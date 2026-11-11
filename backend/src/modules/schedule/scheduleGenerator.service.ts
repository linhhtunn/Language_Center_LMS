import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { addDays, dateOnlyToString, dayNumber, today } from './dotnetBinding.js';
import { solve, splitIntoContiguousRanges, ScheduleSearchStatus, type ScheduleSolverCandidate, type ScheduleSolverTask } from './scheduleConstraintSolver.js';

// =====================================================================================
// Chuyen tu Services/ScheduleGeneratorService.cs (GenerateAndPersistAsync).
// Ban .NET goi ham nay tu ClassesController.Create (POST /api/classes) BEN TRONG transaction
// Serializable, SAU khi da them lop + lien ket giao vien. Module classes cua Node goi:
//
//   const r = await generateAndPersistSchedule(tx, classId, {
//     name, startDate, endDate, capacity, teacherIds, totalPeriods, scheduleConfigs });
//   if (!r.success) { rollback; isConflict = r.error?.startsWith('Du lieu lich da thay doi') }
//   if (r.endDate) cap nhat lophoc.NgayKetThuc = r.endDate
//
// Loi khoa MySQL (1205/1213) duoc nem lai nguyen ven (isMySqlLockConflict) giong ban .NET.
// =====================================================================================

export type Db = PrismaClient | Prisma.TransactionClient;

const MAX_SEARCH_STATES = 25000;
const INT_MAX = 2147483647;

export interface ScheduleConfigInput {
  days?: Array<string | null> | null;
  periods?: number[] | null;
  roomId?: string | null;
  allowAlternativePeriods?: boolean | null;
}

export interface GenerateScheduleRequest {
  /** UpsertClassRequestDto.Name - dung lam TieuDe buoi hoc. */
  name: string;
  /** DateOnly? (Date 00:00 UTC) */
  startDate?: Date | null;
  endDate?: Date | null;
  capacity?: number | null;
  teacherIds?: string[] | null;
  totalPeriods?: number | null;
  /** Phan tu null -> loi "Object reference..." giong .NET (NullReferenceException). */
  scheduleConfigs?: Array<ScheduleConfigInput | null> | null;
}

export interface GenerateScheduleResult {
  success: boolean;
  error: string | null;
  /** Ngay hoc muon nhat da tao (DateOnly) - de cap nhat NgayKetThuc cua lop. */
  endDate: Date | null;
}

/** Loi khoa MySQL 1205 (lock wait timeout) / 1213 (deadlock), hoac P2034 cua Prisma. */
export function isMySqlLockConflict(err: unknown): boolean {
  const e = err as { code?: string; message?: string; meta?: { code?: string | number } } | null;
  if (!e) return false;
  if (e.code === 'P2034') return true;
  const metaCode = String(e.meta?.code ?? '');
  if (metaCode === '1205' || metaCode === '1213') return true;
  return /\b(1205|1213)\b|deadlock|lock wait timeout/i.test(e.message ?? '');
}

class ArgumentError extends Error {}

function mapDayNameToDayOfWeek(name: string | null): number {
  switch (name) {
    case 'Thu 2': return 1;
    case 'Thu 3': return 2;
    case 'Thu 4': return 3;
    case 'Thu 5': return 4;
    case 'Thu 6': return 5;
    case 'Thu 7': return 6;
    case 'Chu nhat': return 0;
    default: throw new ArgumentError('Invalid day name: ' + (name ?? ''));
  }
}

interface Pattern {
  weekday: number;
  start: number;
  end: number;
  room: string | null;
  allowAlternativePeriods: boolean;
}

interface RoomRow {
  MaPhongHoc: string;
  TenPhong: string;
  SucChua: number | null;
}

interface ExistingSchedule {
  MaBuoiHoc: string;
  MaLopHoc: string;
  MaPhongHoc: string | null;
  NgayHoc: Date;
  MaTietBatDau: number;
  MaTietKetThuc: number;
}

const notTrue = (field: string) => ({ OR: [{ [field]: null }, { [field]: false }] });
const notFalse = (field: string) => ({ OR: [{ [field]: null }, { [field]: true }] });

/** Thong bao DbUpdateException cua EF Core khi SaveChanges loi (FK, ...). */
const EF_SAVE_ERROR = 'An error occurred while saving the entity changes. See the inner exception for details.';

