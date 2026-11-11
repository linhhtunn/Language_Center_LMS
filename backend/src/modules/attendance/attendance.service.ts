import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { toDateOnly } from '../../utils/dotnetCompat.js';
import { formatDate } from '../schedule/dotnetBinding.js';

// Chuyen tu Controllers/AttendanceController.cs (phan truy van) + Services/AdminAttendanceService.cs.

const lg = (s: string) => s.toLowerCase();
/** x.DaXoa != true */
const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };
/** x.DaXoa != true && x.TrangThai != false */
const active = { AND: [{ OR: [{ DaXoa: null }, { DaXoa: false }] }, { OR: [{ TrangThai: null }, { TrangThai: true }] }] };

/** StatusMap (StringComparer.OrdinalIgnoreCase) - thu tu chen giu nguyen ban .NET. */
const STATUS_MAP: Array<[string, string, string]> = [
  ['present', 'DD_PRESENT', 'Co mat'],
  ['co_mat', 'DD_PRESENT', 'Co mat'],
  ['absent', 'DD_ABSENT', 'Vang'],
  ['vang', 'DD_ABSENT', 'Vang'],
  ['late', 'DD_LATE', 'Di muon'],
  ['di_muon', 'DD_LATE', 'Di muon'],
  ['excused', 'DD_EXCUSED', 'Co phep'],
  ['co_phep', 'DD_EXCUSED', 'Co phep'],
];

const REQUIRED_STATUSES = STATUS_MAP.filter(([, code], i) => STATUS_MAP.findIndex(([, c]) => c === code) === i).map(([, code, label]) => ({ code, label }));
const STATUS_CODES = REQUIRED_STATUSES.map((s) => s.code);

export function tryNormalizeStatus(status: string | null | undefined): string | null {
  const key = (status ?? '').trim().toLowerCase();
  return STATUS_MAP.find(([k]) => k === key)?.[1] ?? null;
}

function codeToPublicStatus(code: string): string {
  switch (code) {
    case 'DD_PRESENT': return 'present';
    case 'DD_ABSENT': return 'absent';
    case 'DD_LATE': return 'late';
    case 'DD_EXCUSED': return 'excused';
    default: return 'unknown';
  }
}

/** MaChiTiet -> (status, label) cho moi chi tiet danh muc co MaCode la ma diem danh (khong loc theo nhom). */
export async function getAttendanceStatusLookup(): Promise<Map<number, { status: string; label: string }>> {
  const rows = await prisma.chitietdanhmuc.findMany({
    where: { MaCode: { in: STATUS_CODES } },
    select: { MaChiTiet: true, MaCode: true, TenChiTiet: true },
  });
  return new Map(rows.map((r) => [r.MaChiTiet, { status: codeToPublicStatus(r.MaCode!), label: r.TenChiTiet }]));
}

/** Tao nhom DIEM_DANH_STATUS + cac trang thai con thieu, tra ve MaCode -> MaChiTiet. */
export async function ensureAttendanceStatusIds(): Promise<Map<string, number>> {
  let group = await prisma.nhomdanhmuc.findFirst({ where: { MaCode: 'DIEM_DANH_STATUS' } });
  if (!group) {
    group = await prisma.nhomdanhmuc.create({
      data: { MaCode: 'DIEM_DANH_STATUS', TenNhom: 'Trang thai diem danh', TrangThai: true, DaXoa: false, ThoiGianTao: new Date() },
    });
  }
  const existing = await prisma.chitietdanhmuc.findMany({
    where: { MaNhom: group.MaNhom, MaCode: { in: STATUS_CODES } },
    select: { MaCode: true },
  });
  const missing = REQUIRED_STATUSES.filter((r) => existing.every((x) => x.MaCode !== r.code));
  // Them tung dong theo thu tu (giu thu tu MaChiTiet tu tang giong EF).
  for (const s of missing) {
    await prisma.chitietdanhmuc.create({
      data: { MaNhom: group.MaNhom, MaCode: s.code, TenChiTiet: s.label, TrangThai: true, DaXoa: false, ThoiGianTao: new Date() },
    });
  }
  const rows = await prisma.chitietdanhmuc.findMany({
    where: { MaNhom: group.MaNhom, MaCode: { in: STATUS_CODES } },
    select: { MaChiTiet: true, MaCode: true },
  });
  return new Map(rows.map((r) => [r.MaCode!, r.MaChiTiet]));
}

