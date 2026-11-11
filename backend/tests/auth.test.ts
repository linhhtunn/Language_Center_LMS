import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';

// Test chay voi database that (MySQL da nap database/01_schema.sql + 02_seed.sql).
// DATABASE_URL lay tu backend/.env hoac bien moi truong khi chay "npm test".
const { createApp } = await import('../src/app.js');
const { prisma } = await import('../src/db.js');
const app = createApp();

const ADMIN = { email: 'admin@qltt.local', password: 'QlttAdmin@2026!A9' };

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/Auth/login', () => {
  it('thieu email/mat khau -> 400', async () => {
    const res = await request(app).post('/api/Auth/login').send({ data: { email: 'a@b.c' } });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'AUTH_INVALID_INPUT' });
  });

  it('tai khoan khong ton tai -> 401 (deploy.sh dung de kiem tra suc khoe)', async () => {
    const res = await request(app)
      .post('/api/Auth/login')
      .send({ data: { email: 'healthcheck@invalid.local', password: 'x' } });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('sai mat khau -> 401', async () => {
    const res = await request(app).post('/api/Auth/login').send({ data: { email: ADMIN.email, password: 'sai' } });
    expect(res.status).toBe(401);
  });

  it('dung mat khau -> 200, tra du truong nhu ban .NET, mat khau duoc luu bang bcrypt', async () => {
    const res = await request(app).post('/api/Auth/login').send({ data: ADMIN });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ role: 'Admin', fullName: expect.any(String) });
    for (const key of ['id', 'token', 'accessToken', 'refreshToken', 'sessionId', 'permissionCodes']) {
      expect(res.body.data).toHaveProperty(key);
    }

    const user = await prisma.nguoidung.findFirst({ where: { Email: ADMIN.email } });
    expect(user?.MatKhauHash).toMatch(/^\$2[aby]\$/);
  });
});

describe('refresh / logout', () => {
  it('refresh doi token moi, token cu khong dung lai duoc; logout xoa phien', async () => {
    const login = await request(app).post('/api/Auth/login').send({ data: ADMIN });
    const { sessionId, refreshToken } = login.body.data;

    const r1 = await request(app).post('/api/Auth/refresh').send({ data: { sessionId, refreshToken } });
    expect(r1.status).toBe(200);
    expect(r1.body.data.refreshToken).not.toBe(refreshToken);

    // Dung lai refresh token cu -> bi tu choi va phien bi huy.
    const r2 = await request(app).post('/api/Auth/refresh').send({ data: { sessionId, refreshToken } });
    expect(r2.status).toBe(401);

    const out = await request(app).post('/api/Auth/logout').send({ data: { sessionId } });
    expect(out.status).toBe(200);
    expect(await prisma.refresh_sessions.count({ where: { SessionId: sessionId } })).toBe(0);
  });
});

describe('chung', () => {
  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });

  it('API chua co -> 404 dang JSON', async () => {
    const res = await request(app).get('/api/KhongCo');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
