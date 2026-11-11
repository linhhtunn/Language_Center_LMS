import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { parseTimeOnly, toDateOnly } from '../../utils/dotnetCompat.js';
import { addDays, compareInvariant, dayNumber, formatDate, today } from './dotnetBinding.js';
import type { Db } from './scheduleGenerator.service.js';

// Chuyen tu Controllers/ScheduleController.cs (phan truy van / ghi du lieu).

const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };
const activeLink = { AND: [{ OR: [{ DaXoa: null }, { DaXoa: false }] }, { OR: [{ TrangThai: null }, { TrangThai: true }] }] };
/** link.DaXoa != true && link.TrangThai != false */
const activeLinkNe = activeLink;

/** Guid cua .NET luon ghi chu thuong dang D. */
export const lg = <T extends string | null | undefined>(s: T): T => (s ? (s.toLowerCase() as T) : s);

/** Thu Hai dau tuan chua ngay d. */
export function getWeekStart(date: Date): Date {
  const diff = (date.getUTCDay() + 6) % 7;
  return addDays(date, -diff);
}

const getDayIndex = (weekStart: Date, date: Date) => dayNumber(date) - dayNumber(weekStart);

// Include Giangvienlophocs cua EF: thu tu theo khoa chinh (MaLopHoc, MaGiangVien). Lay truoc tat ca roi loc bang code
// giong .FirstOrDefault(g => active) tren collection da nap.
const allTeacherLinks = {
  orderBy: { MaGiangVien: 'asc' },
  include: { giangvien: { include: { nguoidung: { select: { HoTen: true } } } } },
} satisfies Prisma.lophoc$giangvienlophocArgs;

type TeacherLink = { MaGiangVien: string; DaXoa: boolean | null; TrangThai: boolean | null; giangvien: { nguoidung: { HoTen: string } } };

function firstActiveTeacher(links: TeacherLink[] | undefined) {
  return links?.find((g) => (g.DaXoa === null || g.DaXoa === false) && (g.TrangThai === null || g.TrangThai === true));
}

// ---------------------------------------------------------------------------------------
// Tao / sua buoi hoc
// ---------------------------------------------------------------------------------------

export interface BuoiHocInput {
  maLopHoc: string;
  maPhongHoc: string | null;
  ngayHoc: Date; // DateOnly
  maTietBatDau: number;
  maTietKetThuc: number;
  tieuDe: string | null;
  noiDung: string | null;
}

export type HttpResult = { status: number; body?: unknown };

/** Ket qua tra ve ma KHONG commit transaction (giong return truoc CommitAsync -> Dispose rollback). */
class RollbackWith extends Error {
  constructor(public result: HttpResult) {
    super('rollback');
  }
}

export async function runSerializable(fn: (tx: Prisma.TransactionClient) => Promise<{ commit: boolean; result: HttpResult }>): Promise<HttpResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        const r = await fn(tx);
        if (!r.commit) throw new RollbackWith(r.result);
        return r.result;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30_000, maxWait: 10_000 },
    );
  } catch (err) {
    if (err instanceof RollbackWith) return err.result;
    throw err;
  }
}

const TIET_SLOTS: Array<[number, string, string, string]> = [
  [1, 'Tiet 1', '07:00:00', '07:50:00'],
  [2, 'Tiet 2', '07:55:00', '08:45:00'],
  [3, 'Tiet 3', '08:50:00', '09:40:00'],
  [4, 'Tiet 4', '09:50:00', '10:40:00'],
  [5, 'Tiet 5', '10:45:00', '11:35:00'],
  [6, 'Tiet 6', '12:30:00', '13:20:00'],
  [7, 'Tiet 7', '13:25:00', '14:15:00'],
  [8, 'Tiet 8', '14:20:00', '15:10:00'],
  [9, 'Tiet 9', '15:20:00', '16:10:00'],
  [10, 'Tiet 10', '16:15:00', '17:05:00'],
  [11, 'Tiet 11', '17:30:00', '18:20:00'],
  [12, 'Tiet 12', '18:25:00', '19:15:00'],
  [13, 'Tiet 13', '19:20:00', '20:10:00'],
  [14, 'Tiet 14', '20:15:00', '21:05:00'],
];

/** EnsureTietHocSeedAsync: them cac tiet 1-14 con thieu (gio co dinh nhu ban .NET). */
export async function ensureTietHocSeed(db: Db) {
  const existing = new Set((await db.tiethoc.findMany({ select: { MaTiet: true } })).map((t) => t.MaTiet));
  const missing = TIET_SLOTS.filter(([id]) => !existing.has(id));
  if (missing.length === 0) return;
  await db.tiethoc.createMany({
    data: missing.map(([id, name, start, end]) => ({
      MaTiet: id,
      TenTiet: name,
      GioBatDau: parseTimeOnly(start)!,
      GioKetThuc: parseTimeOnly(end)!,
      TrangThai: true,
      DaXoa: false,
      ThoiGianTao: new Date(),
    })),
  });
}