export async function sessionBelongsToClass(classId: string, sessionId: string): Promise<boolean> {
  return (await prisma.buoihoc.count({ where: { MaBuoiHoc: sessionId, MaLopHoc: classId, ...notDeleted } })) > 0;
}

export async function teacherCanAccessClass(classId: string, teacherId: string): Promise<boolean> {
  return (await prisma.giangvienlophoc.count({ where: { MaLopHoc: classId, MaGiangVien: teacherId, ...active } })) > 0;
}

export async function getClassSessionAttendance(classId: string, sessionId: string) {
  const statusLookup = await getAttendanceStatusLookup();
  // OrderBy(HoTen) tren MySQL - dung SQL cung dang voi EF de thu tu dong hang giong nhau.
  const students = await prisma.$queryRaw<Array<{ MaHocSinh: string; HoTen: string }>>`
    SELECT h.MaHocSinh, n.HoTen
    FROM hocsinhlophoc AS h
    INNER JOIN hocsinh AS h0 ON h.MaHocSinh = h0.MaHocSinh
    INNER JOIN nguoidung AS n ON h0.MaNguoiDung = n.MaNguoiDung
    WHERE h.MaLopHoc = ${classId} AND (h.DaXoa <> TRUE OR h.DaXoa IS NULL) AND (h.TrangThai <> FALSE OR h.TrangThai IS NULL)
    ORDER BY n.HoTen`;

  const attendanceRows = await prisma.diemdanh.findMany({ where: { MaBuoiHoc: sessionId, ...notDeleted } });
  const attendance = new Map(attendanceRows.map((r) => [lg(r.MaHocSinh), r]));

  return students.map((enrollment) => {
    const row = attendance.get(lg(enrollment.MaHocSinh));
    const status = row?.MaTrangThai != null ? statusLookup.get(row.MaTrangThai) : undefined;
    return {
      studentId: lg(enrollment.MaHocSinh),
      studentName: enrollment.HoTen,
      status: status ? status.status : '',
      statusLabel: status ? status.label : 'Chua diem danh',
      note: row?.GhiChu ?? null,
      updatedAt: row?.ThoiGianSua ?? row?.ThoiGianTao ?? null,
    };
  });
}

export interface AttendanceItemInput {
  studentId: string;
  status: string;
  note: string | null;
}

export type SaveResult = { ok: true; count: number } | { ok: false; message: string; code: string };

export async function saveClassSessionAttendance(classId: string, sessionId: string, items: AttendanceItemInput[]): Promise<SaveResult> {
  if (items.length === 0) return { ok: false, message: 'Danh sach diem danh khong duoc de trong.', code: 'ATTENDANCE_EMPTY' };

  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.studentId)) return { ok: false, message: 'Khong duoc gui trung hoc sinh trong cung request.', code: 'ATTENDANCE_DUPLICATE_STUDENT' };
    seen.add(item.studentId);
  }

  const enrolled = new Set(
    (await prisma.hocsinhlophoc.findMany({ where: { MaLopHoc: classId, ...active }, select: { MaHocSinh: true } })).map((x) => lg(x.MaHocSinh)),
  );
  if (items.some((x) => !enrolled.has(x.studentId))) {
    return { ok: false, message: 'Hoc sinh khong thuoc lop nay.', code: 'ATTENDANCE_STUDENT_NOT_IN_CLASS' };
  }

  // Ban .NET luu nhom/trang thai (SaveChanges rieng) truoc khi kiem tra tung trang thai.
  const statusIds = await ensureAttendanceStatusIds();
  const existingRows = new Map(
    (await prisma.diemdanh.findMany({ where: { MaBuoiHoc: sessionId, MaHocSinh: { in: items.map((i) => i.studentId) } } })).map((r) => [
      lg(r.MaHocSinh),
      r,
    ]),
  );

  // Vong lap .NET return ngay o trang thai sai dau tien -> khong SaveChanges gi ca.
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const item of items) {
    const normalized = tryNormalizeStatus(item.status);
    if (!normalized) return { ok: false, message: `Trang thai diem danh khong hop le: ${item.status}`, code: 'ATTENDANCE_INVALID_STATUS' };
    const statusId = statusIds.get(normalized)!;
    const note = item.note === null ? null : item.note.trim();
    const row = existingRows.get(item.studentId);
    if (row) {
      ops.push(
        prisma.diemdanh.update({
          where: { MaBuoiHoc_MaHocSinh: { MaBuoiHoc: row.MaBuoiHoc, MaHocSinh: row.MaHocSinh } },
          data: { MaTrangThai: statusId, GhiChu: note, DaXoa: false, TrangThai: true, ThoiGianSua: new Date() },
        }),
      );
    } else {
      ops.push(
        prisma.diemdanh.create({
          data: { MaBuoiHoc: sessionId, MaHocSinh: item.studentId, MaTrangThai: statusId, GhiChu: note, TrangThai: true, DaXoa: false, ThoiGianTao: new Date() },
        }),
      );
    }
  }
  await prisma.$transaction(ops);
  return { ok: true, count: items.length };
}