export async function generateAndPersistSchedule(
  db: Db,
  classId: string,
  request: GenerateScheduleRequest,
): Promise<GenerateScheduleResult> {
  classId = classId.toLowerCase();
  let createdPeriods = 0;
  let statesExplored = 0;
  const totalNeeded = request.totalPeriods ?? 0;
  if (totalNeeded <= 0) return { success: true, error: null, endDate: null };

  const failure = (reason: string): GenerateScheduleResult => ({
    success: false,
    error: `${reason} Da xep ${createdPeriods}/${totalNeeded} tiet.`,
    endDate: null,
  });

  const startDate = request.startDate ?? today();
  const endDateLimit = request.endDate ?? null;
  if (endDateLimit && endDateLimit.getTime() < startDate.getTime()) {
    return { success: false, error: 'Ngay ket thuc phai bang hoac sau ngay bat dau.', endDate: null };
  }

  let patterns: Pattern[] = [];
  try {
    for (const config of request.scheduleConfigs ?? []) {
      if (config === null) throw new TypeError('Object reference not set to an instance of an object.');
      const periods = [...new Set(config.periods ?? [])].sort((a, b) => a - b);
      if (periods.length === 0) continue;
      if (periods.some((p) => p < 1 || p > 14)) {
        return { success: false, error: 'Tiet hoc phai nam trong khoang tu 1 den 14.', endDate: null };
      }
      const ranges = splitIntoContiguousRanges(periods);
      for (const day of [...new Set(config.days ?? [])]) {
        const weekday = mapDayNameToDayOfWeek(day);
        for (const range of ranges) {
          patterns.push({
            weekday,
            start: range.start,
            end: range.end,
            room: config.roomId ? config.roomId.toLowerCase() : null,
            allowAlternativePeriods: !!config.allowAlternativePeriods,
          });
        }
      }
    }
  } catch (err) {
    if (err instanceof ArgumentError) return { success: false, error: err.message, endDate: null };
    throw err;
  }

  // Distinct() tren tuple - giu thu tu xuat hien dau tien.
  const seenPatterns = new Set<string>();
  patterns = patterns.filter((p) => {
    const key = `${p.weekday}|${p.start}|${p.end}|${p.room ?? ''}|${p.allowAlternativePeriods}`;
    if (seenPatterns.has(key)) return false;
    seenPatterns.add(key);
    return true;
  });
  if (patterns.length === 0) {
    return { success: false, error: 'Khong co cau hinh lich hop le (can chon ngay va tiet hoc).', endDate: null };
  }

  const periodsPerWeek = patterns.reduce((s, p) => s + (p.end - p.start + 1), 0);
  const maxWeekOffsets = endDateLimit
    ? Math.max(1, Math.trunc((dayNumber(endDateLimit) - dayNumber(startDate)) / 7) + 1)
    : Math.trunc((totalNeeded + periodsPerWeek - 1) / periodsPerWeek);

  const capacity = request.capacity ?? null;
  const teacherIds = (request.teacherIds ?? []).map((t) => t.toLowerCase());

  try {
    // OrderBy(SucChua ?? int.MaxValue).ThenBy(TenPhong) chay tren MySQL (collation cua cot) -> dung SQL.
    const activeRooms = await db.$queryRaw<RoomRow[]>`
      SELECT p.MaPhongHoc, p.TenPhong, p.SucChua
      FROM phonghoc AS p
      WHERE (p.DaXoa <> TRUE OR p.DaXoa IS NULL) AND (p.TrangThai <> FALSE OR p.TrangThai IS NULL)
      ORDER BY COALESCE(p.SucChua, 2147483647), p.TenPhong`;
    for (const r of activeRooms) {
      r.MaPhongHoc = r.MaPhongHoc.toLowerCase();
      r.SucChua = r.SucChua === null ? null : Number(r.SucChua);
    }

    const patternRoomIds = [...new Set(patterns.filter((p) => p.room !== null).map((p) => p.room!))];
    for (const roomId of patternRoomIds) {
      const room = activeRooms.find((c) => c.MaPhongHoc === roomId);
      if (!room) return { success: false, error: `Phong hoc ${roomId} khong ton tai hoac khong hoat dong.`, endDate: null };
      if (capacity !== null && (room.SucChua === null || room.SucChua < capacity)) {
        return { success: false, error: `Phong ${room.TenPhong} khong du suc chua cho lop.`, endDate: null };
      }
    }

    const created: ExistingSchedule[] = [];
    const createdRows: Prisma.buoihocCreateManyInput[] = [];
    const preferredRooms = new Map<string, string>();
    const teacherClassIdSet = new Set<string>();
    if (teacherIds.length > 0) {
      const links = await db.giangvienlophoc.findMany({
        where: { MaGiangVien: { in: teacherIds }, AND: [notTrue('DaXoa'), notFalse('TrangThai')] },
        select: { MaLopHoc: true },
      });
      for (const l of links) teacherClassIdSet.add(l.MaLopHoc.toLowerCase());
    }

    for (let weekOffset = 0; createdPeriods < totalNeeded && weekOffset < maxWeekOffsets; weekOffset++) {
      const weekStart = addDays(startDate, weekOffset * 7);
      const weekEntries = patterns
        .map((p) => {
          const offset = (p.weekday - weekStart.getUTCDay() + 7) % 7;
          return { date: addDays(weekStart, offset), start: p.start, end: p.end, room: p.room, allowAlternativePeriods: p.allowAlternativePeriods };
        })
        .filter((e) => !endDateLimit || e.date.getTime() <= endDateLimit.getTime())
        .sort((a, b) => a.date.getTime() - b.date.getTime() || a.start - b.start);

      const weekMeetings: Array<{ date: Date; start: number; end: number; duration: number; room: string | null; allowAlternativePeriods: boolean }> = [];
      let weekPeriods = 0;
      for (const entry of weekEntries) {
        if (createdPeriods + weekPeriods >= totalNeeded) break;
        const duration = Math.min(entry.end - entry.start + 1, totalNeeded - createdPeriods - weekPeriods);
        weekMeetings.push({ ...entry, duration });
        weekPeriods += duration;
      }
      if (weekMeetings.length === 0) continue;

      const firstDate = new Date(Math.min(...weekMeetings.map((m) => m.date.getTime())));
      const lastDate = new Date(Math.max(...weekMeetings.map((m) => m.date.getTime())));
      const existingSchedules: ExistingSchedule[] = (
        await db.buoihoc.findMany({
          where: { NgayHoc: { gte: firstDate, lte: lastDate }, ...notTrue('DaXoa') },
          select: { MaBuoiHoc: true, MaLopHoc: true, MaPhongHoc: true, NgayHoc: true, MaTietBatDau: true, MaTietKetThuc: true },
        })
      ).map((s) => ({ ...s, MaLopHoc: s.MaLopHoc.toLowerCase(), MaPhongHoc: s.MaPhongHoc?.toLowerCase() ?? null }));

      const existingClassIds = [...new Set([...existingSchedules.map((s) => s.MaLopHoc), classId])];
      const activeEnrollments = await db.hocsinhlophoc.findMany({
        where: { MaLopHoc: { in: existingClassIds }, AND: [notTrue('DaXoa'), notFalse('TrangThai')] },
        select: { MaLopHoc: true, MaHocSinh: true },
      });
      const studentsByClass = new Map<string, Set<string>>();
      for (const e of activeEnrollments) {
        const key = e.MaLopHoc.toLowerCase();
        let set = studentsByClass.get(key);
        if (!set) studentsByClass.set(key, (set = new Set()));
        set.add(e.MaHocSinh.toLowerCase());
      }
      const classStudentIds = studentsByClass.get(classId) ?? new Set<string>();

      const solverTasks: ScheduleSolverTask[] = [];
      const patternKeys: string[] = [];

      for (const meeting of weekMeetings) {
        const patternKey = `${meeting.date.getUTCDay()}|${meeting.start}|${meeting.end}|${meeting.room ?? ''}`;
        let candidateStarts: number[];
        if (meeting.allowAlternativePeriods) {
          candidateStarts = Array.from({ length: Math.max(0, 15 - meeting.duration) }, (_, i) => i + 1).sort(
            (a, b) =>
              (a === meeting.start ? 0 : 1) - (b === meeting.start ? 0 : 1) ||
              Math.abs(a - meeting.start) - Math.abs(b - meeting.start) ||
              a - b,
          );
        } else {
          candidateStarts = [meeting.start];
        }

        const candidates: ScheduleSolverCandidate[] = [];
        let classConflictFound = false;
        let teacherConflictFound = false;
        let studentConflictFound = false;
        let roomConflictFound = false;
        let capacityConflictFound = false;

        for (const candidateStart of candidateStarts) {
          const candidateEnd = candidateStart + meeting.duration - 1;
          const overlaps = (s: ExistingSchedule) =>
            s.NgayHoc.getTime() === meeting.date.getTime() && s.MaTietBatDau <= candidateEnd && s.MaTietKetThuc >= candidateStart;

          if (existingSchedules.some((s) => s.MaLopHoc === classId && overlaps(s))) {
            classConflictFound = true;
            continue;
          }
          if (teacherClassIdSet.size > 0 && existingSchedules.some((s) => teacherClassIdSet.has(s.MaLopHoc) && overlaps(s))) {
            teacherConflictFound = true;
            continue;
          }
          if (
            classStudentIds.size > 0 &&
            existingSchedules.some((s) => {
              if (!overlaps(s)) return false;
              const other = studentsByClass.get(s.MaLopHoc);
              if (!other) return false;
              for (const x of classStudentIds) if (other.has(x)) return true;
              return false;
            })
          ) {
            studentConflictFound = true;
            continue;
          }

          const preferredRoomId = preferredRooms.get(patternKey);
          const roomCandidates = activeRooms
            .filter((r) => capacity === null || (r.SucChua !== null && r.SucChua >= capacity))
            .filter((r) => meeting.room === null || r.MaPhongHoc === meeting.room)
            // OrderByDescending(phong uu tien).ThenBy(SucChua ?? int.MaxValue) - sort on dinh nhu LINQ.
            .sort(
              (a, b) =>
                (preferredRoomId !== undefined && b.MaPhongHoc === preferredRoomId ? 1 : 0) -
                  (preferredRoomId !== undefined && a.MaPhongHoc === preferredRoomId ? 1 : 0) ||
                (a.SucChua ?? INT_MAX) - (b.SucChua ?? INT_MAX),
            );

          if (roomCandidates.length === 0 && capacity !== null) capacityConflictFound = true;

          for (const room of roomCandidates) {
            if (existingSchedules.some((s) => s.MaPhongHoc === room.MaPhongHoc && overlaps(s))) {
              roomConflictFound = true;
              continue;
            }
            candidates.push({ start: candidateStart, end: candidateEnd, roomId: room.MaPhongHoc });
          }

          if (meeting.room === null && capacity === null) {
            candidates.push({ start: candidateStart, end: candidateEnd, roomId: null });
          }
        }

        if (candidates.length === 0) {
          const conflicts: string[] = [];
          if (classConflictFound) conflicts.push('lop hoc');
          if (teacherConflictFound) conflicts.push('giao vien');
          if (studentConflictFound) conflicts.push('hoc sinh da co lich o lop khac');
          if (capacityConflictFound) conflicts.push('khong co phong du suc chua');
          if (roomConflictFound) conflicts.push('phong da duoc dat');
          if (meeting.room !== null && !roomConflictFound && !capacityConflictFound) conflicts.push('phong duoc chon khong kha dung');
          const details = conflicts.length > 0 ? conflicts.join(', ') : 'khong co khung gio phu hop';
          return failure(
            `Khong co khung gio kha dung ngay ${dateOnlyToString(meeting.date)} cho mau tiet ${meeting.start}-${meeting.end}; xung dot: ${details}.`,
          );
        }

        solverTasks.push({
          classId,
          date: meeting.date,
          teacherIds: new Set(teacherIds),
          candidates,
          studentIds: classStudentIds,
        });
        patternKeys.push(patternKey);
      }

      if (statesExplored >= MAX_SEARCH_STATES) {
        return failure(`Vuot gioi han ${MAX_SEARCH_STATES} trang thai tim kiem; chua the ket luan khong co loi giai.`);
      }

      const searchResult = solve(solverTasks, MAX_SEARCH_STATES - statesExplored);
      statesExplored += searchResult.metrics.statesExplored;

      if (searchResult.status !== ScheduleSearchStatus.Solved) {
        const reason =
          searchResult.status === ScheduleSearchStatus.SearchLimitReached
            ? `Vuot gioi han ${MAX_SEARCH_STATES} trang thai tim kiem; chua the ket luan khong co loi giai.`
            : 'Khong tim duoc to hop lich hop le trong cac khung gio da cho phep.';
        return failure(reason);
      }

      for (let taskIndex = 0; taskIndex < solverTasks.length; taskIndex++) {
        const assignment = searchResult.assignments.get(taskIndex)!;
        const meeting = weekMeetings[taskIndex];
        const id = randomUUID();
        createdRows.push({
          MaBuoiHoc: id,
          MaLopHoc: classId,
          MaPhongHoc: assignment.roomId,
          NgayHoc: meeting.date,
          MaTietBatDau: assignment.start,
          MaTietKetThuc: assignment.end,
          TieuDe: request.name,
          NoiDung: `Lich hoc ${dateOnlyToString(meeting.date)} tiet ${assignment.start}-${assignment.end}`,
          ThoiGianTao: new Date(),
          TrangThai: true,
          DaXoa: false,
        });
        created.push({
          MaBuoiHoc: id,
          MaLopHoc: classId,
          MaPhongHoc: assignment.roomId,
          NgayHoc: meeting.date,
          MaTietBatDau: assignment.start,
          MaTietKetThuc: assignment.end,
        });
        if (assignment.roomId !== null) preferredRooms.set(patternKeys[taskIndex], assignment.roomId);
      }

      createdPeriods += weekPeriods;
    }

    if (createdPeriods < totalNeeded) {
      const reason = endDateLimit
        ? `Khong du khung lich truoc ngay ket thuc ${dateOnlyToString(endDateLimit)}.`
        : 'Khong the tao du so tiet tu cau hinh lich.';
      return failure(reason);
    }

    try {
      await db.buoihoc.createMany({ data: createdRows });
    } catch (err) {
      if (isMySqlLockConflict(err)) throw err;
      throw Object.assign(new Error(EF_SAVE_ERROR), { cause: err });
    }

    const createdIds = created.map((s) => s.MaBuoiHoc);
    for (const schedule of created) {
      const overlappingExisting = await db.buoihoc.findMany({
        where: {
          MaBuoiHoc: { notIn: createdIds },
          NgayHoc: schedule.NgayHoc,
          MaTietBatDau: { lte: schedule.MaTietKetThuc },
          MaTietKetThuc: { gte: schedule.MaTietBatDau },
          ...notTrue('DaXoa'),
        },
        select: { MaLopHoc: true, MaPhongHoc: true },
      });
      let conflictAppeared = overlappingExisting.some(
        (e) =>
          e.MaLopHoc.toLowerCase() === classId ||
          (schedule.MaPhongHoc !== null && e.MaPhongHoc?.toLowerCase() === schedule.MaPhongHoc) ||
          teacherClassIdSet.has(e.MaLopHoc.toLowerCase()),
      );
      if (!conflictAppeared && overlappingExisting.length > 0) {
        const otherClassIds = [...new Set(overlappingExisting.map((e) => e.MaLopHoc.toLowerCase()))];
        conflictAppeared = await hasSharedStudent(db, classId, otherClassIds);
      }
      if (conflictAppeared) {
        return failure(
          `Du lieu lich da thay doi trong luc sinh; phat hien xung dot ngay ${dateOnlyToString(schedule.NgayHoc)}, tiet ${schedule.MaTietBatDau}-${schedule.MaTietKetThuc}.`,
        );
      }
    }

    const maxDate = new Date(Math.max(...created.map((s) => s.NgayHoc.getTime())));
    return { success: true, error: null, endDate: maxDate };
  } catch (err) {
    if (isMySqlLockConflict(err)) throw err;
    return { success: false, error: (err as Error)?.message ?? String(err), endDate: null };
  }
}

async function hasSharedStudent(db: Db, classId: string, otherClassIds: string[]): Promise<boolean> {
  if (otherClassIds.length === 0) return false;
  const active = { AND: [notTrue('DaXoa'), notFalse('TrangThai')] };
  const mine = await db.hocsinhlophoc.findMany({ where: { MaLopHoc: classId, ...active }, select: { MaHocSinh: true } });
  if (mine.length === 0) return false;
  const count = await db.hocsinhlophoc.count({
    where: { MaLopHoc: { in: otherClassIds }, MaHocSinh: { in: mine.map((m) => m.MaHocSinh) }, ...active },
  });
  return count > 0;
}
