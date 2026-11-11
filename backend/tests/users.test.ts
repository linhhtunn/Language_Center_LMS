import { randomInt } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app, auth } from './helpers.js';

const { prisma } = await import('../src/db.js');

// Du lieu thu co tien to TEST_USERS_ va duoc xoa cung o cuoi.
const S = `${Date.now().toString(36)}${randomInt(1000)}`;
const created: string[] = [];

afterAll(async () => {
  const users = await prisma.nguoidung.findMany({
    where: { OR: [{ MaNguoiDung: { in: created } }, { TenDangNhap: { startsWith: `TEST_USERS_${S}` } }] },
    select: { MaNguoiDung: true },
  });
  const ids = users.map((u) => u.MaNguoiDung);
  await prisma.nguoidungvaitro.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.hocsinh.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.giangvien.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.phuhuynh.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.nguoidung.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.$disconnect();
});

describe('GET /api/users', () => {
  it('admin -> danh sach, dung dang UserListItemDto, sap theo HoTen', async () => {
    const res = await request(app).get('/api/users').set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, code: 'SUCCESS', messageKey: 'COMMON.SUCCESS', errorCode: null });
    const admin = res.body.data.find((u: { username: string }) => u.username === 'admin');
    expect(Object.keys(admin)).toEqual(['id', 'profileId', 'username', 'fullName', 'email', 'accountType', 'active', 'roles']);
    expect(admin.roles).toEqual([{ id: 1, name: 'Admin' }]);
    const student = res.body.data.find((u: { email: string }) => u.email === 'hocsinh@qltt.local');
    expect(student.profileId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('khong du quyen -> 403 { message, statusCode }', async () => {
    const res = await request(app).get('/api/users').set(await auth('student'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });

  it('id khong phai guid -> 404 khong body; guid khong ton tai -> USER_NOT_FOUND', async () => {
    expect((await request(app).get('/api/users/abc')).status).toBe(404);
    const res = await request(app).get('/api/users/11111111-2222-3333-4444-555555555555').set(await auth('admin'));
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false, message: 'Khong tim thay nguoi dung.', code: 'USER_NOT_FOUND' });
    // ASP.NET chap nhan guid dang N (32 hex)
    const n = await request(app).get('/api/users/11111111222233334444555555555555').set(await auth('admin'));
    expect(n.status).toBe(404);
    expect(n.body.code).toBe('USER_NOT_FOUND');
  });
});

describe('POST /api/users - validation giong ASP.NET', () => {
  it('thieu Content-Type JSON -> 415', async () => {
    const res = await request(app).post('/api/users').set(await auth('admin')).type('form').send('x=1');
    expect(res.status).toBe(415);
    expect(res.body.title).toBe('Unsupported Media Type');
  });

  it('chuoi rong -> USER_INVALID_INPUT; null -> ValidationProblem', async () => {
    const h = await auth('admin');
    const r1 = await request(app).post('/api/users').set(h).send({ username: ' ', password: 'x', fullName: 'y' });
    expect(r1.status).toBe(400);
    expect(r1.body.code).toBe('USER_INVALID_INPUT');

    const r2 = await request(app).post('/api/users').set(h).send({ username: null, password: null, fullName: null, roleIds: null });
    expect(r2.status).toBe(400);
    expect(r2.headers['content-type']).toContain('application/problem+json');
    expect(Object.keys(r2.body.errors)).toEqual(['RoleIds', 'FullName', 'Password', 'Username']);
  });

  it('sai kieu -> loi "$.field" kem vi tri byte', async () => {
    const res = await request(app)
      .post('/api/users')
      .set(await auth('admin'))
      .set('Content-Type', 'application/json')
      .send('{"username":"a","password":"b","fullName":"c","accountType":"abc"}');
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({
      request: ['The request field is required.'],
      '$.accountType': [
        'The JSON value could not be converted to System.SByte. Path: $.accountType | LineNumber: 0 | BytePositionInLine: 65.',
      ],
    });
  });

  it('username / email trung', async () => {
    const h = await auth('admin');
    const r1 = await request(app).post('/api/users').set(h).send({ USERNAME: 'ADMIN', password: 'b', fullName: 'c' });
    expect(r1.body.code).toBe('USER_USERNAME_EXISTS');
    const r2 = await request(app)
      .post('/api/users')
      .set(h)
      .send({ username: `TEST_USERS_${S}_x`, password: 'b', fullName: 'c', email: ' Admin@QLTT.local ' });
    expect(r2.body.code).toBe('USER_EMAIL_EXISTS');
    const r3 = await request(app)
      .post('/api/users')
      .set(h)
      .send({ username: `TEST_USERS_${S}_x`, password: 'b', fullName: 'c', roleIds: [99999] });
    expect(r3.body).toMatchObject({ code: 'ROLE_NOT_FOUND', message: 'Mot hoac nhieu role khong ton tai.' });
  });
});

describe('vong doi nguoi dung', () => {
  it('tao -> sua -> doi vai tro -> xoa mem', async () => {
    const h = await auth('admin');
    const create = await request(app)
      .post('/api/users')
      .set(h)
      .send({
        username: ` TEST_USERS_${S}_u `,
        password: 'Pass@123',
        fullName: ' TEST_USERS Nguyen ',
        email: ` TEST_USERS_${S}@Example.com `,
        accountType: '3', // ASP.NET doc so tu chuoi
        roleIds: [3, 3],
      });
    expect(create.status).toBe(201);
    const user = create.body.data;
    created.push(user.id);
    expect(create.headers.location).toMatch(new RegExp(`/api/users/${user.id}$`));
    expect(user).toMatchObject({
      username: `TEST_USERS_${S}_u`,
      fullName: 'TEST_USERS Nguyen',
      email: `test_users_${S}@example.com`.toLowerCase(),
      accountType: 3,
      active: true,
      roles: [{ id: 3, name: 'Hoc_Sinh' }],
    });
    const hs = await prisma.hocsinh.findFirst({ where: { MaNguoiDung: user.id } });
    expect(user.profileId).toBe(hs?.MaHocSinh);
    const row = await prisma.nguoidung.findUnique({ where: { MaNguoiDung: user.id } });
    expect(row?.MatKhauHash).toMatch(/^\$2[aby]\$/);
    expect(row?.DaXacMinhEmail).toBe(true);

    const upd = await request(app)
      .put(`/api/users/${user.id}`)
      .set(h)
      .send({ username: `TEST_USERS_${S}_u`, fullName: 'Edited', email: null, accountType: 2, active: false });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ fullName: 'Edited', email: null, accountType: 2, active: false });

    const bad = await request(app).put(`/api/users/${user.id}`).set(h).send({ username: 'a', fullName: 'b', active: 'true' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.errors)).toEqual(['request', '$.active']);

    const roles = await request(app).put(`/api/users/${user.id}/roles`).set(h).send({ roleIds: [2, 4] });
    expect(roles.status).toBe(200);
    expect(roles.body.data.roles).toEqual([
      { id: 2, name: 'Giao_Vien' },
      { id: 4, name: 'Phu_Huynh' },
    ]);
    // Vai tro cu bi tat (DaXoa = true), ho so GV/PH duoc tao them
    const links = await prisma.nguoidungvaitro.findMany({ where: { MaNguoiDung: user.id }, orderBy: { MaVaiTro: 'asc' } });
    expect(links.map((l) => [l.MaVaiTro, l.DaXoa])).toEqual([
      [2, false],
      [3, true],
      [4, false],
    ]);
    expect(await prisma.giangvien.count({ where: { MaNguoiDung: user.id } })).toBe(1);
    const ph = await prisma.phuhuynh.findFirst({ where: { MaNguoiDung: user.id } });
    expect(ph?.SoDienThoai).toBe('Chua cap nhat');

    const del = await request(app).delete(`/api/users/${user.id}`).set(h);
    expect(del.status).toBe(200);
    expect(del.body).toMatchObject({ success: true, message: 'Da xoa mem nguoi dung.', data: { id: user.id } });
    expect(await prisma.nguoidungvaitro.count({ where: { MaNguoiDung: user.id, DaXoa: false } })).toBe(0);
    expect((await request(app).get(`/api/users/${user.id}`).set(h)).status).toBe(404);
    expect((await request(app).delete(`/api/users/${user.id}`).set(h)).status).toBe(404);
  });
});
