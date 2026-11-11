import request from 'supertest';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { app } from './helpers.js';

const { prisma } = await import('../src/db.js');

afterEach(() => {
  delete process.env.SYSTEM_MIGRATE_KEY;
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/System/migrate', () => {
  it('chua cau hinh key -> 404 ProblemDetails', async () => {
    const res = await request(app).post('/api/System/migrate?key=abc');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ title: 'Not Found', status: 404 });
  });

  it('sai / thieu key -> 401', async () => {
    process.env.SYSTEM_MIGRATE_KEY = 'test-key-123';
    expect((await request(app).post('/api/System/migrate')).status).toBe(401);
    expect((await request(app).post('/api/System/migrate?key=wrong')).status).toBe(401);
  });

  it('dung key -> bao trang thai migration', async () => {
    process.env.SYSTEM_MIGRATE_KEY = 'test-key-123';
    const res = await request(app).post('/api/System/migrate?KEY=test-key-123');
    expect([200, 500]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body).toMatchObject({ status: 'SUCCESS', pendingCount: 0, database: expect.any(String) });
      expect(Object.keys(res.body)).toEqual(['status', 'message', 'database', 'host', 'appliedCount', 'pendingCount']);
    } else {
      expect(res.body.status).toBe('ERROR');
    }
  });
});
