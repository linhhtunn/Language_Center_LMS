import { prisma } from '../../db.js';
import {
  activeEnrollment,
  activeStudentCount,
  attendanceCodesForClasses,
  attendedRate,
  calculateAttendanceRate,
  calculateScoreDistribution,
  emptyAttendanceRate,
  emptyScoreDistribution,
  notDeleted,
  scoresForClasses,
  type AttendanceRateDto,
  type ClassSizeDto,
  type ScoreDistributionDto,
} from './reports.common.js';
import { average, csvQuote, dotnetRound, fmtDouble, NL } from './reports.dotnet.js';

// Bao cao tong quan Admin / Giao vien va file CSV tuong ung (ReportsService.cs).

export interface BaseOverviewReportDto {
  totalStudents: number;
  totalClasses: number;
  attendanceRate: AttendanceRateDto;
  scoreDistribution: ScoreDistributionDto;
  classSizes: ClassSizeDto[];
}

export interface AdminOverviewReportDto extends BaseOverviewReportDto {
  totalTeachers: number;
  totalCourses: number;
}

const emptyBase = (): BaseOverviewReportDto => ({
  totalStudents: 0,
  totalClasses: 0,
  attendanceRate: emptyAttendanceRate(),
  scoreDistribution: emptyScoreDistribution(),
  classSizes: [],
});

/** Quy mo tung lop: TenLop, so HS dang hoc (subquery COUNT), SiSoToiDa ?? 0. */
async function classSizes(where: object): Promise<ClassSizeDto[]> {
  const classes = await prisma.lophoc.findMany({ where, select: { MaLopHoc: true, TenLop: true, SiSoToiDa: true } });
  const out: ClassSizeDto[] = [];
  for (const c of classes) {
    out.push({ className: c.TenLop, studentCount: await activeStudentCount(c.MaLopHoc), capacity: c.SiSoToiDa ?? 0 });
  }
  return out;
}

/** FillBaseOverviewReportAsync. limitClassIds = null -> toan trung tam (Admin). */
async function fillBaseOverviewReport(report: BaseOverviewReportDto, limitClassIds: string[] | null): Promise<void> {
  if (limitClassIds !== null) {
    if (limitClassIds.length === 0) return;
    report.totalClasses = limitClassIds.length;

    const students = await prisma.hocsinhlophoc.findMany({
      where: { MaLopHoc: { in: limitClassIds }, ...activeEnrollment },
      select: { MaHocSinh: true },
      distinct: ['MaHocSinh'],
    });
    report.totalStudents = students.length;

    report.attendanceRate = calculateAttendanceRate(await attendanceCodesForClasses(limitClassIds));
    report.scoreDistribution = calculateScoreDistribution(await scoresForClasses(limitClassIds));
    report.classSizes = await classSizes({ MaLopHoc: { in: limitClassIds }, ...notDeleted });
  } else {
    report.totalClasses = await prisma.lophoc.count({ where: notDeleted });
    report.totalStudents = await prisma.hocsinh.count({ where: notDeleted });

    const att = await prisma.diemdanh.findMany({
      where: notDeleted,
      select: { chitietdanhmuc: { select: { MaCode: true } } },
    });
    report.attendanceRate = calculateAttendanceRate(att.map((r) => r.chitietdanhmuc?.MaCode ?? null));

    const scores = await prisma.nopbai.findMany({ where: { ...notDeleted, DiemSo: { not: null } }, select: { DiemSo: true } });
    report.scoreDistribution = calculateScoreDistribution(scores.map((s) => s.DiemSo!.toNumber()));

    report.classSizes = await classSizes(notDeleted);
  }
}

export async function getAdminOverview(): Promise<AdminOverviewReportDto> {
  const base = emptyBase();
  await fillBaseOverviewReport(base, null);
  // Thu tu thuoc tinh giong .NET: thuoc tinh lop con (TotalTeachers, TotalCourses) dung truoc.
  const report: AdminOverviewReportDto = {
    totalTeachers: await prisma.giangvien.count({ where: notDeleted }),
    totalCourses: await prisma.khoahoc.count({ where: notDeleted }),
    ...base,
  };

  // Ban .NET: he thong rong -> BIA 1048 HS / 24 lop / 12 GV / 10 khoa + chuyen can, pho diem, si so lop mau;
  // co lop nhung classSizes rong -> bia si so "Lop 1..n". Ban Node tra dung so thuc (0 / mang rong).
  return report;
}

export async function getTeacherOverview(teacherProfileId: string): Promise<BaseOverviewReportDto> {
  const links = await prisma.giangvienlophoc.findMany({
    where: { MaGiangVien: teacherProfileId, ...notDeleted },
    select: { MaLopHoc: true },
  });
  const report = emptyBase();
  if (links.length > 0) await fillBaseOverviewReport(report, links.map((l) => l.MaLopHoc));
  return report;
}

/** Dong CSV cho 1 lop: Ten, si so hien tai, si so toi da, ty le chuyen can, diem TB. */
async function classCsvLine(c: { MaLopHoc: string; TenLop: string; SiSoToiDa: number | null }): Promise<string> {
  const attRate = attendedRate(await attendanceCodesForClasses([c.MaLopHoc]), 0);
  const scores = await scoresForClasses([c.MaLopHoc]);
  const avgScore = scores.length > 0 ? dotnetRound(average(scores), 2) : 0;
  const currentStudents = await activeStudentCount(c.MaLopHoc);
  return `${csvQuote(c.TenLop)},${currentStudents},${c.SiSoToiDa ?? 0},${fmtDouble(attRate)},${fmtDouble(avgScore)}${NL}`;
}

export async function exportAdminReportCsv(): Promise<string> {
  let sb = '﻿';
  sb += `DANH SÁCH LỚP HỌC VÀ THỐNG KÊ CHI TIẾT${NL}`;
  sb += `Tên Lớp,Sĩ Số Hiện Tại,Sĩ Số Tối Đa,Tỷ Lệ Chuyên Cần (%),Điểm Trung Bình${NL}`;
  const classes = await prisma.lophoc.findMany({ where: notDeleted, select: { MaLopHoc: true, TenLop: true, SiSoToiDa: true } });
  for (const c of classes) sb += await classCsvLine(c);
  return sb;
}

export async function exportTeacherOverviewCsv(teacherProfileId: string): Promise<string> {
  let sb = '﻿';
  sb += `DANH SÁCH LỚP PHỤ TRÁCH VÀ THỐNG KÊ CHI TIẾT${NL}`;
  sb += `Tên Lớp,Sĩ Số Hiện Tại,Sĩ Số Tối Đa,Tỷ Lệ Chuyên Cần (%),Điểm Trung Bình${NL}`;
  const links = await prisma.giangvienlophoc.findMany({
    where: { MaGiangVien: teacherProfileId, ...notDeleted },
    select: { MaLopHoc: true },
  });
  if (links.length === 0) return sb;
  const classes = await prisma.lophoc.findMany({
    where: { MaLopHoc: { in: links.map((l) => l.MaLopHoc) }, ...notDeleted },
    select: { MaLopHoc: true, TenLop: true, SiSoToiDa: true },
  });
  for (const c of classes) sb += await classCsvLine(c);
  return sb;
}
