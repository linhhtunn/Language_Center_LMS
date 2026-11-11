import { prisma } from '../../db.js';
import { attendanceCodesForClasses, calculateAttendanceRate, notDeleted, notInactive, scoresForClasses } from './reports.common.js';
import { average, dotnetRound, fmtDate, isNullOrWhiteSpace, todayUtc } from './reports.dotnet.js';

// GetAdminTeacherDashboardAsync: thong ke giang vien cho dashboard Admin.
// Ban .NET BIA so lieu: DB < 12 GV -> 30 GV mau; GV chua co lop -> 2 lop "LH_TEMP_*"; thieu diem danh/diem ->
// ty le/diem ngau nhien; luon bu cho du 30 GV. Ban Node chi tra GV THAT; chua co du lieu -> null / mang rong.

export interface AdminTeacherClassItemDto {
  classId: string;
  className: string;
  courseLabel: string;
  currentSize: number;
  startDate: string;
  endDate: string;
  status: string;
}

export interface AdminTeacherDashboardRowDto {
  teacherId: string;
  name: string;
  email: string;
  phone: string;
  degree: string;
  specialization: string;
  classCount: number;
  totalStudents: number;
  ongoingClasses: number;
  upcomingClasses: number;
  endedClasses: number;
  /** null = chua co ban ghi diem danh nao. */
  avgAttendanceRate: number | null;
  /** null = chua co bai nop co diem nao. */
  avgScore: number | null;
  classes: AdminTeacherClassItemDto[];
}

export interface AdminTeacherSummaryDto {
  totalTeachers: number;
  totalActiveTeachers: number;
  totalUnassignedTeachers: number;
  avgClassPerTeacher: number;
  avgStudentsPerTeacher: number;
  assignedTeachers: number;
  topSpecialization: string | null;
}

