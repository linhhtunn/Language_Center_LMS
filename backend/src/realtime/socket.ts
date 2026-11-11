import type http from 'node:http';
import { Server, type Socket } from 'socket.io';
import { config } from '../config.js';
import { verifyAccessToken, type AuthUser } from '../middlewares/auth.js';
import { dotnetJsonReplacer, isGuid } from '../utils/dotnetCompat.js';
import { isUserInConversation } from '../modules/messages/chat.repository.js';
import * as notificationRepo from '../modules/notifications/notification.repository.js';

// Thay cho SignalR: ChatHub (/hubs/chat) va NotificationHub (/hubs/notification) ben .NET.
// Hai hub cu -> hai "namespace" cua Socket.IO: /chat va /notification (cung path /socket.io).
//
// Frontend ket noi:  io(baseUrl + '/chat', { path: '/socket.io', auth: { token } })
// Goi "hub method" (thay connection.invoke):  socket.emitWithAck('JoinConversation', conversationId)
//   -> ack tra ve { ok: true } hoac { ok: false, error }.
//
// Group (phong) giu dung ten nhu ben .NET:
//   user:<guid>            - moi ket noi cua 1 nguoi dung (Clients.Group(GetUserGroup(id)))
//   conversation:<guid>    - nguoi dang mo hoi thoai (ChatHub.JoinConversation)
//   role:<TenVaiTro>       - NotificationHub: role:Admin, role:Giao_Vien, role:Hoc_Sinh, role:Phu_Huynh

export type RealtimeNamespace = '/chat' | '/notification';

let io: Server | null = null;

export const userGroup = (userId: string) => `user:${String(userId).toLowerCase()}`;
export const conversationGroup = (conversationId: string) => `conversation:${String(conversationId).toLowerCase()}`;
export const roleGroup = (roleName: string) => `role:${roleName}`;
export const ADMIN_GROUP = 'role:Admin';
export const TEACHER_GROUP = 'role:Giao_Vien';
export const STUDENT_GROUP = 'role:Hoc_Sinh';
export const PARENT_GROUP = 'role:Phu_Huynh';

/**
 * Payload gui qua socket phai co dang giong SignalR (System.Text.Json): Date -> "2026-11-11T13:41:30",
 * Decimal -> number... Socket.IO tu JSON.stringify khong co replacer nen chuan hoa truoc o day.
 */
function normalizePayload(payload: unknown): unknown {
  if (payload === undefined) return undefined;
  const json = JSON.stringify(payload, dotnetJsonReplacer);
  return json === undefined ? undefined : JSON.parse(json);
}

function readToken(socket: Socket): string | undefined {
  const fromAuth = socket.handshake.auth?.token;
  if (typeof fromAuth === 'string' && fromAuth.trim()) return fromAuth.trim();
  // Tuong thich client kieu SignalR (?access_token=...) hoac header Authorization.
  const q = socket.handshake.query?.access_token;
  if (typeof q === 'string' && q.trim()) return q.trim();
  const header = socket.handshake.headers.authorization ?? '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim() || undefined;
  return undefined;
}

type Ack = ((res: unknown) => void) | undefined;
const asAck = (fn: unknown): Ack => (typeof fn === 'function' ? (fn as Ack) : undefined);