/** Kiem tra trung lop / phong / giao vien truoc khi ghi (KHONG loc DaXoa - giu nguyen ban .NET). */
async function precheckConflicts(db: Db, dto: BuoiHocInput, excludeId: string | null): Promise<string[]> {
  const overlapping = await db.buoihoc.findMany({
    where: {
      ...(excludeId ? { MaBuoiHoc: { not: excludeId } } : {}),
      NgayHoc: dto.ngayHoc,
      MaTietBatDau: { lte: dto.maTietKetThuc },
      MaTietKetThuc: { gte: dto.maTietBatDau },
    },
    select: { MaLopHoc: true, MaPhongHoc: true },
  });

  const errors: string[] = [];
  if (overlapping.some((b) => lg(b.MaLopHoc) === dto.maLopHoc)) errors.push('Trùng Lớp học: lớp này đã có buổi học trùng giờ.');
  if (dto.maPhongHoc !== null && overlapping.some((b) => b.MaPhongHoc !== null && lg(b.MaPhongHoc) === dto.maPhongHoc)) {
    errors.push('Trùng Phòng học: phòng này đã được sử dụng ở khung giờ đó.');
  }

  const teachersForClass = await db.giangvienlophoc.findMany({
    where: { MaLopHoc: dto.maLopHoc, ...activeLink },
    select: { MaGiangVien: true },
  });
  if (teachersForClass.length > 0) {
    const classIds = [...new Set(overlapping.map((b) => b.MaLopHoc))];
    const busy = classIds.length
      ? new Set((await db.giangvienlophoc.findMany({ where: { MaLopHoc: { in: classIds } }, select: { MaGiangVien: true } })).map((g) => lg(g.MaGiangVien)))
      : new Set<string>();
    if (teachersForClass.some((t) => busy.has(lg(t.MaGiangVien)))) {
      errors.push('Trùng Giảng viên: một hoặc nhiều giảng viên đang bận trong khung giờ đó.');
    }
  }
  return errors;
}

/** HasScheduleConflictAsync - kiem tra lai sau khi ghi (co loc DaXoa). */
async function hasScheduleConflict(
  db: Db,
  candidate: { MaLopHoc: string; MaPhongHoc: string | null; NgayHoc: Date; MaTietBatDau: number; MaTietKetThuc: number },
  excludedId: string,
): Promise<boolean> {
  const overlapping = await db.buoihoc.findMany({
    where: {
      MaBuoiHoc: { not: excludedId },
      NgayHoc: candidate.NgayHoc,
      MaTietBatDau: { lte: candidate.MaTietKetThuc },
      MaTietKetThuc: { gte: candidate.MaTietBatDau },
      ...notDeleted,
    },
    select: { MaLopHoc: true, MaPhongHoc: true },
  });
  if (
    overlapping.some((s) => lg(s.MaLopHoc) === lg(candidate.MaLopHoc)) ||
    (candidate.MaPhongHoc !== null && overlapping.some((s) => lg(s.MaPhongHoc) === lg(candidate.MaPhongHoc)))
  ) {
    return true;
  }
  const candidateTeachers = await db.giangvienlophoc.findMany({
    where: { MaLopHoc: candidate.MaLopHoc, ...activeLinkNe },
    select: { MaGiangVien: true },
  });
  if (candidateTeachers.length === 0 || overlapping.length === 0) return false;
  const classIds = [...new Set(overlapping.map((s) => s.MaLopHoc))];
  const busy = new Set(
    (await db.giangvienlophoc.findMany({ where: { MaLopHoc: { in: classIds }, ...activeLinkNe }, select: { MaGiangVien: true } })).map((g) =>
      lg(g.MaGiangVien),
    ),
  );
  return candidateTeachers.some((t) => busy.has(lg(t.MaGiangVien)));
}

export function createBuoiHoc(dto: BuoiHocInput): Promise<HttpResult> {
  return runSerializable(async (tx) => {
    if (dto.maTietBatDau > dto.maTietKetThuc) {
      return { commit: false, result: { status: 400, body: { error: 'MaTietBatDau must be <= MaTietKetThuc' } } };
    }
    await ensureTietHocSeed(tx);

    const errors = await precheckConflicts(tx, dto, null);
    if (errors.length > 0) return { commit: false, result: { status: 400, body: { errors } } };

    const entity = {
      MaBuoiHoc: randomUUID(),
      MaLopHoc: dto.maLopHoc,
      MaPhongHoc: dto.maPhongHoc,
      NgayHoc: dto.ngayHoc,
      MaTietBatDau: dto.maTietBatDau,
      MaTietKetThuc: dto.maTietKetThuc,
      TieuDe: dto.tieuDe,
      NoiDung: dto.noiDung,
      ThoiGianTao: new Date(),
      TrangThai: true,
      DaXoa: false,
    };
    await tx.buoihoc.create({ data: entity });

    if (await hasScheduleConflict(tx, entity, entity.MaBuoiHoc)) {
      return { commit: false, result: { status: 409, body: { error: 'Lịch đã thay đổi trong lúc lưu; phát hiện xung đột.' } } };
    }
    return { commit: true, result: { status: 200, body: { id: entity.MaBuoiHoc } } };
  });
}

