import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ok } from '../../utils/apiResponse.js';
import {
  ACTIVE,
  CLASS_NOT_FOUND,
  COURSE_NOT_FOUND,
  DOCUMENT_CLASS_MISMATCH,
  DOCUMENT_NOT_FOUND,
  type Check,
  type ModelErrors,
  bindQueryGuid,
  compareCulture,
  dateOnlyString,
  errCheck,
  g,
  gn,
  guidRoute,
  loadChaptersWithDocuments,
  notFoundFail,
  okCheck,
  routeGuid,
  sendStoredDocument,
  sendValidationProblem,
  todayDateOnly,
} from './studyContent.shared.js';

// Chuyen tu Controllers/StudentStudyContentController.cs
// [Route("api/StudentStudyContent")] + [AuthorizeByPermission("STUDY_CONTENT_STUDENT")] cho ca controller.
// Hoc sinh xem noi dung hoc tap cua cac lop minh da/dang hoc va tai tai lieu.

export const studentStudyContentRouter = Router();
const perm = requirePermission('STUDY_CONTENT_STUDENT');
const BASE = '/api/StudentStudyContent';

const forbidden = <T>() =>
  errCheck<T>(403, 'Bạn không có quyền xem nội dung học tập của lớp này.', 'STUDY_CONTENT_FORBIDDEN');
const sendCheck = (res: Response, c: Check<unknown>) => (c.ok ? undefined : c.send(res));

interface StudentAuth {
  userId: string;
  studentId: string;
}

/** ResolveCurrentStudentAsync */
async function resolveCurrentStudent(req: Request): Promise<Check<StudentAuth>> {
  const userId = req.user?.userId;
  if (!userId) return errCheck(401, 'Bạn chưa đăng nhập.', 'AUTH_INVALID_TOKEN');
  const student = await prisma.hocsinh.findFirst({
    where: { MaNguoiDung: userId, ...ACTIVE },
    select: { MaHocSinh: true },
  });
  if (!student) return errCheck(404, 'Không tìm thấy hồ sơ học sinh.', 'STUDENT_PROFILE_NOT_FOUND');
  return okCheck({ userId: g(userId), studentId: g(student.MaHocSinh) });
}

/** QueryAccessibleStudentClasses: hocsinhlophoc dang hoat dong va da den ngay tham gia (chua xet ngay roi lop). */
function accessibleStudentClassWhere(studentId: string): Prisma.hocsinhlophocWhereInput {
  return {
    MaHocSinh: studentId,
    AND: [...ACTIVE.AND, { OR: [{ NgayThamGia: null }, { NgayThamGia: { lte: todayDateOnly() } }] }],
  };
}

/** Lop thuoc khoa hoc (dang hoat dong) ma hoc sinh truy cap duoc. */
const studentCourseClassWhere = (studentId: string, courseId: string): Prisma.chitietkhoahoc_lophocWhereInput => ({
  MaKhoaHoc: courseId,
  ...ACTIVE,
  lophoc: { hocsinhlophoc: { some: accessibleStudentClassWhere(studentId) } },
});

/** GetStudentClassIdsByCourseAsync */
async function getStudentClassIdsByCourse(studentId: string, courseId: string): Promise<string[]> {
  const rows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: studentCourseClassWhere(studentId, courseId),
    select: { MaLopHoc: true },
  });
  return [...new Set(rows.map((r) => g(r.MaLopHoc)))];
}

/** EnsureStudentHasClassInCourseAsync -> ten lop, hoac 404 (lop khong thuoc khoa) / 403. */
async function ensureStudentHasClassInCourse(studentId: string, courseId: string, classId: string): Promise<Check<string>> {
  const classInfo = await prisma.chitietkhoahoc_lophoc.findFirst({
    where: { ...studentCourseClassWhere(studentId, courseId), MaLopHoc: classId },
    select: { lophoc: { select: { TenLop: true } } },
  });
  if (!classInfo) {
    const classBelongsToCourse = await prisma.chitietkhoahoc_lophoc.count({
      where: { MaKhoaHoc: courseId, MaLopHoc: classId, ...ACTIVE },
    });
    if (!classBelongsToCourse) return errCheck(404, ...CLASS_NOT_FOUND);
    return forbidden();
  }
  return okCheck(classInfo.lophoc.TenLop);
}

