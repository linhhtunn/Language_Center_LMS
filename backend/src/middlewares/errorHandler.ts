import type { NextFunction, Request, Response } from 'express';
import { config } from '../config.js';
import { fail, HttpError } from '../utils/apiResponse.js';

// Thay cho ExceptionMiddleware ben .NET: moi loi chua bat deu tra ve JSON cung mot dang.
// Express 5 tu chuyen loi cua ham async vao day, khong can try/catch trong tung route.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.message, err.code));
  }
  console.error('[Unhandled]', err);
  const message = config.isProduction ? 'Đã xảy ra lỗi hệ thống.' : String((err as Error)?.message ?? err);
  return res.status(500).json(fail(message, 'INTERNAL_ERROR'));
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json(fail('Không tìm thấy API.', 'NOT_FOUND'));
}
