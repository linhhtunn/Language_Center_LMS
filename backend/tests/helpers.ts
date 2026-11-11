import request from 'supertest';
import { createApp } from '../src/app.js';

// Dung chung cho moi file test. Can DATABASE_URL tro toi MySQL da nap database/01_schema.sql + 02_seed.sql.

export const app = createApp();

export const ACCOUNTS = {
  admin: { email: 'admin@qltt.local', password: 'QlttAdmin@2026!A9' },
  teacher: { email: 'giaovien@qltt.local', password: 'QlttTeacher@2026!G7' },
  student: { email: 'hocsinh@qltt.local', password: 'QlttStudent@2026!S5' },
  parent: { email: 'phuhuynh@qltt.local', password: 'QlttParent@2026!P6' },
} as const;

const cache = new Map<string, { token: string; userId: string; profileId: string | null }>();

/** Dang nhap tai khoan demo, tra ve token (co cache trong 1 lan chay test). */
export async function login(role: keyof typeof ACCOUNTS) {
  const hit = cache.get(role);
  if (hit) return hit;
  const res = await request(app).post('/api/Auth/login').send({ data: ACCOUNTS[role] });
  if (res.status !== 200) throw new Error(`Dang nhap ${role} that bai: ${res.status} ${JSON.stringify(res.body)}`);
  const v = { token: res.body.data.token as string, userId: res.body.data.id as string, profileId: res.body.data.profileId as string | null };
  cache.set(role, v);
  return v;
}

/** Header Authorization cho role. */
export async function auth(role: keyof typeof ACCOUNTS) {
  return { Authorization: `Bearer ${(await login(role)).token}` };
}
