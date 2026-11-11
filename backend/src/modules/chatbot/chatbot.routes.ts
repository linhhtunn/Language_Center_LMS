import { Router, type Request, type Response } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth.js';
import { isChatbotBlocked } from '../../shared/chatbotExamGuard.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { isGuid, validationProblem } from '../../utils/dotnetCompat.js';
import * as service from './chatbot.service.js';
import { Suggestions } from './knowledge.js';
import { ChatbotException } from './llm.js';

// Chuyen tu Controllers/ChatbotController.cs ([Route("api/Chatbot")], [Authorize(Roles = "Admin,Giao_Vien,Hoc_Sinh,Phu_Huynh")]).
const router = Router();
const guard = [requireAuth, requireRole('Admin', 'Giao_Vien', 'Hoc_Sinh', 'Phu_Huynh')];

/** Run(...) cua controller: kiem tra quyen/khoa thi roi boc ket qua trong ApiResponseDto. */
async function run(req: Request, res: Response, action: (userId: string, role: string) => Promise<unknown>, checkExam = true) {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json(fail('Bạn cần đăng nhập.', 'AUTH_INVALID_TOKEN'));
  const role = req.user!.role ?? '';
  try {
    await service.ensureAccess(userId, role, checkExam);
    return res.json(ok(await action(userId, role)));
  } catch (err) {
    if (err instanceof ChatbotException) {
      if (err.status === 429) res.setHeader('Retry-After', '60');
      return res.status(err.status).json(fail(err.message, err.code));
    }
    throw err;
  }
}

router.get('/api/Chatbot/status', ...guard, (req, res) =>
  run(
    req,
    res,
    async (id, role) => ({
      available: role !== 'Hoc_Sinh' || !(await isChatbotBlocked(id)),
      suggestions: [
        { id: 'summary', question: role === 'Admin' ? 'Tổng quan hệ thống hiện tại' : role === 'Phu_Huynh' ? 'Tình hình học tập của con' : 'Tổng quan của tôi' },
        ...Suggestions(role),
      ],
      role,
      notice: 'Lịch sử lưu riêng theo tài khoản. Không gửi thông tin nhạy cảm. Câu hỏi cần AI được gửi đến dịch vụ AI; hãy kiểm tra lại khi cần.',
    }),
    false,
  ),
);

/** [FromQuery] int skip = 0: sai dinh dang -> 400 ValidationProblem nhu ASP.NET. */
function readSkip(req: Request): { value: number } | { error: string } {
  const key = Object.keys(req.query).find((k) => k.toLowerCase() === 'skip');
  if (key === undefined) return { value: 0 };
  const rawValue = req.query[key];
  // Nhieu gia tri (?skip=1&skip=2) -> ASP.NET lay gia tri dau.
  const raw = String(Array.isArray(rawValue) ? rawValue[0] : rawValue);
  if (raw === '') return { error: `The value '${raw}' is invalid.` };
  const t = raw.trim();
  if (/^[+-]?\d+$/.test(t)) {
    const n = Number(t);
    if (n >= -2147483648 && n <= 2147483647) return { value: n };
  }
  return { error: `The value '${raw}' is not valid.` };
}

router.get('/api/Chatbot/threads', ...guard, (req, res) => {
  const skip = readSkip(req);
  if ('error' in skip) return res.status(400).json(validationProblem({ skip: [skip.error] }));
  return run(req, res, (id) => service.list(id, skip.value));
});

router.post('/api/Chatbot/threads', ...guard, (req, res) => run(req, res, (id) => service.create(id)));

router.get('/api/Chatbot/threads/:threadId/messages', ...guard, (req, res) => {
  const threadId = String(req.params.threadId);
  if (!isGuid(threadId)) return res.status(404).end();
  return run(req, res, (id) => service.messages(id, threadId.toLowerCase()));
});

