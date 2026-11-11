import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import { Router, type Request, type Response } from 'express';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { requirePermission } from '../../middlewares/permission.js';
import { ok } from '../../utils/apiResponse.js';
import { saveUpload, upload } from '../../utils/upload.js';
import {
  ACTIVE,
  CLASS_NOT_FOUND,
  COURSE_NOT_FOUND,
  DOCUMENT_CLASS_MISMATCH,
  DOCUMENT_NOT_FOUND,
  EMPTY_GUID,
  NOT_DELETED,
  type Check,
  type ModelErrors,
  type UploadedFile,
  badRequestFail,
  bindJsonBody,
  bindQueryGuid,
  buildDocumentDto,
  compareCulture,
  dateOnlyString,
  errCheck,
  formFile,
  formGuid,
  formString,
  g,
  gn,
  guidRoute,
  isExternalUrl,
  isStoredStudyMaterialPath,
  loadChaptersWithDocuments,
  normalizeOptional,
  notFoundFail,
  okCheck,
  resolveDocumentDisplayName,
  routeGuid,
  sendStoredDocument,
  sendValidationProblem,
  studyMaterialDiskPath,
} from './studyContent.shared.js';

// Chuyen tu Controllers/TeacherStudyContentController.cs
// [Route("api/TeacherStudyContent")] + [AuthorizeByPermission("STUDY_CONTENT_TEACHER")] cho ca controller.
// Giang vien quan ly chuong hoc / tai lieu theo tung lop minh duoc phan cong.

export const teacherStudyContentRouter = Router();
const perm = requirePermission('STUDY_CONTENT_TEACHER');
const BASE = '/api/TeacherStudyContent';

const MAX_STUDY_FILE_SIZE = 100 * 1024 * 1024;
const ALLOWED_STUDY_FILE_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp3', '.wav', '.m4a', '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.txt', '.zip', '.rar',
];

const forbidden = <T>() =>
  errCheck<T>(403, 'Bạn không có quyền thao tác nội dung học tập của lớp này.', 'STUDY_CONTENT_FORBIDDEN');

// ------------------------------------------------------------------ helper rieng (private ben .NET)

interface TeacherAuth {
  userId: string;
  teacherId: string;
}

/** ResolveCurrentTeacherAsync: tim ho so giang vien theo nguoi dung dang nhap. */
async function resolveCurrentTeacher(req: Request): Promise<Check<TeacherAuth>> {
  const userId = req.user?.userId;
  if (!userId) return errCheck(401, 'Bạn chưa đăng nhập.', 'AUTH_INVALID_TOKEN');
  const teacher = await prisma.giangvien.findFirst({
    where: { MaNguoiDung: userId, ...ACTIVE },
    select: { MaGiangVien: true },
  });
  if (!teacher) return errCheck(404, 'Không tìm thấy hồ sơ giảng viên.', 'TEACHER_PROFILE_NOT_FOUND');
  return okCheck({ userId: g(userId), teacherId: g(teacher.MaGiangVien) });
}

/** Lop thuoc khoa hoc (chitietkhoahoc_lophoc dang hoat dong) VA giang vien dang duoc phan cong lop do. */
const teacherCourseClassWhere = (teacherId: string, courseId: string): Prisma.chitietkhoahoc_lophocWhereInput => ({
  MaKhoaHoc: courseId,
  ...ACTIVE,
  lophoc: { giangvienlophoc: { some: { MaGiangVien: teacherId, ...ACTIVE } } },
});

/** GetTeacherClassIdsByCourseAsync */
async function getTeacherClassIdsByCourse(teacherId: string, courseId: string): Promise<string[]> {
  const rows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: teacherCourseClassWhere(teacherId, courseId),
    select: { MaLopHoc: true },
  });
  return [...new Set(rows.map((r) => g(r.MaLopHoc)))];
}

