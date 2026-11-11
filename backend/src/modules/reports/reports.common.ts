import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { average, dotnetRound } from './reports.dotnet.js';

// Phan dung chung cua ReportsService.cs: DTO chuyen can / pho diem.

/** `x.DaXoa != true` cua EF; Pomelo dich thanh `(DaXoa = FALSE) OR (DaXoa IS NULL)` - giu dung thu tu/dang de MySQL chon cung ke hoach (thu tu dong tra ve). */
export const notDeleted = { OR: [{ DaXoa: false }, { DaXoa: null }] };
/** `x.TrangThai != false`. */
export const notInactive = { OR: [{ TrangThai: true }, { TrangThai: null }] };
/** Ca hai dieu kien tren (dung cho hocsinhlophoc). */
export const activeEnrollment = { AND: [notDeleted, notInactive] };

export interface AttendanceRateDto {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  presentPercent: number;
}

export interface ScoreDistributionDto {
  under5: number;
  from5To7: number;
  from7To85: number;
  above85: number;
  total: number;
  averageScore: number;
}

export interface ClassSizeDto {
  className: string;
  studentCount: number;
  capacity: number;
}

/** PresentPercent la thuoc tinh tinh toan cua AttendanceRateDto - van duoc ghi ra JSON. */
export function presentPercent(a: { present: number; late: number; total: number }): number {
  return a.total > 0 ? dotnetRound(((a.present + a.late) / a.total) * 100, 2) : 0;
}

export function makeAttendanceRate(present: number, absent: number, late: number, excused: number, total: number): AttendanceRateDto {
  return { present, absent, late, excused, total, presentPercent: presentPercent({ present, late, total }) };
}

export const emptyAttendanceRate = (): AttendanceRateDto => makeAttendanceRate(0, 0, 0, 0, 0);

export const emptyScoreDistribution = (): ScoreDistributionDto => ({
  under5: 0,
  from5To7: 0,
  from7To85: 0,
  above85: 0,
  total: 0,
  averageScore: 0,
});

/**
 * CalculateScoreDistribution. Ban .NET: danh sach rong -> BIA so lieu mau (seeded) nhu that.
 * Ban Node: rong -> toan so 0 (total = 0 nghia la chua co du lieu).
 */
export function calculateScoreDistribution(scores: number[]): ScoreDistributionDto {
  if (scores.length === 0) return emptyScoreDistribution();
  return {
    under5: scores.filter((s) => s < 5.0).length,
    from5To7: scores.filter((s) => s >= 5.0 && s < 7.0).length,
    from7To85: scores.filter((s) => s >= 7.0 && s < 8.5).length,
    above85: scores.filter((s) => s >= 8.5).length,
    total: scores.length,
    averageScore: dotnetRound(average(scores), 2),
  };
}

/** CalculateAttendanceRate: nhan danh sach MaCode trang thai (null neu ban ghi khong co trang thai). */
export function calculateAttendanceRate(codes: (string | null)[]): AttendanceRateDto {
  if (codes.length === 0) return emptyAttendanceRate(); // ban .NET: bia so lieu mau
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;
  for (const code of codes) {
    if (code === 'DD_PRESENT') present++;
    else if (code === 'DD_ABSENT') absent++;
    else if (code === 'DD_LATE') late++;
    else if (code === 'DD_EXCUSED') excused++;
  }
  return makeAttendanceRate(present, absent, late, excused, codes.length);
}

/** (Present + Late) / Total * 100, lam tron 2 so; khong co ban ghi -> `whenEmpty`. */
export function attendedRate(codes: (string | null)[], whenEmpty: number): number {
  const total = codes.length;
  const attended = codes.filter((c) => c === 'DD_PRESENT' || c === 'DD_LATE').length;
  return total > 0 ? dotnetRound((attended / total) * 100, 2) : whenEmpty;
}

/** Decimal(5,2) cua Prisma -> double ((double)decimal ben C#). */
export const toDouble = (d: Prisma.Decimal | number) => (typeof d === 'number' ? d : d.toNumber());

/** Danh sach MaCode cua cac ban ghi diem danh (diemdanh JOIN buoihoc) thuoc cac lop cho truoc. */
export async function attendanceCodesForClasses(classIds: string[]): Promise<(string | null)[]> {
  if (classIds.length === 0) return [];
  const rows = await prisma.diemdanh.findMany({
    where: { ...notDeleted, buoihoc: { MaLopHoc: { in: classIds } } },
    select: { chitietdanhmuc: { select: { MaCode: true } } },
  });
  return rows.map((r) => r.chitietdanhmuc?.MaCode ?? null);
}

