import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import {
  activeEnrollment,
  attendedRate,
  calculateAttendanceRate,
  calculateScoreDistribution,
  efColumns,
  notDeleted,
  toDouble,
  type AttendanceRateDto,
  type ScoreDistributionDto,
} from './reports.common.js';
import { average, csvQuote, dotnetRound, fmtDateTime, fmtDouble, fmtF1, NL } from './reports.dotnet.js';

// Bao cao chi tiet 1 lop cua Giao vien + bao cao ca nhan cua Hoc sinh (ReportsService.cs).

/** UnauthorizedAccessException ben .NET -> controller tra Forbid() (403, body rong). */
export class ReportForbiddenError extends Error {}
/** KeyNotFoundException ben .NET -> roi vao catch(Exception) chung cua controller. */
export class ReportNotFoundError extends Error {}

export interface StudentReportItemDto {
  studentId: string;
  studentName: string;
  attendanceRate: number;
  averageScore: number;
  completedHomeworkCount: number;
  totalHomeworkCount: number;
}

export interface TeacherClassReportDto {
  classId: string;
  className: string;
  totalStudents: number;
  attendanceRate: AttendanceRateDto;
  scoreDistribution: ScoreDistributionDto;
  homeworkCompletionRate: number;
  students: StudentReportItemDto[];
}

export interface StudentScoreTrendDto {
  assignmentName: string;
  submitTime: Date | null;
  score: number | null;
  maxScore: number;
}

export interface StudentReportDto {
  studentId: string;
  studentName: string;
  attendanceRate: AttendanceRateDto;
  homeworkCompletionRate: number;
  scoreTrend: StudentScoreTrendDto[];
}

/**
 * Hoc sinh dang hoc trong lop kem ho ten - giong cau EF
 * Hocsinhlophocs.Where(..).Include(MaHocSinhNavigation).ThenInclude(MaNguoiDungNavigation):
 * INNER JOIN, khong ORDER BY (giu thu tu MySQL tra ve nhu ban .NET).
 */
export async function enrolledStudentsWithNames(classId: string): Promise<{ MaHocSinh: string; HoTen: string }[]> {
  const rows = await prisma.$queryRaw<{ h_MaHocSinh: string; n_HoTen: string }[]>(Prisma.sql`
    SELECT ${efColumns(['hocsinhlophoc', 'h'], ['hocsinh', 'h0'], ['nguoidung', 'n'])}
    FROM hocsinhlophoc AS h
    INNER JOIN hocsinh AS h0 ON h.MaHocSinh = h0.MaHocSinh
    INNER JOIN nguoidung AS n ON h0.MaNguoiDung = n.MaNguoiDung
    WHERE h.MaLopHoc = ${classId}
      AND ((h.DaXoa = FALSE) OR (h.DaXoa IS NULL))
      AND ((h.TrangThai = TRUE) OR (h.TrangThai IS NULL))`);
  return rows.map((r) => ({ MaHocSinh: r.h_MaHocSinh, HoTen: r.n_HoTen }));
}

async function assertTeacherAssigned(teacherProfileId: string, classId: string) {
  const assigned = await prisma.giangvienlophoc.count({
    where: { MaGiangVien: teacherProfileId, MaLopHoc: classId, ...notDeleted },
  });
  if (!assigned) throw new ReportForbiddenError('Giáo viên không được phân công dạy lớp này.');
}

