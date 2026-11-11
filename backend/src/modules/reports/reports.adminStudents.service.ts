import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { efColumns, notDeleted, toDouble } from './reports.common.js';
import { cultureCompare, dotnetRound, guidN } from './reports.dotnet.js';

// GetAdminStudentPerformanceAsync: bang hoc sinh x lop toan he thong + top 8 hoc vien.
// Ban .NET BIA toan bo diem / so buoi / so buoi vang (seed theo ma HS + ma lop), ke ca khi da co du lieu that,
// va tra 500 khi chua co hoc sinh ghi danh. Ban Node tinh tu du lieu that:
//   score        = TB diem cac bai da cham cua HS trong lop (moi bai lay lan nop moi nhat), null neu chua co
//   totalSessions = so ban ghi diem danh cua HS trong lop (buoi hoc chua xoa), absenceCount = so buoi DD_ABSENT
//   absenceRate  = absenceCount / totalSessions * 100 (1 so le), null neu chua diem danh buoi nao

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
  let rank = 0;
  for (const r of ranked) r.rank = r.score === null ? null : ++rank;
  return ranked;
}

function buildTopLearners(rows: AdminStudentPerformanceRowDto[]): AdminTopLearnerDto[] {
  const groups = new Map<string, AdminStudentPerformanceRowDto[]>();
  for (const r of rows) {
    if (r.score === null) continue; // chi xep hang HS da co diem
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

  if (enrollments.length === 0) return { performanceRows: [], topLearners: [] };

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

  const lc = (x: string) => x.toLowerCase();
  const pair = (studentId: string, classId: string) => `${lc(studentId)}|${lc(classId)}`;
  const classIds = [...new Set(enrollments.map((e) => e.h_MaLopHoc))];
  const studentIds = [...new Set(enrollments.map((e) => e.h_MaHocSinh))];

  // Diem: bai nop co diem, chua xoa, thuoc su kien (chua xoa) cua lop. Nop nhieu lan -> lay lan moi nhat.
  const submissions = await prisma.nopbai.findMany({
    where: {
      ...notDeleted,
      DiemSo: { not: null },
      MaHocSinh: { in: studentIds },
      sukienlophoc: { MaLopHoc: { in: classIds }, ...notDeleted },
    },
    select: { MaHocSinh: true, MaSuKien: true, DiemSo: true, LanNop: true, ThoiGianNop: true, sukienlophoc: { select: { MaLopHoc: true } } },
  });
  const latestPerEvent = new Map<string, (typeof submissions)[number]>();
  const newer = (a: (typeof submissions)[number], b: (typeof submissions)[number]) =>
    (a.LanNop ?? 0) !== (b.LanNop ?? 0) ? (a.LanNop ?? 0) > (b.LanNop ?? 0) : (a.ThoiGianNop?.getTime() ?? 0) > (b.ThoiGianNop?.getTime() ?? 0);
  for (const sub of submissions) {
    const key = `${lc(sub.MaHocSinh)}|${lc(sub.MaSuKien)}`;
    const cur = latestPerEvent.get(key);
    if (!cur || newer(sub, cur)) latestPerEvent.set(key, sub);
  }
  const scoresByPair = new Map<string, number[]>();
  for (const sub of latestPerEvent.values()) {
    const key = pair(sub.MaHocSinh, sub.sukienlophoc.MaLopHoc);
    const list = scoresByPair.get(key) ?? [];
    list.push(toDouble(sub.DiemSo!));
    scoresByPair.set(key, list);
  }

  // Chuyen can: ban ghi diem danh chua xoa, cua buoi hoc chua xoa thuoc lop.
  const attendance = await prisma.diemdanh.findMany({
    where: { ...notDeleted, MaHocSinh: { in: studentIds }, buoihoc: { MaLopHoc: { in: classIds }, ...notDeleted } },
    select: { MaHocSinh: true, buoihoc: { select: { MaLopHoc: true } }, chitietdanhmuc: { select: { MaCode: true } } },
  });
  const attByPair = new Map<string, { total: number; absent: number }>();
  for (const a of attendance) {
    const key = pair(a.MaHocSinh, a.buoihoc.MaLopHoc);
    const cur = attByPair.get(key) ?? { total: 0, absent: 0 };
    cur.total++;
    if (a.chitietdanhmuc?.MaCode === 'DD_ABSENT') cur.absent++;
    attByPair.set(key, cur);
  }

  const rawPerClass = new Map<string, AdminStudentPerformanceRowDto[]>();
  for (const enr of enrollments) {
    const classId = enr.h_MaLopHoc;
    const studentId = enr.h_MaHocSinh;
    const key = pair(studentId, classId);
    const scores = scoresByPair.get(key) ?? [];
    const att = attByPair.get(key) ?? { total: 0, absent: 0 };

    const row: AdminStudentPerformanceRowDto = {
      classId,
      className: enr.l_TenLop ?? '',
      courseLabel: classCourseLabels.get(classId.toLowerCase()) ?? '',
      studentId,
      studentName: enr.n_HoTen ?? guidN(studentId).substring(0, 8),
      email: enr.n_Email ?? '',
      score: scores.length > 0 ? dotnetRound(scores.reduce((x, y) => x + y, 0) / scores.length, 1) : null,
      rank: null,
      classSize: classSizeLookup.get(classId) ?? 0,
      absenceCount: att.absent,
      totalSessions: att.total,
      absenceRate: att.total > 0 ? dotnetRound((att.absent / att.total) * 100, 1) : null,
    };
    const list = rawPerClass.get(lc(classId));
    if (list) list.push(row);
    else rawPerClass.set(lc(classId), [row]);
  }

  const performanceRows: AdminStudentPerformanceRowDto[] = [];
  for (const cls of rawPerClass.values()) performanceRows.push(...rankRows(cls));

  return { performanceRows, topLearners: buildTopLearners(performanceRows) };
}
