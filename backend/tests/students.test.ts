import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { app } from './helpers.js';
import { cleanupPeople, createUser, type TestUser } from './people.fixture.js';

// HocSinhController: /api/HocSinh/*
const P = 'TEST_PEOPLE_STU_';
let hs: TestUser, noProfile: TestUser;

beforeAll(async () => {
  await cleanupPeople(P);
  hs = await createUser(P, 'hs', 'Hoc_Sinh', `${P}HS Binh`);
  noProfile = await createUser(P, 'nohs', 'Hoc_Sinh', `${P}HS moi`, false);
});

afterAll(async () => {
  await cleanupPeople(P);
  await prisma.$disconnect();
});

describe('/api/HocSinh', () => {
  it('my-profile: ngay sinh dang yyyy-MM-dd', async () => {
    const res = await request(app).get('/api/HocSinh/my-profile').set(hs.headers);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      hoTen: `${P}HS Binh`,
      email: hs.email,
      anhDaiDien: '',
      ngaySinh: '2010-05-06',
      queQuan: '',
      truongDangTheoHoc: '',
      soDienThoaiNguoiThan: '',
    });
    const none = await request(app).get('/api/HocSinh/my-profile').set(noProfile.headers);
    expect(none.body.data.ngaySinh).toBe('');
  });

  it('update-profile: validate HoTen va NgaySinh', async () => {
    let res = await request(app).put('/api/HocSinh/update-profile').set(hs.headers).send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('STUDENT_PROFILE_NAME_REQUIRED');
    res = await request(app).put('/api/HocSinh/update-profile').set(hs.headers).send({ hoTen: null });
    expect(res.body.errors).toEqual({ HoTen: ['The HoTen field is required.'] });
    for (const bad of ['2011-2-3', '2011-02-30', '03/02/2011']) {
      res = await request(app).put('/api/HocSinh/update-profile').set(hs.headers).send({ HoTen: 'x', NgaySinh: bad });
      expect(res.body).toMatchObject({ code: 'STUDENT_PROFILE_BIRTHDATE_INVALID', message: 'Ngày sinh không hợp lệ. Định dạng đúng là yyyy-MM-dd.' });
    }
    res = await request(app).put('/api/HocSinh/update-profile').set(hs.headers).send({ HoTen: 5 });
    expect(Object.keys(res.body.errors)).toEqual(['dto', '$.HoTen']);
  });

  it('update-profile: cap nhat, NgaySinh rong -> null', async () => {
    let res = await request(app)
      .put('/api/HocSinh/update-profile')
      .set(hs.headers)
      .send({ HoTen: ` ${P}HS Binh `, NgaySinh: '2011-02-03', QueQuan: ' Ha Noi ', TruongDangTheoHoc: 'THPT A', SoDienThoaiNguoiThan: '', AnhDaiDien: ' http://x/a.png ' });
    expect(res.body.data).toEqual({
      hoTen: `${P}HS Binh`,
      email: hs.email,
      anhDaiDien: 'http://x/a.png',
      ngaySinh: '2011-02-03',
      queQuan: 'Ha Noi',
      truongDangTheoHoc: 'THPT A',
      soDienThoaiNguoiThan: '',
    });
    res = await request(app).put('/api/HocSinh/update-profile').set(hs.headers).send({ HoTen: `${P}HS Binh`, NgaySinh: '  ' });
    expect(res.body.data.ngaySinh).toBe('');
    expect(res.body.data.anhDaiDien).toBe('');
  });

  it('update-profile tao ho so hocsinh neu chua co', async () => {
    const res = await request(app).put('/api/HocSinh/update-profile').set(noProfile.headers).send({ HoTen: `${P}HS moi`, NgaySinh: '2012-12-31' });
    expect(res.status).toBe(200);
    const row = await prisma.hocsinh.findFirst({ where: { MaNguoiDung: noProfile.userId } });
    expect(row?.NgaySinh?.toISOString().slice(0, 10)).toBe('2012-12-31');
  });

  it('upload/delete avatar', async () => {
    const png = Buffer.from('89504e470d0a1a0a', 'hex');
    let res = await request(app).post('/api/HocSinh/upload-avatar').set(hs.headers).attach('file', png, 'a.jpeg');
    expect(res.status).toBe(200);
    expect(res.body.data.avatarUrl).toMatch(/^\/uploads\/avatars\/avatar_[0-9a-f]{32}_[0-9a-f]{32}\.jpeg$/);
    res = await request(app).delete('/api/HocSinh/delete-avatar').set(hs.headers);
    expect(res.body.data).toEqual({ avatarUrl: '' });
  });
});
