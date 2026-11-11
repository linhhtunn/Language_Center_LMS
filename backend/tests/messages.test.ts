import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, auth, login } from './helpers.js';
import { prisma } from '../src/db.js';
import { deleteUpload } from '../src/utils/upload.js';

// MessagesController (/api/Messages). Du lieu tao ra co tien to TEST_MSG_.

const FAKE = '00000000-0000-0000-0000-000000000001';
const uploaded: string[] = [];
let adminId = '';
let teacherId = '';
let studentId = '';
let directId = '';
let groupId = '';

beforeAll(async () => {
  adminId = (await login('admin')).userId;
  teacherId = (await login('teacher')).userId;
  studentId = (await login('student')).userId;
});

afterAll(async () => {
  for (const url of uploaded) await deleteUpload(url);
  await prisma.$disconnect();
});

describe('GET /api/Messages/users, /conversations', () => {
  it('chua dang nhap -> 401', async () => {
    expect((await request(app).get('/api/Messages/users')).status).toBe(401);
  });

  it('danh sach nguoi dung nhan tin (khong co chinh minh, sap theo ten)', async () => {
    const res = await request(app).get('/api/Messages/users').set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Lấy danh sách người dùng nhắn tin thành công.' });
    const users = res.body.data as { userId: string; fullName: string; role: string; avatarUrl: string | null }[];
    expect(users.some((u) => u.userId === adminId)).toBe(false);
    const teacher = users.find((u) => u.userId === teacherId);
    expect(teacher).toMatchObject({ role: 'Giao_Vien', avatarUrl: null });
    expect(Object.keys(teacher!)).toEqual(['userId', 'fullName', 'role', 'avatarUrl']);
  });
});

