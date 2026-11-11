import { Router, type NextFunction, type Request, type Response } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { getCI, validationProblem } from '../../utils/dotnetCompat.js';
import { getAdminStudentPerformance } from './reports.adminStudents.service.js';
import { getAdminTeacherDashboard } from './reports.adminTeachers.service.js';
import {
  exportStudentReportCsv,
  exportTeacherClassReportCsv,
  getStudentOverview,
  getTeacherClassOverview,
  ReportForbiddenError,
} from './reports.classStudent.service.js';
import { getClassDashboard, getParentChildrenDashboard, getStudentCourseDashboard } from './reports.dashboards.service.js';
import { canViewClassDashboard, canViewStudentDashboard, FORBIDDEN_BODY } from './reports.access.js';
import { parseGuid } from './reports.dotnet.js';
import { exportAdminReportCsv, exportTeacherOverviewCsv, getAdminOverview, getTeacherOverview } from './reports.overview.service.js';

// Chuyen tu ReportsController.cs ([Route("api/[controller]")] -> /api/Reports/...).
// Moi action ben .NET boc try/catch: loi -> 500 JSON (API xem) hoac 400 JSON (API xuat file CSV).
const router = Router();

const ADMIN = requirePermission('PAGE_ADMIN_REPORTS_VIEW');
const TEACHER = requirePermission('PAGE_TEACHER_REPORTS_VIEW');
const STUDENT = requirePermission('PAGE_STUDENT_SCHEDULE_VIEW');

const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** User.GetProfileId(): claim profileId phai la Guid hop le, khong thi null. */
const profileIdOf = (req: Request) => parseGuid(req.user?.profileId ?? null);

/** Rang buoc route {classId:guid}: sai dinh dang -> 404 body rong (truoc ca kiem tra quyen, giong routing ASP.NET). */
function guidRoute(req: Request, res: Response, next: NextFunction) {
  if (!parseGuid(req.params.classId)) return res.status(404).end();
  return next();
}

/** return File(bytes, "text/csv; charset=utf-8", fileName) cua ASP.NET. */
function sendCsv(res: Response, csv: string, fileName: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename=${fileName}; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  return res.status(200).send(Buffer.from(csv, 'utf8'));
}

const noTeacherProfile = (res: Response) =>
  res.status(400).json(fail('Không tìm thấy mã giáo viên trong phiên đăng nhập.', 'TEACHER_PROFILE_NOT_FOUND'));
const noStudentProfile = (res: Response) =>
  res.status(400).json(fail('Không tìm thấy mã học sinh trong phiên đăng nhập.', 'STUDENT_PROFILE_NOT_FOUND'));

router.get('/api/Reports/admin/overview', ...ADMIN, async (_req, res) => {
  try {
    return res.json(ok(await getAdminOverview(), 'Lấy thống kê tổng quan admin thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_ADMIN_OVERVIEW_ERROR'));
  }
});

router.get('/api/Reports/admin/export', ...ADMIN, async (_req, res) => {
  try {
    return sendCsv(res, await exportAdminReportCsv(), 'BaoCaoTongQuanAdmin.csv');
  } catch (e) {
    return res.status(400).json(fail(`Lỗi xuất Excel: ${errMsg(e)}`, 'REPORT_ADMIN_EXPORT_ERROR'));
  }
});

router.get('/api/Reports/admin/student-performance', ...ADMIN, async (_req, res) => {
  try {
    return res.json(ok(await getAdminStudentPerformance(), 'Lấy thống kê học sinh admin thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_ADMIN_STUDENT_PERFORMANCE_ERROR'));
  }
});

router.get('/api/Reports/admin/teacher-dashboard', ...ADMIN, async (_req, res) => {
  try {
    return res.json(ok(await getAdminTeacherDashboard(), 'Lấy thống kê giảng viên admin thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_ADMIN_TEACHER_DASHBOARD_ERROR'));
  }
});

router.get('/api/Reports/teacher/overview', ...TEACHER, async (req, res) => {
  try {
    const teacherId = profileIdOf(req);
    if (!teacherId) return noTeacherProfile(res);
    return res.json(ok(await getTeacherOverview(teacherId), 'Lấy thống kê tổng quan giảng dạy thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_TEACHER_OVERVIEW_ERROR'));
  }
});

router.get('/api/Reports/teacher/export', ...TEACHER, async (req, res) => {
  try {
    const teacherId = profileIdOf(req);
    if (!teacherId) return noTeacherProfile(res);
    return sendCsv(res, await exportTeacherOverviewCsv(teacherId), 'BaoCaoTongQuanGiangDay.csv');
  } catch (e) {
    return res.status(400).json(fail(`Lỗi xuất Excel: ${errMsg(e)}`, 'REPORT_TEACHER_EXPORT_ERROR'));
  }
});

