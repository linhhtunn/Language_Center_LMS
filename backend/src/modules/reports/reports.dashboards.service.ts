import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { activeStudentCount, efColumns, notDeleted, toDouble } from './reports.common.js';
import { enrolledStudentsWithNames } from './reports.classStudent.service.js';
import { average, dotnetRound } from './reports.dotnet.js';

// Dashboard lop hoc / hoc sinh trong lop / phu huynh (ReportsService.cs, DTO trong DashboardDtos.cs).

export interface ScoreCountDto {
  score: number;
  count: number;
}

export interface TestScoreDistributionDto {
  testId: string;
  testName: string;
  scoreDistribution: ScoreCountDto[];
  scores: number[];
  registeredCount: number;
  totalAttempts: number;
  notSubmittedCount: number;
}

export interface StudentAttendanceSummaryDto {
  studentId: string;
  studentName: string;
  totalSessions: number;
  presentSessions: number;
  absentSessions: number;
  lateSessions: number;
  excusedSessions: number;
  attendanceRate: number;
  absentRate: number;
}

export interface ScoreIntervalBinDto {
  interval: string;
  count: number;
}

export interface ClassDashboardDto {
  classId: string;
  className: string;
  totalStudents: number;
  totalTests: number;
  tests: TestScoreDistributionDto[];
  attendance: StudentAttendanceSummaryDto[];
  averageScoreDistribution: ScoreIntervalBinDto[];
}

export interface StudentTestResultDto {
  testId: string;
  testName: string;
  score: number | null;
  classAverage: number;
  rank: string;
}

export interface StudentCourseDashboardDto {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  attendanceRate: number;
  tests: StudentTestResultDto[];
}

export interface ChildCourseSummaryDto {
  classId: string;
  className: string;
  courseName: string;
  finalAverageScore: number | null;
}

export interface ParentChildDashboardDto {
  studentId: string;
  studentName: string;
  courses: ChildCourseSummaryDto[];
}

/** Su kien bai tap/kiem tra cua lop (MaBaiTap != null, chua xoa). */
function classTests(classId: string) {
  return prisma.sukienlophoc.findMany({
    where: { MaLopHoc: classId, MaBaiTap: { not: null }, ...notDeleted },
  });
}

async function testNameOf(maBaiTap: string | null): Promise<string> {
  const bt = maBaiTap ? await prisma.baitap.findFirst({ where: { MaBaiTap: maBaiTap }, select: { TenBaiTap: true } }) : null;
  return bt?.TenBaiTap ?? 'Bài kiểm tra';
}

async function classNameOf(classId: string): Promise<string> {
  const c = await prisma.lophoc.findFirst({ where: { MaLopHoc: classId }, select: { TenLop: true } });
  return c?.TenLop ?? 'Lớp học';
}

/** Ma buoi hoc (chua xoa) cua lop. */
async function classSessionIds(classId: string): Promise<string[]> {
  const rows = await prisma.buoihoc.findMany({ where: { MaLopHoc: classId, ...notDeleted }, select: { MaBuoiHoc: true } });
  return rows.map((r) => r.MaBuoiHoc);
}

