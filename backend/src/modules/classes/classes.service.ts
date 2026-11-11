import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { fail, type ApiResponse } from '../../utils/apiResponse.js';
import { toDateOnly } from '../../utils/dotnetCompat.js';
import type { ClassDto, ClassStudentDto, CourseDto, TeacherOverviewDto, UpsertClassRequest } from './classes.dto.js';
import { notFalse, notTrue, todayDateOnly } from './dtoBinding.js';

// Logic dung chung cua ClassesController.cs + ClassStudentsController.cs.

export type Db = Prisma.TransactionClient | typeof prisma;

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';
/** Guid ben .NET luon in chu thuong. */
export const g = (s: string) => s.toLowerCase();

const notDeleted = notTrue('DaXoa');
const activeNotDeleted = { AND: [notTrue('DaXoa'), notFalse('TrangThai')] };

// ---------- Include giong LoadClassAsync / GetAll ----------

const courseLinkInclude = {
  where: notDeleted as Prisma.chitietkhoahoc_lophocWhereInput,
  include: { khoahoc: true },
  orderBy: { MaKhoaHoc: 'asc' as const },
};

function classInclude(studentsWithUser: boolean) {
  return {
    chitietkhoahoc_lophoc: courseLinkInclude,
    giangvienlophoc: {
      where: notDeleted as Prisma.giangvienlophocWhereInput,
      include: { giangvien: { include: { nguoidung: true } } },
      orderBy: { MaGiangVien: 'asc' as const },
    },
    hocsinhlophoc: {
      where: activeNotDeleted as Prisma.hocsinhlophocWhereInput,
      include: { hocsinh: studentsWithUser ? { include: { nguoidung: true } } : false },
      orderBy: { MaHocSinh: 'asc' as const },
    },
  } satisfies Prisma.lophocInclude;
}

type CourseLink = Prisma.chitietkhoahoc_lophocGetPayload<{ include: { khoahoc: true } }>;
type LoadedClass = Prisma.lophocGetPayload<{
  include: {
    chitietkhoahoc_lophoc: { include: { khoahoc: true } };
    giangvienlophoc: { include: { giangvien: { include: { nguoidung: true } } } };
    hocsinhlophoc: { include: { hocsinh: { include: { nguoidung: true } } } };
  };
}>;
/** hocsinh co the khong duoc nap (assigned-to-me khong ThenInclude -> navigation null ben EF). */
type ClassForDto = Omit<LoadedClass, 'hocsinhlophoc'> & {
  hocsinhlophoc: (Omit<LoadedClass['hocsinhlophoc'][number], 'hocsinh'> & {
    hocsinh?: LoadedClass['hocsinhlophoc'][number]['hocsinh'] | null;
  })[];
};

function toCourseDto(x: CourseLink): CourseDto {
  return {
    id: g(x.MaKhoaHoc),
    name: x.khoahoc?.TenKhoaHoc ?? g(x.MaKhoaHoc),
    description: x.khoahoc?.MoTa ?? null,
    basePrice: (x.khoahoc?.GiaCoBan ?? null) as unknown as number | null, // Decimal -> number qua json replacer
    active: x.khoahoc?.TrangThai !== false,
  };
}

export function toClassDto(c: ClassForDto): ClassDto {
  const students = c.hocsinhlophoc.filter((x) => x.DaXoa !== true && x.TrangThai !== false);
  return {
    id: g(c.MaLopHoc),
    name: c.TenLop,
    startDate: toDateOnly(c.NgayBatDau),
    endDate: toDateOnly(c.NgayKetThuc),
    currentSize: c.SiSoHienTai ?? students.length,
    capacity: c.SiSoToiDa,
    active: c.TrangThai !== false,
    courses: c.chitietkhoahoc_lophoc.filter((x) => x.DaXoa !== true).map(toCourseDto),
    teachers: c.giangvienlophoc
      .filter((x) => x.DaXoa !== true)
      .map((x) => ({ id: g(x.MaGiangVien), name: x.giangvien?.nguoidung?.HoTen ?? g(x.MaGiangVien) })),
    students: students.map((x) => ({
      studentId: g(x.MaHocSinh),
      userId: x.hocsinh ? g(x.hocsinh.MaNguoiDung) : EMPTY_GUID,
      fullName: x.hocsinh?.nguoidung?.HoTen ?? g(x.MaHocSinh),
      email: x.hocsinh?.nguoidung?.Email ?? null,
      joinedAt: toDateOnly(x.NgayThamGia),
      active: x.TrangThai !== false,
    })),
  };
}