export function updateBuoiHoc(id: string, dto: BuoiHocInput): Promise<HttpResult> {
  return runSerializable(async (tx) => {
    const existing = await tx.buoihoc.findUnique({ where: { MaBuoiHoc: id } });
    if (!existing) return { commit: false, result: { status: 404 } };

    if (dto.maTietBatDau > dto.maTietKetThuc) {
      return { commit: false, result: { status: 400, body: { error: 'MaTietBatDau must be <= MaTietKetThuc' } } };
    }

    const errors = await precheckConflicts(tx, dto, id);
    if (errors.length > 0) return { commit: false, result: { status: 400, body: { errors } } };

    const data = {
      MaLopHoc: dto.maLopHoc,
      MaPhongHoc: dto.maPhongHoc,
      NgayHoc: dto.ngayHoc,
      MaTietBatDau: dto.maTietBatDau,
      MaTietKetThuc: dto.maTietKetThuc,
      TieuDe: dto.tieuDe,
      NoiDung: dto.noiDung,
      ThoiGianSua: new Date(),
    };
    await tx.buoihoc.update({ where: { MaBuoiHoc: existing.MaBuoiHoc }, data });

    if (await hasScheduleConflict(tx, data, existing.MaBuoiHoc)) {
      return { commit: false, result: { status: 409, body: { error: 'Lịch đã thay đổi trong lúc lưu; phát hiện xung đột.' } } };
    }
    return { commit: true, result: { status: 200, body: { message: 'Cập nhật buổi học thành công.', id: lg(existing.MaBuoiHoc) } } };
  });
}

export async function deleteBuoiHoc(id: string): Promise<HttpResult> {
  const existing = await prisma.buoihoc.findUnique({ where: { MaBuoiHoc: id }, select: { MaBuoiHoc: true } });
  if (!existing) return { status: 404, body: { message: 'Không tìm thấy buổi học.' } };
  await prisma.buoihoc.update({ where: { MaBuoiHoc: existing.MaBuoiHoc }, data: { DaXoa: true, ThoiGianSua: new Date() } });
  return { status: 200, body: { message: 'Đã xóa buổi học.', id } };
}

// ---------------------------------------------------------------------------------------
// sample-payload
// ---------------------------------------------------------------------------------------

export async function getSamplePayload() {
  const classRow = await prisma.lophoc.findFirst({ where: notDeleted, orderBy: { TenLop: 'asc' } });
  const roomRow = await prisma.phonghoc.findFirst({ where: notDeleted, orderBy: { TenPhong: 'asc' } });
  const sessionRow = await prisma.buoihoc.findFirst({ where: notDeleted, orderBy: { ThoiGianTao: 'desc' } });
  const fallbackDate = new Date(Date.UTC(2026, 4, 8));

  return {
    create: {
      maLopHoc: lg(classRow?.MaLopHoc) ?? null,
      maPhongHoc: lg(roomRow?.MaPhongHoc) ?? null,
      ngayHoc: sessionRow?.NgayHoc ?? fallbackDate,
      maTietBatDau: 1,
      maTietKetThuc: 2,
      tieuDe: classRow ? `${classRow.TenLop} - Buổi học` : 'Buổi học',
      noiDung: 'Nội dung buổi học theo lớp thực tế trong hệ thống',
    },
    update: {
      maLopHoc: lg(sessionRow?.MaLopHoc ?? classRow?.MaLopHoc) ?? null,
      maPhongHoc: lg(sessionRow?.MaPhongHoc) ?? null,
      ngayHoc: sessionRow?.NgayHoc ?? fallbackDate,
      maTietBatDau: sessionRow?.MaTietBatDau ?? 3,
      maTietKetThuc: sessionRow?.MaTietKetThuc ?? 4,
      tieuDe: sessionRow?.TieuDe ?? 'Buổi học cập nhật',
      noiDung: sessionRow?.NoiDung ?? 'Nội dung cập nhật theo buổi học thực tế',
    },
    notes: [
      'Dữ liệu mẫu được lấy từ các bản ghi thực tế trong hệ thống nếu có.',
      'MaPhongHoc có thể để null nếu chưa chốt phòng.',
      'MaTietBatDau phải nhỏ hơn hoặc bằng MaTietKetThuc.',
    ],
  };
}

// ---------------------------------------------------------------------------------------
// Bang lich (admin / giao vien / hoc sinh / phu huynh)
// ---------------------------------------------------------------------------------------