export async function getTeacherClassOverview(teacherProfileId: string, classId: string): Promise<TeacherClassReportDto> {
  await assertTeacherAssigned(teacherProfileId, classId);

  const classEntity = await prisma.lophoc.findFirst({ where: { MaLopHoc: classId, ...notDeleted } });
  if (!classEntity) throw new ReportNotFoundError('Không tìm thấy lớp học.');

  const enrollments = await enrolledStudentsWithNames(classId);

  const attendanceRecords = await prisma.diemdanh.findMany({
    where: { ...notDeleted, buoihoc: { MaLopHoc: classId } },
    select: { MaHocSinh: true, chitietdanhmuc: { select: { MaCode: true } } },
  });

  const events = await prisma.sukienlophoc.findMany({
    where: { MaLopHoc: classId, MaBaiTap: { not: null }, ...notDeleted },
    select: { MaSuKien: true },
  });
  const eventIds = events.map((e) => e.MaSuKien);

  const submissions =
    eventIds.length > 0
      ? await prisma.nopbai.findMany({
          where: { MaSuKien: { in: eventIds }, ...notDeleted },
          select: { MaHocSinh: true, DiemSo: true, ThoiGianNop: true },
        })
      : [];

  const allCodes = attendanceRecords.map((a) => a.chitietdanhmuc?.MaCode ?? null);
  const classScores = submissions.filter((s) => s.DiemSo !== null).map((s) => s.DiemSo!.toNumber());

  const totalPossible = enrollments.length * events.length;
  const completed = submissions.filter((s) => s.ThoiGianNop !== null).length;

  const report: TeacherClassReportDto = {
    classId,
    className: classEntity.TenLop,
    totalStudents: enrollments.length,
    attendanceRate: calculateAttendanceRate(allCodes),
    scoreDistribution: calculateScoreDistribution(classScores),
    homeworkCompletionRate: totalPossible > 0 ? dotnetRound((completed / totalPossible) * 100, 2) : 0,
    students: [],
  };

  for (const e of enrollments) {
    const studentId = e.MaHocSinh;
    const codes = attendanceRecords.filter((a) => a.MaHocSinh === studentId).map((a) => a.chitietdanhmuc?.MaCode ?? null);
    const subs = submissions.filter((s) => s.MaHocSinh === studentId);
    const scores = subs.filter((s) => s.DiemSo !== null).map((s) => s.DiemSo!.toNumber());
    report.students.push({
      studentId,
      studentName: e.HoTen ?? 'Học sinh',
      attendanceRate: attendedRate(codes, 0),
      averageScore: scores.length > 0 ? dotnetRound(average(scores), 2) : 0,
      completedHomeworkCount: subs.filter((s) => s.ThoiGianNop !== null).length,
      totalHomeworkCount: events.length,
    });
  }
  return report;
}

export async function exportTeacherClassReportCsv(teacherProfileId: string, classId: string): Promise<string> {
  await assertTeacherAssigned(teacherProfileId, classId);
  const classEntity = await prisma.lophoc.findFirst({ where: { MaLopHoc: classId, ...notDeleted } });
  const overview = await getTeacherClassOverview(teacherProfileId, classId);

  let sb = '﻿';
  sb += `BÁO CÁO CHI TIẾT LỚP HỌC: ${classEntity?.TenLop ?? ''}${NL}`;
  sb += `Sĩ số: ${overview.totalStudents} học sinh${NL}`;
  sb += `Tỷ lệ hoàn thành bài tập chung: ${fmtDouble(overview.homeworkCompletionRate)}%${NL}`;
  sb += NL;
  sb += `Họ Tên Học Sinh,Tỷ Lệ Chuyên Cần (%),Điểm Trung Bình,Bài Tập Hoàn Thành,Tổng Số Bài Tập${NL}`;
  for (const s of overview.students) {
    sb += `${csvQuote(s.studentName)},${fmtDouble(s.attendanceRate)},${fmtDouble(s.averageScore)},${s.completedHomeworkCount},${s.totalHomeworkCount}${NL}`;
  }
  return sb;
}

async function findStudentWithName(studentProfileId: string) {
  return prisma.hocsinh.findFirst({
    where: { MaHocSinh: studentProfileId, ...notDeleted },
    select: { nguoidung: { select: { HoTen: true } } },
  });
}

/** So sanh DateTime? cua .NET (null dung truoc). */
function compareNullableDate(a: Date | null, b: Date | null): number {
  if (a === null) return b === null ? 0 : -1;
  if (b === null) return 1;
  return a.getTime() - b.getTime();
}

