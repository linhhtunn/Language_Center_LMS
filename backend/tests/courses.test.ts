import { randomInt } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app, auth } from './helpers.js';

const { prisma } = await import('../src/db.js');

const S = `${Date.now().toString(36)}${randomInt(1000)}`;
const name = `TEST_USERS_Course_${S}`;

afterAll(async () => {
  const rows = await prisma.khoahoc.findMany({ where: { TenKhoaHoc: { startsWith: `TEST_USERS_Course_${S}` } } });
  await prisma.khoahoc.deleteMany({ where: { MaKhoaHoc: { in: rows.map((r) => r.MaKhoaHoc) } } });
  await prisma.$disconnect();
});

describe('/api/courses', () => {
  it('chua dang nhap -> 401; hoc sinh xem duoc danh sach nhung khong tao duoc', async () => {
    expect((await request(app).get('/api/courses')).status).toBe(401);
    const list = await request(app).get('/api/courses').set(await auth('student'));
    expect(list.status).toBe(200);
    expect(list.body.success).toBe(true);
    const create = await request(app).post('/api/courses').set(await auth('student')).send({ name: 'x' });
    expect(create.status).toBe(403);
  });

  it('validation', async () => {
    const h = await auth('admin');
    const blank = await request(app).post('/api/courses').set(h).send({ name: '  ' });
    expect(blank.body).toMatchObject({ code: 'COURSE_NAME_REQUIRED', message: 'Ten khoa hoc la bat buoc.' });
    const nul = await request(app).post('/api/courses').set(h).send({ name: null });
    expect(nul.body.errors).toEqual({ Name: ['The Name field is required.'] });
    const price = await request(app).post('/api/courses').set(h).send({ name: 'x', basePrice: 'abc' });
    expect(Object.keys(price.body.errors)).toEqual(['request', '$.basePrice']);
  });

  it('tao -> doc -> sua -> xoa mem', async () => {
    const h = await auth('admin');
    const create = await request(app)
      .post('/api/courses')
      .set(h)
      .send({ name: ` ${name} `, description: '  mo ta  ', basePrice: '1234.5', active: false });
    expect(create.status).toBe(201);
    const c = create.body.data;
    expect(create.headers.location).toMatch(new RegExp(`/api/courses/${c.id}$`));
    expect(c).toEqual({ id: c.id, name, description: 'mo ta', basePrice: 1234.5, active: false });

    const get = await request(app).get(`/api/courses/${c.id}`).set(h);
    expect(get.status).toBe(200);
    // DECIMAL(14,2) ghi giong .NET: 1234.50
    expect(get.text).toContain('"basePrice":1234.50');

    const all = await request(app).get('/api/courses').set(h);
    expect(all.body.data.some((x: { id: string }) => x.id === c.id)).toBe(true);

    const dup = await request(app).post('/api/courses').set(h).send({ name });
    expect(dup.body.code).toBe('COURSE_NAME_EXISTS');

    const upd = await request(app).put(`/api/courses/${c.id}`).set(h).send({ name: `${name}_b`, basePrice: 99.5 });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toEqual({ id: c.id, name: `${name}_b`, description: null, basePrice: 99.5, active: true });

    const del = await request(app).delete(`/api/courses/${c.id}`).set(h);
    expect(del.body).toMatchObject({ success: true, message: 'Da xoa mem khoa hoc.', data: { id: c.id } });
    const nf = await request(app).get(`/api/courses/${c.id}`).set(h);
    expect(nf.status).toBe(404);
    expect(nf.body.code).toBe('COURSE_NOT_FOUND');
    expect((await request(app).get('/api/courses/not-a-guid').set(h)).status).toBe(404);
  });
});