/** Dang ky "hub method" client goi duoc; loi -> ack({ ok:false, error }) thay cho HubException. */
function hubMethod(socket: Socket, name: string, handler: (user: AuthUser, ...args: unknown[]) => Promise<unknown>) {
  socket.on(name, async (...args: unknown[]) => {
    const ack = args.length > 0 ? asAck(args[args.length - 1]) : undefined;
    const params = ack ? args.slice(0, -1) : args;
    try {
      const result = await handler(socket.data.user as AuthUser, ...params);
      ack?.({ ok: true, ...(result !== undefined ? { data: normalizePayload(result) } : {}) });
    } catch (err) {
      ack?.({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  });
}

function setupChatHub(socket: Socket) {
  const user = socket.data.user as AuthUser;
  // ChatHub.OnConnectedAsync
  void socket.join(userGroup(user.userId));

  // ChatHub.JoinConversation(Guid conversationId)
  hubMethod(socket, 'JoinConversation', async (u, conversationId) => {
    if (!isGuid(conversationId)) throw new Error('conversationId không hợp lệ.');
    // Ban .NET khong kiem tra thanh vien (ai cung join duoc nhom bat ky) - o day chan lai.
    if (!(await isUserInConversation(conversationId, u.userId))) throw new Error('Bạn không thuộc hội thoại này.');
    await socket.join(conversationGroup(conversationId));
  });

  // ChatHub.LeaveConversation(Guid conversationId)
  hubMethod(socket, 'LeaveConversation', async (_u, conversationId) => {
    if (!isGuid(conversationId)) throw new Error('conversationId không hợp lệ.');
    await socket.leave(conversationGroup(conversationId));
  });
}

function setupNotificationHub(socket: Socket) {
  const user = socket.data.user as AuthUser;
  // NotificationHub.OnConnectedAsync: group ca nhan + group theo vai tro.
  // (Ban .NET doc claim "role" nhung token ghi ClaimTypes.Role nen thuc te khong vao group vai tro nao.)
  void socket.join(userGroup(user.userId));
  if (user.role) void socket.join(roleGroup(user.role));
  // OnDisconnectedAsync: Socket.IO tu roi moi phong khi ngat ket noi.

  // NotificationHub.MarkNotificationAsRead(Guid notificationId) -> Caller "NotificationMarkedAsRead"
  hubMethod(socket, 'MarkNotificationAsRead', async (u, notificationId) => {
    if (!isGuid(notificationId)) throw new Error('notificationId không hợp lệ.');
    await notificationRepo.markAsRead(u.userId, notificationId);
    socket.emit('NotificationMarkedAsRead', notificationId.toLowerCase());
  });

  // NotificationHub.GetUnreadCount() -> Caller "UnreadCountUpdated"
  hubMethod(socket, 'GetUnreadCount', async (u) => {
    const count = await notificationRepo.getUnreadCount(u.userId);
    socket.emit('UnreadCountUpdated', count);
  });
}

export function attachRealtime(server: http.Server) {
  io = new Server(server, {
    path: '/socket.io',
    cors: {
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : true,
      credentials: true,
    },
  });

  for (const nsName of ['/chat', '/notification'] as const) {
    const ns = io.of(nsName);

    // [Authorize] tren hub: xac thuc bang access token gui trong handshake.
    ns.use((socket, next) => {
      try {
        const token = readToken(socket);
        if (!token) return next(new Error('AUTH_REQUIRED'));
        socket.data.user = verifyAccessToken(token);
        return next();
      } catch {
        return next(new Error('AUTH_TOKEN_INVALID'));
      }
    });

    ns.on('connection', nsName === '/chat' ? setupChatHub : setupNotificationHub);
  }

  return io;
}

/** Server Socket.IO hien tai (null neu chua attachRealtime, vd khi test bang supertest). */
export function getIo(): Server | null {
  return io;
}

/** Gui su kien toi mot nguoi dung, vd: emitToUser('/notification', userId, 'NewNotification', payload) */
export function emitToUser(namespace: RealtimeNamespace, userId: string, event: string, payload: unknown) {
  io?.of(namespace).to(userGroup(userId)).emit(event, normalizePayload(payload));
}

/** Gui toi nhieu nguoi dung; moi ket noi chi nhan 1 lan. */
export function emitToUsers(namespace: RealtimeNamespace, userIds: Iterable<string>, event: string, payload: unknown) {
  const rooms = [...new Set([...userIds].map(userGroup))];
  if (rooms.length === 0) return;
  io?.of(namespace).to(rooms).emit(event, normalizePayload(payload));
}

/**
 * Clients.Group(name) / Clients.Groups(names): gui toi 1 hay nhieu phong (ten day du, vd 'role:Admin',
 * userGroup(id), conversationGroup(id)). Ket noi nam o nhieu phong chi nhan 1 lan.
 */
export function emitToGroup(namespace: RealtimeNamespace, group: string | string[], event: string, payload: unknown) {
  const rooms = Array.isArray(group) ? [...new Set(group)] : [group];
  if (rooms.length === 0) return;
  io?.of(namespace).to(rooms).emit(event, normalizePayload(payload));
}

/** Clients.All */
export function emitToAll(namespace: RealtimeNamespace, event: string, payload: unknown) {
  io?.of(namespace).emit(event, normalizePayload(payload));
}
