import { type NextFunction, type Request, type Response, Router } from 'express';
import { requirePermission } from '../../middlewares/permission.js';
import { completeExamSession, startExamSession } from '../../shared/chatbotExamGuard.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { bindSubmitRequest, parseRouteGuid, unsupportedMediaType } from './studentAssignments.json.js';
import * as service from './studentAssignments.service.js';

// Chuyen tu Controllers/StudentAssignmentController.cs
// [Route("api/[controller]")] + [AuthorizeByPermission("STUDY_CONTENT_STUDENT")] cho ca controller.
// Router gan o goc nen ghi du duong dan.
const router = Router();
const BASE = '/api/StudentAssignment';
const auth = requirePermission('STUDY_CONTENT_STUDENT');

/** Rang buoc {assignmentId:guid}: sai dinh dang -> route khong khop -> 404 (truoc khi xac thuc, nhu ASP.NET). */
function guidRoute(req: Request, res: Response, next: NextFunction) {
  const id = parseRouteGuid(String(req.params.assignmentId ?? ''));
  if (!id) return next('route');
  res.locals.assignmentId = id;
  return next();
}

const assignmentId = (res: Response) => res.locals.assignmentId as string;

const problemJson = (res: Response, status: number, body: unknown) =>
  res.status(status).type('application/problem+json').send(JSON.stringify(body));

router.get(BASE, ...auth, async (req, res) => {
  const r = await service.getStudentAssignments(req.user!.userId);
  if (r.errorCode != null) return res.status(400).json(fail(r.errorMessage ?? 'Lỗi không xác định', r.errorCode));
  return res.json(ok(r.data, 'Lấy danh sách bài tập thành công'));
});

/** Nhan xet tien bo AI3 gan nhat cho tung khoa hoc cua hoc sinh dang dang nhap. */
router.get(`${BASE}/ai-progress`, ...auth, async (req, res) => {
  const r = await service.getAiProgress(req.user!.userId);
  if (r.errorCode != null) return res.status(404).json(fail(r.errorMessage ?? 'Lỗi', r.errorCode));
  return res.json(ok(r.data, 'Lấy nhận xét tiến bộ thành công.'));
});

router.get(`${BASE}/:assignmentId`, guidRoute, ...auth, async (req, res) => {
  const userId = req.user!.userId;
  const id = assignmentId(res);
  const r = await service.getAssignmentForStudent(userId, id);
  if (r.errorCode != null) return res.status(404).json(fail(r.errorMessage ?? 'Lỗi', r.errorCode));
  if (r.data?.coTheLamBai !== true) {
    return res.status(400).json(fail('Bài này hiện không thể bắt đầu làm.', 'ASSIGNMENT_NOT_OPEN'));
  }
  // Ghi khoa chatbot truoc khi tra noi dung cau hoi (tab/API khac cung bi chan).
  await startExamSession(userId, id, r.data.thoiGianLamBai);
  return res.json(ok(r.data, 'Lấy thông tin bài tập thành công.'));
});

/** Nop bai: cham tu dong cac cau khach quan, ghi vao nopbai + chitietnopbai. */
router.post(`${BASE}/:assignmentId/submit`, guidRoute, ...auth, async (req, res) => {
  // [FromBody] chi nhan JSON (application/json, text/json, application/*+json), con lai 415.
  if (!req.is(['application/json', 'text/json', 'application/*+json'])) return problemJson(res, 415, unsupportedMediaType());
  // body-parser bien body rong thanh {} - ASP.NET bao "A non-empty request body is required."
  const len = req.headers['content-length'];
  const emptyBody = len === '0' || (len === undefined && req.headers['transfer-encoding'] === undefined);
  const bound = bindSubmitRequest(emptyBody ? undefined : req.body);
  if ('error' in bound) return problemJson(res, 400, bound.error);

  const userId = req.user!.userId;
  const id = assignmentId(res);
  const r = await service.submitAssignment(userId, id, bound.value);
  if (r.errorCode != null) {
    // Khong tim thay -> 404; con lai la vi pham dieu kien nop -> 400.
    const notFound = ['ASSIGNMENT_NOT_FOUND', 'STUDENT_PROFILE_NOT_FOUND', 'ASSIGNMENT_NOT_ASSIGNED'].includes(r.errorCode);
    return res.status(notFound ? 404 : 400).json(fail(r.errorMessage ?? 'Lỗi', r.errorCode));
  }
  await completeExamSession(userId, id);
  return res.json(ok(r.data, 'Nộp bài thành công.'));
});

/** Ket qua lan nop gan nhat cua hoc sinh cho bai tap nay. */
router.get(`${BASE}/:assignmentId/result`, guidRoute, ...auth, async (req, res) => {
  const r = await service.getLatestResult(req.user!.userId, assignmentId(res));
  if (r.errorCode != null) return res.status(404).json(fail(r.errorMessage ?? 'Lỗi', r.errorCode));
  return res.json(ok(r.data, 'Lấy kết quả thành công.'));
});

/** Nhan xet AI (AI1 tung bai/dang + AI2 tong the) cua lan nop gan nhat; frontend poll toi khi dangXuLy = false. */
router.get(`${BASE}/:assignmentId/ai-feedback`, guidRoute, ...auth, async (req, res) => {
  const r = await service.getAiFeedback(req.user!.userId, assignmentId(res));
  if (r.errorCode != null) return res.status(404).json(fail(r.errorMessage ?? 'Lỗi', r.errorCode));
  return res.json(ok(r.data, 'Lấy nhận xét AI thành công.'));
});

// Sai HTTP method tren duong dan da co -> 405 + header Allow (ASP.NET routing), khong can dang nhap.
const methodNotAllowed = (allow: string) => (_req: Request, res: Response) => {
  res.status(405).set('Allow', allow).end();
};
router.all(BASE, methodNotAllowed('GET'));
router.all(`${BASE}/ai-progress`, methodNotAllowed('GET'));
router.all(`${BASE}/:assignmentId`, guidRoute, methodNotAllowed('GET'));
router.all(`${BASE}/:assignmentId/submit`, guidRoute, methodNotAllowed('POST'));
router.all(`${BASE}/:assignmentId/result`, guidRoute, methodNotAllowed('GET'));
router.all(`${BASE}/:assignmentId/ai-feedback`, guidRoute, methodNotAllowed('GET'));

export default router;