async function lookupRooms() {
  const rooms = await prisma.phonghoc.findMany({ where: notDeleted, orderBy: { TenPhong: 'asc' }, select: { MaPhongHoc: true, TenPhong: true } });
  return rooms.map((r) => ({ id: lg(r.MaPhongHoc), name: r.TenPhong }));
}

export async function getAdminBoard(weekStartParam: Date | null) {
  const monday = getWeekStart(weekStartParam ? dateOnly(weekStartParam) : today());
  const weekEnd = addDays(monday, 6);

  const scheduleRows = await prisma.buoihoc.findMany({
    where: { ...notDeleted, NgayHoc: { gte: monday, lte: weekEnd } },
    include: { lophoc: { include: { giangvienlophoc: allTeacherLinks } }, phonghoc: true },
    orderBy: { MaBuoiHoc: 'asc' },
  });

  const schedules = scheduleRows.map((row) => {
    const teacher = firstActiveTeacher(row.lophoc?.giangvienlophoc);
    return {
      id: lg(row.MaBuoiHoc),
      maBuoiHoc: lg(row.MaBuoiHoc),
      maLopHoc: lg(row.MaLopHoc),
      classCode: row.lophoc?.TenLop ?? lg(row.MaLopHoc),
      className: row.lophoc?.TenLop ?? '',
      maGiangVien: lg(teacher?.MaGiangVien) ?? null,
      teacher: teacher?.giangvien?.nguoidung?.HoTen ?? 'Chưa phân công',
      maPhongHoc: lg(row.MaPhongHoc) ?? null,
      room: row.phonghoc?.TenPhong ?? 'Chưa gán phòng',
      ngayHoc: toDateOnly(row.NgayHoc),
      dayIdx: getDayIndex(monday, row.NgayHoc),
      slotId: row.MaTietBatDau,
      slotEndId: row.MaTietKetThuc,
      subject: row.TieuDe ?? row.lophoc?.TenLop ?? 'Buổi học',
      isConflict: false,
      conflictReason: null,
    };
  });

  const requestRows = await prisma.yeucaulichday.findMany({
    where: { ...notDeleted, AND: [{ OR: [{ TrangThaiDuyet: null }, { TrangThaiDuyet: 0 }] }] },
    include: {
      lophoc: true,
      giangvien: { include: { nguoidung: { select: { HoTen: true } } } },
      buoihoc: { include: { phonghoc: true } },
      phonghoc: true,
    },
    orderBy: { MaYeuCau: 'asc' },
  });

  const rescheduleRequests = requestRows.map((row) => ({
    id: lg(row.MaYeuCau),
    maYeuCau: lg(row.MaYeuCau),
    maBuoiHoc: lg(row.MaBuoiHoc) ?? null,
    maLopHoc: lg(row.MaLopHoc),
    classCode: row.lophoc?.TenLop ?? lg(row.MaLopHoc),
    teacher: row.giangvien?.nguoidung?.HoTen ?? 'Chưa rõ',
    oldDate: row.buoihoc ? `${formatDate(row.buoihoc.NgayHoc, 'dd/MM')} - Ca ${row.buoihoc.MaTietBatDau}` : 'Chưa có lịch gốc',
    newDate:
      row.LoaiYeuCau === 2
        ? `Đổi phòng: ${row.buoihoc?.phonghoc?.TenPhong ?? '?'} → ${row.phonghoc?.TenPhong ?? '?'}`
        : `${formatDate(row.NgayHocDeXuat, 'dd/MM')} - Ca ${row.MaTietBatDauDeXuat}`,
    reason: row.LyDo ?? '',
    status: row.TrangThaiDuyet ?? null,
    loaiYeuCau: row.LoaiYeuCau ?? null,
    tenPhongHocHienTai: row.buoihoc?.phonghoc?.TenPhong ?? null,
    tenPhongHocDeXuat: row.phonghoc?.TenPhong ?? null,
  }));

  const classes = (
    await prisma.lophoc.findMany({ where: notDeleted, orderBy: { TenLop: 'asc' }, select: { MaLopHoc: true, TenLop: true } })
  ).map((c) => ({ id: lg(c.MaLopHoc), name: c.TenLop }));

  // OrderBy(HoTen) + collection con -> EF them ORDER BY MaGiangVien; chuyen mon theo khoa (MaGiangVien, MaKhoaHoc).
  const rawTeachers = await prisma.giangvien.findMany({
    where: notDeleted,
    orderBy: [{ nguoidung: { HoTen: 'asc' } }, { MaGiangVien: 'asc' }],
    select: { MaGiangVien: true, nguoidung: { select: { HoTen: true } } },
  });
  const specRows = rawTeachers.length
    ? await prisma.giangvienkhoahoc.findMany({
        where: { MaGiangVien: { in: rawTeachers.map((t) => t.MaGiangVien) } },
        orderBy: [{ MaGiangVien: 'asc' }, { MaKhoaHoc: 'asc' }],
      })
    : [];
  const courseNames = new Map(
    (specRows.length
      ? await prisma.khoahoc.findMany({ where: { MaKhoaHoc: { in: [...new Set(specRows.map((s) => s.MaKhoaHoc))] } }, select: { MaKhoaHoc: true, TenKhoaHoc: true } })
      : []
    ).map((k) => [lg(k.MaKhoaHoc), k.TenKhoaHoc]),
  );
  const teachers = rawTeachers.map((t) => {
    const specs = specRows
      .filter((s) => lg(s.MaGiangVien) === lg(t.MaGiangVien) && courseNames.has(lg(s.MaKhoaHoc)))
      .map((s) => courseNames.get(lg(s.MaKhoaHoc))!);
    return { id: lg(t.MaGiangVien), name: t.nguoidung.HoTen + (specs.length ? ' (' + specs.join(', ') + ')' : '') };
  });

  return {
    weekStart: monday,
    schedules,
    rescheduleRequests,
    classes,
    teachers,
    rooms: await lookupRooms(),
  };
}