/** EnsureTeacherHasClassInCourseAsync -> ten lop, hoac 404 (lop khong thuoc khoa) / 403 (khong phu trach). */
async function ensureTeacherHasClassInCourse(teacherId: string, courseId: string, classId: string): Promise<Check<string>> {
  const classInfo = await prisma.chitietkhoahoc_lophoc.findFirst({
    where: { ...teacherCourseClassWhere(teacherId, courseId), MaLopHoc: classId },
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

/** GetNextChapterOrderAsync */
async function getNextChapterOrder(courseId: string, classId: string): Promise<number> {
  const agg = await prisma.chuonghoc.aggregate({
    where: { MaKhoaHoc: courseId, MaLopHoc: classId, ...ACTIVE },
    _max: { ThuTu: true },
  });
  return (agg._max.ThuTu ?? 0) + 1;
}

/** Ban ghi tainguyenluutru se duoc luu cung luc voi tai lieu (giong _context.Add roi SaveChanges). */
type PendingResource = Prisma.tainguyenluutruCreateManyInput;

/** SaveStudyMaterialAsync: kiem tra file, ghi vao uploads/study-materials/study_<user:N>_<guid:N><ext>. */
async function saveStudyMaterial(
  file: UploadedFile,
  userId: string,
  now: Date,
): Promise<Check<{ link: string; resource: PendingResource }>> {
  if (file.size === 0) return errCheck(400, 'File tài liệu đang rỗng.', 'STUDY_CONTENT_FILE_EMPTY');
  if (file.size > MAX_STUDY_FILE_SIZE) {
    return errCheck(400, 'Dung lượng tài liệu không vượt quá 100MB.', 'STUDY_CONTENT_FILE_TOO_LARGE');
  }
  const ext = dotnetGetExtension(file.originalname).toLowerCase();
  if (!ALLOWED_STUDY_FILE_EXTENSIONS.includes(ext)) {
    return errCheck(400, 'Định dạng tài liệu chưa được hỗ trợ.', 'STUDY_CONTENT_FILE_EXTENSION_INVALID');
  }

  const storedFileName = `study_${userId.replaceAll('-', '')}_${randomUUID().replaceAll('-', '')}${ext}`;
  const saved = await saveUpload(file, 'study-materials', storedFileName);
  const relativePath = `/uploads/study-materials/${storedFileName}`;
  return okCheck({
    link: relativePath,
    resource: {
      MaTaiNguyen: randomUUID(),
      MaNguoiDung: userId,
      TenTaiNguyen: storedFileName,
      Link: saved.url,
      NguoiTao: userId,
      ThoiGianTao: now,
      TrangThai: true,
      DaXoa: false,
    },
  });
}

/** Path.GetExtension cho ten file goc (IFormFile.FileName). */
function dotnetGetExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  const sep = Math.max(name.lastIndexOf('/'), name.lastIndexOf('\\'));
  if (dot < 0 || dot < sep || dot === name.length - 1) return '';
  return name.slice(dot);
}

/** ResolveDocumentSourceAsync: file upload HOAC link ngoai http(s). */
async function resolveDocumentSource(
  file: UploadedFile | null,
  externalLink: string | null,
  userId: string,
  now: Date,
): Promise<Check<{ link: string; resource: PendingResource | null }>> {
  if (!file && (externalLink == null || externalLink.trim() === '')) {
    return errCheck(400, 'Tài liệu phải có file upload hoặc link ngoài hợp lệ.', 'STUDY_CONTENT_DOCUMENT_SOURCE_REQUIRED');
  }
  if (file) {
    const saved = await saveStudyMaterial(file, userId, now);
    return saved.ok ? okCheck({ link: saved.value.link, resource: saved.value.resource }) : saved;
  }
  if (!isExternalUrl(externalLink)) {
    return errCheck(400, 'Link tài liệu ngoài phải là http hoặc https hợp lệ.', 'STUDY_CONTENT_DOCUMENT_LINK_INVALID');
  }
  return okCheck({ link: externalLink!.trim(), resource: null });
}

/**
 * CleanupDocumentFileAsync: xoa file vat ly (neu la file trong study-materials) ngay lap tuc,
 * tra ve thao tac danh dau tainguyenluutru (Link trung) da xoa de chay trong transaction luc "SaveChanges".
 * (Tra ve ham tao thao tac, KHONG tra PrismaPromise tu ham async vi se bi await va chay ngay.)
 */
async function cleanupDocumentFile(
  currentPath: string | null,
  userId: string,
  now: Date,
): Promise<(() => Prisma.PrismaPromise<unknown>) | null> {
  if (currentPath == null || currentPath.trim() === '') return null;
  const trimmed = currentPath.trim();
  if (isStoredStudyMaterialPath(trimmed)) {
    const disk = studyMaterialDiskPath(trimmed);
    if (disk) {
      const st = await fs.stat(disk).catch(() => null);
      if (st?.isFile()) await fs.rm(disk, { force: true });
    }
  }
  const resources = await prisma.tainguyenluutru.findMany({
    where: { Link: trimmed, ...NOT_DELETED },
    select: { MaTaiNguyen: true },
  });
  if (resources.length === 0) return null;
  const ids = resources.map((r) => r.MaTaiNguyen);
  return () =>
    prisma.tainguyenluutru.updateMany({
      where: { MaTaiNguyen: { in: ids } },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    });
}

function chapterDto(
  c: { MaChuong: string; MaKhoaHoc: string; MaLopHoc: string | null; TenChuong: string; MoTa: string | null; ThuTu: number | null },
  tenLop: string | null,
) {
  return {
    maChuong: g(c.MaChuong),
    maKhoaHoc: g(c.MaKhoaHoc),
    maLopHoc: gn(c.MaLopHoc),
    tenLop,
    tenChuong: c.TenChuong,
    moTa: c.MoTa,
    thuTu: c.ThuTu,
    taiLieu: [] as unknown[],
  };
}

const sendCheck = (res: Response, c: Check<unknown>) => (c.ok ? undefined : c.send(res));

// ------------------------------------------------------------------ GET courses
// Giang vien chi nhin thay cac khoa hoc co it nhat mot lop dang duoc phan cong.
teacherStudyContentRouter.get(`${BASE}/courses`, ...perm, async (req, res) => {
  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);
  const { teacherId } = auth.value;

  const assignedCourses = (
    await prisma.chitietkhoahoc_lophoc.findMany({
      where: {
        ...ACTIVE,
        khoahoc: ACTIVE,
        lophoc: { giangvienlophoc: { some: { MaGiangVien: teacherId, ...ACTIVE } } },
      },
      select: { MaKhoaHoc: true, MaLopHoc: true, khoahoc: { select: { TenKhoaHoc: true } } },
    })
  ).map((x) => ({ maKhoaHoc: g(x.MaKhoaHoc), maLopHoc: g(x.MaLopHoc), tenKhoaHoc: x.khoahoc.TenKhoaHoc }));

  const courseIds = [...new Set(assignedCourses.map((x) => x.maKhoaHoc))];
  const assignedClassKeys = new Set(assignedCourses.map((x) => `${x.maKhoaHoc}:${x.maLopHoc}`));

  const chapterCounts = new Map<string, number>();
  if (courseIds.length > 0) {
    const chapters = await prisma.chuonghoc.findMany({
      where: { MaLopHoc: { not: null }, MaKhoaHoc: { in: courseIds }, ...ACTIVE },
      select: { MaKhoaHoc: true, MaLopHoc: true },
    });
    for (const c of chapters) {
      if (c.MaLopHoc == null || !assignedClassKeys.has(`${g(c.MaKhoaHoc)}:${g(c.MaLopHoc)}`)) continue;
      chapterCounts.set(g(c.MaKhoaHoc), (chapterCounts.get(g(c.MaKhoaHoc)) ?? 0) + 1);
    }
  }

  const groups = new Map<string, { maKhoaHoc: string; tenKhoaHoc: string; classes: Set<string> }>();
  for (const x of assignedCourses) {
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

  return res.json(ok(courses, 'Lấy danh sách khóa học giảng dạy thành công.'));
});

// ------------------------------------------------------------------ GET courses/{courseId:guid}/classes
// Chi tra cac lop thuoc khoa hoc va thuoc phan cong cua chinh giang vien hien tai.
teacherStudyContentRouter.get(`${BASE}/courses/:courseId/classes`, guidRoute('courseId'), ...perm, async (req, res) => {
  const courseId = routeGuid(req, 'courseId');
  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  const rows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: teacherCourseClassWhere(auth.value.teacherId, courseId),
    orderBy: { lophoc: { TenLop: 'asc' } },
    select: {
      MaLopHoc: true,
      MaKhoaHoc: true,
      lophoc: { select: { TenLop: true, NgayBatDau: true, NgayKetThuc: true } },
    },
  });

  const seen = new Set<string>();
  const classes = rows
    .map((x) => ({
      maLopHoc: g(x.MaLopHoc),
      maKhoaHoc: g(x.MaKhoaHoc),
      tenLop: x.lophoc.TenLop,
      ngayBatDau: dateOnlyString(x.lophoc.NgayBatDau),
      ngayKetThuc: dateOnlyString(x.lophoc.NgayKetThuc),
      laLopHienTai: false,
    }))
    .filter((x) => {
      const key = JSON.stringify([x.maLopHoc, x.maKhoaHoc, x.tenLop, x.ngayBatDau, x.ngayKetThuc]);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => compareCulture(a.tenLop, b.tenLop));

  if (classes.length === 0) {
    if (!(await courseExists(courseId))) return notFoundFail(res, ...COURSE_NOT_FOUND);
    return sendCheck(res, forbidden());
  }

  return res.json(ok(classes, 'Lấy danh sách lớp học phụ trách thành công.'));
});

// ------------------------------------------------------------------ GET contents?courseId=&classId=
// Noi dung hoc tap duoc quan ly theo tung lop; classId quyet dinh dung pham vi du lieu duoc xem/sua.
teacherStudyContentRouter.get(`${BASE}/contents`, ...perm, async (req, res) => {
  const errors: ModelErrors = [];
  const courseId = bindQueryGuid(req, 'courseId', false, errors);
  const classId = bindQueryGuid(req, 'classId', true, errors);
  if (errors.length) return sendValidationProblem(res, errors);

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);
  const { teacherId } = auth.value;

  let className: string | null = null;
  let visibleClassIds: string[];
  if (classId) {
    const access = await ensureTeacherHasClassInCourse(teacherId, courseId, classId);
    if (!access.ok) return sendCheck(res, access);
    className = access.value;
    visibleClassIds = [classId];
  } else {
    visibleClassIds = await getTeacherClassIdsByCourse(teacherId, courseId);
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

// ------------------------------------------------------------------ POST chapters
teacherStudyContentRouter.post(`${BASE}/chapters`, ...perm, async (req, res) => {
  const dto = bindJsonBody(
    req,
    res,
    'dto',
    'CreateStudyChapterDto',
    { MaKhoaHoc: 'guid', MaLopHoc: 'guid', TenChuong: 'string', MoTa: 'string?', ThuTu: 'int?' },
    { MaKhoaHoc: EMPTY_GUID, MaLopHoc: EMPTY_GUID, TenChuong: '' as string | null, MoTa: null as string | null, ThuTu: null as number | null },
  );
  if (!dto) return undefined;

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  if (dto.MaKhoaHoc === EMPTY_GUID || dto.MaLopHoc === EMPTY_GUID) {
    return badRequestFail(res, 'Thiếu khóa học hoặc lớp học để tạo chương.', 'STUDY_CONTENT_CONTEXT_REQUIRED');
  }
  if (dto.TenChuong == null || dto.TenChuong.trim() === '') {
    return badRequestFail(res, 'Tên chương là bắt buộc.', 'STUDY_CONTENT_CHAPTER_NAME_REQUIRED');
  }

  const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, dto.MaKhoaHoc, dto.MaLopHoc);
  if (!access.ok) return sendCheck(res, access);

  const now = new Date();
  const chapter = await prisma.chuonghoc.create({
    data: {
      MaChuong: randomUUID(),
      MaKhoaHoc: dto.MaKhoaHoc,
      MaLopHoc: dto.MaLopHoc,
      TenChuong: dto.TenChuong.trim(),
      MoTa: normalizeOptional(dto.MoTa),
      ThuTu: dto.ThuTu ?? (await getNextChapterOrder(dto.MaKhoaHoc, dto.MaLopHoc)),
      NguoiTao: auth.value.userId,
      ThoiGianTao: now,
      TrangThai: true,
      DaXoa: false,
    },
  });

  return res.json(ok(chapterDto(chapter, access.value), 'Tạo chương học thành công.'));
});

// ------------------------------------------------------------------ PUT chapters/{chapterId:guid}
teacherStudyContentRouter.put(`${BASE}/chapters/:chapterId`, guidRoute('chapterId'), ...perm, async (req, res) => {
  const chapterId = routeGuid(req, 'chapterId');
  const dto = bindJsonBody(
    req,
    res,
    'dto',
    'UpdateStudyChapterDto',
    { MaLopHoc: 'guid', TenChuong: 'string', MoTa: 'string?', ThuTu: 'int?' },
    { MaLopHoc: EMPTY_GUID, TenChuong: '' as string | null, MoTa: null as string | null, ThuTu: null as number | null },
  );
  if (!dto) return undefined;

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  if (dto.MaLopHoc === EMPTY_GUID) {
    return badRequestFail(res, 'Thiếu lớp học để cập nhật chương.', 'STUDY_CONTENT_CLASS_REQUIRED');
  }
  if (dto.TenChuong == null || dto.TenChuong.trim() === '') {
    return badRequestFail(res, 'Tên chương là bắt buộc.', 'STUDY_CONTENT_CHAPTER_NAME_REQUIRED');
  }

  const chapter = await prisma.chuonghoc.findFirst({ where: { MaChuong: chapterId, ...ACTIVE } });
  if (!chapter) return notFoundFail(res, 'Không tìm thấy chương học.', 'STUDY_CONTENT_CHAPTER_NOT_FOUND');
  if (gn(chapter.MaLopHoc) !== dto.MaLopHoc) {
    return notFoundFail(res, 'Chương học không thuộc lớp đã chọn.', 'STUDY_CONTENT_CHAPTER_CLASS_MISMATCH');
  }

  const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, g(chapter.MaKhoaHoc), dto.MaLopHoc);
  if (!access.ok) return sendCheck(res, access);

  const updated = await prisma.chuonghoc.update({
    where: { MaChuong: chapter.MaChuong },
    data: {
      TenChuong: dto.TenChuong.trim(),
      MoTa: normalizeOptional(dto.MoTa),
      ThuTu: dto.ThuTu ?? chapter.ThuTu,
      NguoiSua: auth.value.userId,
      ThoiGianSua: new Date(),
    },
  });

  return res.json(ok(chapterDto(updated, access.value), 'Cập nhật chương học thành công.'));
});

// ------------------------------------------------------------------ DELETE chapters/{chapterId:guid}?classId=
teacherStudyContentRouter.delete(`${BASE}/chapters/:chapterId`, guidRoute('chapterId'), ...perm, async (req, res) => {
  const chapterId = routeGuid(req, 'chapterId');
  const errors: ModelErrors = [];
  const classId = bindQueryGuid(req, 'classId', false, errors);
  if (errors.length) return sendValidationProblem(res, errors);

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  if (classId === EMPTY_GUID) return badRequestFail(res, 'Thiếu lớp học để xóa chương.', 'STUDY_CONTENT_CLASS_REQUIRED');

  const chapter = await prisma.chuonghoc.findFirst({
    where: { MaChuong: chapterId, ...ACTIVE },
    include: { tailieu: { where: ACTIVE } },
  });
  if (!chapter) return notFoundFail(res, 'Không tìm thấy chương học.', 'STUDY_CONTENT_CHAPTER_NOT_FOUND');
  if (gn(chapter.MaLopHoc) !== classId) {
    return notFoundFail(res, 'Chương học không thuộc lớp đã chọn.', 'STUDY_CONTENT_CHAPTER_CLASS_MISMATCH');
  }

  const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, g(chapter.MaKhoaHoc), classId);
  if (!access.ok) return sendCheck(res, access);

  const now = new Date();
  const userId = auth.value.userId;
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  for (const document of chapter.tailieu) {
    const cleanup = await cleanupDocumentFile(document.LinkTaiLieu, userId, now);
    if (cleanup) ops.push(cleanup());
    ops.push(
      prisma.tailieu.update({
        where: { MaTaiLieu: document.MaTaiLieu },
        data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
      }),
    );
  }
  ops.push(
    prisma.chuonghoc.update({
      where: { MaChuong: chapter.MaChuong },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    }),
  );
  await prisma.$transaction(ops);

  return res.json(ok({ chapterId }, 'Xóa chương học thành công.'));
});