const GUID_D = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/**
 * Model binding + [ApiController] validation cua ChatbotSendRequest (System.Text.Json, khong phan biet hoa thuong).
 * BytePositionInLine tinh tren JSON gon (frontend gui JSON.stringify) - giong .NET voi body mot dong.
 */
export function bindSendRequest(
  body: unknown,
): { ok: true; value: { requestId: string; message: string } } | { ok: false; errors: Record<string, string[]> } {
  if (body === undefined) return { ok: false, errors: { '': ['A non-empty request body is required.'], request: ['The request field is required.'] } };
  const convErr = (path: string, type: string, pos: number) => ({
    ok: false as const,
    errors: {
      request: ['The request field is required.'],
      [path]: [`The JSON value could not be converted to ${type}. Path: ${path} | LineNumber: 0 | BytePositionInLine: ${pos}.`],
    },
  });
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    if (body === null) return { ok: false, errors: { request: ['The request field is required.'] } };
    const pos = Array.isArray(body) ? 1 : Buffer.byteLength(JSON.stringify(body));
    // Loi o goc: khoa "$" dung truoc "request".
    return {
      ok: false,
      errors: {
        $: [`The JSON value could not be converted to backend.DTOs.ChatbotSendRequest. Path: $ | LineNumber: 0 | BytePositionInLine: ${pos}.`],
        request: ['The request field is required.'],
      },
    };
  }
  let requestId = EMPTY_GUID;
  let message: string | null = '';
  let prefix = '{';
  let first = true;
  for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
    prefix += (first ? '' : ',') + JSON.stringify(k) + ':';
    first = false;
    const startPos = Buffer.byteLength(prefix);
    const tok = JSON.stringify(v) ?? 'null';
    const endPos = startPos + (v !== null && typeof v === 'object' ? 1 : Buffer.byteLength(tok));
    const name = k.toLowerCase();
    if (name === 'requestid') {
      if (typeof v !== 'string' || !GUID_D.test(v)) return convErr(`$.${k}`, 'System.Guid', endPos);
      requestId = v.toLowerCase();
    } else if (name === 'message') {
      if (v !== null && typeof v !== 'string') return convErr(`$.${k}`, 'System.String', endPos);
      message = v as string | null;
    }
    prefix += tok;
  }
  const errs: string[] = [];
  if (message === null || message.trim() === '') errs.push('The Message field is required.');
  if (message !== null && (message.length < 1 || message.length > 1200))
    errs.push('The field Message must be a string with a minimum length of 1 and a maximum length of 1200.');
  if (errs.length) return { ok: false, errors: { Message: errs } };
  return { ok: true, value: { requestId, message: message! } };
}

router.post('/api/Chatbot/threads/:threadId/messages', ...guard, (req, res) => {
  const threadId = String(req.params.threadId);
  if (!isGuid(threadId)) return res.status(404).end();
  // [RequestSizeLimit(8192)]: .NET nem BadHttpRequestException -> ExceptionMiddleware tra 500.
  if (Number(req.headers['content-length'] ?? 0) > 8192) throw new Error('Request body too large. The max request body size is 8192 bytes.');
  const ct = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (!(ct === 'application/json' || ct === 'text/json' || /^application\/[^/]+\+json$/.test(ct))) {
    return res.status(415).json({ type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16', title: 'Unsupported Media Type', status: 415 });
  }
  const bound = bindSendRequest(req.body);
  if (!bound.ok) return res.status(400).json(validationProblem(bound.errors));
  const ac = new AbortController();
  res.on('close', () => {
    if (!res.writableFinished) ac.abort();
  });
  return run(req, res, (id, role) => service.send(id, role, threadId.toLowerCase(), bound.value, ac.signal));
});

router.delete('/api/Chatbot/threads/:threadId', ...guard, (req, res) => {
  const threadId = String(req.params.threadId);
  if (!isGuid(threadId)) return res.status(404).end();
  return run(req, res, async (id) => {
    await service.remove(id, threadId.toLowerCase());
    return { deleted: true };
  });
});

export default router;