export async function getTeacherBoard(weekStartParam: Date | null, teacherId: string) {
  const monday = getWeekStart(weekStartParam ? dateOnly(weekStartParam) : today());
  const weekEnd = addDays(monday, 6);
  // User.FindFirst("name") khong ton tai trong token .NET (chi co "fullName") -> luon "Giáo viên".
  const teacherName = 'Giáo viên';

  const scheduleRows = await prisma.buoihoc.findMany({
    where: {
      ...notDeleted,
      NgayHoc: { gte: monday, lte: weekEnd },
      lophoc: { giangvienlophoc: { some: { MaGiangVien: teacherId } } },
    },
    include: { lophoc: true, phonghoc: true },
    orderBy: { MaBuoiHoc: 'asc' },
  });

  const schedules = scheduleRows.map((row) => ({
    id: lg(row.MaBuoiHoc),
    maBuoiHoc: lg(row.MaBuoiHoc),
    maLopHoc: lg(row.MaLopHoc),
    classCode: row.lophoc?.TenLop ?? lg(row.MaLopHoc),
    className: row.lophoc?.TenLop ?? '',
    maGiangVien: teacherId,
    teacher: teacherName,
    maPhongHoc: lg(row.MaPhongHoc) ?? null,
    room: row.phonghoc?.TenPhong ?? 'Chưa gán phòng',
    ngayHoc: toDateOnly(row.NgayHoc),
    dayIdx: getDayIndex(monday, row.NgayHoc),
    slotId: row.MaTietBatDau,
    slotEndId: row.MaTietKetThuc,
    subject: row.TieuDe ?? row.lophoc?.TenLop ?? 'Buổi học',
    isConflict: false,
    conflictReason: null,
  }));

  const rawRequests = await prisma.yeucaulichday.findMany({
    where: { ...notDeleted, MaGiangVien: teacherId },
    select: {
      MaYeuCau: true,
      MaBuoiHoc: true,
      MaLopHoc: true,
      NgayHocDeXuat: true,
      MaTietBatDauDeXuat: true,
      MaTietKetThucDeXuat: true,
      LyDo: true,
      TrangThaiDuyet: true,
      LoaiYeuCau: true,
      MaPhongHocDeXuat: true,
    },
    orderBy: { MaYeuCau: 'asc' },
  });

  const classIds = [...new Set(rawRequests.map((r) => r.MaLopHoc))];
  const buoiIds = [...new Set(rawRequests.filter((r) => r.MaBuoiHoc).map((r) => r.MaBuoiHoc!))];
  const roomIds = [...new Set(rawRequests.filter((r) => r.MaPhongHocDeXuat).map((r) => lg(r.MaPhongHocDeXuat!)))];

  const classMap = new Map(
    (classIds.length ? await prisma.lophoc.findMany({ where: { MaLopHoc: { in: classIds } }, select: { MaLopHoc: true, TenLop: true } }) : []).map(
      (l) => [lg(l.MaLopHoc), l.TenLop],
    ),
  );
  const buoiMap = new Map(
    (buoiIds.length ? await prisma.buoihoc.findMany({ where: { MaBuoiHoc: { in: buoiIds } } }) : []).map((b) => [lg(b.MaBuoiHoc), b]),
  );
  for (const b of buoiMap.values()) {
    if (b.MaPhongHoc && !roomIds.includes(lg(b.MaPhongHoc))) roomIds.push(lg(b.MaPhongHoc));
  }
  const roomMap = new Map(
    (roomIds.length ? await prisma.phonghoc.findMany({ where: { MaPhongHoc: { in: roomIds } }, select: { MaPhongHoc: true, TenPhong: true } }) : []).map(
      (r) => [lg(r.MaPhongHoc), r.TenPhong],
    ),
  );

  const rescheduleRequests = rawRequests.map((row) => {
    const buoi = row.MaBuoiHoc ? buoiMap.get(lg(row.MaBuoiHoc)) : undefined;
    const currentRoom = buoi?.MaPhongHoc ? roomMap.get(lg(buoi.MaPhongHoc)) : undefined;
    const proposedRoom = row.MaPhongHocDeXuat ? roomMap.get(lg(row.MaPhongHocDeXuat)) : undefined;
    return {
      id: lg(row.MaYeuCau),
      maYeuCau: lg(row.MaYeuCau),
      maBuoiHoc: lg(row.MaBuoiHoc) ?? null,
      maLopHoc: lg(row.MaLopHoc),
      classCode: classMap.get(lg(row.MaLopHoc)) ?? '',
      teacher: teacherName,
      oldDate: buoi ? `${formatDate(buoi.NgayHoc, 'dd/MM')} - Ca ${buoi.MaTietBatDau}` : 'Không xác định',
      newDate:
        row.LoaiYeuCau === 2
          ? `Đổi phòng: ${currentRoom ?? '?'} → ${proposedRoom ?? '?'}`
          : `${formatDate(row.NgayHocDeXuat, 'dd/MM')} - Ca ${row.MaTietBatDauDeXuat}`,
      reason: row.LyDo ?? '',
      status: row.TrangThaiDuyet ?? null,
      loaiYeuCau: row.LoaiYeuCau ?? null,
      tenPhongHocHienTai: null,
      tenPhongHocDeXuat: proposedRoom ?? null,
    };
  });

  return {
    weekStart: monday,
    schedules,
    rescheduleRequests,
    classes: [],
    teachers: [],
    rooms: await lookupRooms(),
  };
}

