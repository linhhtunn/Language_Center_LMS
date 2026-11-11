import { randomUUID } from 'node:crypto';
import { prisma } from '../src/db.js';
import { signAccessToken } from '../src/middlewares/auth.js';

// Du lieu thu cho tests/classes|teachers|students|parents.test.ts.
// Moi file dung 1 tien to rieng (TEST_PEOPLE_<X>_) va tu don sach bang cleanupPeople(prefix).

const ROLE = { Admin: 1, Giao_Vien: 2, Hoc_Sinh: 3, Phu_Huynh: 4 } as const;
type RoleName = keyof typeof ROLE;

export interface TestUser {
  userId: string;
  profileId: string | null;
  role: RoleName;
  email: string;
  name: string;
  headers: { Authorization: string };
}

/** Tao nguoi dung + vai tro (+ ho so neu withProfile) va token dang nhap ky truc tiep (khong qua /login de tranh rate limit). */
export async function createUser(prefix: string, key: string, role: RoleName, name: string, withProfile = true): Promise<TestUser> {
  const userId = randomUUID();
  const email = `${prefix}${key}@test.local`.toLowerCase();
  await prisma.nguoidung.create({
    data: { MaNguoiDung: userId, LoaiTaiKhoan: ROLE[role], TenDangNhap: prefix + key, MatKhauHash: 'x', HoTen: name, Email: email, TrangThai: true, DaXoa: false },
  });
  await prisma.nguoidungvaitro.create({ data: { MaNguoiDung: userId, MaVaiTro: ROLE[role], TrangThai: true, DaXoa: false } });
  let profileId: string | null = null;
  if (withProfile) {
    profileId = randomUUID();
    if (role === 'Giao_Vien') {
      await prisma.giangvien.create({ data: { MaGiangVien: profileId, MaNguoiDung: userId, TrinhDoChuyenMon: 'Cu nhan', TrangThai: true, DaXoa: false } });
    } else if (role === 'Hoc_Sinh') {
      await prisma.hocsinh.create({ data: { MaHocSinh: profileId, MaNguoiDung: userId, NgaySinh: new Date(Date.UTC(2010, 4, 6)), TrangThai: true, DaXoa: false } });
    } else if (role === 'Phu_Huynh') {
      await prisma.phuhuynh.create({ data: { MaPhuHuynh: profileId, MaNguoiDung: userId, SoDienThoai: '0901', TrangThai: true, DaXoa: false } });
    } else profileId = null;
  }
  const token = signAccessToken({ userId, email, role, fullName: name, profileId });
  return { userId, profileId, role, email, name, headers: { Authorization: `Bearer ${token}` } };
}

export async function createCourse(prefix: string, name: string, extra: { active?: boolean; price?: string; moTa?: string } = {}) {
  const id = randomUUID();
  await prisma.khoahoc.create({
    data: { MaKhoaHoc: id, TenKhoaHoc: prefix + name, MoTa: extra.moTa ?? null, GiaCoBan: extra.price ?? null, TrangThai: extra.active ?? true, DaXoa: false },
  });
  return id;
}

/** Xoa cung moi du lieu co tien to `prefix` (nguoi dung, lop, khoa hoc va cac bang lien ket). */
export async function cleanupPeople(prefix: string) {
  const uids = (await prisma.nguoidung.findMany({ where: { TenDangNhap: { startsWith: prefix } }, select: { MaNguoiDung: true } })).map((u) => u.MaNguoiDung);
  const cids = (await prisma.lophoc.findMany({ where: { TenLop: { startsWith: prefix } }, select: { MaLopHoc: true } })).map((c) => c.MaLopHoc);
  const kids = (await prisma.khoahoc.findMany({ where: { TenKhoaHoc: { startsWith: prefix } }, select: { MaKhoaHoc: true } })).map((c) => c.MaKhoaHoc);
  const gids = (await prisma.giangvien.findMany({ where: { MaNguoiDung: { in: uids } }, select: { MaGiangVien: true } })).map((x) => x.MaGiangVien);
  const hids = (await prisma.hocsinh.findMany({ where: { MaNguoiDung: { in: uids } }, select: { MaHocSinh: true } })).map((x) => x.MaHocSinh);
  const pids = (await prisma.phuhuynh.findMany({ where: { MaNguoiDung: { in: uids } }, select: { MaPhuHuynh: true } })).map((x) => x.MaPhuHuynh);
  await prisma.buoihoc.deleteMany({ where: { MaLopHoc: { in: cids } } });
  await prisma.hocsinhlophoc.deleteMany({ where: { OR: [{ MaLopHoc: { in: cids } }, { MaHocSinh: { in: hids } }] } });
  await prisma.giangvienlophoc.deleteMany({ where: { OR: [{ MaLopHoc: { in: cids } }, { MaGiangVien: { in: gids } }] } });
  await prisma.chitietkhoahoc_lophoc.deleteMany({ where: { OR: [{ MaLopHoc: { in: cids } }, { MaKhoaHoc: { in: kids } }] } });
  await prisma.giangvienkhoahoc.deleteMany({ where: { OR: [{ MaGiangVien: { in: gids } }, { MaKhoaHoc: { in: kids } }] } });
  await prisma.phuhuynhhocsinh.deleteMany({ where: { OR: [{ MaPhuHuynh: { in: pids } }, { MaHocSinh: { in: hids } }] } });
  await prisma.lophoc.deleteMany({ where: { MaLopHoc: { in: cids } } });
  await prisma.khoahoc.deleteMany({ where: { MaKhoaHoc: { in: kids } } });
  await prisma.giangvien.deleteMany({ where: { MaGiangVien: { in: gids } } });
  await prisma.hocsinh.deleteMany({ where: { MaHocSinh: { in: hids } } });
  await prisma.phuhuynh.deleteMany({ where: { MaPhuHuynh: { in: pids } } });
  await prisma.tainguyenluutru.deleteMany({ where: { MaNguoiDung: { in: uids } } });
  await prisma.refresh_sessions.deleteMany({ where: { UserId: { in: uids } } });
  await prisma.nguoidungvaitro.deleteMany({ where: { MaNguoiDung: { in: uids } } });
  await prisma.nguoidung.deleteMany({ where: { MaNguoiDung: { in: uids } } });
}
