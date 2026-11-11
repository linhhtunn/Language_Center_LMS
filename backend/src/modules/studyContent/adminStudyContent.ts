import { Router } from 'express';
import { prisma } from '../../db.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ok } from '../../utils/apiResponse.js';
import {
  ACTIVE,
  CLASS_NOT_FOUND,
  COURSE_NOT_FOUND,
  DOCUMENT_NOT_FOUND,
  type ModelErrors,
  bindQueryGuid,
  dateOnlyString,
  g,
  guidRoute,
  loadChaptersWithDocuments,
  notFoundFail,
  routeGuid,
  sendStoredDocument,
  sendValidationProblem,
} from './studyContent.shared.js';

// Chuyen tu Controllers/AdminStudyContentController.cs
// [Route("api/AdminStudyContent")] + [AuthorizeByPermission("STUDY_CONTENT_ADMIN")] cho ca controller.
// Admin chi XEM noi dung hoc tap cua moi khoa hoc / lop hoc va tai tai lieu.

export const adminStudyContentRouter = Router();
const perm = requirePermission('STUDY_CONTENT_ADMIN');
const BASE = '/api/AdminStudyContent';

// GET api/AdminStudyContent/courses
adminStudyContentRouter.get(`${BASE}/courses`, ...perm, async (_req, res) => {
  const rows = await prisma.khoahoc.findMany({
    where: ACTIVE,
    orderBy: { TenKhoaHoc: 'asc' },
    select: {
      MaKhoaHoc: true,
      TenKhoaHoc: true,
      _count: { select: { chitietkhoahoc_lophoc: { where: ACTIVE }, chuonghoc: { where: ACTIVE } } },
    },
  });
  const courses = rows.map((x) => ({
    maKhoaHoc: g(x.MaKhoaHoc),
    tenKhoaHoc: x.TenKhoaHoc,
    soLopHoc: x._count.chitietkhoahoc_lophoc,
    soChuongHoc: x._count.chuonghoc,
  }));
  return res.json(ok(courses, 'Lấy danh sách khóa học thành công.'));
});

// GET api/AdminStudyContent/courses/{courseId:guid}/classes
adminStudyContentRouter.get(`${BASE}/courses/:courseId/classes`, guidRoute('courseId'), ...perm, async (req, res) => {
  const courseId = routeGuid(req, 'courseId');
  const courseExists = await prisma.khoahoc.count({ where: { MaKhoaHoc: courseId, ...ACTIVE } });
  if (!courseExists) return notFoundFail(res, ...COURSE_NOT_FOUND);

  const rows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: { MaKhoaHoc: courseId, ...ACTIVE },
    orderBy: { lophoc: { TenLop: 'asc' } },
    select: {
      MaLopHoc: true,
      MaKhoaHoc: true,
      lophoc: { select: { TenLop: true, NgayBatDau: true, NgayKetThuc: true } },
    },
  });
  const classes = rows.map((x) => ({
    maLopHoc: g(x.MaLopHoc),
    maKhoaHoc: g(x.MaKhoaHoc),
    tenLop: x.lophoc.TenLop,
    ngayBatDau: dateOnlyString(x.lophoc.NgayBatDau),
    ngayKetThuc: dateOnlyString(x.lophoc.NgayKetThuc),
    laLopHienTai: false,
  }));
  return res.json(ok(classes, 'Lấy danh sách lớp học thành công.'));
});

// GET api/AdminStudyContent/contents?courseId=&classId=
adminStudyContentRouter.get(`${BASE}/contents`, ...perm, async (req, res) => {
  const errors: ModelErrors = [];
  const courseId = bindQueryGuid(req, 'courseId', false, errors);
  const classId = bindQueryGuid(req, 'classId', true, errors);
  if (errors.length) return sendValidationProblem(res, errors);

  const course = await prisma.khoahoc.findFirst({
    where: { MaKhoaHoc: courseId, ...ACTIVE },
    select: { MaKhoaHoc: true, TenKhoaHoc: true },
  });
  if (!course) return notFoundFail(res, ...COURSE_NOT_FOUND);

  let className: string | null = null;
  if (classId) {
    const mapping = await prisma.chitietkhoahoc_lophoc.findFirst({
      where: { MaKhoaHoc: courseId, MaLopHoc: classId, ...ACTIVE },
      select: { MaLopHoc: true, lophoc: { select: { TenLop: true } } },
    });
    if (!mapping) return notFoundFail(res, ...CLASS_NOT_FOUND);
    className = mapping.lophoc.TenLop;
  }

  const chapters = await loadChaptersWithDocuments(courseId, classId, null, 'admin');
  const overview = {
    maKhoaHoc: g(course.MaKhoaHoc),
    tenKhoaHoc: course.TenKhoaHoc,
    maLopHoc: classId,
    tenLop: className,
    noiDungHocTap: chapters,
  };
  return res.json(ok(overview, 'Lấy nội dung học tập thành công.'));
});

// GET api/AdminStudyContent/documents/{documentId:guid}/download
adminStudyContentRouter.get(
  `${BASE}/documents/:documentId/download`,
  guidRoute('documentId'),
  ...perm,
  async (req, res) => {
    const documentId = routeGuid(req, 'documentId');
    const document = await prisma.tailieu.findFirst({
      where: { MaTaiLieu: documentId, ...ACTIVE },
      select: { TenTaiLieu: true, LinkTaiLieu: true },
    });
    if (!document) return notFoundFail(res, ...DOCUMENT_NOT_FOUND);
    return sendStoredDocument(req, res, document.TenTaiLieu, document.LinkTaiLieu);
  },
);