export async function getStudentOverview(studentProfileId: string): Promise<StudentReportDto> {
  const student = await findStudentWithName(studentProfileId);
  if (!student) throw new ReportNotFoundError('Không tìm thấy học sinh.');

  const attendance = await prisma.diemdanh.findMany({
    where: { MaHocSinh: studentProfileId, ...notDeleted },
    select: { chitietdanhmuc: { select: { MaCode: true } } },
  });

  // Nopbais.Where(..).Include(MaSuKienNavigation) -> INNER JOIN sukienlophoc, khong ORDER BY.
  const submissions = await prisma.$queryRaw<
    { n_DiemSo: Prisma.Decimal | null; n_ThoiGianNop: Date | null; n_ThoiGianTao: Date | null; s_MaBaiTap: string | null }[]
  >(Prisma.sql`
    SELECT ${efColumns(['nopbai', 'n'], ['sukienlophoc', 's'])}
    FROM nopbai AS n
    INNER JOIN sukienlophoc AS s ON n.MaSuKien = s.MaSuKien
    WHERE (n.MaHocSinh = ${studentProfileId}) AND ((n.DaXoa = FALSE) OR (n.DaXoa IS NULL))`).then((rows) =>
    rows.map((r) => ({ DiemSo: r.n_DiemSo, ThoiGianNop: r.n_ThoiGianNop, ThoiGianTao: r.n_ThoiGianTao, MaBaiTap: r.s_MaBaiTap })),
  );

  const classIds = (
    await prisma.hocsinhlophoc.findMany({
      where: { MaHocSinh: studentProfileId, ...activeEnrollment },
      select: { MaLopHoc: true },
    })
  ).map((x) => x.MaLopHoc);
  const totalAssignments =
    classIds.length > 0
      ? await prisma.sukienlophoc.count({ where: { MaLopHoc: { in: classIds }, MaBaiTap: { not: null }, ...notDeleted } })
      : 0;

  const completed = submissions.filter((s) => s.ThoiGianNop !== null).length;
  const report: StudentReportDto = {
    studentId: studentProfileId,
    studentName: student.nguoidung?.HoTen ?? 'Học sinh',
    attendanceRate: calculateAttendanceRate(attendance.map((a) => a.chitietdanhmuc?.MaCode ?? null)),
    homeworkCompletionRate: totalAssignments > 0 ? dotnetRound((completed / totalAssignments) * 100, 2) : 0,
    scoreTrend: [],
  };

  // OrderBy cua LINQ on dinh -> Array.sort cung on dinh.
  const sorted = submissions
    .filter((s) => s.DiemSo !== null)
    .sort((a, b) => compareNullableDate(a.ThoiGianNop ?? a.ThoiGianTao, b.ThoiGianNop ?? b.ThoiGianTao));

  for (const sub of sorted) {
    let assignmentName = 'Bài tập';
    if (sub.MaBaiTap !== null) {
      const bt = await prisma.baitap.findFirst({ where: { MaBaiTap: sub.MaBaiTap }, select: { TenBaiTap: true } });
      if (bt) assignmentName = bt.TenBaiTap;
    }
    report.scoreTrend.push({
      assignmentName,
      submitTime: sub.ThoiGianNop,
      score: sub.DiemSo !== null ? toDouble(sub.DiemSo) : null,
      maxScore: 10.0,
    });
  }
  return report;
}

export async function exportStudentReportCsv(studentProfileId: string): Promise<string> {
  const student = await findStudentWithName(studentProfileId);
  const overview = await getStudentOverview(studentProfileId);

  let sb = '﻿';
  sb += `PHIẾU BÁO CÁO HỌC TẬP CÁ NHÂN${NL}`;
  sb += `Học sinh: ${student?.nguoidung?.HoTen ?? ''}${NL}`;
  sb += `Tỷ lệ đi học đúng giờ: ${fmtDouble(overview.attendanceRate.presentPercent)}%${NL}`;
  sb += `Tỷ lệ hoàn thành bài tập: ${fmtDouble(overview.homeworkCompletionRate)}%${NL}`;
  sb += NL;
  sb += `Tên Bài Tập,Thời Gian Nộp,Điểm Số,Thang Điểm${NL}`;
  for (const t of overview.scoreTrend) {
    const submitDateStr = t.submitTime ? fmtDateTime(t.submitTime) : 'Chưa nộp';
    const scoreStr = t.score !== null ? fmtF1(t.score) : 'Chưa chấm';
    sb += `${csvQuote(t.assignmentName)},${submitDateStr},${scoreStr},${fmtDouble(t.maxScore)}${NL}`;
  }
  return sb;
}

