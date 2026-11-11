import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { fail, HttpError } from '../utils/apiResponse.js';

// Thay cho ExceptionMiddleware ben .NET: moi loi chua bat deu tra ve JSON cung mot dang.
// Express 5 tu chuyen loi cua ham async vao day, khong can try/catch trong tung route.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.message, err.code));
  }
  // Loi do multer (file qua lon...) hoac body JSON sai cu phap -> 400
  const e = err as { type?: string; code?: string; message?: string; status?: number };
  if (e?.type === 'entity.parse.failed' || e?.code?.startsWith?.('LIMIT_')) {
    return res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json(fail(e.message ?? 'Dữ liệu không hợp lệ.', 'BAD_REQUEST'));
  }
  const errorId = randomUUID().replaceAll('-', '');
  console.error(`[Unhandled ${errorId}] ${req.method} ${req.path}`, err);
  const body = fail<{ errorId: string }>('Đã có lỗi hệ thống. Vui lòng thử lại sau.', 'SERVER_ERROR');
  body.data = { errorId };
  return res.status(500).json(body);
}

export function notFound(_req: Request, res: Response) {
  res.status(404).end();
}