// ------------------------------------------------------------------ POST documents (multipart/form-data)
teacherStudyContentRouter.post(`${BASE}/documents`, ...perm, upload.any(), async (req, res) => {
  const errors: ModelErrors = [];
  const maChuongHoc = formGuid(req, 'MaChuongHoc', errors);
  const maLopHoc = formGuid(req, 'MaLopHoc', errors);
  const tenTaiLieu = formString(req, 'TenTaiLieu');
  const moTa = formString(req, 'MoTa');
  const linkTaiLieu = formString(req, 'LinkTaiLieu');
  const file = formFile(req, 'File');
  if (errors.length) return sendValidationProblem(res, errors);

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  if (maChuongHoc === EMPTY_GUID || maLopHoc === EMPTY_GUID) {
    return badRequestFail(res, 'Thiếu chương học hoặc lớp học để tạo tài liệu.', 'STUDY_CONTENT_CONTEXT_REQUIRED');
  }
  if (file && linkTaiLieu != null && linkTaiLieu.trim() !== '') {
    return badRequestFail(res, 'Chỉ được chọn upload file hoặc nhập link ngoài.', 'STUDY_CONTENT_DOCUMENT_SOURCE_CONFLICT');
  }

  const chapter = await prisma.chuonghoc.findFirst({
    where: { MaChuong: maChuongHoc, ...ACTIVE },
    select: { MaKhoaHoc: true, MaLopHoc: true },
  });
  if (!chapter) return notFoundFail(res, 'Không tìm thấy chương học.', 'STUDY_CONTENT_CHAPTER_NOT_FOUND');
  if (gn(chapter.MaLopHoc) !== maLopHoc) {
    return notFoundFail(res, 'Chương học không thuộc lớp đã chọn.', 'STUDY_CONTENT_CHAPTER_CLASS_MISMATCH');
  }

  const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, g(chapter.MaKhoaHoc), maLopHoc);
  if (!access.ok) return sendCheck(res, access);

  const userId = auth.value.userId;
  const source = await resolveDocumentSource(file, linkTaiLieu, userId, new Date());
  if (!source.ok) return sendCheck(res, source);

  const now = new Date();
  const document = {
    MaTaiLieu: randomUUID(),
    MaChuongHoc: maChuongHoc,
    TenTaiLieu: resolveDocumentDisplayName(tenTaiLieu, file?.originalname, linkTaiLieu),
    LinkTaiLieu: source.value.link,
    MoTa: normalizeOptional(moTa),
    NguoiTao: userId,
    ThoiGianTao: now,
    TrangThai: true,
    DaXoa: false,
  };
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  if (source.value.resource) ops.push(prisma.tainguyenluutru.create({ data: source.value.resource }));
  ops.push(prisma.tailieu.create({ data: document }));
  await prisma.$transaction(ops);

  return res.json(ok(buildDocumentDto(document, 'scoped'), 'Tạo tài liệu thành công.'));
});

