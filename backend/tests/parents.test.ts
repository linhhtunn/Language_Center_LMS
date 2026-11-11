import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { app, auth } from './helpers.js';
import { cleanupPeople, createUser, type TestUser } from './people.fixture.js';

// ParentController (/api/Parent/*) + ParentChildrenController (/api/parents/{parentUserId}/children...).
const P = 'TEST_PEOPLE_PRT_';
let ph: TestUser, ph2: TestUser, hs: TestUser, hs2: TestUser, noProfile: TestUser;
let admin: { Authorization: string };

beforeAll(async () => {
  await cleanupPeople(P);
  admin = await auth('admin');
  ph = await createUser(P, 'ph', 'Phu_Huynh', `${P}PH Cha`);
  ph2 = await createUser(P, 'ph2', 'Phu_Huynh', `${P}PH Me`);
  hs = await createUser(P, 'hs', 'Hoc_Sinh', `${P}HS Binh`);
  hs2 = await createUser(P, 'hs2', 'Hoc_Sinh', `${P}HS An`);
  noProfile = await createUser(P, 'noph', 'Phu_Huynh', `${P}PH moi`, false);
});

afterAll(async () => {
  await cleanupPeople(P);
  await prisma.$disconnect();
});

describe('/api/Parent profile', () => {
  it('my-profile', async () => {
    const res = await request(app).get('/api/Parent/my-profile').set(ph.headers);
    expect(res.body.data).toEqual({ hoTen: `${P}PH Cha`, email: ph.email, anhDaiDien: '', soDienThoai: '0901', diaChiLienHe: '', ngheNghiep: '' });
  });

  it('update-profile: HoTen rong -> 400; SoDienThoai null -> ""', async () => {
    let res = await request(app).put('/api/Parent/update-profile').set(ph.headers).send({ HoTen: ' ' });
    expect(res.body).toMatchObject({ code: 'PARENT_PROFILE_NAME_REQUIRED', message: 'Họ và tên là bắt buộc.' });
    res = await request(app).put('/api/Parent/update-profile').set(ph.headers).send({ HoTen: `${P}PH Cha`, SoDienThoai: null, DiaChiLienHe: ' 12 Ly ', NgheNghiep: 'Ky su' });
    expect(res.body.data).toEqual({ hoTen: `${P}PH Cha`, email: ph.email, anhDaiDien: '', soDienThoai: '', diaChiLienHe: '12 Ly', ngheNghiep: 'Ky su' });
    res = await request(app).put('/api/Parent/update-profile').set(noProfile.headers).send({ HoTen: `${P}PH moi`, SoDienThoai: ' 0999 ' });
    expect(res.body.data.soDienThoai).toBe('0999');
    expect(await prisma.phuhuynh.count({ where: { MaNguoiDung: noProfile.userId } })).toBe(1);
  });

  it('upload/delete avatar', async () => {
    let res = await request(app).post('/api/Parent/upload-avatar').set(ph.headers).attach('file', Buffer.from('GIF89a'), 'a.gif');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Upload ảnh đại diện thành công.');
    res = await request(app).delete('/api/Parent/delete-avatar').set(ph.headers);
    expect(res.body.data).toEqual({ avatarUrl: '' });
  });

  it('child-summary: text/plain khi loi, object tron khi thanh cong, can quyen PAGE_PARENT_SCHEDULE_VIEW', async () => {
    let res = await request(app).get(`/api/Parent/child-summary/abc`).set(ph.headers);
    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toContain('text/plain');
    expect(res.text).toBe('userId không hợp lệ.');
    res = await request(app).get(`/api/Parent/child-summary/${ph.userId}`).set(ph.headers);
    expect(res.status).toBe(404);
    expect(res.text).toBe('Không tìm thấy dữ liệu.');
    res = await request(app).get(`/api/Parent/child-summary/${hs.userId.replaceAll('-', '').toUpperCase()}`).set(ph.headers);
    expect(res.body).toEqual({ maHocSinh: hs.profileId, tenCon: `${P}HS Binh`, maLopHienThi: 'N/A', tenKhoaHoc: 'N/A', nhanXetMoiNhat: 'Chưa có dữ liệu' });
    res = await request(app).get(`/api/Parent/child-summary/${hs.userId}`).set(hs.headers);
    expect(res.status).toBe(403);
  });
});

describe('/api/parents/{parentUserId}/children', () => {
  const url = () => `/api/parents/${ph.userId}/children`;

  it('quyen: chi Admin hoac chinh phu huynh xem; them/xoa can PARENT_CHILDREN_EDIT', async () => {
    expect((await request(app).get(url()).set(ph2.headers)).status).toBe(403);
    expect((await request(app).get('/api/parents/abc/children').set(admin)).status).toBe(404);
    const res = await request(app).post(url()).set(ph.headers).send({ studentId: hs.profileId });
    expect(res.status).toBe(403);
    expect(res.body.statusCode).toBe(403);
  });

  it('them con, sap xep theo ten, go con, gan lai', async () => {
    let res = await request(app).post(url()).set(admin).send({ studentId: hs.profileId });
    expect(res.body).toMatchObject({ success: true, message: 'Da gan phu huynh voi hoc sinh.', data: { parentUserId: ph.userId, studentId: hs.profileId } });
    await request(app).post(url()).set(admin).send({ studentId: hs2.profileId });
    res = await request(app).get(url()).set(ph.headers);
    expect(res.body.data).toEqual([
      { studentId: hs2.profileId, userId: hs2.userId, fullName: `${P}HS An`, email: hs2.email, active: true },
      { studentId: hs.profileId, userId: hs.userId, fullName: `${P}HS Binh`, email: hs.email, active: true },
    ]);

    res = await request(app).delete(`${url()}/${hs.profileId}`).set(admin);
    expect(res.body).toMatchObject({ message: 'Da go hoc sinh khoi phu huynh.', data: { parentUserId: ph.userId, studentId: hs.profileId } });
    res = await request(app).delete(`${url()}/${hs.profileId}`).set(admin);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('PARENT_CHILD_NOT_FOUND');
    expect((await request(app).get(url()).set(admin)).body.data).toHaveLength(1);

    res = await request(app).post(url()).set(admin).send({ studentId: hs.profileId });
    expect(res.status).toBe(200);
    expect((await request(app).get(url()).set(admin)).body.data).toHaveLength(2);
  });

  it('404: phu huynh / hoc sinh khong ton tai; binding sai', async () => {
    let res = await request(app).post(`/api/parents/${hs.userId}/children`).set(admin).send({ studentId: hs.profileId });
    expect(res.body.code).toBe('PARENT_NOT_FOUND');
    res = await request(app).post(url()).set(admin).send({ studentId: '11111111-1111-1111-1111-111111111111' });
    expect(res.body.code).toBe('STUDENT_NOT_FOUND');
    res = await request(app).post(url()).set(admin).send({});
    expect(res.body.code).toBe('STUDENT_NOT_FOUND'); // Guid.Empty
    res = await request(app).post(url()).set(admin).send({ studentId: 1 });
    expect(res.status).toBe(400);
    expect(res.body.errors['$.studentId'][0]).toContain('System.Guid');
  });
});