describe('Hoi thoai truc tiep / nhom + gui tin', () => {
  it('direct: thieu nguoi nhan / chinh minh / khong ton tai', async () => {
    const h = await auth('admin');
    expect((await request(app).post('/api/Messages/direct').set(h).send({})).body.code).toBe('CHAT_RECIPIENT_REQUIRED');
    expect((await request(app).post('/api/Messages/direct').set(h).send({ recipientUserId: adminId })).body.code).toBe(
      'CHAT_INVALID_RECIPIENT',
    );
    const nf = await request(app).post('/api/Messages/direct').set(h).send({ recipientUserId: FAKE });
    expect(nf.status).toBe(400);
    expect(nf.body.code).toBe('CHAT_RECIPIENT_NOT_FOUND');
  });

  it('direct: Guid sai -> 400 ValidationProblem giong .NET', async () => {
    const res = await request(app).post('/api/Messages/direct').set(await auth('admin')).send({ recipientUserId: 'abc' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(['request', '$.recipientUserId']);
  });

  it('direct: tao (hoac dung lai) hoi thoai admin <-> giao vien', async () => {
    const res = await request(app)
      .post('/api/Messages/direct')
      .set(await auth('admin'))
      .send({ recipientUserId: teacherId, initialMessage: 'TEST_MSG_ direct hello' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isGroup: false, title: null, lastMessage: 'TEST_MSG_ direct hello' });
    expect(Object.keys(res.body.data)).toEqual([
      'conversationId',
      'isGroup',
      'displayName',
      'title',
      'avatarUrl',
      'lastMessage',
      'lastMessageAt',
      'unreadCount',
      'members',
    ]);
    directId = res.body.data.conversationId;
    // goi lai -> cung hoi thoai
    const again = await request(app).post('/api/Messages/direct').set(await auth('teacher')).send({ recipientUserId: adminId });
    expect(again.body.data.conversationId).toBe(directId);
  });

  it('groups: validate + tao nhom', async () => {
    const h = await auth('admin');
    expect((await request(app).post('/api/Messages/groups').set(h).send({ memberUserIds: [teacherId] })).body.code).toBe(
      'CHAT_GROUP_TITLE_REQUIRED',
    );
    expect((await request(app).post('/api/Messages/groups').set(h).send({ title: 'x', memberUserIds: [adminId] })).body.code).toBe(
      'CHAT_GROUP_MEMBERS_REQUIRED',
    );
    expect((await request(app).post('/api/Messages/groups').set(h).send({ title: 'x', memberUserIds: [FAKE] })).body.code).toBe(
      'CHAT_GROUP_INVALID_MEMBER',
    );
    const nulls = await request(app).post('/api/Messages/groups').set(h).send({ title: null, memberUserIds: null });
    expect(nulls.body.errors).toEqual({
      Title: ['The Title field is required.'],
      MemberUserIds: ['The MemberUserIds field is required.'],
    });

    const res = await request(app)
      .post('/api/Messages/groups')
      .set(h)
      .send({ title: ' TEST_MSG_ nhom ', memberUserIds: [teacherId, studentId, teacherId] });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isGroup: true, title: 'TEST_MSG_ nhom', displayName: 'TEST_MSG_ nhom', avatarUrl: null });
    expect(res.body.data.members).toHaveLength(3);
    groupId = res.body.data.conversationId;
  });

  it('gui tin: rong -> 400, khong phai thanh vien -> 403 khong body, guid sai -> 404', async () => {
    const h = await auth('admin');
    const empty = await request(app).post(`/api/Messages/conversations/${groupId}/messages`).set(h).send({ content: '  ' });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('CHAT_MESSAGE_REQUIRED');
    const forbidden = await request(app)
      .post(`/api/Messages/conversations/${directId}/messages`)
      .set(await auth('student'))
      .send({ content: 'x' });
    expect(forbidden.status).toBe(403);
    expect(forbidden.text).toBe('');
    expect((await request(app).post('/api/Messages/conversations/abc/messages').set(h).send({ content: 'x' })).status).toBe(404);
  });

  it('gui tin co dinh kem, doc lai danh sach tin nhan (cu -> moi)', async () => {
    const h = await auth('teacher');
    const sent = await request(app)
      .post(`/api/Messages/conversations/${groupId}/messages`)
      .set(h)
      .send({ content: 'TEST_MSG_ file', attachmentUrls: ['/uploads/message-attachments/attachment_test.png'] });
    expect(sent.status).toBe(200);
    expect(sent.body.data).toMatchObject({
      conversationId: groupId,
      senderId: teacherId,
      senderRole: 'Giao_Vien',
      content: 'TEST_MSG_ file',
      attachmentUrls: ['/uploads/message-attachments/attachment_test.png'],
      isRead: false,
    });
    // DateTime.UtcNow ben .NET -> co "Z"
    expect(sent.body.data.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

    // Noi dung luu dang JSON dac biet giong .NET
    const row = await prisma.tinnhan.findUnique({ where: { MaTinNhan: sent.body.data.messageId } });
    expect(JSON.parse(row!.NoiDung)).toEqual({
      __chatMessageFormat: 1,
      Text: 'TEST_MSG_ file',
      AttachmentUrls: ['/uploads/message-attachments/attachment_test.png'],
    });

    const list = await request(app).get(`/api/Messages/conversations/${groupId}/messages?take=10`).set(await auth('admin'));
    expect(list.status).toBe(200);
    const msgs = list.body.data;
    expect(msgs[msgs.length - 1]).toMatchObject({ content: 'TEST_MSG_ file', attachmentUrls: ['/uploads/message-attachments/attachment_test.png'] });
    expect(msgs[msgs.length - 1].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);

    const one = await request(app).get(`/api/Messages/conversations/${groupId}/messages?take=1`).set(await auth('admin'));
    expect(one.body.data).toHaveLength(1);
    const bad = await request(app).get(`/api/Messages/conversations/${groupId}/messages?take=abc`).set(await auth('admin'));
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toEqual({ take: ["The value 'abc' is not valid."] });
  });

  it('hoi thoai nhom: tin cuoi co ten nguoi gui, unreadCount, doc -> 0', async () => {
    const conv = await request(app).get(`/api/Messages/conversations/${groupId}`).set(await auth('admin'));
    expect(conv.status).toBe(200);
    expect(conv.body.data.lastMessage).toMatch(/: TEST_MSG_ file$/);
    expect(conv.body.data.unreadCount).toBeGreaterThan(0);

    const read = await request(app).post(`/api/Messages/conversations/${groupId}/read`).set(await auth('admin'));
    expect(read.status).toBe(200);
    expect(read.body.data).toMatchObject({ conversationId: groupId });
    expect(read.body.data.updatedCount).toBeGreaterThan(0);

    const after = await request(app).get(`/api/Messages/conversations/${groupId}`).set(await auth('admin'));
    expect(after.body.data.unreadCount).toBe(0);

    const list = await request(app).get('/api/Messages/conversations').set(await auth('admin'));
    expect(list.body.data.some((c: { conversationId: string }) => c.conversationId === groupId)).toBe(true);
  });

  it('GET hoi thoai: khong thuoc -> 403, guid sai -> 404', async () => {
    expect((await request(app).get(`/api/Messages/conversations/${directId}`).set(await auth('student'))).status).toBe(403);
    expect((await request(app).get('/api/Messages/conversations/xyz').set(await auth('admin'))).status).toBe(404);
  });
});

describe('POST /api/Messages/attachments, /device-token', () => {
  it('khong co file -> 400 CHAT_ATTACHMENTS_REQUIRED', async () => {
    const res = await request(app).post('/api/Messages/attachments').set(await auth('admin')).field('x', '1');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('CHAT_ATTACHMENTS_REQUIRED');
  });

  it('upload -> /uploads/message-attachments/attachment_<guid><ext>', async () => {
    const res = await request(app)
      .post('/api/Messages/attachments')
      .set(await auth('admin'))
      .attach('files', Buffer.from('hello'), 'TEST_MSG_a.TXT')
      .attach('Files', Buffer.from('png'), 'TEST_MSG_b.png');
    expect(res.status).toBe(200);
    const urls = res.body.data as string[];
    uploaded.push(...urls);
    expect(urls).toHaveLength(2);
    expect(urls[0]).toMatch(/^\/uploads\/message-attachments\/attachment_[0-9a-f-]{36}\.TXT$/);
    const file = await request(app).get(urls[1]);
    expect(file.status).toBe(200);
  });

  it('device token', async () => {
    const h = await auth('admin');
    expect((await request(app).post('/api/Messages/device-token').set(h).send({ deviceToken: ' ' })).body.code).toBe(
      'CHAT_DEVICE_TOKEN_INVALID',
    );
    const res = await request(app).post('/api/Messages/device-token').set(h).send({ deviceToken: 'TEST_MSG_token' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ userId: adminId, registered: true });
  });
});
