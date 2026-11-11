import type http from 'node:http';
import { Server } from 'socket.io';
import { config } from '../config.js';
import { verifyAccessToken } from '../middlewares/auth.js';

// Thay cho SignalR (ChatHub /hubs/chat, NotificationHub /hubs/notification).
// Hai hub cu -> hai "namespace" cua Socket.IO: /chat va /notification.
// Frontend can doi tu @microsoft/signalr sang socket.io-client (xem MIGRATION_CHECKLIST.md).

let io: Server | null = null;

export function attachRealtime(server: http.Server) {
  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : true,
      credentials: true,
    },
  });

  for (const nsName of ['/chat', '/notification']) {
    const ns = io.of(nsName);

    // Xac thuc bang access token gui trong handshake: io(url, { auth: { token } })
    ns.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token as string | undefined;
        if (!token) return next(new Error('AUTH_REQUIRED'));
        socket.data.user = verifyAccessToken(token);
        return next();
      } catch {
        return next(new Error('AUTH_TOKEN_INVALID'));
      }
    });

    ns.on('connection', (socket) => {
      // Moi user vao "phong" rieng theo userId de server gui tin dung nguoi
      // (tuong duong Clients.User(userId) ben SignalR).
      socket.join(`user:${socket.data.user.userId}`);
    });
  }

  return io;
}

/** Gui su kien toi mot nguoi dung, vd: emitToUser('/notification', userId, 'ReceiveNotification', payload) */
export function emitToUser(namespace: '/chat' | '/notification', userId: string, event: string, payload: unknown) {
  io?.of(namespace).to(`user:${userId}`).emit(event, payload);
}
