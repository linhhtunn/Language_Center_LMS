import { Router, type Request } from 'express';
import { loginRateLimit } from '../../middlewares/loginRateLimit.js';
import { fail } from '../../utils/apiResponse.js';
import * as auth from './auth.service.js';

// Chuyen tu AuthController.cs. Duong dan giu nguyen: /api/Auth/...
// Frontend gui moi input trong object "data": { data: { email, password } }.

export const authRouter = Router();

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readField(req: Request, name: string): string | null {
  const data = req.body?.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const value = data[name];
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

authRouter.post('/login', loginRateLimit, async (req, res) => {
  const email = readField(req, 'email');
  const password = readField(req, 'password');
  if (!email || !password) return res.status(400).json(fail('Thiếu email hoặc mật khẩu.', 'AUTH_INVALID_INPUT'));

  const result = await auth.login(email, password);
  return res.status(result.success ? 200 : 401).json(result);
});

authRouter.post('/refresh', async (req, res) => {
  const sessionId = readField(req, 'sessionId');
  const refreshToken = readField(req, 'refreshToken');
  if (!sessionId || !refreshToken) {
    return res.status(400).json(fail('Thiếu sessionId hoặc refreshToken.', 'AUTH_REFRESH_INVALID_INPUT'));
  }
  const result = await auth.refresh(sessionId, refreshToken);
  return res.status(result.success ? 200 : 401).json(result);
});

authRouter.post('/logout', async (req, res) => {
  const sessionId = readField(req, 'sessionId');
  if (!sessionId) return res.status(400).json(fail('Thiếu sessionId.', 'AUTH_LOGOUT_INVALID_INPUT'));
  return res.json(await auth.logout(sessionId));
});

authRouter.post('/refresh-permissions/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!GUID.test(userId)) return res.status(404).json(fail('Không tìm thấy API.', 'NOT_FOUND'));
  const result = await auth.refreshPermissions(userId);
  return res.status(result.success ? 200 : 404).json(result);
});
