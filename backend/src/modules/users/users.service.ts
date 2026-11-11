import { randomUUID } from 'node:crypto';
import { prisma } from '../../db.js';
import { fail, type ApiResponse } from '../../utils/apiResponse.js';
import { hashPassword } from '../auth/auth.service.js';

// Chuyen tu cac ham private trong UsersController.cs (.NET).

/** EF: `x.DaXoa != true` -> (DaXoa IS NULL OR DaXoa = 0) */
export const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

export interface RoleItemDto {
  id: number;
  name: string;
}

export interface UserListItemDto {
  id: string;
  profileId: string | null;
  username: string;
  fullName: string;
  email: string | null;
  accountType: number;
  active: boolean;
  roles: RoleItemDto[];
}

export interface CreateUserRequest {
  Username: string;
  Password: string;
  FullName: string;
  Email: string | null;
  AccountType: number;
  RoleIds: number[];
}

export interface UpdateUserRequest {
  Username: string;
  FullName: string;
  Email: string | null;
  AccountType: number;
  Active: boolean;
}

// .Include(Hocsinh/Giangvien/Phuhuynh) + .Include(Nguoidungvaitros.Where(DaXoa != true)).ThenInclude(MaVaiTroNavigation)
// EF them ORDER BY theo khoa nen vai tro duoc sap theo MaVaiTro.
const userInclude = {
  hocsinh: { select: { MaHocSinh: true } },
  giangvien: { select: { MaGiangVien: true } },
  phuhuynh: { select: { MaPhuHuynh: true } },
  nguoidungvaitro: {
    where: notDeleted,
    orderBy: { MaVaiTro: 'asc' as const },
    select: { MaVaiTro: true, DaXoa: true, vaitro: { select: { TenVaiTro: true } } },
  },
};

type UserWithRelations = {
  MaNguoiDung: string;
  TenDangNhap: string;
  HoTen: string;
  Email: string | null;
  LoaiTaiKhoan: number;
  TrangThai: boolean | null;
  hocsinh: { MaHocSinh: string } | null;
  giangvien: { MaGiangVien: string } | null;
  phuhuynh: { MaPhuHuynh: string } | null;
  nguoidungvaitro: { MaVaiTro: number; DaXoa: boolean | null; vaitro: { TenVaiTro: string } }[];
};

export function toDto(user: UserWithRelations): UserListItemDto {
  return {
    id: user.MaNguoiDung,
    profileId: user.hocsinh?.MaHocSinh ?? user.giangvien?.MaGiangVien ?? user.phuhuynh?.MaPhuHuynh ?? null,
    username: user.TenDangNhap,
    fullName: user.HoTen,
    email: user.Email,
    accountType: user.LoaiTaiKhoan,
    active: user.TrangThai !== false,
    roles: user.nguoidungvaitro
      .filter((r) => r.DaXoa !== true)
      .map((r) => ({ id: r.MaVaiTro, name: r.vaitro.TenVaiTro })),
  };
}

export async function listUsers(): Promise<UserListItemDto[]> {
  const users = await prisma.nguoidung.findMany({
    where: notDeleted,
    include: userInclude,
    // OrderBy(HoTen); EF them MaNguoiDung lam khoa phu khi Include collection.
    orderBy: [{ HoTen: 'asc' }, { MaNguoiDung: 'asc' }],
  });
  return users.map(toDto);
}

export async function loadUserDto(userId: string): Promise<UserListItemDto | null> {
  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notDeleted },
    include: userInclude,
  });
  return user ? toDto(user) : null;
}

export function normalizeEmail(email: string | null | undefined): string | null {
  return !email || !email.trim() ? null : email.trim().toLowerCase();
}

const isBlank = (s: string | null | undefined) => !s || !s.trim();

export async function validateRoleIds(roleIds: number[] | null): Promise<ApiResponse<null> | null> {
  if (!roleIds || roleIds.length === 0) return null;
  const distinctIds = [...new Set(roleIds)];
  const existingCount = await prisma.vaitro.count({ where: { MaVaiTro: { in: distinctIds }, ...notDeleted } });
  return existingCount === distinctIds.length ? null : fail('Mot hoac nhieu role khong ton tai.', 'ROLE_NOT_FOUND');
}

export async function validateCreate(request: CreateUserRequest): Promise<ApiResponse<null> | null> {
  if (isBlank(request.Username) || isBlank(request.Password) || isBlank(request.FullName)) {
    return fail('Username, password va ho ten la bat buoc.', 'USER_INVALID_INPUT');
  }
  if (await prisma.nguoidung.count({ where: { TenDangNhap: request.Username.trim(), ...notDeleted } })) {
    return fail('Username da ton tai.', 'USER_USERNAME_EXISTS');
  }
  const email = normalizeEmail(request.Email);
  if (email && (await prisma.nguoidung.count({ where: { Email: email, ...notDeleted } }))) {
    return fail('Email da ton tai.', 'USER_EMAIL_EXISTS');
  }
  return validateRoleIds(request.RoleIds);
}

export async function validateUpdate(id: string, request: UpdateUserRequest): Promise<ApiResponse<null> | null> {
  if (isBlank(request.Username) || isBlank(request.FullName)) {
    return fail('Username va ho ten la bat buoc.', 'USER_INVALID_INPUT');
  }
  if (
    await prisma.nguoidung.count({
      where: { MaNguoiDung: { not: id }, TenDangNhap: request.Username.trim(), ...notDeleted },
    })
  ) {
    return fail('Username da ton tai.', 'USER_USERNAME_EXISTS');
  }
  const email = normalizeEmail(request.Email);
  if (email && (await prisma.nguoidung.count({ where: { MaNguoiDung: { not: id }, Email: email, ...notDeleted } }))) {
    return fail('Email da ton tai.', 'USER_EMAIL_EXISTS');
  }
  return null;
}

