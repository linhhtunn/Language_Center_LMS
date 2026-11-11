import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import type { ApiResponse } from '../../utils/apiResponse.js';
import { isGuid } from '../../utils/dotnetCompat.js';
import { upload } from '../../utils/upload.js';
import {
  bodyGuid,
  bodyList,
  bodyString,
  fixUploadName,
  JsonConversionError,
  ModelState,
  queryIntStrict,
  readJsonBody,
  sendConversionError,
} from './binding.js';
import * as chat from './chat.service.js';

// Chuyen tu Controllers/MessagesController.cs - [Route("api/[controller]")] = /api/Messages/...
// [Authorize(Roles = "Admin,Giao_Vien,Phu_Huynh,Hoc_Sinh")] tren ca controller.
// Router gan o goc -> middleware phai gan theo tung route (khong dung router.use).

const router = Router();
const guard = [requireAuth, requireRole('Admin', 'Giao_Vien', 'Phu_Huynh', 'Hoc_Sinh')] as const;
const BASE = '/api/Messages';

/** Forbid() khong body cua ASP.NET. */
function forbid(res: Response) {
  return res.status(403).end();
}

function withConversionGuard(paramName: string, handler: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    try {
      return await handler(req, res);
    } catch (err) {
      if (err instanceof JsonConversionError) return sendConversionError(res, paramName, err);
      throw err;
    }
  };
}

const statusFor = (result: ApiResponse<unknown>) => (result.success ? 200 : 400);

router.get(`${BASE}/users`, ...guard, async (req, res) => {
  res.json(await chat.getChatUsers(req.user!.userId));
});

router.get(`${BASE}/conversations`, ...guard, async (req, res) => {
  res.json(await chat.getConversations(req.user!.userId));
});

router.get(`${BASE}/conversations/:conversationId`, ...guard, async (req, res) => {
  const { conversationId } = req.params;
  if (!isGuid(conversationId)) return res.status(404).end();
  const result = await chat.getConversation(req.user!.userId, conversationId.toLowerCase());
  if (!result.success && result.code === 'CHAT_FORBIDDEN') return forbid(res);
  if (!result.success && result.code === 'CHAT_NOT_FOUND') return res.status(404).json(result);
  return res.json(result);
});

router.get(`${BASE}/conversations/:conversationId/messages`, ...guard, async (req, res) => {
  const { conversationId } = req.params;
  if (!isGuid(conversationId)) return res.status(404).end();
  const ms = new ModelState();
  const take = queryIntStrict(req, 'take', ms, 50);
  if (!ms.isValid) return ms.send(res);
  const result = await chat.getMessages(req.user!.userId, conversationId.toLowerCase(), take);
  if (!result.success && result.code === 'CHAT_FORBIDDEN') return forbid(res);
  return res.json(result);
});

router.post(
  `${BASE}/direct`,
  ...guard,
  withConversionGuard('request', async (req, res) => {
    const ms = new ModelState();
    const body = readJsonBody(req, 'request', ms);
    if (!body) return ms.send(res);
    const recipientUserId = bodyGuid(body, 'recipientUserId');
    const initialMessage = bodyString(body, 'initialMessage', 'InitialMessage', ms, null, true);
    if (!ms.isValid) return ms.send(res);
    const result = await chat.createDirectConversation(req.user!.userId, { recipientUserId, initialMessage });
    return res.status(statusFor(result)).json(result);
  }),
);

router.post(
  `${BASE}/groups`,
  ...guard,
  withConversionGuard('request', async (req, res) => {
    const ms = new ModelState();
    const body = readJsonBody(req, 'request', ms);
    if (!body) return ms.send(res);
    const title = bodyString(body, 'title', 'Title', ms, '');
    const memberUserIds = bodyList(body, 'memberUserIds', 'MemberUserIds', ms, { element: 'guid', nullable: false, defaultValue: [] });
    const initialMessage = bodyString(body, 'initialMessage', 'InitialMessage', ms, null, true);
    if (!ms.isValid) return ms.send(res);
    const result = await chat.createGroupConversation(req.user!.userId, {
      title: title ?? '',
      memberUserIds: memberUserIds ?? [],
      initialMessage,
    });
    return res.status(statusFor(result)).json(result);
  }),
);

router.post(
  `${BASE}/conversations/:conversationId/messages`,
  ...guard,
  withConversionGuard('request', async (req, res) => {
    const { conversationId } = req.params;
    if (!isGuid(conversationId)) return res.status(404).end();
    const ms = new ModelState();
    const body = readJsonBody(req, 'request', ms);
    if (!body) return ms.send(res);
    const content = bodyString(body, 'content', 'Content', ms, '');
    const attachmentUrls = bodyList(body, 'attachmentUrls', 'AttachmentUrls', ms, {
      element: 'string',
      nullable: true,
      defaultValue: null,
    });
    if (!ms.isValid) return ms.send(res);
    const result = await chat.sendMessage(req.user!.userId, conversationId.toLowerCase(), { content, attachmentUrls });
    if (!result.success && result.code === 'CHAT_FORBIDDEN') return forbid(res);
    return res.status(statusFor(result)).json(result);
  }),
);

// [FromForm] List<IFormFile> files - ten field khong phan biet hoa thuong.
router.post(`${BASE}/attachments`, ...guard, upload.any(), async (req, res) => {
  const all = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
  const files = all
    .filter((f) => f.fieldname.toLowerCase() === 'files')
    .map((f) => ({ buffer: f.buffer, originalname: fixUploadName(f.originalname), size: f.size }));
  const result = await chat.uploadMessageAttachments(req.user!.userId, files);
  return res.status(statusFor(result)).json(result);
});

router.post(`${BASE}/conversations/:conversationId/read`, ...guard, async (req, res) => {
  const { conversationId } = req.params;
  if (!isGuid(conversationId)) return res.status(404).end();
  const result = await chat.markAsRead(req.user!.userId, conversationId.toLowerCase());
  if (!result.success && result.code === 'CHAT_FORBIDDEN') return forbid(res);
  return res.json(result);
});

router.post(
  `${BASE}/device-token`,
  ...guard,
  withConversionGuard('request', async (req, res) => {
    const ms = new ModelState();
    const body = readJsonBody(req, 'request', ms);
    if (!body) return ms.send(res);
    const deviceToken = bodyString(body, 'deviceToken', 'DeviceToken', ms, '');
    if (!ms.isValid) return ms.send(res);
    const result = await chat.registerDeviceToken(req.user!.userId, deviceToken);
    return res.status(statusFor(result)).json(result);
  }),
);

export default router;