async function courseExists(courseId: string): Promise<boolean> {
  return (await prisma.khoahoc.count({ where: { MaKhoaHoc: courseId, ...ACTIVE } })) > 0;
}

interface CurrentContext {
  courseId: string;
  courseName: string;
  classId: string;
  className: string;
}

/**
 * ResolveCurrentStudyContextAsync: lop dang hoc hom nay (da tham gia, chua roi lop).
 * Neu du lieu cu con nhieu lop dang hoat dong thi lay lop moi nhat
 * (NgayThamGia giam dan, roi NgayBatDau cua lop, roi ThoiGianTao).
 */
async function resolveCurrentStudyContext(studentId: string): Promise<Check<CurrentContext>> {
  const today = todayDateOnly();
  const currentWhere: Prisma.hocsinhlophocWhereInput = {
    MaHocSinh: studentId,
    AND: [
      ...ACTIVE.AND,
      { OR: [{ NgayThamGia: null }, { NgayThamGia: { lte: today } }] },
      { OR: [{ NgayRoiLop: null }, { NgayRoiLop: { gte: today } }] },
    ],
  };
  const rows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: { ...ACTIVE, lophoc: { hocsinhlophoc: { some: currentWhere } } },
    select: {
      MaKhoaHoc: true,
      MaLopHoc: true,
      khoahoc: { select: { TenKhoaHoc: true } },
      lophoc: {
        select: {
          TenLop: true,
          NgayBatDau: true,
          hocsinhlophoc: { where: currentWhere, select: { NgayThamGia: true, ThoiGianTao: true } },
        },
      },
    },
  });

  const time = (d: Date | null) => (d ? d.getTime() : Number.NEGATIVE_INFINITY);
  const candidates = rows.flatMap((r) =>
    r.lophoc.hocsinhlophoc.map((sc) => ({
      courseId: g(r.MaKhoaHoc),
      courseName: r.khoahoc.TenKhoaHoc,
      classId: g(r.MaLopHoc),
      className: r.lophoc.TenLop,
      ngayThamGia: time(sc.NgayThamGia),
      ngayBatDauLop: time(r.lophoc.NgayBatDau),
      thoiGianTao: time(sc.ThoiGianTao),
    })),
  );
  candidates.sort(
    (a, b) => b.ngayThamGia - a.ngayThamGia || b.ngayBatDauLop - a.ngayBatDauLop || b.thoiGianTao - a.thoiGianTao,
  );

  const current = candidates[0];
  if (!current) {
    return errCheck(404, 'Học sinh chưa được xếp lớp học hiện tại.', 'STUDY_CONTENT_CURRENT_ENROLLMENT_NOT_FOUND');
  }
  return okCheck({
    courseId: current.courseId,
    courseName: current.courseName,
    classId: current.classId,
    className: current.className,
  });
}

// ------------------------------------------------------------------ GET current-content
studentStudyContentRouter.get(`${BASE}/current-content`, ...perm, async (req, res) => {
  const auth = await resolveCurrentStudent(req);
  if (!auth.ok) return sendCheck(res, auth);

  const ctx = await resolveCurrentStudyContext(auth.value.studentId);
  if (!ctx.ok) return sendCheck(res, ctx);
  const { courseId, courseName, classId, className } = ctx.value;

  const chapters = await loadChaptersWithDocuments(courseId, classId, [classId], 'scoped');
  return res.json(
    ok(
      { maKhoaHoc: courseId, tenKhoaHoc: courseName, maLopHoc: classId, tenLop: className, noiDungHocTap: chapters },
      'Lấy nội dung học tập hiện tại thành công.',
    ),
  );
});