const activeEnrollment = activeLink;

function studentScheduleItem(
  row: { MaBuoiHoc: string; MaLopHoc: string; NgayHoc: Date; MaTietBatDau: number; MaTietKetThuc: number; TieuDe: string | null; phonghoc: { TenPhong: string } | null },
  className: string | undefined,
  teacher: string,
  dayIdx: number,
) {
  return {
    id: lg(row.MaBuoiHoc),
    classCode: className ?? lg(row.MaLopHoc),
    className: className ?? '',
    teacher,
    room: row.phonghoc?.TenPhong ?? 'Chưa gán phòng',
    ngayHoc: toDateOnly(row.NgayHoc),
    dayIdx,
    slotId: row.MaTietBatDau,
    slotEndId: row.MaTietKetThuc,
    subject: row.TieuDe ?? className ?? 'Buổi học',
  };
}

const classStatus = (trangThai: boolean | null) => (trangThai === true ? 'Hoạt động' : 'Không hoạt động');

async function countActiveStudents(classId: string) {
  return prisma.hocsinhlophoc.count({ where: { MaLopHoc: classId, ...activeEnrollment } });
}

export async function getStudentClasses(studentId: string) {
  const studentClasses = await prisma.hocsinhlophoc.findMany({
    where: { MaHocSinh: studentId, ...activeEnrollment },
    include: { lophoc: { include: { giangvienlophoc: allTeacherLinks } } },
    orderBy: [{ MaLopHoc: 'asc' }, { MaHocSinh: 'asc' }],
  });

  const classes = [];
  for (const sc of studentClasses) {
    const info = sc.lophoc;
    const teacherName = firstActiveTeacher(info?.giangvienlophoc)?.giangvien?.nguoidung?.HoTen ?? 'Chưa phân công';
    const studentCount = await countActiveStudents(info.MaLopHoc);
    classes.push({
      id: lg(info.MaLopHoc),
      classCode: info.TenLop,
      className: info.TenLop,
      teacher: teacherName,
      studentCount,
      maxStudents: info.SiSoToiDa ?? 0,
      startDate: toDateOnly(info.NgayBatDau),
      endDate: toDateOnly(info.NgayKetThuc),
      status: classStatus(info.TrangThai),
    });
  }
  // LINQ OrderBy on dinh, so sanh chuoi theo culture (InvariantCulture tren server .NET).
  classes.sort((a, b) => compareInvariant(a.classCode, b.classCode));
  return { classes };
}

