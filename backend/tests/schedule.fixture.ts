import { randomUUID } from 'node:crypto';
import { prisma } from '../src/db.js';
import { ensureTietHocSeed } from '../src/modules/schedule/schedule.service.js';

// Du lieu thu cho tests/schedule.test.ts va tests/attendance.test.ts.
// Moi file dung tien to rieng (TEST_SCHED_S_ / TEST_SCHED_A_) de chay song song khong dung nhau.
// Chi tao / xoa dong co tien to - khong dung toi tai khoan demo va du lieu seed.

export const NET = 'http://localhost:5099';

export const DEMO = {
  adminUserId: '54cf819b-c886-46e1-a7f4-2a5f60c17293',
  teacherProfileId: '354e345c-fbb6-4deb-a832-a0940fc36cc9',
  studentProfileId: 'fb624d5d-14f4-4aee-b6f6-03dbee23d829',
  parentUserId: '7ec7c74d-8cfe-4c58-9907-0cd0a785625f',
};

const NET_ACCOUNTS = {
  admin: { email: 'admin@qltt.local', password: 'QlttAdmin@2026!A9' },
  teacher: { email: 'giaovien@qltt.local', password: 'QlttTeacher@2026!G7' },
  student: { email: 'hocsinh@qltt.local', password: 'QlttStudent@2026!S5' },
  parent: { email: 'phuhuynh@qltt.local', password: 'QlttParent@2026!P6' },
} as const;

const netTokens = new Map<string, string | null>();