router.get('/api/Reports/teacher/classes/:classId/overview', guidRoute, ...TEACHER, async (req, res) => {
  const classId = parseGuid(req.params.classId)!;
  try {
    const teacherId = profileIdOf(req);
    if (!teacherId) return noTeacherProfile(res);
    return res.json(ok(await getTeacherClassOverview(teacherId, classId), 'Lấy thống kê lớp học thành công.'));
  } catch (e) {
    if (e instanceof ReportForbiddenError) return res.status(403).end(); // Forbid()
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_TEACHER_OVERVIEW_ERROR'));
  }
});

router.get('/api/Reports/teacher/classes/:classId/export', guidRoute, ...TEACHER, async (req, res) => {
  const classId = parseGuid(req.params.classId)!;
  try {
    const teacherId = profileIdOf(req);
    if (!teacherId) return noTeacherProfile(res);
    return sendCsv(res, await exportTeacherClassReportCsv(teacherId, classId), `BaoCaoLopHoc_${classId}.csv`);
  } catch (e) {
    if (e instanceof ReportForbiddenError) return res.status(403).end();
    return res.status(400).json(fail(`Lỗi xuất Excel: ${errMsg(e)}`, 'REPORT_TEACHER_EXPORT_ERROR'));
  }
});

router.get('/api/Reports/student/overview', ...STUDENT, async (req, res) => {
  try {
    const studentId = profileIdOf(req);
    if (!studentId) return noStudentProfile(res);
    return res.json(ok(await getStudentOverview(studentId), 'Lấy thống kê học tập thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_STUDENT_OVERVIEW_ERROR'));
  }
});

router.get('/api/Reports/student/export', ...STUDENT, async (req, res) => {
  try {
    const studentId = profileIdOf(req);
    if (!studentId) return noStudentProfile(res);
    return sendCsv(res, await exportStudentReportCsv(studentId), 'BaoCaoHocTapCaNhan.csv');
  } catch (e) {
    return res.status(400).json(fail(`Lỗi xuất Excel: ${errMsg(e)}`, 'REPORT_STUDENT_EXPORT_ERROR'));
  }
});

router.get('/api/Reports/class/:classId/dashboard', guidRoute, requireAuth, async (req, res) => {
  const classId = parseGuid(req.params.classId)!;
  if (!(await canViewClassDashboard(req.user!, classId))) return res.status(403).json(FORBIDDEN_BODY);
  try {
    return res.json(ok(await getClassDashboard(classId), 'Lấy dữ liệu dashboard lớp học thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_CLASS_DASHBOARD_ERROR'));
  }
});

/**
 * Model binding [FromQuery] Guid / Guid? cua ASP.NET: thieu -> Guid.Empty / null;
 * sai dinh dang -> 400 ValidationProblem "The value 'x' is not valid." (chuoi rong: "The value '' is invalid.").
 */
function bindGuidQuery(req: Request, name: string): { value: string | null; error?: string } {
  const raw = getCI<unknown>(req.query, name);
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === null) return { value: null };
  const s = String(v);
  if (s === '') return { value: null, error: `The value '' is invalid.` };
  const g = parseGuid(s);
  return g ? { value: g } : { value: null, error: `The value '${s}' is not valid.` };
}

router.get('/api/Reports/student/dashboard', requireAuth, async (req, res) => {
  const classQ = bindGuidQuery(req, 'classId');
  const studentQ = bindGuidQuery(req, 'studentId');
  const errors: Record<string, string[]> = {};
  if (classQ.error) errors.classId = [classQ.error];
  if (studentQ.error) errors.studentId = [studentQ.error];
  if (Object.keys(errors).length > 0) {
    return res.status(400).type('application/problem+json').json(validationProblem(errors));
  }

  try {
    const classId = classQ.value ?? '00000000-0000-0000-0000-000000000000';
    const targetStudentId = studentQ.value ?? profileIdOf(req);
    if (!targetStudentId) return res.status(400).json(fail('Không tìm thấy mã học sinh.', 'STUDENT_ID_REQUIRED'));
    if (!(await canViewStudentDashboard(req.user!, targetStudentId, classId))) return res.status(403).json(FORBIDDEN_BODY);
    return res.json(ok(await getStudentCourseDashboard(targetStudentId, classId), 'Lấy dữ liệu dashboard học sinh thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_STUDENT_DASHBOARD_ERROR'));
  }
});

router.get('/api/Reports/parent/dashboard', requireAuth, async (req, res) => {
  try {
    const parentId = profileIdOf(req);
    if (!parentId) {
      return res.status(400).json(fail('Không tìm thấy mã phụ huynh trong phiên đăng nhập.', 'PARENT_PROFILE_NOT_FOUND'));
    }
    return res.json(ok(await getParentChildrenDashboard(parentId), 'Lấy dữ liệu dashboard phụ huynh thành công.'));
  } catch (e) {
    return res.status(500).json(fail(`Lỗi: ${errMsg(e)}`, 'REPORT_PARENT_DASHBOARD_ERROR'));
  }
});

export default router;
