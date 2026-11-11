import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { efColumns } from './reports.common.js';
import { cultureCompare, dotnetRound, guidN, seededInt, seededNumber } from './reports.dotnet.js';

// GetAdminStudentPerformanceAsync: bang hoc sinh x lop toan he thong + top 8 hoc vien.
// Diem/chuyen can o day la so "gia lap" deterministic (seed theo ma HS/ma lop) giong het ban .NET.

export interface AdminStudentPerformanceRowDto {
  classId: string;
  className: string;
  courseLabel: string;
  studentId: string;
  studentName: string;
  email: string;
  score: number | null;
  rank: number | null;
  classSize: number | null;
  absenceCount: number | null;
  totalSessions: number | null;
  absenceRate: number | null;
}

export interface AdminTopLearnerDto {
  studentId: string;
  fullName: string;
  email: string;
  classCount: number;
  courseCount: number;
  courses: string[];
  averageScore: number;
  globalRank: number;
}

export interface AdminStudentPerformanceReportDto {
  performanceRows: AdminStudentPerformanceRowDto[];
  topLearners: AdminTopLearnerDto[];
}

/** OrderByDescending(Score).ThenBy(StudentName) - LINQ sort on dinh, so sanh ten theo culture. */
function rankRows(rows: AdminStudentPerformanceRowDto[]): AdminStudentPerformanceRowDto[] {
  const ranked = [...rows].sort((a, b) => {
    const sa = a.score ?? Number.NEGATIVE_INFINITY;
    const sb = b.score ?? Number.NEGATIVE_INFINITY;
    if (sa !== sb) return sb - sa;
    return cultureCompare(a.studentName, b.studentName);
  });
  ranked.forEach((r, k) => (r.rank = k + 1));
  return ranked;
}

function buildTopLearners(rows: AdminStudentPerformanceRowDto[]): AdminTopLearnerDto[] {
  const groups = new Map<string, AdminStudentPerformanceRowDto[]>();
  for (const r of rows) {
    const key = r.studentId.toLowerCase();
    const g = groups.get(key);
    if (g) g.push(r);
    else groups.set(key, [r]);
  }
  const agg = [...groups.values()].map((g) => {
    let sum = 0;
    for (const x of g) sum += x.score ?? 0;
    const courses = new Set<string>();
    for (const x of g) if (x.courseLabel) courses.add(x.courseLabel);
    return { first: g[0], avg: dotnetRound(sum / g.length, 1), classCount: g.length, courses };
  });
  agg.sort((a, b) => (a.avg !== b.avg ? b.avg - a.avg : b.classCount - a.classCount));
  return agg.slice(0, 8).map((a, idx) => ({
    studentId: a.first.studentId,
    fullName: a.first.studentName,
    email: a.first.email,
    classCount: a.classCount,
    courseCount: a.courses.size,
    courses: [...a.courses],
    averageScore: a.avg,
    globalRank: idx + 1,
  }));
}

interface EnrollmentRow {
  h_MaLopHoc: string;
  h_MaHocSinh: string;
  l_TenLop: string | null;
  n_HoTen: string | null;
  n_Email: string | null;
}

export async function getAdminStudentPerformance(): Promise<AdminStudentPerformanceReportDto> {
  // Hocsinhlophocs.Where(..).Include(HocSinh->NguoiDung).Include(LopHoc): cac INNER JOIN, khong ORDER BY.
  const enrollments = await prisma.$queryRaw<EnrollmentRow[]>(Prisma.sql`
    SELECT ${efColumns(['hocsinhlophoc', 'h'], ['hocsinh', 'h0'], ['nguoidung', 'n'], ['lophoc', 'l'])}
    FROM hocsinhlophoc AS h
    INNER JOIN hocsinh AS h0 ON h.MaHocSinh = h0.MaHocSinh
    INNER JOIN nguoidung AS n ON h0.MaNguoiDung = n.MaNguoiDung
    INNER JOIN lophoc AS l ON h.MaLopHoc = l.MaLopHoc
    WHERE ((h.DaXoa = FALSE) OR (h.DaXoa IS NULL)) AND ((h.TrangThai = TRUE) OR (h.TrangThai IS NULL))`);

  if (enrollments.length === 0) {
    // Nhanh "demo universe" cua ban .NET dung lop dau tien da goi
    //   new Guid(HashSeed(..).ToString("X8") + "-0000-0000-0000-000000000000".Substring(8))
    // -> chuoi 28 ky tu khong phai Guid hop le -> FormatException -> controller tra 500.
    // Giu nguyen hanh vi do (loi cua ban goc).
    throw new Error('Unrecognized Guid format.');
  }

  const classSizeLookup = new Map<string, number>();
  for (const e of enrollments) classSizeLookup.set(e.h_MaLopHoc, (classSizeLookup.get(e.h_MaLopHoc) ?? 0) + 1);

  // ChitietkhoahocLophocs.Where(DaXoa != true).Include(KhoaHoc): lop co nhieu khoa -> khoa doc sau cung thang.
  const courseLinks = await prisma.$queryRaw<{ c_MaLopHoc: string; k_TenKhoaHoc: string | null }[]>(Prisma.sql`
    SELECT ${efColumns(['chitietkhoahoc_lophoc', 'c'], ['khoahoc', 'k'])}
    FROM chitietkhoahoc_lophoc AS c
    INNER JOIN khoahoc AS k ON c.MaKhoaHoc = k.MaKhoaHoc
    WHERE (c.DaXoa = FALSE) OR (c.DaXoa IS NULL)`);
  const classCourseLabels = new Map<string, string>();
  for (const cl of courseLinks) if (cl.k_TenKhoaHoc != null) classCourseLabels.set(cl.c_MaLopHoc.toLowerCase(), cl.k_TenKhoaHoc);

  const rawPerClass = new Map<string, AdminStudentPerformanceRowDto[]>();
  for (const enr of enrollments) {
    const classId = enr.h_MaLopHoc;
    const studentId = enr.h_MaHocSinh;
    const totalSessions = Math.max(8, seededInt(`${guidN(classId)}-sessions`, 10, 24));
    const score = seededNumber(`${guidN(studentId)}-${guidN(classId)}-score`, 4.2, 9.8, 1);
    const absenceCount = seededInt(`${guidN(studentId)}-${guidN(classId)}-abs`, 0, Math.min(totalSessions, 6));
    const absenceRate = dotnetRound((absenceCount / Math.max(totalSessions, 1)) * 100, 1);

    const row: AdminStudentPerformanceRowDto = {
      classId,
      className: enr.l_TenLop ?? '',
      courseLabel: classCourseLabels.get(classId.toLowerCase()) ?? '',
      studentId,
      studentName: enr.n_HoTen ?? guidN(studentId).substring(0, 8),
      email: enr.n_Email ?? '',
      score,
      rank: null,
      classSize: classSizeLookup.get(classId) ?? 0,
      absenceCount,
      totalSessions,
      absenceRate,
    };
    const key = classId.toLowerCase();
    const list = rawPerClass.get(key);
    if (list) list.push(row);
    else rawPerClass.set(key, [row]);
  }

  const performanceRows: AdminStudentPerformanceRowDto[] = [];
  for (const cls of rawPerClass.values()) performanceRows.push(...rankRows(cls));

  return { performanceRows, topLearners: buildTopLearners(performanceRows) };
}