/** Diem cac bai nop (DiemSo != null, chua xoa) thuoc su kien cua cac lop cho truoc. */
export async function scoresForClasses(classIds: string[]): Promise<number[]> {
  if (classIds.length === 0) return [];
  const rows = await prisma.nopbai.findMany({
    where: { ...notDeleted, DiemSo: { not: null }, sukienlophoc: { MaLopHoc: { in: classIds } } },
    select: { DiemSo: true },
  });
  return rows.map((r) => toDouble(r.DiemSo!));
}

/** So hoc sinh dang hoc trong lop (hocsinhlophoc chua xoa va TrangThai != false). */
export async function activeStudentCount(classId: string): Promise<number> {
  return prisma.hocsinhlophoc.count({ where: { MaLopHoc: classId, ...activeEnrollment } });
}

// ---------- SELECT du cot nhu EF ----------
// Thu tu dong MySQL tra ve (khi khong ORDER BY) phu thuoc ke hoach thuc thi, ma ke hoach lai phu thuoc
// cot duoc SELECT (chi lay vai cot -> MySQL co the doc index phu "covering index" -> thu tu khac).
// EF luon SELECT moi cot cua cac bang trong Include, nen cac cau raw trong module lam y het.
const COLUMNS = {
  hocsinhlophoc: ['MaLopHoc', 'MaHocSinh', 'DaXoa', 'MaTrangThai', 'NgayRoiLop', 'NgayThamGia', 'NguoiSua', 'NguoiTao', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai'],
  hocsinh: ['MaHocSinh', 'DaXoa', 'MaNguoiDung', 'NgaySinh', 'NguoiSua', 'NguoiTao', 'QueQuan', 'SoDienThoaiNguoiThan', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai', 'TruongDangTheoHoc'],
  nguoidung: ['MaNguoiDung', 'AnhDaiDien', 'DaXacMinhEmail', 'DaXoa', 'Email', 'HoTen', 'LanCuoiDangNhap', 'LoaiTaiKhoan', 'MaTrangThai', 'MatKhauHash', 'NguoiSua', 'NguoiTao', 'TenDangNhap', 'ThoiGianSua', 'ThoiGianTao', 'TokenXacMinh', 'TrangThai'],
  lophoc: ['MaLopHoc', 'DaXoa', 'MaTrangThai', 'NgayBatDau', 'NgayKetThuc', 'NguoiSua', 'NguoiTao', 'SiSoHienTai', 'SiSoToiDa', 'TenLop', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai'],
  chitietkhoahoc_lophoc: ['MaKhoaHoc', 'MaLopHoc', 'DaXoa', 'GhiChu', 'NguoiSua', 'NguoiTao', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai'],
  khoahoc: ['MaKhoaHoc', 'DaXoa', 'GiaCoBan', 'MaTrangThai', 'MoTa', 'NguoiSua', 'NguoiTao', 'TenKhoaHoc', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai'],
  nopbai: ['MaNopBai', 'DaXoa', 'DiemSo', 'LanNop', 'MaHocSinh', 'MaSuKien', 'MaTrangThai', 'NguoiSua', 'NguoiTao', 'NhanXetGiaoVien', 'ThoiGianBatDau', 'ThoiGianNop', 'ThoiGianSua', 'ThoiGianTao', 'ThoiGianThucTe', 'TrangThai', 'TrangThaiChamBai'],
  sukienlophoc: ['MaSuKien', 'DaXoa', 'DangSuKien', 'HanNop', 'MaBaiTap', 'MaLopHoc', 'MaNguoiDung', 'MaTrangThai', 'NguoiSua', 'NguoiTao', 'NoiDung', 'ThoiGianSua', 'ThoiGianTao', 'TrangThai'],
} as const;

/** Danh sach cot dang `a`.`Cot` AS `a_Cot` cho cac cap [bang, bi danh]. */
export function efColumns(...tables: [keyof typeof COLUMNS, string][]): Prisma.Sql {
  const parts = tables.flatMap(([table, alias]) => COLUMNS[table].map((c) => `\`${alias}\`.\`${c}\` AS \`${alias}_${c}\``));
  return Prisma.raw(parts.join(', '));
}