export async function listClasses(): Promise<ClassDto[]> {
  const rows = await prisma.lophoc.findMany({
    where: notDeleted as Prisma.lophocWhereInput,
    include: classInclude(true),
    orderBy: { TenLop: 'asc' },
  });
  return (rows as unknown as ClassForDto[]).map(toClassDto);
}

export async function listClassesAssignedTo(teacherId: string): Promise<ClassDto[]> {
  const rows = await prisma.lophoc.findMany({
    where: {
      ...notDeleted,
      giangvienlophoc: { some: { MaGiangVien: teacherId, ...activeNotDeleted } },
    } as Prisma.lophocWhereInput,
    // Ban .NET khong ThenInclude hoc sinh o day -> navigation null: userId = Guid.Empty, fullName = MaHocSinh, email = null.
    include: classInclude(false),
    orderBy: { TenLop: 'asc' },
  });
  return rows.map((r) => toClassDto(r as unknown as ClassForDto));
}

export async function teachersOverview(): Promise<TeacherOverviewDto[]> {
  const teachers = await prisma.giangvien.findMany({
    where: notDeleted as Prisma.giangvienWhereInput,
    include: {
      nguoidung: true,
      giangvienlophoc: {
        where: notDeleted as Prisma.giangvienlophocWhereInput,
        include: { lophoc: { include: { chitietkhoahoc_lophoc: courseLinkInclude } } },
        orderBy: { MaLopHoc: 'asc' },
      },
    },
    orderBy: { nguoidung: { HoTen: 'asc' } },
  });
  return teachers.map((t) => ({
    id: g(t.MaGiangVien),
    name: t.nguoidung?.HoTen ?? g(t.MaGiangVien),
    email: t.nguoidung?.Email ?? null,
    classes: t.giangvienlophoc
      .filter((x) => x.DaXoa !== true && x.lophoc && x.lophoc.DaXoa !== true)
      .map((x) => ({
        classId: g(x.MaLopHoc),
        className: x.lophoc.TenLop,
        courses: x.lophoc.chitietkhoahoc_lophoc.filter((c) => c.DaXoa !== true).map(toCourseDto),
      })),
  }));
}

export async function loadClass(id: string, db: Db = prisma): Promise<LoadedClass | null> {
  return db.lophoc.findFirst({
    where: { MaLopHoc: id, ...notDeleted } as Prisma.lophocWhereInput,
    include: classInclude(true),
  }) as Promise<LoadedClass | null>;
}

export async function countActiveStudents(classId: string, db: Db = prisma): Promise<number> {
  return db.hocsinhlophoc.count({ where: { MaLopHoc: classId, ...activeNotDeleted } as Prisma.hocsinhlophocWhereInput });
}

const distinct = (ids: string[] | null | undefined) => [...new Set(ids ?? [])];

/** ValidateRequestAsync */
export async function validateRequest(request: UpsertClassRequest, currentId: string | null = null): Promise<ApiResponse<null> | null> {
  if (!request.Name || !request.Name.trim()) return fail('Ten lop hoc la bat buoc.', 'CLASS_NAME_REQUIRED');
  if (request.Capacity !== null && request.Capacity <= 0) return fail('Suc chua lop phai lon hon 0.', 'CLASS_INVALID_CAPACITY');

  const nameExists = await prisma.lophoc.count({
    where: {
      ...notDeleted,
      TenLop: request.Name.trim(),
      ...(currentId ? { NOT: { MaLopHoc: currentId } } : {}),
    } as Prisma.lophocWhereInput,
  });
  if (nameExists > 0) return fail('Ten lop hoc da ton tai.', 'CLASS_NAME_EXISTS');

  const courseIds = distinct(request.CourseIds);
  if (courseIds.length > 0) {
    const count = await prisma.khoahoc.count({ where: { MaKhoaHoc: { in: courseIds }, ...notDeleted } as Prisma.khoahocWhereInput });
    if (count !== courseIds.length) return fail('Mot hoac nhieu khoa hoc khong ton tai.', 'COURSE_NOT_FOUND');
  }

  const teacherIds = distinct(request.TeacherIds);
  if (teacherIds.length > 0) {
    const count = await prisma.giangvien.count({ where: { MaGiangVien: { in: teacherIds }, ...notDeleted } as Prisma.giangvienWhereInput });
    if (count !== teacherIds.length) return fail('Mot hoac nhieu giao vien khong ton tai.', 'TEACHER_NOT_FOUND');
  }
  return null;
}