// ------------------------------------------------------------------ GET courses
studentStudyContentRouter.get(`${BASE}/courses`, ...perm, async (req, res) => {
  const auth = await resolveCurrentStudent(req);
  if (!auth.ok) return sendCheck(res, auth);

  const enrolledCourses = (
    await prisma.chitietkhoahoc_lophoc.findMany({
      where: {
        ...ACTIVE,
        khoahoc: ACTIVE,
        lophoc: { hocsinhlophoc: { some: accessibleStudentClassWhere(auth.value.studentId) } },
      },
      select: { MaKhoaHoc: true, MaLopHoc: true, khoahoc: { select: { TenKhoaHoc: true } } },
    })
  ).map((x) => ({ maKhoaHoc: g(x.MaKhoaHoc), maLopHoc: g(x.MaLopHoc), tenKhoaHoc: x.khoahoc.TenKhoaHoc }));

  const courseIds = [...new Set(enrolledCourses.map((x) => x.maKhoaHoc))];
  const enrolledClassKeys = new Set(enrolledCourses.map((x) => `${x.maKhoaHoc}:${x.maLopHoc}`));

  const chapterCounts = new Map<string, number>();
  if (courseIds.length > 0) {
    const chapters = await prisma.chuonghoc.findMany({
      where: { MaLopHoc: { not: null }, MaKhoaHoc: { in: courseIds }, ...ACTIVE },
      select: { MaKhoaHoc: true, MaLopHoc: true },
    });
    for (const c of chapters) {
      if (c.MaLopHoc == null || !enrolledClassKeys.has(`${g(c.MaKhoaHoc)}:${g(c.MaLopHoc)}`)) continue;
      chapterCounts.set(g(c.MaKhoaHoc), (chapterCounts.get(g(c.MaKhoaHoc)) ?? 0) + 1);
    }
  }

  const groups = new Map<string, { maKhoaHoc: string; tenKhoaHoc: string; classes: Set<string> }>();
  for (const x of enrolledCourses) {
    const key = `${x.maKhoaHoc}\u0000${x.tenKhoaHoc}`;
    const grp = groups.get(key) ?? { maKhoaHoc: x.maKhoaHoc, tenKhoaHoc: x.tenKhoaHoc, classes: new Set<string>() };
    grp.classes.add(x.maLopHoc);
    groups.set(key, grp);
  }
  const courses = [...groups.values()]
    .map((x) => ({
      maKhoaHoc: x.maKhoaHoc,
      tenKhoaHoc: x.tenKhoaHoc,
      soLopHoc: x.classes.size,
      soChuongHoc: chapterCounts.get(x.maKhoaHoc) ?? 0,
    }))
    .sort((a, b) => compareCulture(a.tenKhoaHoc, b.tenKhoaHoc));

  return res.json(ok(courses, 'Lấy danh sách khóa học của học sinh thành công.'));
});

// ------------------------------------------------------------------ GET courses/{courseId:guid}/classes
studentStudyContentRouter.get(`${BASE}/courses/:courseId/classes`, guidRoute('courseId'), ...perm, async (req, res) => {
  const courseId = routeGuid(req, 'courseId');
  const auth = await resolveCurrentStudent(req);
  if (!auth.ok) return sendCheck(res, auth);

  const today = todayDateOnly();
  const rows = await prisma.hocsinhlophoc.findMany({
    where: {
      ...accessibleStudentClassWhere(auth.value.studentId),
      lophoc: { chitietkhoahoc_lophoc: { some: { MaKhoaHoc: courseId, ...ACTIVE } } },
    },
    select: {
      NgayRoiLop: true,
      lophoc: { select: { MaLopHoc: true, TenLop: true, NgayBatDau: true, NgayKetThuc: true } },
    },
  });

  const groups = new Map<
    string,
    { maLopHoc: string; maKhoaHoc: string; tenLop: string; ngayBatDau: string | null; ngayKetThuc: string | null; laLopHienTai: boolean }
  >();
  for (const r of rows) {
    const item = {
      maLopHoc: g(r.lophoc.MaLopHoc),
      maKhoaHoc: courseId,
      tenLop: r.lophoc.TenLop,
      ngayBatDau: dateOnlyString(r.lophoc.NgayBatDau),
      ngayKetThuc: dateOnlyString(r.lophoc.NgayKetThuc),
      laLopHienTai: !r.NgayRoiLop || r.NgayRoiLop.getTime() >= today.getTime(),
    };
    const key = JSON.stringify([item.maLopHoc, item.maKhoaHoc, item.tenLop, item.ngayBatDau, item.ngayKetThuc]);
    const existing = groups.get(key);
    if (existing) existing.laLopHienTai ||= item.laLopHienTai;
    else groups.set(key, item);
  }
  const classes = [...groups.values()].sort(
    (a, b) =>
      Number(b.laLopHienTai) - Number(a.laLopHienTai) ||
      compareCulture(b.ngayKetThuc ?? '', a.ngayKetThuc ?? '') ||
      compareCulture(b.ngayBatDau ?? '', a.ngayBatDau ?? '') ||
      compareCulture(a.tenLop, b.tenLop),
  );

  if (classes.length === 0) {
    if (!(await courseExists(courseId))) return notFoundFail(res, ...COURSE_NOT_FOUND);
    return sendCheck(res, forbidden());
  }

  return res.json(ok(classes, 'Lấy danh sách lớp học của học sinh thành công.'));
});

