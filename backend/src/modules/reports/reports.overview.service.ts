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
  fallbackAttendanceRate,
  fallbackScoreDistribution,
  notDeleted,
  scoresForClasses,
  type AttendanceRateDto,
  type ClassSizeDto,
  type ScoreDistributionDto,
} from './reports.common.js';
import { average, csvQuote, dotnetRound, fmtDouble, NL, seededInt } from './reports.dotnet.js';

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

    const estimatedAttendance = Math.max(60, report.totalStudents * 10);
    const estimatedScores = Math.max(40, report.totalStudents * 4);
    const seedTag = `teacher-${limitClassIds.length}`;

    report.attendanceRate = calculateAttendanceRate(await attendanceCodesForClasses(limitClassIds), seedTag, estimatedAttendance);
    report.scoreDistribution = calculateScoreDistribution(await scoresForClasses(limitClassIds), seedTag, estimatedScores);
    report.classSizes = await classSizes({ MaLopHoc: { in: limitClassIds }, ...notDeleted });
  } else {
    report.totalClasses = await prisma.lophoc.count({ where: notDeleted });
    report.totalStudents = await prisma.hocsinh.count({ where: notDeleted });

    const estimatedAttendance = Math.max(120, report.totalStudents * Math.max(1, report.totalClasses) * 6);
    const estimatedScores = Math.max(80, report.totalStudents * 5);
    const seedTag = 'admin-overview';

    const att = await prisma.diemdanh.findMany({
      where: notDeleted,
      select: { chitietdanhmuc: { select: { MaCode: true } } },
    });
    report.attendanceRate = calculateAttendanceRate(
      att.map((r) => r.chitietdanhmuc?.MaCode ?? null),
      seedTag,
      estimatedAttendance,
    );

    const scores = await prisma.nopbai.findMany({ where: { ...notDeleted, DiemSo: { not: null } }, select: { DiemSo: true } });
    report.scoreDistribution = calculateScoreDistribution(
      scores.map((s) => s.DiemSo!.toNumber()),
      seedTag,
      estimatedScores,
    );

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

  const isEmptySystem =
    report.totalStudents === 0 &&
    report.totalClasses === 0 &&
    report.totalTeachers === 0 &&
    report.totalCourses === 0 &&
    report.classSizes.length === 0;
  if (isEmptySystem) {
    report.totalStudents = 1048;
    report.totalClasses = 24;
    report.totalTeachers = 12;
    report.totalCourses = 10;
    report.attendanceRate = fallbackAttendanceRate(14000, 'empty-universe');
    report.scoreDistribution = fallbackScoreDistribution(5200, 'empty-universe');
    const year = new Date().getFullYear();
    for (let i = 1; i <= 24; i++) {
      const cls = `LH_ENSEED_${String(i).padStart(2, '0')}`;
      // Ban goc dung chung seed "cls-gsize" cho moi lop nen si so 24 lop nhu nhau (giu nguyen).
      const size = seededInt('cls-gsize', 22, 42);
      const cap = seededInt(`${cls}-capacity`, 30, 45);
      report.classSizes.push({ className: `${cls}_${year}`, studentCount: size, capacity: cap });
    }
  } else if (report.classSizes.length === 0 && report.totalClasses > 0) {
    for (let i = 1; i <= report.totalClasses; i++) {
      const key = `fallback-size-${i}`;
      report.classSizes.push({
        className: `Lớp ${i}`,
        studentCount: seededInt(key, 20, 40),
        capacity: seededInt(`${key}-cap`, 30, 45),
      });
    }
  }
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