/** ReplaceCourseLinksAsync: bat/tat lien ket cu, them lien ket moi. */
export async function replaceCourseLinks(db: Db, classId: string, courseIdsIn: string[] | null) {
  const courseIds = distinct(courseIdsIn);
  const now = new Date();
  const existing = await db.chitietkhoahoc_lophoc.findMany({ where: { MaLopHoc: classId } });
  for (const link of existing) {
    const shouldActive = courseIds.includes(g(link.MaKhoaHoc));
    await db.chitietkhoahoc_lophoc.update({
      where: { MaKhoaHoc_MaLopHoc: { MaKhoaHoc: link.MaKhoaHoc, MaLopHoc: link.MaLopHoc } },
      data: { DaXoa: !shouldActive, TrangThai: shouldActive, ThoiGianSua: now },
    });
  }
  const existingIds = new Set(existing.map((x) => g(x.MaKhoaHoc)));
  const toAdd = courseIds.filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    await db.chitietkhoahoc_lophoc.createMany({
      data: toAdd.map((MaKhoaHoc) => ({ MaLopHoc: classId, MaKhoaHoc, TrangThai: true, DaXoa: false, ThoiGianTao: now })),
    });
  }
}

/** ReplaceTeacherLinksAsync */
export async function replaceTeacherLinks(db: Db, classId: string, teacherIdsIn: string[] | null) {
  const teacherIds = distinct(teacherIdsIn);
  const now = new Date();
  const existing = await db.giangvienlophoc.findMany({ where: { MaLopHoc: classId } });
  for (const link of existing) {
    const shouldActive = teacherIds.includes(g(link.MaGiangVien));
    await db.giangvienlophoc.update({
      where: { MaLopHoc_MaGiangVien: { MaLopHoc: link.MaLopHoc, MaGiangVien: link.MaGiangVien } },
      data: { DaXoa: !shouldActive, TrangThai: shouldActive, ThoiGianSua: now },
    });
  }
  const existingIds = new Set(existing.map((x) => g(x.MaGiangVien)));
  const toAdd = teacherIds.filter((id) => !existingIds.has(id));
  if (toAdd.length > 0) {
    await db.giangvienlophoc.createMany({
      data: toAdd.map((MaGiangVien) => ({
        MaLopHoc: classId,
        MaGiangVien,
        NgayThamGia: todayDateOnly(),
        TrangThai: true,
        DaXoa: false,
        ThoiGianTao: now,
      })),
    });
  }
}

// ---------- ClassStudentsController ----------

type Enrollment = Prisma.hocsinhlophocGetPayload<{ include: { hocsinh: { include: { nguoidung: true } } } }>;

export function toClassStudentDto(e: Enrollment): ClassStudentDto {
  const user = e.hocsinh.nguoidung;
  return {
    studentId: g(e.MaHocSinh),
    userId: g(user.MaNguoiDung),
    fullName: user.HoTen,
    email: user.Email,
    joinedAt: toDateOnly(e.NgayThamGia),
    active: e.TrangThai !== false && e.DaXoa !== true,
  };
}

/** CanManageClassAsync: Admin, hoac giao vien dang day lop (lien ket con hieu luc). */
export async function canManageClass(user: { role: string; profileId: string | null } | undefined, classId: string): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'Admin') return true;
  const teacherId = user.profileId;
  if (!teacherId) return false;
  const count = await prisma.giangvienlophoc.count({
    where: { MaLopHoc: classId, MaGiangVien: teacherId, ...activeNotDeleted } as Prisma.giangvienlophocWhereInput,
  });
  return count > 0;
}

export async function listClassStudents(classId: string): Promise<ClassStudentDto[]> {
  const rows = await prisma.hocsinhlophoc.findMany({
    where: { MaLopHoc: classId, ...notDeleted } as Prisma.hocsinhlophocWhereInput,
    include: { hocsinh: { include: { nguoidung: true } } },
    orderBy: { hocsinh: { nguoidung: { HoTen: 'asc' } } },
  });
  return rows.map(toClassStudentDto);
}

export async function loadEnrollment(classId: string, studentId: string, db: Db = prisma): Promise<Enrollment | null> {
  return db.hocsinhlophoc.findFirst({
    where: { MaLopHoc: classId, MaHocSinh: studentId },
    include: { hocsinh: { include: { nguoidung: true } } },
  });
}