// ------------------------------------------------------------------ GET contents?courseId=&classId=
studentStudyContentRouter.get(`${BASE}/contents`, ...perm, async (req, res) => {
  const errors: ModelErrors = [];
  const courseId = bindQueryGuid(req, 'courseId', false, errors);
  const classId = bindQueryGuid(req, 'classId', true, errors);
  if (errors.length) return sendValidationProblem(res, errors);

  const auth = await resolveCurrentStudent(req);
  if (!auth.ok) return sendCheck(res, auth);
  const { studentId } = auth.value;

  let className: string | null = null;
  let visibleClassIds: string[];
  if (classId) {
    const access = await ensureStudentHasClassInCourse(studentId, courseId, classId);
    if (!access.ok) return sendCheck(res, access);
    className = access.value;
    visibleClassIds = [classId];
  } else {
    visibleClassIds = await getStudentClassIdsByCourse(studentId, courseId);
    if (visibleClassIds.length === 0) {
      if (!(await courseExists(courseId))) return notFoundFail(res, ...COURSE_NOT_FOUND);
      return sendCheck(res, forbidden());
    }
  }

  const course = await prisma.khoahoc.findFirst({
    where: { MaKhoaHoc: courseId, ...ACTIVE },
    select: { TenKhoaHoc: true },
  });
  if (!course) return notFoundFail(res, ...COURSE_NOT_FOUND);

  const chapters = await loadChaptersWithDocuments(courseId, classId, visibleClassIds, 'scoped');
  return res.json(
    ok(
      { maKhoaHoc: courseId, tenKhoaHoc: course.TenKhoaHoc, maLopHoc: classId, tenLop: className, noiDungHocTap: chapters },
      'Lấy nội dung học tập thành công.',
    ),
  );
});

// ------------------------------------------------------------------ GET documents/{documentId:guid}/download?classId=
studentStudyContentRouter.get(
  `${BASE}/documents/:documentId/download`,
  guidRoute('documentId'),
  ...perm,
  async (req, res) => {
    const documentId = routeGuid(req, 'documentId');
    const errors: ModelErrors = [];
    const classId = bindQueryGuid(req, 'classId', true, errors);
    if (errors.length) return sendValidationProblem(res, errors);

    const auth = await resolveCurrentStudent(req);
    if (!auth.ok) return sendCheck(res, auth);
    const { studentId } = auth.value;

    const document = await prisma.tailieu.findFirst({
      where: { MaTaiLieu: documentId, ...ACTIVE },
      select: { TenTaiLieu: true, LinkTaiLieu: true, chuonghoc: { select: { MaKhoaHoc: true, MaLopHoc: true } } },
    });
    if (!document) return notFoundFail(res, ...DOCUMENT_NOT_FOUND);

    const maKhoaHoc = g(document.chuonghoc.MaKhoaHoc);
    const maLopHoc = gn(document.chuonghoc.MaLopHoc);
    if (classId) {
      if (maLopHoc !== classId) return notFoundFail(res, ...DOCUMENT_CLASS_MISMATCH);
      const access = await ensureStudentHasClassInCourse(studentId, maKhoaHoc, classId);
      if (!access.ok) return sendCheck(res, access);
    } else {
      if (!maLopHoc) return sendCheck(res, forbidden());
      const access = await ensureStudentHasClassInCourse(studentId, maKhoaHoc, maLopHoc);
      if (!access.ok) return sendCheck(res, access);
    }

    return sendStoredDocument(req, res, document.TenTaiLieu, document.LinkTaiLieu);
  },
);