/** Token cua backend .NET doi chieu (null neu .NET khong chay hoac bi gioi han dang nhap). */
export async function netToken(role: keyof typeof NET_ACCOUNTS): Promise<string | null> {
  if (netTokens.has(role)) return netTokens.get(role)!;
  let token: string | null = null;
  try {
    const r = await fetch(`${NET}/api/Auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: NET_ACCOUNTS[role] }),
      signal: AbortSignal.timeout(5000),
    });
    const j = (await r.json()) as { data?: { token?: string } };
    token = j.data?.token ?? null;
  } catch {
    token = null;
  }
  netTokens.set(role, token);
  return token;
}

export async function netCall(role: keyof typeof NET_ACCOUNTS, method: string, path: string, body?: unknown) {
  const token = await netToken(role);
  const r = await fetch(`${NET}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    /* body rong */
  }
  return { status: r.status, body: json as any };
}

export const d = (s: string) => new Date(`${s}T00:00:00Z`);

export interface Fixture {
  prefix: string;
  teachers: { t1: string; t2: string };
  teacherUsers: { t1: string; t2: string };
  students: { s1: string; s2: string };
  studentUsers: { s1: string; s2: string };
  parent: { profileId: string; userId: string };
  rooms: { a: string; b: string; c: string; d: string };
  classes: { c1: string; c2: string; c3: string };
}

async function createUser(prefix: string, key: string, loai: number, hoTen: string) {
  const id = randomUUID();
  await prisma.nguoidung.create({
    data: {
      MaNguoiDung: id,
      LoaiTaiKhoan: loai,
      TenDangNhap: `${prefix}${key}`.toLowerCase().slice(0, 50),
      MatKhauHash: 'x',
      HoTen: hoTen,
      Email: null,
      TrangThai: true,
      DaXoa: false,
    },
  });
  return id;
}

/** Xoa moi du lieu thu cua tien to (thu tu theo khoa ngoai). */
export async function cleanup(prefix: string) {
  const like = `${prefix}%`;
  const classIds = (await prisma.lophoc.findMany({ where: { TenLop: { startsWith: prefix } }, select: { MaLopHoc: true } })).map((c) => c.MaLopHoc);
  const roomIds = (await prisma.phonghoc.findMany({ where: { TenPhong: { startsWith: prefix } }, select: { MaPhongHoc: true } })).map((r) => r.MaPhongHoc);
  const userIds = (await prisma.nguoidung.findMany({ where: { TenDangNhap: { startsWith: prefix.toLowerCase() } }, select: { MaNguoiDung: true } })).map(
    (u) => u.MaNguoiDung,
  );
  const teacherIds = (await prisma.giangvien.findMany({ where: { MaNguoiDung: { in: userIds } }, select: { MaGiangVien: true } })).map((g) => g.MaGiangVien);
  const studentIds = (await prisma.hocsinh.findMany({ where: { MaNguoiDung: { in: userIds } }, select: { MaHocSinh: true } })).map((h) => h.MaHocSinh);
  const parentIds = (await prisma.phuhuynh.findMany({ where: { MaNguoiDung: { in: userIds } }, select: { MaPhuHuynh: true } })).map((p) => p.MaPhuHuynh);
  const sessionIds = (
    await prisma.buoihoc.findMany({ where: { OR: [{ MaLopHoc: { in: classIds } }, { MaPhongHoc: { in: roomIds } }] }, select: { MaBuoiHoc: true } })
  ).map((b) => b.MaBuoiHoc);

  const notifs = (
    await prisma.$queryRaw<Array<{ MaThongBao: string }>>`SELECT MaThongBao FROM thongbao WHERE NoiDung LIKE ${'%' + like + '%'}`
  ).map((t) => t.MaThongBao);
  if (notifs.length) {
    await prisma.nguoinhanthongbao.deleteMany({ where: { MaThongBao: { in: notifs } } });
    await prisma.thongbao.deleteMany({ where: { MaThongBao: { in: notifs } } });
  }
  await prisma.diemdanh.deleteMany({ where: { OR: [{ MaBuoiHoc: { in: sessionIds } }, { MaHocSinh: { in: studentIds } }] } });
  await prisma.yeucaulichday.deleteMany({
    where: { OR: [{ MaLopHoc: { in: classIds } }, { MaBuoiHoc: { in: sessionIds } }, { MaGiangVien: { in: teacherIds } }] },
  });
  await prisma.buoihoc.deleteMany({ where: { MaBuoiHoc: { in: sessionIds } } });
  await prisma.hocsinhlophoc.deleteMany({ where: { OR: [{ MaLopHoc: { in: classIds } }, { MaHocSinh: { in: studentIds } }] } });
  await prisma.giangvienlophoc.deleteMany({ where: { OR: [{ MaLopHoc: { in: classIds } }, { MaGiangVien: { in: teacherIds } }] } });
  await prisma.chitietkhoahoc_lophoc.deleteMany({ where: { MaLopHoc: { in: classIds } } });
  await prisma.phuhuynhhocsinh.deleteMany({ where: { OR: [{ MaPhuHuynh: { in: parentIds } }, { MaHocSinh: { in: studentIds } }] } });
  await prisma.lophoc.deleteMany({ where: { MaLopHoc: { in: classIds } } });
  await prisma.phonghoc.deleteMany({ where: { MaPhongHoc: { in: roomIds } } });
  await prisma.nguoinhanthongbao.deleteMany({ where: { MaNguoiDung: { in: userIds } } });
  await prisma.phuhuynh.deleteMany({ where: { MaPhuHuynh: { in: parentIds } } });
  await prisma.hocsinh.deleteMany({ where: { MaHocSinh: { in: studentIds } } });
  await prisma.giangvien.deleteMany({ where: { MaGiangVien: { in: teacherIds } } });
  await prisma.nguoidung.deleteMany({ where: { MaNguoiDung: { in: userIds } } });
}

export async function createFixture(prefix: string): Promise<Fixture> {
  await cleanup(prefix);
  // Bang tiethoc trong DB thu dang rong: tao 14 tiet giong het EnsureTietHocSeedAsync (POST /api/Schedule cung lam vay).
  await ensureTietHocSeed(prisma);

  const t1User = await createUser(prefix, 't1', 2, `${prefix}Giao Vien B`);
  const t2User = await createUser(prefix, 't2', 2, `${prefix}Giao Vien A`);
  const s1User = await createUser(prefix, 's1', 3, `${prefix}Hoc Sinh B`);
  const s2User = await createUser(prefix, 's2', 3, `${prefix}Hoc Sinh A`);
  const pUser = await createUser(prefix, 'p1', 4, `${prefix}Phu Huynh`);

  const t1 = randomUUID();
  const t2 = randomUUID();
  await prisma.giangvien.createMany({
    data: [
      { MaGiangVien: t1, MaNguoiDung: t1User, TrinhDoChuyenMon: 'x', TrangThai: true, DaXoa: false },
      { MaGiangVien: t2, MaNguoiDung: t2User, TrinhDoChuyenMon: 'x', TrangThai: true, DaXoa: false },
    ],
  });
  const s1 = randomUUID();
  const s2 = randomUUID();
  await prisma.hocsinh.createMany({
    data: [
      { MaHocSinh: s1, MaNguoiDung: s1User, TrangThai: true, DaXoa: false },
      { MaHocSinh: s2, MaNguoiDung: s2User, TrangThai: true, DaXoa: false },
    ],
  });
  const parentId = randomUUID();
  await prisma.phuhuynh.create({ data: { MaPhuHuynh: parentId, MaNguoiDung: pUser, SoDienThoai: '0900000000', TrangThai: true, DaXoa: false } });
  await prisma.phuhuynhhocsinh.createMany({
    data: [
      { MaPhuHuynh: parentId, MaHocSinh: s1, TrangThai: true, DaXoa: false },
      { MaPhuHuynh: parentId, MaHocSinh: s2, TrangThai: true, DaXoa: false },
    ],
  });

  const rooms = { a: randomUUID(), b: randomUUID(), c: randomUUID(), d: randomUUID() };
  await prisma.phonghoc.createMany({
    data: [
      { MaPhongHoc: rooms.a, TenPhong: `${prefix}R_A`, SucChua: 900, TrangThai: true, DaXoa: false },
      { MaPhongHoc: rooms.b, TenPhong: `${prefix}R_B`, SucChua: 950, TrangThai: true, DaXoa: false },
      { MaPhongHoc: rooms.c, TenPhong: `${prefix}R_C`, SucChua: 1000, TrangThai: true, DaXoa: false },
      { MaPhongHoc: rooms.d, TenPhong: `${prefix}R_D`, SucChua: null, TrangThai: true, DaXoa: false },
    ],
  });

  const classes = { c1: randomUUID(), c2: randomUUID(), c3: randomUUID() };
  await prisma.lophoc.createMany({
    data: [
      { MaLopHoc: classes.c1, TenLop: `${prefix}C1`, NgayBatDau: d('2031-01-01'), NgayKetThuc: d('2031-12-31'), SiSoToiDa: 30, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c2, TenLop: `${prefix}C2`, NgayBatDau: null, NgayKetThuc: null, SiSoToiDa: null, TrangThai: false, DaXoa: false },
      { MaLopHoc: classes.c3, TenLop: `${prefix}C3`, NgayBatDau: d('2031-01-01'), NgayKetThuc: null, SiSoToiDa: 10, TrangThai: true, DaXoa: false },
    ],
  });
  await prisma.giangvienlophoc.createMany({
    data: [
      { MaLopHoc: classes.c1, MaGiangVien: t1, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c2, MaGiangVien: t2, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c2, MaGiangVien: t1, TrangThai: false, DaXoa: false },
      // Lop C3 do giao vien demo day (de thu yeu cau doi lich bang token giao vien demo).
      { MaLopHoc: classes.c3, MaGiangVien: DEMO.teacherProfileId, TrangThai: true, DaXoa: false },
    ],
  });
  await prisma.hocsinhlophoc.createMany({
    data: [
      { MaLopHoc: classes.c1, MaHocSinh: s1, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c1, MaHocSinh: s2, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c2, MaHocSinh: s2, TrangThai: true, DaXoa: false },
      { MaLopHoc: classes.c3, MaHocSinh: s1, TrangThai: true, DaXoa: false },
    ],
  });

  return {
    prefix,
    teachers: { t1, t2 },
    teacherUsers: { t1: t1User, t2: t2User },
    students: { s1, s2 },
    studentUsers: { s1: s1User, s2: s2User },
    parent: { profileId: parentId, userId: pUser },
    rooms,
    classes,
  };
}

export async function addSession(
  classId: string,
  date: string,
  start: number,
  end: number,
  roomId: string | null,
  extra: { TieuDe?: string | null; DaXoa?: boolean } = {},
) {
  const id = randomUUID();
  await prisma.buoihoc.create({
    data: {
      MaBuoiHoc: id,
      MaLopHoc: classId,
      MaPhongHoc: roomId,
      NgayHoc: d(date),
      MaTietBatDau: start,
      MaTietKetThuc: end,
      TieuDe: extra.TieuDe === undefined ? `Buoi ${date}` : extra.TieuDe,
      NoiDung: null,
      TrangThai: true,
      DaXoa: extra.DaXoa ?? false,
    },
  });
  return id;
}

/** So sanh sau, bo qua cac key trong `ignore`. Tra ve danh sach khac biet (rong = giong). */
export function diffJson(a: unknown, b: unknown, ignore: string[] = [], path = '$'): string[] {
  const out: string[] = [];
  const isObj = (x: unknown) => x !== null && typeof x === 'object';
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return [`${path}: array mismatch`];
    if (a.length !== b.length) out.push(`${path}: length ${a.length} vs ${b.length}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) out.push(...diffJson(a[i], b[i], ignore, `${path}[${i}]`));
    return out;
  }
  if (isObj(a) && isObj(b)) {
    const ka = Object.keys(a as object).filter((k) => !ignore.includes(k));
    const kb = Object.keys(b as object).filter((k) => !ignore.includes(k));
    if (ka.join() !== kb.join()) out.push(`${path}: keys [${ka}] vs [${kb}]`);
    for (const k of ka) if (kb.includes(k)) out.push(...diffJson((a as any)[k], (b as any)[k], ignore, `${path}.${k}`));
    return out;
  }
  if (a !== b) out.push(`${path}: ${JSON.stringify(a)} vs ${JSON.stringify(b)}`);
  return out;
}
