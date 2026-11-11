import path from 'node:path';
import cors from 'cors';
import express from 'express';
import { config } from './config.js';
import { errorHandler, notFound } from './middlewares/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import assignmentsRouter from './modules/assignments/assignments.routes.js';
import attendanceRouter from './modules/attendance/attendance.routes.js';
import chatbotRouter from './modules/chatbot/chatbot.routes.js';
import classesRouter from './modules/classes/classes.routes.js';
import coursesRouter from './modules/courses/courses.routes.js';
import messagesRouter from './modules/messages/messages.routes.js';
import notificationsRouter from './modules/notifications/notifications.routes.js';
import parentsRouter from './modules/parents/parents.routes.js';
import permissionsRouter from './modules/permissions/permissions.routes.js';
import reportsRouter from './modules/reports/reports.routes.js';
import scheduleRouter from './modules/schedule/schedule.routes.js';
import studentAssignmentsRouter from './modules/studentAssignments/studentAssignments.routes.js';
import studentsRouter from './modules/students/students.routes.js';
import studyContentRouter from './modules/studyContent/studyContent.routes.js';
import systemRouter from './modules/system/system.routes.js';
import teachersRouter from './modules/teachers/teachers.routes.js';
import usersRouter from './modules/users/users.routes.js';
import { dotnetJsonReplacer } from './utils/dotnetCompat.js';

// Thay cho phan cau hinh pipeline trong Program.cs ben .NET.
export function createApp() {
  const app = express();

  // Sau Caddy: tin 1 tang proxy de req.ip la IP that cua khach.
  if (config.trustProxy) app.set('trust proxy', 1);
  // Date -> "2026-11-11T13:41:30" (khong Z, giong .NET), Decimal/BigInt -> number.
  app.set('json replacer', dotnetJsonReplacer);

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

  // ===== Cac module API: moi controller .NET -> 1 router =====
  // Duong dan giu y het ban .NET; Express mac dinh khong phan biet hoa thuong nhu ASP.NET.
  // LoginAuditMiddleware: ghi log moi lan dang nhap / lam moi token (status, IP, thoi gian xu ly).
  app.use(['/api/Auth/login', '/api/Auth/refresh'], (req, res, next) => {
    if (req.method !== 'POST') return next();
    const start = performance.now();
    res.on('finish', () => {
      const line = `Auth event POST ${req.originalUrl} status=${res.statusCode} ip=${req.ip ?? 'unknown'} durationMs=${(performance.now() - start).toFixed(2)}`;
      if (res.statusCode < 400) console.info(line);
      else console.warn(line);
    });
    return next();
  });
  app.use('/api/Auth', authRouter);
  // Cac router duoi day gan o goc, tu khai bao duong dan day du ('/api/...').
  for (const router of [
    usersRouter,
    permissionsRouter,
    systemRouter,
    coursesRouter,
    classesRouter,
    teachersRouter,
    studentsRouter,
    parentsRouter,
    scheduleRouter,
    attendanceRouter,
    assignmentsRouter,
    studentAssignmentsRouter,
    studyContentRouter,
    messagesRouter,
    notificationsRouter,
    reportsRouter,
    chatbotRouter,
  ]) {
    app.use(router);
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