interface AttendanceListRow {
  MaHocSinh: string;
  MaBuoiHoc: string;
  MaTrangThai: number | null;
  GhiChu: string | null;
  HoTen: string;
  MaLopHoc: string;
  NgayHoc: Date;
  TenLop: string;
}

function mapChildAttendance(rows: AttendanceListRow[], statusLookup: Map<number, { status: string; label: string }>) {
  return rows.map((row) => {
    const status = (row.MaTrangThai !== null ? statusLookup.get(Number(row.MaTrangThai)) : undefined) ?? { status: 'unknown', label: 'Khong ro' };
    return {
      studentId: lg(row.MaHocSinh),
      studentName: row.HoTen,
      classId: lg(row.MaLopHoc),
      className: row.TenLop,
      sessionId: lg(row.MaBuoiHoc),
      sessionDate: toDateOnly(row.NgayHoc),
      status: status.status,
      statusLabel: status.label,
      note: row.GhiChu ?? null,
    };
  });
}

export async function findParentProfile(parentUserId: string) {
  return prisma.phuhuynh.findFirst({ where: { MaNguoiDung: parentUserId, ...notDeleted } });
}

export async function getParentChildrenAttendance(maPhuHuynh: string) {
  const childIds = (await prisma.phuhuynhhocsinh.findMany({ where: { MaPhuHuynh: maPhuHuynh, ...active }, select: { MaHocSinh: true } })).map(
    (x) => x.MaHocSinh,
  );
  const statusLookup = await getAttendanceStatusLookup();
  if (childIds.length === 0) return [];
  const rows = await prisma.$queryRaw<AttendanceListRow[]>`
    SELECT d.MaHocSinh, d.MaBuoiHoc, d.MaTrangThai, d.GhiChu, n.HoTen, b.MaLopHoc, b.NgayHoc, l.TenLop
    FROM diemdanh AS d
    INNER JOIN hocsinh AS h ON d.MaHocSinh = h.MaHocSinh
    INNER JOIN nguoidung AS n ON h.MaNguoiDung = n.MaNguoiDung
    INNER JOIN buoihoc AS b ON d.MaBuoiHoc = b.MaBuoiHoc
    INNER JOIN lophoc AS l ON b.MaLopHoc = l.MaLopHoc
    WHERE d.MaHocSinh IN (${Prisma.join(childIds)}) AND (d.DaXoa <> TRUE OR d.DaXoa IS NULL)
    ORDER BY b.NgayHoc DESC, n.HoTen`;
  return mapChildAttendance(rows, statusLookup);
}

export async function studentExists(studentId: string) {
  return (await prisma.hocsinh.count({ where: { MaHocSinh: studentId, ...notDeleted } })) > 0;
}

export async function getStudentAttendance(studentId: string) {
  const statusLookup = await getAttendanceStatusLookup();
  const rows = await prisma.$queryRaw<AttendanceListRow[]>`
    SELECT d.MaHocSinh, d.MaBuoiHoc, d.MaTrangThai, d.GhiChu, n.HoTen, b.MaLopHoc, b.NgayHoc, l.TenLop
    FROM diemdanh AS d
    INNER JOIN hocsinh AS h ON d.MaHocSinh = h.MaHocSinh
    INNER JOIN nguoidung AS n ON h.MaNguoiDung = n.MaNguoiDung
    INNER JOIN buoihoc AS b ON d.MaBuoiHoc = b.MaBuoiHoc
    INNER JOIN lophoc AS l ON b.MaLopHoc = l.MaLopHoc
    WHERE d.MaHocSinh = ${studentId} AND (d.DaXoa <> TRUE OR d.DaXoa IS NULL)
    ORDER BY b.NgayHoc DESC`;
  return mapChildAttendance(rows, statusLookup);
}

// =====================================================================================
// AdminAttendanceService.GetAllAttendanceSummariesAsync
// =====================================================================================