export async function getClassDashboard(classId: string): Promise<ClassDashboardDto> {
  const studentCount = await activeStudentCount(classId);
  const tests = await classTests(classId);

  const testScoreDists: TestScoreDistributionDto[] = [];
  for (const test of tests) {
    const testName = await testNameOf(test.MaBaiTap);
    const allSubs = await prisma.nopbai.findMany({
      where: { MaSuKien: test.MaSuKien, ...notDeleted },
    });
    const graded = allSubs.filter((s) => s.DiemSo !== null).map((s) => toDouble(s.DiemSo!));

    const dist: ScoreCountDto[] = [];
    for (let i = 0; i <= 10; i++) dist.push({ score: i, count: 0 });
    for (const score of graded) {
      const rounded = Math.min(Math.max(dotnetRound(score), 0), 10);
      const bin = dist.find((d) => d.score === rounded);
      if (bin) bin.count++;
    }

    const distinctSubmitted = new Set(allSubs.map((s) => s.MaHocSinh.toLowerCase())).size;
    testScoreDists.push({
      testId: test.MaSuKien,
      testName,
      scoreDistribution: dist,
      scores: graded,
      registeredCount: studentCount,
      totalAttempts: allSubs.length,
      notSubmittedCount: Math.max(0, studentCount - distinctSubmitted),
    });
  }

  const students = await enrolledStudentsWithNames(classId);
  const sessionIds = await classSessionIds(classId);
  const allAttendance =
    sessionIds.length > 0
      ? await prisma.diemdanh.findMany({
          where: { MaBuoiHoc: { in: sessionIds }, ...notDeleted },
          select: { MaHocSinh: true, chitietdanhmuc: { select: { MaCode: true } } },
        })
      : [];

  const attendance: StudentAttendanceSummaryDto[] = [];
  for (const sc of students) {
    const codes = allAttendance.filter((d) => d.MaHocSinh === sc.MaHocSinh).map((d) => d.chitietdanhmuc?.MaCode ?? null);
    const total = codes.length;
    const present = codes.filter((c) => c === 'DD_PRESENT').length;
    const late = codes.filter((c) => c === 'DD_LATE').length;
    const absent = codes.filter((c) => c === 'DD_ABSENT').length;
    const excused = codes.filter((c) => c === 'DD_EXCUSED').length;
    attendance.push({
      studentId: sc.MaHocSinh,
      studentName: sc.HoTen ?? 'Học sinh',
      totalSessions: total,
      presentSessions: present,
      absentSessions: absent,
      lateSessions: late,
      excusedSessions: excused,
      attendanceRate: total > 0 ? dotnetRound(((present + late) / total) * 100, 2) : 100.0,
      absentRate: total > 0 ? dotnetRound((absent / total) * 100, 2) : 0.0,
    });
  }

  const testIds = tests.map((t) => t.MaSuKien);
  const classSubmissions =
    testIds.length > 0
      ? await prisma.nopbai.findMany({
          where: { MaSuKien: { in: testIds }, DiemSo: { not: null }, ...notDeleted },
          select: { MaHocSinh: true, DiemSo: true },
        })
      : [];

  const avgBins: ScoreIntervalBinDto[] = [];
  for (let i = 0; i < 10; i++) avgBins.push({ interval: `${i}-${i + 1}`, count: 0 });
  for (const sc of students) {
    const scores = classSubmissions.filter((s) => s.MaHocSinh === sc.MaHocSinh).map((s) => toDouble(s.DiemSo!));
    if (scores.length > 0) {
      const binIndex = Math.min(Math.max(Math.floor(average(scores)), 0), 9);
      avgBins[binIndex].count++;
    }
  }

  return {
    classId,
    className: await classNameOf(classId),
    totalStudents: studentCount,
    totalTests: tests.length,
    tests: testScoreDists,
    attendance,
    averageScoreDistribution: avgBins,
  };
}

export async function getStudentCourseDashboard(studentId: string, classId: string): Promise<StudentCourseDashboardDto> {
  const tests = await classTests(classId);
  const results: StudentTestResultDto[] = [];
  for (const test of tests) {
    const testName = await testNameOf(test.MaBaiTap);
    const allTestSubs = await prisma.nopbai.findMany({
      where: { MaSuKien: test.MaSuKien, DiemSo: { not: null }, ...notDeleted },
      orderBy: { DiemSo: 'desc' },
    });
    const idx = allTestSubs.findIndex((s) => s.MaHocSinh.toLowerCase() === studentId);
    const studentSub = idx >= 0 ? allTestSubs[idx] : undefined;
    results.push({
      testId: test.MaSuKien,
      testName,
      score: studentSub ? toDouble(studentSub.DiemSo!) : null,
      classAverage: allTestSubs.length > 0 ? dotnetRound(average(allTestSubs.map((s) => toDouble(s.DiemSo!))), 2) : 0.0,
      rank: studentSub ? `${idx + 1}/${allTestSubs.length}` : 'Chưa có',
    });
  }

  const sessionIds = await classSessionIds(classId);
  const att =
    sessionIds.length > 0
      ? await prisma.diemdanh.findMany({
          where: { MaBuoiHoc: { in: sessionIds }, MaHocSinh: studentId, ...notDeleted },
          select: { chitietdanhmuc: { select: { MaCode: true } } },
        })
      : [];
  const totalAtt = att.length;
  const presentAtt = att.filter((x) => x.chitietdanhmuc?.MaCode === 'DD_PRESENT' || x.chitietdanhmuc?.MaCode === 'DD_LATE').length;

  const student = await prisma.hocsinh.findFirst({
    where: { MaHocSinh: studentId },
    select: { nguoidung: { select: { HoTen: true } } },
  });

  return {
    studentId,
    studentName: student?.nguoidung?.HoTen ?? 'Học sinh',
    classId,
    className: await classNameOf(classId),
    attendanceRate: totalAtt > 0 ? dotnetRound((presentAtt / totalAtt) * 100, 2) : 100.0,
    tests: results,
  };
}