export async function createUser(request: CreateUserRequest): Promise<string> {
  const id = randomUUID();
  await prisma.nguoidung.create({
    data: {
      MaNguoiDung: id,
      TenDangNhap: request.Username.trim(),
      MatKhauHash: await hashPassword(request.Password),
      HoTen: request.FullName.trim(),
      Email: normalizeEmail(request.Email),
      LoaiTaiKhoan: request.AccountType,
      DaXacMinhEmail: true,
      TrangThai: true,
      DaXoa: false,
      ThoiGianTao: new Date(),
    },
  });
  await replaceUserRoles(id, request.RoleIds);
  await ensureRoleProfiles(id, request.RoleIds);
  return id;
}

export async function updateUser(id: string, request: UpdateUserRequest): Promise<void> {
  await prisma.nguoidung.update({
    where: { MaNguoiDung: id },
    data: {
      TenDangNhap: request.Username.trim(),
      HoTen: request.FullName.trim(),
      Email: normalizeEmail(request.Email),
      LoaiTaiKhoan: request.AccountType,
      TrangThai: request.Active,
      ThoiGianSua: new Date(),
    },
  });
}

export async function findActiveUser(id: string) {
  return prisma.nguoidung.findFirst({ where: { MaNguoiDung: id, ...notDeleted }, select: { MaNguoiDung: true } });
}

/** Xoa mem nguoi dung + cac lien ket vai tro (mot SaveChanges = mot transaction). */
export async function softDeleteUser(id: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.nguoidung.update({ where: { MaNguoiDung: id }, data: { DaXoa: true, TrangThai: false, ThoiGianSua: now } }),
    prisma.nguoidungvaitro.updateMany({
      where: { MaNguoiDung: id, ...notDeleted },
      data: { DaXoa: true, TrangThai: false, ThoiGianSua: now },
    }),
  ]);
}

/** Bat lai/tat cac lien ket da co, them lien ket moi (giong ReplaceUserRolesAsync). */
export async function replaceUserRoles(userId: string, roleIdsInput: number[] | null): Promise<void> {
  const roleIds = [...new Set(roleIdsInput ?? [])];
  const existing = await prisma.nguoidungvaitro.findMany({ where: { MaNguoiDung: userId }, select: { MaVaiTro: true } });
  const now = new Date();
  const existingIds = new Set(existing.map((r) => r.MaVaiTro));
  const ops = [
    ...existing.map((m) => {
      const shouldActive = roleIds.includes(m.MaVaiTro);
      return prisma.nguoidungvaitro.update({
        where: { MaNguoiDung_MaVaiTro: { MaNguoiDung: userId, MaVaiTro: m.MaVaiTro } },
        data: { DaXoa: !shouldActive, TrangThai: shouldActive, ThoiGianSua: now },
      });
    }),
    ...roleIds
      .filter((id) => !existingIds.has(id))
      .map((roleId) =>
        prisma.nguoidungvaitro.create({
          data: { MaNguoiDung: userId, MaVaiTro: roleId, TrangThai: true, DaXoa: false, ThoiGianTao: now },
        }),
      ),
  ];
  if (ops.length) await prisma.$transaction(ops);
}

/** Tao ho so Giang vien / Hoc sinh / Phu huynh neu nguoi dung duoc gan vai tro tuong ung ma chua co ho so. */
export async function ensureRoleProfiles(userId: string, roleIds: number[] | null): Promise<void> {
  const roles = await prisma.vaitro.findMany({ where: { MaVaiTro: { in: roleIds ?? [] } }, select: { TenVaiTro: true } });
  const roleNames = roles.map((r) => r.TenVaiTro);
  const now = new Date();
  const ops = [];

  if (roleNames.includes('Giao_Vien') && !(await prisma.giangvien.count({ where: { MaNguoiDung: userId } }))) {
    ops.push(
      prisma.giangvien.create({
        data: {
          MaGiangVien: randomUUID(),
          MaNguoiDung: userId,
          TrinhDoChuyenMon: 'Chua cap nhat',
          TrangThai: true,
          DaXoa: false,
          ThoiGianTao: now,
        },
      }),
    );
  }
  if (roleNames.includes('Hoc_Sinh') && !(await prisma.hocsinh.count({ where: { MaNguoiDung: userId } }))) {
    ops.push(
      prisma.hocsinh.create({
        data: { MaHocSinh: randomUUID(), MaNguoiDung: userId, TrangThai: true, DaXoa: false, ThoiGianTao: now },
      }),
    );
  }
  if (roleNames.includes('Phu_Huynh') && !(await prisma.phuhuynh.count({ where: { MaNguoiDung: userId } }))) {
    ops.push(
      prisma.phuhuynh.create({
        data: {
          MaPhuHuynh: randomUUID(),
          MaNguoiDung: userId,
          SoDienThoai: 'Chua cap nhat',
          TrangThai: true,
          DaXoa: false,
          ThoiGianTao: now,
        },
      }),
    );
  }
  if (ops.length) await prisma.$transaction(ops);
}