interface SummaryRow {
  MaBuoiHoc: string;
  MaLopHoc: string;
  TenLop: string;
  TenKhoaHoc: string;
  TeacherName: string;
  NgayHoc: Date;
  GioBatDau: Date | string;
  GioKetThuc: Date | string;
}

/** TimeOnly voi format "hh\:mm": "hh" la gio 12h (01-12) - giu nguyen hanh vi ban .NET. */
function formatTime12(t: Date | string): string {
  let h: number;
  let m: number;
  if (t instanceof Date) {
    h = t.getUTCHours();
    m = t.getUTCMinutes();
  } else {
    const p = /^(\d{1,2}):(\d{2})/.exec(t)!;
    h = +p[1];
    m = +p[2];
  }
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export async function getAllAttendanceSummaries(classCode: string | null, status: string | null, fromDate: Date | null, toDate: Date | null) {
  // 1a. So hoc sinh da co ban ghi diem danh theo buoi (DaXoa == false -> loai ca NULL).
  const present = new Map(
    (await prisma.diemdanh.groupBy({ by: ['MaBuoiHoc'], where: { DaXoa: false }, _count: { _all: true } })).map((g) => [lg(g.MaBuoiHoc), g._count._all]),
  );
  // 1b. Tong hoc sinh theo lop.
  const total = new Map(
    (await prisma.hocsinhlophoc.groupBy({ by: ['MaLopHoc'], where: { DaXoa: false }, _count: { _all: true } })).map((g) => [lg(g.MaLopHoc), g._count._all]),
  );

  const classFilter = classCode === null ? Prisma.sql`TRUE` : Prisma.sql`(LOCATE(${classCode}, l.TenLop) > 0)`;
  const fromFilter = fromDate === null ? Prisma.sql`TRUE` : Prisma.sql`b.NgayHoc >= ${fromDate}`;
  const toFilter = toDate === null ? Prisma.sql`TRUE` : Prisma.sql`b.NgayHoc <= ${toDate}`;

  const rows = await prisma.$queryRaw<SummaryRow[]>`
    SELECT b.MaBuoiHoc, l.MaLopHoc, l.TenLop,
      CASE WHEN k.MaKhoaHoc IS NOT NULL THEN k.TenKhoaHoc ELSE 'Chưa xác định' END AS TenKhoaHoc,
      CASE WHEN n.MaNguoiDung IS NOT NULL THEN n.HoTen ELSE 'Chưa phân công' END AS TeacherName,
      b.NgayHoc, t.GioBatDau, t0.GioKetThuc
    FROM buoihoc AS b
    INNER JOIN lophoc AS l ON b.MaLopHoc = l.MaLopHoc
    INNER JOIN tiethoc AS t ON b.MaTietBatDau = t.MaTiet
    INNER JOIN tiethoc AS t0 ON b.MaTietKetThuc = t0.MaTiet
    LEFT JOIN (SELECT c.MaKhoaHoc, c.MaLopHoc FROM chitietkhoahoc_lophoc AS c WHERE c.DaXoa = FALSE) AS c0 ON l.MaLopHoc = c0.MaLopHoc
    LEFT JOIN khoahoc AS k ON c0.MaKhoaHoc = k.MaKhoaHoc
    LEFT JOIN (SELECT g.MaLopHoc, g.MaGiangVien FROM giangvienlophoc AS g WHERE g.DaXoa = FALSE) AS g0 ON l.MaLopHoc = g0.MaLopHoc
    LEFT JOIN giangvien AS g1 ON g0.MaGiangVien = g1.MaGiangVien
    LEFT JOIN nguoidung AS n ON g1.MaNguoiDung = n.MaNguoiDung
    WHERE b.DaXoa = FALSE AND l.DaXoa = FALSE AND ${classFilter} AND ${fromFilter} AND ${toFilter}
    ORDER BY b.NgayHoc DESC, t.GioBatDau`;

  return rows
    .map((x) => {
      const p = present.get(lg(x.MaBuoiHoc)) ?? 0;
      const tot = total.get(lg(x.MaLopHoc)) ?? 0;
      return {
        id: lg(x.MaBuoiHoc),
        classCode: x.TenLop,
        courseName: x.TenKhoaHoc,
        teacher: x.TeacherName,
        date: formatDate(x.NgayHoc, 'dd/MM/yyyy'),
        time: `${formatTime12(x.GioBatDau)} - ${formatTime12(x.GioKetThuc)}`,
        present: p,
        total: tot,
        status: p > 0 ? 'Đã điểm danh' : 'Chưa điểm danh',
      };
    })
    .filter((x) => status === null || x.status === status);
}