// ------------------------------------------------------------------ PUT documents/{documentId:guid} (multipart/form-data)
teacherStudyContentRouter.put(
  `${BASE}/documents/:documentId`,
  guidRoute('documentId'),
  ...perm,
  upload.any(),
  async (req, res) => {
    const documentId = routeGuid(req, 'documentId');
    const errors: ModelErrors = [];
    const maLopHoc = formGuid(req, 'MaLopHoc', errors);
    const tenTaiLieu = formString(req, 'TenTaiLieu');
    const moTa = formString(req, 'MoTa');
    const linkTaiLieu = formString(req, 'LinkTaiLieu');
    const file = formFile(req, 'File');
    if (errors.length) return sendValidationProblem(res, errors);

    const auth = await resolveCurrentTeacher(req);
    if (!auth.ok) return sendCheck(res, auth);

    if (maLopHoc === EMPTY_GUID) {
      return badRequestFail(res, 'Thiếu lớp học để cập nhật tài liệu.', 'STUDY_CONTENT_CLASS_REQUIRED');
    }
    if (file && linkTaiLieu != null && linkTaiLieu.trim() !== '') {
      return badRequestFail(res, 'Chỉ được chọn upload file hoặc nhập link ngoài.', 'STUDY_CONTENT_DOCUMENT_SOURCE_CONFLICT');
    }

    const document = await prisma.tailieu.findFirst({
      where: { MaTaiLieu: documentId, ...ACTIVE },
      include: { chuonghoc: { select: { MaKhoaHoc: true, MaLopHoc: true } } },
    });
    if (!document) return notFoundFail(res, ...DOCUMENT_NOT_FOUND);
    if (gn(document.chuonghoc.MaLopHoc) !== maLopHoc) return notFoundFail(res, ...DOCUMENT_CLASS_MISMATCH);

    const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, g(document.chuonghoc.MaKhoaHoc), maLopHoc);
    if (!access.ok) return sendCheck(res, access);

    const userId = auth.value.userId;
    const now = new Date();
    let nextLink = document.LinkTaiLieu;
    const ops: Prisma.PrismaPromise<unknown>[] = [];

    if (file || (linkTaiLieu != null && linkTaiLieu.trim() !== '')) {
      const source = await resolveDocumentSource(file, linkTaiLieu, userId, now);
      if (!source.ok) return sendCheck(res, source);
      if (source.value.resource) ops.push(prisma.tainguyenluutru.create({ data: source.value.resource }));

      const cleanup = await cleanupDocumentFile(document.LinkTaiLieu, userId, now);
      if (cleanup) ops.push(cleanup());
      nextLink = source.value.link;
    }

    if (nextLink == null || nextLink.trim() === '') {
      return badRequestFail(res, 'Tài liệu phải có file upload hoặc link ngoài hợp lệ.', 'STUDY_CONTENT_DOCUMENT_SOURCE_REQUIRED');
    }

    const tenMoi = resolveDocumentDisplayName(tenTaiLieu, file?.originalname, linkTaiLieu, document.TenTaiLieu);
    const moTaMoi = normalizeOptional(moTa);
    ops.push(
      prisma.tailieu.update({
        where: { MaTaiLieu: document.MaTaiLieu },
        data: { TenTaiLieu: tenMoi, LinkTaiLieu: nextLink, MoTa: moTaMoi, NguoiSua: userId, ThoiGianSua: now },
      }),
    );
    await prisma.$transaction(ops);

    return res.json(
      ok(
        buildDocumentDto(
          {
            MaTaiLieu: document.MaTaiLieu,
            MaChuongHoc: document.MaChuongHoc,
            TenTaiLieu: tenMoi,
            LinkTaiLieu: nextLink,
            MoTa: moTaMoi,
            ThoiGianTao: document.ThoiGianTao ?? now,
          },
          'scoped',
        ),
        'Cập nhật tài liệu thành công.',
      ),
    );
  },
);

