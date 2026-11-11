import { randomUUID } from 'node:crypto';
import { prisma } from '../../db.js';
import { attendanceCodesForClasses, calculateAttendanceRate, notDeleted, notInactive, scoresForClasses } from './reports.common.js';
import { addDays, average, dotnetRound, fmtDate, isNullOrWhiteSpace, seededInt, seededNumber, todayUtc } from './reports.dotnet.js';

// GetAdminTeacherDashboardAsync: thong ke ~30 giang vien cho dashboard Admin.
// DB co it hon 12 GV -> tra 30 GV mau (deterministic, tru TeacherId/ClassId la Guid.NewGuid()).

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
  avgAttendanceRate: number;
  avgScore: number;
  classes: AdminTeacherClassItemDto[];
}

export interface AdminTeacherSummaryDto {
  totalTeachers: number;
  totalActiveTeachers: number;
  totalUnassignedTeachers: number;
  avgClassPerTeacher: number;
  avgStudentsPerTeacher: number;
  assignedTeachers: number;
  topSpecialization: string;
}

export interface AdminTeacherDashboardReportDto {
  summary: AdminTeacherSummaryDto;
  teachers: AdminTeacherDashboardRowDto[];
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

function buildFallbackTeachersReport(desiredCount = 30): AdminTeacherDashboardReportDto {
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
  const firstNames = ['Anh', 'Bình', 'Cúc', 'Dung', 'Em', 'Phương', 'Giang', 'Hương', 'Khánh', 'Lan', 'Minh', 'Nam', 'Oanh', 'Phúc', 'Quỳnh', 'Rosa', 'Sơn', 'Thư', 'Uyên', 'Vân', 'Xuân', 'Yến', 'Hải', 'Chi', 'Thảo', 'Trâm', 'Thúy', 'Tú', 'Khoa', 'Lâm'];
  const degrees = ['ThS.', 'TS.', 'Cử nhân', 'Thạc sĩ'];
  const specs = ['IELTS', 'TOEIC', 'Tiếng Anh giao tiếp', 'Luyện thi THPT', 'Chuyên Ngữ pháp', 'Chuyên Kỹ năng nói', 'Kid Starter', 'Teen Master'];
  const classNames = ['LH_IELTS_F01', 'LH_IELTS_F02', 'LH_IELTS_IN01', 'LH_IELTS_IN02', 'LH_TOEIC_500', 'LH_TOEIC_650', 'LH_TOEIC_800', 'LH_TA_SENIOR01', 'LH_TA_JUNIOR02', 'LH_THPT_10A', 'LH_THPT_11B', 'LH_THPT_12C', 'LH_KIDS_01', 'LH_KIDS_02', 'LH_TEEN_03', 'LH_TEEN_04', 'LH_GRAM_F01', 'LH_GRAM_IN01', 'LH_SPEAK_F02', 'LH_WRIT_IN01', 'LH_ENSEED_01', 'LH_ENSEED_02', 'LH_ENSEED_03', 'LH_ENSEED_04'];
  const courses = ['Khóa IELTS Foundation', 'Khóa IELTS Intensive', 'Khóa TOEIC 500+', 'Khóa TOEIC 650+', 'Khóa Tiếng Anh Giao Tiếp', 'Khóa Luyện Thi THPT', 'Khóa Kid Starter', 'Khóa Teen Master', 'Khóa Chuyên Ngữ Pháp', 'Khóa Kỹ Năng Nói'];
  const today = todayUtc(); // DateOnly.FromDateTime(DateTime.UtcNow.AddDays(x)) chi lay phan ngay

  const teachers: AdminTeacherDashboardRowDto[] = [];
  for (let i = 0; i < desiredCount; i++) {
    const seedKey = `fb-teacher-${i}`;
    const name = `${lastNames[seededInt(`${seedKey}-last`, 0, lastNames.length - 1)]} ${firstNames[i % firstNames.length]}`;
    const login = `gv_demo_${String(i + 1).padStart(3, '0')}`;
    const phone = `09${String(10000000 + seededInt(`${seedKey}-phone`, 0, 89999999)).padStart(8, '0')}`;
    const degree = degrees[seededInt(`${seedKey}-degree`, 0, degrees.length - 1)];
    const spec = specs[seededInt(`${seedKey}-spec`, 0, specs.length - 1)];
    const classCount = seededInt(`${seedKey}-cls`, 2, 6);
    const classes: AdminTeacherClassItemDto[] = [];
    let totalStudents = 0;
    let ongoing = 0;
    let upcoming = 0;
    let ended = 0;

    for (let c = 0; c < classCount; c++) {
      const clsSeed = `${seedKey}-cls-${c}`;
      const size = seededInt(clsSeed, 14, 38);
      // `cap` tinh ra nhung khong dung o ban goc.
      totalStudents += size;
      const startDate = addDays(today, seededInt(clsSeed, -180, 40));
      const endDate = addDays(startDate, seededInt(clsSeed, 60, 180));
      const status = classifyClassStatus(startDate, endDate);
      if (status === 'ongoing') ongoing++;
      else if (status === 'upcoming') upcoming++;
      else ended++;
      classes.push({
        classId: randomUUID(),
        className: classNames[(i * 2 + c) % classNames.length],
        courseLabel: courses[(i + c * 3) % courses.length],
        currentSize: size,
        startDate: fmtDate(startDate),
        endDate: fmtDate(endDate),
        status,
      });
    }

    teachers.push({
      teacherId: randomUUID(),
      name,
      email: `${login}@qltt.local`,
      phone,
      degree,
      specialization: spec,
      classCount,
      totalStudents,
      ongoingClasses: ongoing,
      upcomingClasses: upcoming,
      endedClasses: ended,
      avgAttendanceRate: dotnetRound(seededNumber(`${seedKey}-att`, 80, 95, 1), 1),
      avgScore: dotnetRound(seededNumber(`${seedKey}-score`, 6.8, 8.7, 2), 2),
      classes,
    });
  }

  return {
    summary: {
      totalTeachers: desiredCount,
      totalActiveTeachers: desiredCount,
      totalUnassignedTeachers: 0,
      avgClassPerTeacher: dotnetRound(avgOf(teachers.map((t) => t.classCount)), 2),
      avgStudentsPerTeacher: dotnetRound(avgOf(teachers.map((t) => t.totalStudents)), 1),
      assignedTeachers: desiredCount,
      topSpecialization: specs[0],
    },
    teachers,
    usesFallback: true,
  };
}

export async function getAdminTeacherDashboard(): Promise<AdminTeacherDashboardReportDto> {
  const DESIRED_TEACHERS = 30;
  let usesFallback = false;
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

  if (dbTeachers.length < 12) return buildFallbackTeachersReport(DESIRED_TEACHERS);

  const today = todayUtc();
  const specFrequency = new Map<string, number>();

  for (const gv of dbTeachers.slice(0, DESIRED_TEACHERS)) {
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

    if (classes.length === 0) {
      const seedKey = `gv-fallback-${gv.MaGiangVien}`;
      for (let c = 0; c < 2; c++) {
        const clsSeed = `${seedKey}-${c}`;
        const size = seededInt(clsSeed, 16, 32);
        totalStudents += size;
        const start = addDays(today, seededInt(clsSeed, -120, 20));
        const end = addDays(start, seededInt(clsSeed, 60, 150));
        const status = classifyClassStatus(start, end);
        if (status === 'ongoing') ongoing++;
        else if (status === 'upcoming') upcoming++;
        else ended++;
        classes.push({
          classId: randomUUID(),
          className: `LH_TEMP_${gv.MaGiangVien.substring(0, 5)}_${c + 1}`,
          courseLabel: 'Tạm gán khóa học',
          currentSize: size,
          startDate: fmtDate(start),
          endDate: fmtDate(end),
          status,
        });
      }
      usesFallback = true;
    }

    let avgAtt: number;
    let avgScore: number;
    const teacherSeedKey = `gv-stats-${gv.MaGiangVien}`;
    try {
      const classIds = [...new Set(classes.filter((c) => c.classId !== EMPTY_GUID).map((c) => c.classId))];
      if (classIds.length > 0) {
        const codes = await attendanceCodesForClasses(classIds);
        avgAtt = calculateAttendanceRate(codes, teacherSeedKey, Math.max(80, classIds.length * 30)).presentPercent;
      } else {
        avgAtt = dotnetRound(seededNumber(`${teacherSeedKey}-att`, 80, 95, 1), 1);
        usesFallback = true;
      }

      const seededAvg = dotnetRound(seededNumber(`${teacherSeedKey}-score`, 6.8, 8.7, 2), 2);
      if (classIds.length > 0) {
        const realScores = await scoresForClasses(classIds);
        avgScore = realScores.length > 0 ? dotnetRound(average(realScores), 2) : seededAvg;
        if (realScores.length === 0) usesFallback = true;
      } else {
        avgScore = seededAvg;
      }
    } catch {
      avgAtt = dotnetRound(seededNumber(`${teacherSeedKey}-att`, 80, 95, 1), 1);
      avgScore = dotnetRound(seededNumber(`${teacherSeedKey}-score`, 6.8, 8.7, 2), 2);
      usesFallback = true;
    }

    let spec: string;
    if (!isNullOrWhiteSpace(gv.TrinhDoChuyenMon)) spec = gv.TrinhDoChuyenMon;
    else if (!isNullOrWhiteSpace(gv.HocVi)) spec = gv.HocVi!;
    else spec = 'Chuyên môn đa ngành';
    if (spec) specFrequency.set(spec, (specFrequency.get(spec) ?? 0) + 1);

    teachers.push({
      teacherId: gv.MaGiangVien,
      name: gv.nguoidung?.HoTen ?? `Giảng viên ${gv.MaGiangVien.substring(0, 6)}`,
      email: gv.nguoidung?.Email ?? `gv_${gv.MaGiangVien.substring(0, 6)}@qltt.local`,
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

  const needFill = DESIRED_TEACHERS - teachers.length;
  if (needFill > 0) {
    teachers.push(...buildFallbackTeachersReport(needFill).teachers);
    usesFallback = true;
  }

  // OrderByDescending(Value).First(): sort on dinh -> lay chuyen mon xuat hien nhieu nhat, gap dau tien.
  let topSpec = 'IELTS';
  let topCount = -1;
  for (const [k, v] of specFrequency) {
    if (v > topCount) {
      topSpec = k;
      topCount = v;
    }
  }

  const hasReal = dbTeachers.length > 0;
  return {
    summary: {
      totalTeachers: Math.max(dbTeachers.length, DESIRED_TEACHERS),
      totalActiveTeachers: teachers.filter((t) => t.ongoingClasses + t.upcomingClasses > 0).length,
      totalUnassignedTeachers: hasReal ? dbTeachers.filter((g) => g.giangvienlophoc.length === 0).length : 0,
      avgClassPerTeacher: dotnetRound(avgOf(teachers.map((t) => t.classCount)), 2),
      avgStudentsPerTeacher: dotnetRound(avgOf(teachers.map((t) => t.totalStudents)), 1),
      assignedTeachers: hasReal ? dbTeachers.filter((g) => g.giangvienlophoc.length > 0).length : DESIRED_TEACHERS,
      topSpecialization: topSpec,
    },
    teachers,
    usesFallback,
  };
}
