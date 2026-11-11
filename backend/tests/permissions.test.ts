import { randomInt } from 'node:crypto';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app, auth } from './helpers.js';

const { prisma } = await import('../src/db.js');

const S = `${Date.now().toString(36)}${randomInt(1000)}`;
const roleName = `TEST_USERS_R${S}`;

afterAll(async () => {
  const roles = await prisma.vaitro.findMany({ where: { TenVaiTro: { startsWith: `TEST_USERS_R${S}` } } });
  const ids = roles.map((r) => r.MaVaiTro);
  await prisma.nguoidungvaitro.deleteMany({ where: { MaVaiTro: { in: ids } } });
  await prisma.vaitroquyen.deleteMany({ where: { MaVaiTro: { in: ids } } });
  await prisma.vaitro.deleteMany({ where: { MaVaiTro: { in: ids } } });
  await prisma.$disconnect();
});

describe('GET /api/Permissions/matrix', () => {
  it('tra { roles, pages, mappings } khong boc ApiResponse', async () => {
    const res = await request(app).get('/api/Permissions/matrix').set(await auth('admin'));
    expect(res.status).toBe(200);
    expect(Object.keys(res.body)).toEqual(['roles', 'pages', 'mappings']);
    expect(res.body.roles).toEqual(expect.arrayContaining([{ maVaiTro: 1, tenVaiTro: 'Admin' }]));
    const page = res.body.pages[0];
    expect(Object.keys(page)).toEqual(['maTrang', 'maChucNang', 'tenChucNang', 'tenTrang', 'quyens']);
    expect(page.maTrang).toBe(`func_${page.maChucNang}`);
    expect(Object.keys(page.quyens[0])).toEqual(['maQuyen', 'permissionCode', 'thuTu']);
    const maTrang = res.body.pages.map((p: { maTrang: string }) => p.maTrang);
    expect(maTrang).toEqual([...maTrang].sort());
    expect(Object.keys(res.body.mappings[0])).toEqual(['maVaiTro', 'maQuyen']);
  });

  it('hoc sinh -> 403', async () => {
    const res = await request(app).get('/api/Permissions/matrix').set(await auth('student'));
    expect(res.status).toBe(403);
  });
});

describe('GET /api/Permissions/roles/:roleId va /check', () => {
  it('roles/1 -> Admin; khong ton tai -> 404 { message }; khong phai so -> 404 khong body', async () => {
    const h = await auth('admin');
    const r1 = await request(app).get('/api/Permissions/roles/1').set(h);
    expect(r1.body).toMatchObject({ roleId: 1, roleName: 'Admin' });
    expect(r1.body.permissionCodes).toContain('USERS_CREATE');
    const r2 = await request(app).get('/api/Permissions/roles/99999').set(h);
    expect(r2.status).toBe(404);
    expect(r2.body).toEqual({ message: 'Không tìm thấy nhóm quyền.' });
    const r3 = await request(app).get('/api/Permissions/roles/abc').set(h);
    expect(r3.status).toBe(404);
    expect(r3.text).toBe('');
  });

  it('check: so khop khong phan biet hoa thuong, tra lai permissionCode nguyen goc', async () => {
    const h = await auth('admin');
    const res = await request(app).get('/api/Permissions/check?roleId=1&permissionCode=%20users_create%20').set(h);
    expect(res.body).toEqual({ roleId: 1, permissionCode: ' users_create ', hasPermission: true });
    const none = await request(app).get('/api/Permissions/check?permissionCode=USERS_CREATE').set(h);
    expect(none.body).toEqual({ roleId: 0, permissionCode: 'USERS_CREATE', hasPermission: false });
  });

  it('check: loi model binding', async () => {
    const h = await auth('admin');
    const res = await request(app).get('/api/Permissions/check?roleId=x').set(h);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({
      roleId: ["The value 'x' is not valid."],
      permissionCode: ['The permissionCode field is required.'],
    });
  });
});

describe('tao / sua / xoa vai tro', () => {
  it('vong doi day du', async () => {
    const h = await auth('admin');
    const empty = await request(app).post('/api/Permissions/roles').set(h).send({ tenVaiTro: '  ' });
    expect(empty.status).toBe(400);
    expect(empty.body).toEqual({ message: 'Tên nhóm quyền không được để trống.' });

    const dup = await request(app).post('/api/Permissions/roles').set(h).send({ tenVaiTro: ' admin ' });
    expect(dup.body).toEqual({ message: 'Tên nhóm quyền đã tồn tại.' });

    const create = await request(app)
      .post('/api/Permissions/roles')
      .set(h)
      .send({ tenVaiTro: ` ${roleName} `, permissionCodes: [' users_create ', 'COURSES_EDIT', '', null, 'NOPE'] });
    expect(create.status).toBe(200);
    expect(create.body).toEqual({ maVaiTro: expect.any(Number), tenVaiTro: roleName });
    const id = create.body.maVaiTro as number;

    const get1 = await request(app).get(`/api/Permissions/roles/${id}`).set(h);
    expect([...get1.body.permissionCodes].sort()).toEqual(['COURSES_EDIT', 'USERS_CREATE']);

    const upd = await request(app).put(`/api/Permissions/roles/${id}`).set(h).send({ permissionCodes: ['COURSES_EDIT', 'USERS_DELETE'] });
    expect(upd.body).toEqual({ message: 'Cập nhật quyền thành công.' });
    const get2 = await request(app).get(`/api/Permissions/roles/${id}`).set(h);
    expect([...get2.body.permissionCodes].sort()).toEqual(['COURSES_EDIT', 'USERS_DELETE']);

    const nf = await request(app).put('/api/Permissions/roles/99999').set(h).send({});
    expect(nf.status).toBe(404);
    const nullCodes = await request(app).put(`/api/Permissions/roles/${id}`).set(h).send({ permissionCodes: null });
    expect(nullCodes.status).toBe(400);
    expect(nullCodes.body.errors).toEqual({ PermissionCodes: ['The PermissionCodes field is required.'] });

    // Vai tro he thong / dang duoc gan
    const sys = await request(app).delete('/api/Permissions/roles/2').set(h);
    expect(sys.body).toEqual({ message: 'Không thể xoá vai trò hệ thống.' });

    const del = await request(app).delete(`/api/Permissions/roles/${id}`).set(h);
    expect(del.body).toEqual({ message: 'Xoá vai trò thành công.' });
    const row = await prisma.vaitro.findUnique({ where: { MaVaiTro: id } });
    expect(row).toMatchObject({ DaXoa: true, TrangThai: false });
    expect(await prisma.vaitroquyen.count({ where: { MaVaiTro: id, DaXoa: false } })).toBe(0);

    const again = await request(app).delete(`/api/Permissions/roles/${id}`).set(h);
    expect(again.status).toBe(404);
    // Giong ban .NET: GET theo id khong loc DaXoa
    expect((await request(app).get(`/api/Permissions/roles/${id}`).set(h)).status).toBe(200);
  });
});
