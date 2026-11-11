import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';

// Thay cho phan cau hinh pipeline trong Program.cs ben .NET.
export function createApp() {
  const app = express();

  // Sau Caddy: tin 1 tang proxy de req.ip la IP that cua khach.
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(
    cors({
      // Dev khong khai bao origin thi cho phep moi origin (giong ban .NET), production bat buoc khai bao.
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : true,
      credentials: true,
    }),
  );
  // Gioi han body 250MB giong Kestrel ben .NET (upload tai lieu lon).
  app.use(express.json({ limit: '250mb' }));
  app.use(express.urlencoded({ extended: true, limit: '250mb' }));

  // File da upload: giu dung duong dan /uploads/... nhu ban .NET (wwwroot/uploads).
  app.use('/uploads', express.static(path.resolve(config.uploadsDir)));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: process.env.APP_VERSION ?? 'dev' });
  });

  // ===== Cac module API (moi controller .NET -> 1 router) =====
  // Giu dung duong dan cu (/api/Auth/login ...) de frontend khong phai sua.
  app.use('/api/Auth', authRouter);
  // TODO: chuyen dan cac controller con lai, xem MIGRATION_CHECKLIST.md

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