export async function getStudentClassDetail(classId: string, studentId: string): Promise<HttpResult> {
  const studentInClass = await prisma.hocsinhlophoc.findFirst({ where: { MaHocSinh: studentId, MaLopHoc: classId, ...activeEnrollment } });
  if (!studentInClass) return { status: 403 };

  const classInfo = await prisma.lophoc.findFirst({
    where: { MaLopHoc: classId, ...notDeleted },
    include: { giangvienlophoc: allTeacherLinks },
  });
  if (!classInfo) return { status: 404, body: { message: 'Không tìm thấy lớp học.' } };

  // Select(HoTen).Distinct() -> SELECT DISTINCT tren MySQL, giu thu tu MySQL tra ve.
  const nameRows = await prisma.$queryRaw<Array<{ HoTen: string }>>`
    SELECT DISTINCT n.HoTen
    FROM hocsinhlophoc AS h
    INNER JOIN hocsinh AS h0 ON h.MaHocSinh = h0.MaHocSinh
    INNER JOIN nguoidung AS n ON h0.MaNguoiDung = n.MaNguoiDung
    WHERE h.MaLopHoc = ${classId} AND (h.DaXoa IS NULL OR h.DaXoa = FALSE) AND (h.TrangThai IS NULL OR h.TrangThai = TRUE)`;

  const from = today();
  const to = addDays(from, 7);
  const upcoming = await prisma.buoihoc.findMany({
    where: { MaLopHoc: classId, ...notDeleted, NgayHoc: { gte: from, lte: to } },
    include: { phonghoc: true },
    orderBy: [{ NgayHoc: 'asc' }, { MaTietBatDau: 'asc' }],
  });

  const teacher = firstActiveTeacher(classInfo.giangvienlophoc);
  const teacherName = teacher?.giangvien?.nguoidung?.HoTen ?? 'Chưa phân công';
  const studentCount = await countActiveStudents(classId);

  return {
    status: 200,
    body: {
      id: lg(classInfo.MaLopHoc),
      classCode: classInfo.TenLop,
      className: classInfo.TenLop,
      teacher: teacherName,
      teacherId: lg(teacher?.MaGiangVien) ?? null,
      studentCount,
      maxStudents: classInfo.SiSoToiDa ?? 0,
      startDate: toDateOnly(classInfo.NgayBatDau),
      endDate: toDateOnly(classInfo.NgayKetThuc),
      status: classStatus(classInfo.TrangThai),
      description: null,
      studentNames: nameRows.map((r) => r.HoTen),
      upcomingSchedules: upcoming.map((s) => ({ ...studentScheduleItem(s, classInfo.TenLop, teacherName, 0), subject: s.TieuDe ?? classInfo.TenLop })),
    },
  };
}

export async function getStudentBoard(weekStartParam: Date | null, studentId: string) {
  const monday = getWeekStart(weekStartParam ? dateOnly(weekStartParam) : today());
  const weekEnd = addDays(monday, 6);

  const classIds = [
    ...new Set(
      (await prisma.hocsinhlophoc.findMany({ where: { MaHocSinh: studentId, ...activeEnrollment }, select: { MaLopHoc: true } })).map((h) => h.MaLopHoc),
    ),
  ];

  const scheduleRows = classIds.length
    ? await prisma.buoihoc.findMany({
        where: { ...notDeleted, NgayHoc: { gte: monday, lte: weekEnd }, MaLopHoc: { in: classIds } },
        include: { lophoc: { include: { giangvienlophoc: allTeacherLinks } }, phonghoc: true },
        orderBy: [{ NgayHoc: 'asc' }, { MaTietBatDau: 'asc' }, { MaBuoiHoc: 'asc' }],
      })
    : [];

  const schedules = scheduleRows.map((row) => {
    const teacherName = firstActiveTeacher(row.lophoc?.giangvienlophoc)?.giangvien?.nguoidung?.HoTen ?? 'Chưa phân công';
    return studentScheduleItem(row, row.lophoc?.TenLop, teacherName, getDayIndex(monday, row.NgayHoc));
  });

  return { weekStart: monday, schedules };
}

export async function getParentBoard(weekStartParam: Date | null, parentId: string) {
  const monday = getWeekStart(weekStartParam ? dateOnly(weekStartParam) : today());
  const weekEnd = addDays(monday, 6);

  const parentStudents = [
    ...new Set(
      (await prisma.phuhuynhhocsinh.findMany({ where: { MaPhuHuynh: parentId, ...activeLink }, select: { MaHocSinh: true } })).map((p) => p.MaHocSinh),
    ),
  ];
  if (parentStudents.length === 0) return { weekStart: monday, schedules: [] };

  const studentClasses = await prisma.hocsinhlophoc.findMany({
    where: { MaHocSinh: { in: parentStudents }, ...activeEnrollment },
    include: { hocsinh: { include: { nguoidung: { select: { HoTen: true } } } } },
    orderBy: [{ MaHocSinh: 'asc' }, { MaLopHoc: 'asc' }],
  });

  const namedStudents = await prisma.hocsinh.findMany({
    where: { MaHocSinh: { in: parentStudents }, ...activeLink },
    select: { MaHocSinh: true, nguoidung: { select: { HoTen: true, TenDangNhap: true } } },
  });
  const studentNamesById = new Map(
    namedStudents.map((x) => [
      lg(x.MaHocSinh),
      x.nguoidung.HoTen?.trim() ? x.nguoidung.HoTen : x.nguoidung.TenDangNhap?.trim() ? x.nguoidung.TenDangNhap : lg(x.MaHocSinh),
    ]),
  );

  const classIds = [...new Set(studentClasses.map((h) => h.MaLopHoc))];
  const scheduleRows = classIds.length
    ? await prisma.buoihoc.findMany({
        where: { ...notDeleted, NgayHoc: { gte: monday, lte: weekEnd }, MaLopHoc: { in: classIds } },
        include: { lophoc: { include: { giangvienlophoc: allTeacherLinks } }, phonghoc: true },
        orderBy: [{ NgayHoc: 'asc' }, { MaTietBatDau: 'asc' }, { MaBuoiHoc: 'asc' }],
      })
    : [];

  const schedules = [];
  for (const schedule of scheduleRows) {
    const studentsInClass = studentClasses.filter((h) => lg(h.MaLopHoc) === lg(schedule.MaLopHoc));
    const teacherName = firstActiveTeacher(schedule.lophoc?.giangvienlophoc)?.giangvien?.nguoidung?.HoTen ?? 'Chưa phân công';
    for (const sc of studentsInClass) {
      const studentName = studentNamesById.get(lg(sc.MaHocSinh)) ?? sc.hocsinh?.nguoidung?.HoTen ?? lg(sc.MaHocSinh);
      const base = studentScheduleItem(schedule, schedule.lophoc?.TenLop, teacherName, getDayIndex(monday, schedule.NgayHoc));
      schedules.push({ id: base.id, studentId: lg(sc.MaHocSinh), studentName, ...omitId(base) });
    }
  }
  return { weekStart: monday, schedules };
}