export interface AdminTeacherDashboardReportDto {
  summary: AdminTeacherSummaryDto;
  teachers: AdminTeacherDashboardRowDto[];
  /** Luon false (giu truong de frontend cu khong loi). */
  usesFallback: boolean;
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** ClassifyClassStatus: so sanh DateOnly voi ngay hom nay (UTC). */
function classifyClassStatus(start: Date | null, end: Date | null): string {
  const today = fmtDate(todayUtc());
  if (!start) return 'upcoming';
  if (fmtDate(start) > today) return 'upcoming';
  if (end && fmtDate(end) < today) return 'ended';
  return 'ongoing';
}

const avgOf = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length; // Average(int) = tong long / dem

export async function getAdminTeacherDashboard(): Promise<AdminTeacherDashboardReportDto> {
  const teachers: AdminTeacherDashboardRowDto[] = [];

  // Include co loc (filtered include) giong EF; EF sap xep: HoTen, MaGiangVien, roi khoa cac bang con.
  const dbTeachers = await prisma.giangvien.findMany({
    where: notDeleted,
    include: {
      nguoidung: { select: { HoTen: true, Email: true } },
      giangvienlophoc: {
        where: { AND: [notDeleted, notInactive] },
        orderBy: [{ MaLopHoc: 'asc' }, { MaGiangVien: 'asc' }],
        include: {
          lophoc: {
            include: {
              chitietkhoahoc_lophoc: {
                where: notDeleted,
                orderBy: [{ MaKhoaHoc: 'asc' }, { MaLopHoc: 'asc' }],
                include: { khoahoc: { select: { TenKhoaHoc: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: [{ nguoidung: { HoTen: 'asc' } }, { MaGiangVien: 'asc' }],
  });

  const specFrequency = new Map<string, number>();

  for (const gv of dbTeachers) {
    const classes: AdminTeacherClassItemDto[] = [];
    let totalStudents = 0;
    let ongoing = 0;
    let upcoming = 0;
    let ended = 0;

    for (const link of gv.giangvienlophoc) {
      const lh = link.lophoc;
      if (!lh || (lh.DaXoa ?? false)) continue;
      const labels = lh.chitietkhoahoc_lophoc.filter((ck) => ck.khoahoc).map((ck) => ck.khoahoc.TenKhoaHoc);
      if (labels.length === 0) labels.push('Chưa gán khóa');

      // lh.Hocsinhlophocs khong duoc Include ben EF -> rong -> chi con SiSoHienTai ?? 0.
      const size = lh.SiSoHienTai ?? 0;
      totalStudents += size;

      const status = classifyClassStatus(lh.NgayBatDau, lh.NgayKetThuc);
      if (status === 'ongoing') ongoing++;
      else if (status === 'upcoming') upcoming++;
      else ended++;

      classes.push({
        classId: lh.MaLopHoc,
        className: lh.TenLop,
        courseLabel: labels.join(', '),
        currentSize: size,
        startDate: lh.NgayBatDau ? fmtDate(lh.NgayBatDau) : '',
        endDate: lh.NgayKetThuc ? fmtDate(lh.NgayKetThuc) : '',
        status,
      });
    }

    let avgAtt: number | null = null;
    let avgScore: number | null = null;
    const classIds = [...new Set(classes.filter((c) => c.classId !== EMPTY_GUID).map((c) => c.classId))];
    if (classIds.length > 0) {
      const codes = await attendanceCodesForClasses(classIds);
      if (codes.length > 0) avgAtt = calculateAttendanceRate(codes).presentPercent;
      const realScores = await scoresForClasses(classIds);
      if (realScores.length > 0) avgScore = dotnetRound(average(realScores), 2);
    }

    // Chua khai bao chuyen mon -> chuoi rong (ban .NET dien nhan "Chuyen mon da nganh" va dem vao thong ke).
    let spec = '';
    if (!isNullOrWhiteSpace(gv.TrinhDoChuyenMon)) spec = gv.TrinhDoChuyenMon;
    else if (!isNullOrWhiteSpace(gv.HocVi)) spec = gv.HocVi!;
    if (spec) specFrequency.set(spec, (specFrequency.get(spec) ?? 0) + 1);

    teachers.push({
      teacherId: gv.MaGiangVien,
      name: gv.nguoidung?.HoTen ?? `Giảng viên ${gv.MaGiangVien.substring(0, 6)}`,
      email: gv.nguoidung?.Email ?? '', // ban .NET bia email gv_xxx@qltt.local
      phone: gv.SoDienThoai ?? '',
      degree: gv.HocVi ?? '',
      specialization: spec,
      classCount: classes.length,
      totalStudents,
      ongoingClasses: ongoing,
      upcomingClasses: upcoming,
      endedClasses: ended,
      avgAttendanceRate: avgAtt,
      avgScore,
      classes,
    });
  }

  // OrderByDescending(Value).First(): sort on dinh -> lay chuyen mon xuat hien nhieu nhat, gap dau tien.
  let topSpec: string | null = null;
  let topCount = -1;
  for (const [k, v] of specFrequency) {
    if (v > topCount) {
      topSpec = k;
      topCount = v;
    }
  }

  const avgOrZero = (xs: number[]) => (xs.length > 0 ? avgOf(xs) : 0);
  return {
    summary: {
      totalTeachers: dbTeachers.length,
      totalActiveTeachers: teachers.filter((t) => t.ongoingClasses + t.upcomingClasses > 0).length,
      totalUnassignedTeachers: dbTeachers.filter((g) => g.giangvienlophoc.length === 0).length,
      avgClassPerTeacher: dotnetRound(avgOrZero(teachers.map((t) => t.classCount)), 2),
      avgStudentsPerTeacher: dotnetRound(avgOrZero(teachers.map((t) => t.totalStudents)), 1),
      assignedTeachers: dbTeachers.filter((g) => g.giangvienlophoc.length > 0).length,
      topSpecialization: topSpec,
    },
    teachers,
    usesFallback: false,
  };
}