// ------------------------------------------------------------------ DELETE documents/{documentId:guid}?classId=
teacherStudyContentRouter.delete(`${BASE}/documents/:documentId`, guidRoute('documentId'), ...perm, async (req, res) => {
  const documentId = routeGuid(req, 'documentId');
  const errors: ModelErrors = [];
  const classId = bindQueryGuid(req, 'classId', false, errors);
  if (errors.length) return sendValidationProblem(res, errors);

  const auth = await resolveCurrentTeacher(req);
  if (!auth.ok) return sendCheck(res, auth);

  if (classId === EMPTY_GUID) return badRequestFail(res, 'Thiếu lớp học để xóa tài liệu.', 'STUDY_CONTENT_CLASS_REQUIRED');

  const document = await prisma.tailieu.findFirst({
    where: { MaTaiLieu: documentId, ...ACTIVE },
    include: { chuonghoc: { select: { MaKhoaHoc: true, MaLopHoc: true } } },
  });
  if (!document) return notFoundFail(res, ...DOCUMENT_NOT_FOUND);
  if (gn(document.chuonghoc.MaLopHoc) !== classId) return notFoundFail(res, ...DOCUMENT_CLASS_MISMATCH);

  const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, g(document.chuonghoc.MaKhoaHoc), classId);
  if (!access.ok) return sendCheck(res, access);

  const now = new Date();
  const userId = auth.value.userId;
  const ops: Prisma.PrismaPromise<unknown>[] = [];
  const cleanup = await cleanupDocumentFile(document.LinkTaiLieu, userId, now);
  if (cleanup) ops.push(cleanup());
  ops.push(
    prisma.tailieu.update({
      where: { MaTaiLieu: document.MaTaiLieu },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    }),
  );
  await prisma.$transaction(ops);

  return res.json(ok({ documentId }, 'Xóa tài liệu thành công.'));
});

