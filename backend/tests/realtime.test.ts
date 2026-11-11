import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, auth, login } from './helpers.js';
import { prisma } from '../src/db.js';
import { attachRealtime, emitToGroup, emitToUser } from '../src/realtime/socket.js';

// Realtime Socket.IO (thay SignalR). socket.io-client lay tu frontend/node_modules (backend khong cai).
const here = path.dirname(fileURLToPath(import.meta.url));
const requireFromFrontend = createRequire(path.resolve(here, '../../frontend/package.json'));
const { io } = requireFromFrontend('socket.io-client') as typeof import('socket.io-client');
type ClientSocket = ReturnType<typeof io>;

let server: http.Server;
let baseUrl = '';
const sockets: ClientSocket[] = [];

function connect(ns: '/chat' | '/notification', token?: string): ClientSocket {
  const s = io(baseUrl + ns, { path: '/socket.io', auth: token ? { token } : {}, transports: ['websocket'], reconnection: false, forceNew: true });
  sockets.push(s);
  return s;
}

function connected(s: ClientSocket) {
  return new Promise<void>((resolve, reject) => {
    if (s.connected) return resolve();
    s.once('connect', () => resolve());
    s.once('connect_error', (e) => reject(e));
  });
}

function nextEvent<T = unknown>(s: ClientSocket, event: string, timeoutMs = 4000) {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout cho su kien ${event}`)), timeoutMs);
    s.once(event, (payload: T) => {
      clearTimeout(t);
      resolve(payload);
    });
  });
}

beforeAll(async () => {
  server = http.createServer(app);
  attachRealtime(server);
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', () => r()));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  for (const s of sockets) s.disconnect();
  await new Promise<void>((r) => server.close(() => r()));
  await prisma.$disconnect();
});

describe('Xac thuc handshake', () => {
  it('khong co token -> connect_error AUTH_REQUIRED', async () => {
    await expect(connected(connect('/chat'))).rejects.toThrow('AUTH_REQUIRED');
  });
  it('token sai -> connect_error AUTH_TOKEN_INVALID', async () => {
    await expect(connected(connect('/notification', 'abc.def.ghi'))).rejects.toThrow('AUTH_TOKEN_INVALID');
  });
});

describe('/chat (ChatHub)', () => {
  let conversationId = '';

  // Dung cap admin <-> phu huynh de khong dua voi messages.test.ts (admin <-> giao vien) khi chay song song.
  it('gui tin bang REST -> nguoi nhan nhan "message-created" va "conversation-updated"', async () => {
    const teacher = await login('parent');
    const admin = await login('admin');
    const created = await request(app).post('/api/Messages/direct').set(await auth('admin')).send({ recipientUserId: teacher.userId });
    conversationId = created.body.data.conversationId;

    const teacherSocket = connect('/chat', teacher.token);
    await connected(teacherSocket);

    const msgP = nextEvent<Record<string, unknown>>(teacherSocket, 'message-created');
    const convP = nextEvent<Record<string, unknown>>(teacherSocket, 'conversation-updated');
    const sent = await request(app)
      .post(`/api/Messages/conversations/${conversationId}/messages`)
      .set(await auth('admin'))
      .send({ content: 'TEST_MSG_ realtime' });
    expect(sent.status).toBe(200);

    const msg = await msgP;
    expect(msg).toEqual(sent.body.data);
    expect(msg).toMatchObject({ conversationId, senderId: admin.userId, content: 'TEST_MSG_ realtime' });
    expect(await convP).toEqual({ conversationId });
  });

  it('JoinConversation: thanh vien -> ok, ket noi o ca 2 phong chi nhan 1 lan; nguoi ngoai -> bi tu choi', async () => {
    const teacher = await login('parent');
    const s = connect('/chat', teacher.token);
    await connected(s);
    expect(await s.timeout(3000).emitWithAck('JoinConversation', conversationId)).toEqual({ ok: true });

    let count = 0;
    s.on('message-created', () => count++);
    const p = nextEvent(s, 'message-created');
    await request(app)
      .post(`/api/Messages/conversations/${conversationId}/messages`)
      .set(await auth('admin'))
      .send({ content: 'TEST_MSG_ once' });
    await p;
    await new Promise((r) => setTimeout(r, 300));
    expect(count).toBe(1);

    expect(await s.timeout(3000).emitWithAck('LeaveConversation', conversationId)).toEqual({ ok: true });

    const student = await login('student');
    const st = connect('/chat', student.token);
    await connected(st);
    const denied = await st.timeout(3000).emitWithAck('JoinConversation', conversationId);
    expect(denied).toMatchObject({ ok: false });
    const bad = await st.timeout(3000).emitWithAck('JoinConversation', 'not-a-guid');
    expect(bad).toMatchObject({ ok: false });
  });

  it('emitToUser (dung cho module lich) gui dung nguoi, Date duoc ghi kieu .NET', async () => {
    const admin = await login('admin');
    const s = connect('/chat', admin.token);
    await connected(s);
    const p = nextEvent<Record<string, unknown>>(s, 'NewScheduleChangeRequest');
    emitToUser('/chat', admin.userId, 'NewScheduleChangeRequest', { maYeuCau: 1, at: new Date(Date.UTC(2026, 0, 2, 3, 4, 5)) });
    expect(await p).toEqual({ maYeuCau: 1, at: '2026-01-02T03:04:05' });
  });
});

describe('/notification (NotificationHub)', () => {
  it('GetUnreadCount -> "UnreadCountUpdated" bang REST unread-count', async () => {
    const admin = await login('admin');
    const s = connect('/notification', admin.token);
    await connected(s);
    const p = nextEvent<number>(s, 'UnreadCountUpdated');
    expect(await s.timeout(3000).emitWithAck('GetUnreadCount')).toEqual({ ok: true });
    const rest = await request(app).get('/api/Notification/unread-count').set(await auth('admin'));
    expect(await p).toBe(rest.body.data);
  });

  it('MarkNotificationAsRead -> "NotificationMarkedAsRead" (id)', async () => {
    const admin = await login('admin');
    const s = connect('/notification', admin.token);
    await connected(s);
    const id = '00000000-0000-0000-0000-000000000001';
    const p = nextEvent<string>(s, 'NotificationMarkedAsRead');
    expect(await s.timeout(3000).emitWithAck('MarkNotificationAsRead', id)).toEqual({ ok: true });
    expect(await p).toBe(id);
  });

  it('group vai tro role:Admin nhan "NewNotification", hoc sinh thi khong', async () => {
    const admin = await login('admin');
    const student = await login('student');
    const a = connect('/notification', admin.token);
    const st = connect('/notification', student.token);
    await Promise.all([connected(a), connected(st)]);
    let studentGot = false;
    st.on('NewNotification', () => (studentGot = true));
    const p = nextEvent(a, 'NewNotification');
    emitToGroup('/notification', 'role:Admin', 'NewNotification', { id: 'x', title: 'TEST_MSG_' });
    expect(await p).toEqual({ id: 'x', title: 'TEST_MSG_' });
    await new Promise((r) => setTimeout(r, 200));
    expect(studentGot).toBe(false);
  });
});
