import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import type { ApiResponse } from '../../utils/apiResponse.js';
import { getCI, isGuid } from '../../utils/dotnetCompat.js';
import { upload } from '../../utils/upload.js';
import {
  bodyGuid,
  bodyString,
  fixUploadName,
  JsonConversionError,
  ModelState,
  readJsonBody,
  routeGuid,
  sendConversionError,
} from '../messages/binding.js';
import * as svc from './notification.service.js';

// Chuyen tu Controllers/NotificationController.cs - /api/Notification/... ([Authorize] tren ca controller).
// Router gan o goc -> middleware gan theo tung route.

const router = Router();
const BASE = '/api/Notification';
const statusFor = (r: ApiResponse<unknown>) => (r.success ? 200 : 400);

// GET /api/Notification - [AuthorizeByPermission("NOTIFICATIONS_VIEW_ALL")]
router.get(BASE, ...requirePermission('NOTIFICATIONS_VIEW_ALL'), async (_req, res) => {
  res.json(await svc.getAll());
});

router.get(`${BASE}/my-notifications`, requireAuth, async (req, res) => {
  res.json(await svc.getUserNotifications(req.user!.userId));
});

router.get(`${BASE}/unread`, requireAuth, async (req, res) => {
  res.json(await svc.getUnreadNotifications(req.user!.userId));
});

router.get(`${BASE}/unread-count`, requireAuth, async (req, res) => {
  res.json(await svc.getUnreadCount(req.user!.userId));
});

// [HttpPost("{id}/mark-as-read")] Guid id khong co rang buoc :guid -> sai la 400 validation.
router.post(`${BASE}/:id/mark-as-read`, requireAuth, async (req, res) => {
  const ms = new ModelState();
  const id = routeGuid(String(req.params.id), 'id', ms);
  if (!id) return ms.send(res);
  const result = await svc.markAsRead(req.user!.userId, id);
  return res.status(statusFor(result)).json(result);
});

router.post(`${BASE}/mark-all-as-read`, requireAuth, async (req, res) => {
  const result = await svc.markAllAsRead(req.user!.userId);
  return res.status(statusFor(result)).json(result);
});

/** Gia tri form [FromForm] string (khong phan biet hoa thuong, lay gia tri dau; rong/khoang trang -> null). */
function formString(req: Request, key: string): string | null | undefined {
  const raw = getCI<unknown>(req.body, key);
  if (raw === undefined) return undefined;
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === null) return null;
  const s = String(v);
  return s.trim() === '' ? null : s;
}

// POST /api/Notification - multipart: Title, Content, DoiTuong, Files[] - [AuthorizeByPermission("NOTIFICATIONS_CREATE")]
router.post(BASE, ...requirePermission('NOTIFICATIONS_CREATE'), upload.any(), async (req, res) => {
  const ms = new ModelState();
  const title = formString(req, 'Title');
  const content = formString(req, 'Content');
  const doiTuongRaw = formString(req, 'DoiTuong');
  // Title/Content la `= null!` (thieu = null), DoiTuong co mac dinh "Tat_Ca" (chi loi khi gui rong).
  if (title == null) ms.required('Title');
  if (content == null) ms.required('Content');
  if (doiTuongRaw === null) ms.required('DoiTuong');
  if (!ms.isValid) return ms.send(res);

  const files = ((Array.isArray(req.files) ? req.files : []) as Express.Multer.File[])
    .filter((f) => f.fieldname.toLowerCase() === 'files')
    .filter((f) => !(f.size === 0 && !f.originalname))
    .map((f) => ({ buffer: f.buffer, originalname: fixUploadName(f.originalname), size: f.size }));

  const result = await svc.create(req.user!.userId, {
    title: title!,
    content: content!,
    doiTuong: doiTuongRaw ?? 'Tat_Ca',
    files,
  });
  return res.status(statusFor(result)).json(result);
});

// GET /api/Notification/attachments/{resourceId:guid}/download
router.get(`${BASE}/attachments/:resourceId/download`, requireAuth, async (req, res: Response) => {
  const { resourceId } = req.params;
  if (!isGuid(resourceId)) return res.status(404).end();
  const r = await svc.getAttachmentForDownload(req.user!.userId, req.user!.role === 'Admin', resourceId.toLowerCase());
  if (r.error) return res.status(r.error.errorCode === 'ATTACHMENT_FORBIDDEN' ? 403 : 404).json(r.error);
  return new Promise<void>((resolve) => {
    res.download(r.physicalPath, r.fileName, (err) => {
      if (err && !res.headersSent) res.status(404).end();
      resolve();
    });
  });
});

// PUT /api/Notification/{id} - [AuthorizeByPermission("NOTIFICATIONS_EDIT")], body UpdateNotificationDto
router.put(`${BASE}/:id`, ...requirePermission('NOTIFICATIONS_EDIT'), async (req, res) => {
  const ms = new ModelState();
  const id = routeGuid(String(req.params.id), 'id', ms);
  try {
    const body = readJsonBody(req, 'dto', ms);
    if (!body) return ms.send(res);
    bodyGuid(body, 'id'); // chi de bao loi neu sai kieu - Id luon lay theo route
    const title = bodyString(body, 'title', 'Title', ms, null);
    const content = bodyString(body, 'content', 'Content', ms, null);
    const doiTuong = bodyString(body, 'doiTuong', 'DoiTuong', ms, 'Tat_Ca');
    if (!ms.isValid || !id) return ms.send(res);
    const result = await svc.update(req.user!.userId, { id, title: title!, content: content!, doiTuong: doiTuong! });
    return res.status(statusFor(result)).json(result);
  } catch (err) {
    // Loi route id (neu co) dung truoc, roi "dto" + "$.field" nhu ModelState ben .NET.
    if (err instanceof JsonConversionError) return sendConversionError(res, 'dto', err, id ? undefined : ms);
    throw err;
  }
});

// DELETE /api/Notification/{id} - [AuthorizeByPermission("NOTIFICATIONS_DELETE")]
router.delete(`${BASE}/:id`, ...requirePermission('NOTIFICATIONS_DELETE'), async (req, res) => {
  const ms = new ModelState();
  const id = routeGuid(String(req.params.id), 'id', ms);
  if (!id) return ms.send(res);
  const result = await svc.remove(id, req.user!.userId);
  return res.status(statusFor(result)).json(result);
});

export default router;
