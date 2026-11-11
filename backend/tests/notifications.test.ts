import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app, auth, login } from './helpers.js';
import { prisma } from '../src/db.js';
import { deleteUpload } from '../src/utils/upload.js';

// NotificationController (/api/Notification). Thong bao thu chi gui cho DoiTuong=Admin, tien to TEST_MSG_.

const FAKE = '00000000-0000-0000-0000-000000000001';
const UTC_Z = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
let adminId = '';
let notifId = '';
let attachmentId = '';
const createdLinks: string[] = [];

beforeAll(async () => {
  adminId = (await login('admin')).userId;
});

afterAll(async () => {
  for (const url of createdLinks) await deleteUpload(url);
  await prisma.$disconnect();
});

describe('Quyen + validate', () => {
  it('chua dang nhap -> 401; hoc sinh GET tat ca -> 403 {message,statusCode}', async () => {
    expect((await request(app).get('/api/Notification/unread-count')).status).toBe(401);
    const res = await request(app).get('/api/Notification').set(await auth('student'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });

  it('tao: thieu Title / rong -> 400 ValidationProblem', async () => {
    const h = await auth('admin');
    const a = await request(app).post('/api/Notification').set(h).field('Content', 'abc');
    expect(a.status).toBe(400);
    expect(a.body.errors).toEqual({ Title: ['The Title field is required.'] });
    const b = await request(app).post('/api/Notification').set(h).field('Title', ' ').field('Content', '').field('DoiTuong', '');
    expect(Object.keys(b.body.errors)).toEqual(['Title', 'Content', 'DoiTuong']);
  });

  it('tao: file sai dinh dang -> 400 ATTACHMENT_INVALID va KHONG luu thong bao', async () => {
    const title = `TEST_MSG_ bad file ${Date.now()}`;
    const res = await request(app)
      .post('/api/Notification')
      .set(await auth('admin'))
      .field('Title', title)
      .field('Content', 'x')
      .field('DoiTuong', 'Admin')
      .attach('Files', Buffer.from('MZ'), 'virus.exe');
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('ATTACHMENT_INVALID');
    expect(await prisma.thongbao.count({ where: { TieuDe: title } })).toBe(0);
  });

  it('id sai -> 400 "The value ... is not valid."; khong ton tai -> 400 NOT_FOUND', async () => {
    const h = await auth('admin');
    const bad = await request(app).post('/api/Notification/abc/mark-as-read').set(h);
    expect(bad.status).toBe(400);
    expect(bad.body.errors).toEqual({ id: ["The value 'abc' is not valid."] });
    const del = await request(app).delete(`/api/Notification/${FAKE}`).set(h);
    expect(del.status).toBe(400);
    expect(del.body.code).toBe('NOT_FOUND');
    const put = await request(app).put(`/api/Notification/${FAKE}`).set(h).send({});
    expect(put.body.errors).toEqual({ Title: ['The Title field is required.'], Content: ['The Content field is required.'] });
  });
});

describe('Vong doi thong bao', () => {
  it('tao co file dinh kem (ten tieng Viet)', async () => {
    const res = await request(app)
      .post('/api/Notification')
      .set(await auth('admin'))
      .field('Title', 'TEST_MSG_ thông báo')
      .field('Content', 'TEST_MSG_ nội dung')
      .field('DoiTuong', 'Admin')
      .attach('Files', Buffer.from('%PDF-1.4 test'), { filename: 'TEST_MSG_tài liệu.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tạo thông báo thành công');
    expect(Object.keys(res.body.data)).toEqual(['id', 'title', 'content', 'doiTuong', 'createdAt', 'isRead', 'readAt', 'attachments']);
    expect(res.body.data).toMatchObject({ doiTuong: 'Admin', isRead: false, readAt: null });
    expect(res.body.data.createdAt).toMatch(UTC_Z);
    expect(res.body.data.attachments).toEqual([{ id: expect.any(String), fileName: 'TEST_MSG_tài liệu.pdf' }]);
    notifId = res.body.data.id;
    attachmentId = res.body.data.attachments[0].id;
    const resource = await prisma.tainguyenluutru.findUnique({ where: { MaTaiNguyen: attachmentId } });
    createdLinks.push(resource!.Link);
    expect(resource!.Link).toMatch(new RegExp(`^/uploads/notifications/notif_${adminId.replaceAll('-', '')}_[0-9a-f]{32}\\.pdf$`));
  });

  it('admin nhan duoc: my-notifications, unread, unread-count, GET tat ca', async () => {
    const h = await auth('admin');
    const my = await request(app).get('/api/Notification/my-notifications').set(h);
    const mine = my.body.data.find((n: { id: string }) => n.id === notifId);
    expect(mine).toMatchObject({ title: 'TEST_MSG_ thông báo', isRead: false, readAt: null });
    const unread = await request(app).get('/api/Notification/unread').set(h);
    expect(unread.body.data.some((n: { id: string }) => n.id === notifId)).toBe(true);
    const count = await request(app).get('/api/Notification/unread-count').set(h);
    expect(count.body.data).toBeGreaterThan(0);
    const all = await request(app).get('/api/Notification').set(h);
    expect(all.body.data.find((n: { id: string }) => n.id === notifId).attachments).toHaveLength(1);
    // hoc sinh khong phai nguoi nhan
    const st = await request(app).get('/api/Notification/my-notifications').set(await auth('student'));
    expect(st.body.data.some((n: { id: string }) => n.id === notifId)).toBe(false);
  });

  it('tai file: admin OK; hoc sinh khong phai nguoi nhan -> 403; guid sai -> 404', async () => {
    const res = await request(app).get(`/api/Notification/attachments/${attachmentId}/download`).set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment');
    const st = await request(app).get(`/api/Notification/attachments/${attachmentId}/download`).set(await auth('student'));
    expect(st.status).toBe(403);
    expect(st.body.code).toBe('ATTACHMENT_FORBIDDEN');
    expect((await request(app).get('/api/Notification/attachments/abc/download').set(await auth('admin'))).status).toBe(404);
  });

  it('danh dau da doc -> readAt co Z', async () => {
    const h = await auth('admin');
    const res = await request(app).post(`/api/Notification/${notifId}/mark-as-read`).set(h);
    expect(res.body).toMatchObject({ success: true, data: null });
    const my = await request(app).get('/api/Notification/my-notifications').set(h);
    const mine = my.body.data.find((n: { id: string }) => n.id === notifId);
    expect(mine.isRead).toBe(true);
    expect(mine.readAt).toMatch(UTC_Z);
  });

  it('cap nhat -> nguoi nhan tinh lai, attachments rong trong ket qua', async () => {
    const res = await request(app)
      .put(`/api/Notification/${notifId}`)
      .set(await auth('admin'))
      .send({ title: 'TEST_MSG_ đã sửa', content: 'TEST_MSG_ c2', doiTuong: 'Admin' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: 'Cập nhật thành công', data: { title: 'TEST_MSG_ đã sửa', attachments: [] } });
    const receivers = await prisma.nguoinhanthongbao.findMany({ where: { MaThongBao: notifId, MaNguoiDung: adminId } });
    expect(receivers[0].DaXoa).toBe(false);
  });

  it('danh dau tat ca da doc', async () => {
    const res = await request(app).post('/api/Notification/mark-all-as-read').set(await auth('admin'));
    expect(res.status).toBe(200);
  });

  it('xoa mem', async () => {
    const h = await auth('admin');
    const res = await request(app).delete(`/api/Notification/${notifId}`).set(h);
    expect(res.body).toMatchObject({ success: true, message: 'Xóa thông báo thành công' });
    const my = await request(app).get('/api/Notification/my-notifications').set(h);
    expect(my.body.data.some((n: { id: string }) => n.id === notifId)).toBe(false);
  });
});