function omitId<T extends { id: unknown }>(o: T): Omit<T, 'id'> {
  const { id: _id, ...rest } = o;
  return rest;
}

function dateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// ---------------------------------------------------------------------------------------
// Phong hoc
// ---------------------------------------------------------------------------------------

export async function getRooms() {
  const rooms = await prisma.phonghoc.findMany({ where: notDeleted, orderBy: { TenPhong: 'asc' } });
  return rooms.map((x) => ({ id: lg(x.MaPhongHoc), tenPhong: x.TenPhong, sucChua: x.SucChua ?? null, active: x.TrangThai ?? null }));
}

export async function findActiveRoom(id: string) {
  const room = await prisma.phonghoc.findUnique({ where: { MaPhongHoc: id } });
  return room && room.DaXoa !== true ? room : null;
}

/** available-rooms: KHONG loc DaXoa (ca buoi hoc lan phong) - giu nguyen ban .NET. */
export async function getAvailableRooms(date: Date | null, start: number, end: number) {
  const overlapping = date
    ? await prisma.buoihoc.findMany({
        where: { NgayHoc: date, MaTietBatDau: { lte: end }, MaTietKetThuc: { gte: start } },
        select: { MaLopHoc: true, MaPhongHoc: true },
      })
    : [];
  const busyRoomIds = [...new Set(overlapping.filter((b) => b.MaPhongHoc !== null).map((b) => b.MaPhongHoc!))];
  const rows = busyRoomIds.length
    ? await prisma.$queryRaw<Array<{ MaPhongHoc: string; TenPhong: string }>>`
        SELECT p.MaPhongHoc, p.TenPhong FROM phonghoc AS p WHERE p.MaPhongHoc NOT IN (${Prisma.join(busyRoomIds)})`
    : await prisma.$queryRaw<Array<{ MaPhongHoc: string; TenPhong: string }>>`SELECT p.MaPhongHoc, p.TenPhong FROM phonghoc AS p`;
  return rows.map((r) => ({ maPhongHoc: lg(r.MaPhongHoc), tenPhong: r.TenPhong }));
}

export async function getAvailableTeachers(date: Date | null, start: number, end: number) {
  const overlapping = date
    ? await prisma.buoihoc.findMany({
        where: { NgayHoc: date, MaTietBatDau: { lte: end }, MaTietKetThuc: { gte: start } },
        select: { MaLopHoc: true },
      })
    : [];
  const classIds = [...new Set(overlapping.map((b) => b.MaLopHoc))];
  const busy = classIds.length
    ? [...new Set((await prisma.giangvienlophoc.findMany({ where: { MaLopHoc: { in: classIds } }, select: { MaGiangVien: true } })).map((g) => g.MaGiangVien))]
    : [];
  const rows = busy.length
    ? await prisma.$queryRaw<Array<{ MaGiangVien: string; MaNguoiDung: string }>>`
        SELECT g.MaGiangVien, g.MaNguoiDung FROM giangvien AS g WHERE g.MaGiangVien NOT IN (${Prisma.join(busy)})`
    : await prisma.$queryRaw<Array<{ MaGiangVien: string; MaNguoiDung: string }>>`SELECT g.MaGiangVien, g.MaNguoiDung FROM giangvien AS g`;
  return rows.map((t) => ({ maGiangVien: lg(t.MaGiangVien), maNguoiDung: lg(t.MaNguoiDung) }));
}
