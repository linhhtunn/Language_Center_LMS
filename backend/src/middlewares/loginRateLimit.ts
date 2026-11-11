import rateLimit from 'express-rate-limit';
import { fail } from '../utils/apiResponse.js';

// Thay cho LoginRateLimitMiddleware: moi IP toi da 20 lan dang nhap / 5 phut (giong ban .NET).
// IP that sau Caddy duoc lay dung nho app.set('trust proxy', ...) trong app.ts.
export const loginRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(fail('Bạn đăng nhập sai quá nhiều lần, vui lòng thử lại sau ít phút.', 'AUTH_RATE_LIMITED'));
  },
});