export async function getParentChildrenDashboard(parentProfileId: string): Promise<ParentChildDashboardDto[]> {
  const childLinks = await prisma.phuhuynhhocsinh.findMany({
    where: { MaPhuHuynh: parentProfileId, ...notDeleted },
  });

  const list: ParentChildDashboardDto[] = [];
  for (const link of childLinks) {
    const student = await prisma.hocsinh.findFirst({
      where: { MaHocSinh: link.MaHocSinh, ...notDeleted },
      select: { MaHocSinh: true, nguoidung: { select: { HoTen: true } } },
    });
    if (!student) continue;

    const child: ParentChildDashboardDto = {
      studentId: student.MaHocSinh,
      studentName: student.nguoidung?.HoTen ?? 'Con',
      courses: [],
    };

    // Hocsinhlophocs.Where(..).Include(MaLopHocNavigation) -> INNER JOIN lophoc, khong ORDER BY.
    const enrollRows = await prisma.$queryRaw<{ h_MaLopHoc: string; l_TenLop: string }[]>(Prisma.sql`
      SELECT ${efColumns(['hocsinhlophoc', 'h'], ['lophoc', 'l'])}
      FROM hocsinhlophoc AS h
      INNER JOIN lophoc AS l ON h.MaLopHoc = l.MaLopHoc
      WHERE h.MaHocSinh = ${student.MaHocSinh}
        AND ((h.DaXoa = FALSE) OR (h.DaXoa IS NULL))
        AND ((h.TrangThai = TRUE) OR (h.TrangThai IS NULL))`);
    const enrollments = enrollRows.map((r) => ({ MaLopHoc: r.h_MaLopHoc, TenLop: r.l_TenLop }));

    for (const enr of enrollments) {
      // ChitietkhoahocLophocs.Where(..).Include(MaKhoaHocNavigation).FirstOrDefaultAsync() -> JOIN + LIMIT 1.
      const courseLink = await prisma.$queryRaw<{ k_TenKhoaHoc: string }[]>(Prisma.sql`
        SELECT ${efColumns(['chitietkhoahoc_lophoc', 'c'], ['khoahoc', 'k'])}
        FROM chitietkhoahoc_lophoc AS c
        INNER JOIN khoahoc AS k ON c.MaKhoaHoc = k.MaKhoaHoc
        WHERE (c.MaLopHoc = ${enr.MaLopHoc}) AND ((c.DaXoa = FALSE) OR (c.DaXoa IS NULL))
        LIMIT 1`);

      const tests = await prisma.sukienlophoc.findMany({
        where: { MaLopHoc: enr.MaLopHoc, MaBaiTap: { not: null }, ...notDeleted },
        select: { MaSuKien: true },
      });

      let finalAvg: number | null = null;
      if (tests.length > 0) {
        const scores = await prisma.nopbai.findMany({
          where: {
            MaSuKien: { in: tests.map((t) => t.MaSuKien) },
            MaHocSinh: student.MaHocSinh,
            DiemSo: { not: null },
            ...notDeleted,
          },
          select: { DiemSo: true },
        });
        if (scores.length > 0) finalAvg = dotnetRound(average(scores.map((s) => toDouble(s.DiemSo!))), 2);
      }

      child.courses.push({
        classId: enr.MaLopHoc,
        className: enr.TenLop ?? 'Lớp học',
        courseName: courseLink[0]?.k_TenKhoaHoc ?? 'Khóa học',
        finalAverageScore: finalAvg,
      });
    }
    list.push(child);
  }
  return list;
}