// ------------------------------------------------------------------ GET documents/{documentId:guid}/download?classId=
teacherStudyContentRouter.get(
  `${BASE}/documents/:documentId/download`,
  guidRoute('documentId'),
  ...perm,
  async (req, res) => {
    const documentId = routeGuid(req, 'documentId');
    const errors: ModelErrors = [];
    const classId = bindQueryGuid(req, 'classId', true, errors);
    if (errors.length) return sendValidationProblem(res, errors);

    const auth = await resolveCurrentTeacher(req);
    if (!auth.ok) return sendCheck(res, auth);

    const document = await prisma.tailieu.findFirst({
      where: { MaTaiLieu: documentId, ...ACTIVE },
      select: { TenTaiLieu: true, LinkTaiLieu: true, chuonghoc: { select: { MaKhoaHoc: true, MaLopHoc: true } } },
    });
    if (!document) return notFoundFail(res, ...DOCUMENT_NOT_FOUND);

    const maKhoaHoc = g(document.chuonghoc.MaKhoaHoc);
    const maLopHoc = gn(document.chuonghoc.MaLopHoc);
    if (classId) {
      if (maLopHoc !== classId) return notFoundFail(res, ...DOCUMENT_CLASS_MISMATCH);
      const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, maKhoaHoc, classId);
      if (!access.ok) return sendCheck(res, access);
    } else {
      if (!maLopHoc) return sendCheck(res, forbidden());
      const access = await ensureTeacherHasClassInCourse(auth.value.teacherId, maKhoaHoc, maLopHoc);
      if (!access.ok) return sendCheck(res, access);
    }

    return sendStoredDocument(req, res, document.TenTaiLieu, document.LinkTaiLieu);
  },
);
