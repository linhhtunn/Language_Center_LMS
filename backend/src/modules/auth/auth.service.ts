import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { signAccessToken } from '../../middlewares/auth.js';
import { fail, ok, type ApiResponse } from '../../utils/apiResponse.js';

// Chuyen tu UserService + UserRepository + PasswordService + DbRefreshSessionStore ben .NET.

const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

// ---------- Mat khau ----------
const isBcrypt = (hash: string) => /^\$2[aby]\$/.test(hash);

export async function verifyPassword(plain: string, hashOrPlain: string | null | undefined): Promise<boolean> {
  if (!hashOrPlain?.trim()) return false;
  if (isBcrypt(hashOrPlain)) return bcrypt.compare(plain, hashOrPlain);
  // Tai khoan cu luu mat khau dang chu thuong: van cho dang nhap, sau do nang cap len bcrypt.
  return hashOrPlain === plain;
}

export const hashPassword = (plain: string) => bcrypt.hash(plain, 12);

// ---------- Truy van nguoi dung ----------
async function getUserRole(userId: string) {
  const link = await prisma.nguoidungvaitro.findFirst({
    where: { MaNguoiDung: userId, ...notDeleted },
    include: { vaitro: true },
  });
  return link?.vaitro ?? null;
}

async function getPermissionCodes(roleId: number): Promise<string[]> {
  const rows = await prisma.vaitroquyen.findMany({
    where: { MaVaiTro: roleId, ...notDeleted },
    select: { quyen: { select: { TenQuyen: true } } },
  });
  return rows.map((r) => r.quyen.TenQuyen);
}

/** ProfileId de frontend dieu huong dung man hinh: MaHocSinh / MaGiangVien / MaPhuHuynh. */
async function getProfileId(userId: string, roleName: string): Promise<string | null> {
  if (roleName === 'Hoc_Sinh') {
    return (await prisma.hocsinh.findFirst({ where: { MaNguoiDung: userId } }))?.MaHocSinh ?? null;
  }
  if (roleName === 'Giao_Vien') {
    return (await prisma.giangvien.findFirst({ where: { MaNguoiDung: userId, ...notDeleted } }))?.MaGiangVien ?? null;
  }
  if (roleName === 'Phu_Huynh') {
    return (await prisma.phuhuynh.findFirst({ where: { MaNguoiDung: userId, ...notDeleted } }))?.MaPhuHuynh ?? null;
  }
  return null;
}

// ---------- Refresh session (luu trong bang refresh_sessions) ----------
const newRefreshToken = () => randomBytes(64).toString('base64');
const refreshExpiry = () => new Date(Date.now() + config.jwt.refreshTokenDays * 24 * 60 * 60 * 1000);

async function createSession(userId: string, refreshToken: string): Promise<string> {
  const sessionId = randomUUID().replaceAll('-', '');
  await prisma.refresh_sessions.create({
    data: {
      SessionId: sessionId,
      UserId: userId,
      RefreshToken: refreshToken,
      ExpiresAtUtc: refreshExpiry(),
      CreatedAtUtc: new Date(),
    },
  });
  return sessionId;
}

/** Kiem tra refresh token, dung thi thay token moi (chong dung lai token cu). Tra ve userId hoac null. */
async function validateAndRotate(sessionId: string, refreshToken: string, rotatedToken: string): Promise<string | null> {
  const session = await prisma.refresh_sessions.findUnique({ where: { SessionId: sessionId } });
  if (!session) return null;
  if (session.RefreshToken !== refreshToken || session.ExpiresAtUtc <= new Date()) {
    await prisma.refresh_sessions.delete({ where: { SessionId: sessionId } }).catch(() => undefined);
    return null;
  }
  await prisma.refresh_sessions.update({
    where: { SessionId: sessionId },
    data: { RefreshToken: rotatedToken, ExpiresAtUtc: refreshExpiry(), UpdatedAtUtc: new Date() },
  });
  return session.UserId;
}

// ---------- Nghiep vu ----------
export interface AuthResult {
  id: string;
  fullName: string;
  role: string;
  profileId: string | null;
  token: string;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  permissionCodes: string[];
}

export async function login(email: string, password: string): Promise<ApiResponse<AuthResult>> {
  const user = await prisma.nguoidung.findFirst({ where: { Email: email, ...notDeleted } });
  if (!user) return fail('Email hoặc mật khẩu không đúng!', 'AUTH_INVALID_CREDENTIALS');
  if (user.TrangThai === false) return fail('Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa.', 'AUTH_USER_DISABLED');
  if (!(await verifyPassword(password, user.MatKhauHash))) {
    return fail('Email hoặc mật khẩu không đúng!', 'AUTH_INVALID_CREDENTIALS');
  }

  await prisma.nguoidung.update({
    where: { MaNguoiDung: user.MaNguoiDung },
    data: {
      LanCuoiDangNhap: new Date(),
      ...(isBcrypt(user.MatKhauHash) ? {} : { MatKhauHash: await hashPassword(password) }),
    },
  });

  const role = await getUserRole(user.MaNguoiDung);
  if (!role) return fail('Tài khoản chưa được gán vai trò.', 'AUTH_ROLE_NOT_ASSIGNED');

  const roleName = role.TenVaiTro || 'User';
  const profileId = await getProfileId(user.MaNguoiDung, roleName);
  const permissionCodes = await getPermissionCodes(role.MaVaiTro);

  const accessToken = signAccessToken({
    userId: user.MaNguoiDung,
    email: user.Email ?? '',
    role: roleName,
    fullName: user.HoTen ?? '',
    profileId,
  });
  const refreshToken = newRefreshToken();
  const sessionId = await createSession(user.MaNguoiDung, refreshToken);

  return ok(
    {
      id: user.MaNguoiDung,
      fullName: user.HoTen ?? '',
      role: roleName,
      profileId,
      token: accessToken,
      accessToken,
      refreshToken,
      sessionId,
      permissionCodes,
    },
    'Đăng nhập thành công',
  );
}

export async function refresh(sessionId: string, refreshToken: string) {
  const rotated = newRefreshToken();
  const userId = await validateAndRotate(sessionId, refreshToken, rotated);
  if (!userId) return fail('Refresh token không hợp lệ hoặc đã hết hạn.', 'AUTH_REFRESH_INVALID');

  const user = await prisma.nguoidung.findFirst({ where: { MaNguoiDung: userId, ...notDeleted } });
  if (!user || user.TrangThai === false) {
    return fail('Người dùng không tồn tại hoặc đã bị vô hiệu hóa.', 'AUTH_USER_NOT_FOUND');
  }

  const role = await getUserRole(userId);
  const roleName = role?.TenVaiTro || 'User';
  const profileId = await getProfileId(userId, roleName);
  const accessToken = signAccessToken({
    userId,
    email: user.Email ?? '',
    role: roleName,
    fullName: user.HoTen ?? '',
    profileId,
  });

  return ok({ token: accessToken, accessToken, refreshToken: rotated, sessionId }, 'Làm mới token thành công');
}

export async function refreshPermissions(userId: string) {
  const user = await prisma.nguoidung.findFirst({ where: { MaNguoiDung: userId, ...notDeleted } });
  if (!user) return fail('Người dùng không tồn tại.', 'AUTH_USER_NOT_FOUND');
  const role = await getUserRole(userId);
  if (!role) return fail('Tài khoản chưa được gán vai trò.', 'AUTH_ROLE_NOT_ASSIGNED');
  const permissionCodes = await getPermissionCodes(role.MaVaiTro);
  return ok({ userId, role: role.TenVaiTro, permissionCodes }, 'Cập nhật quyền thành công');
}

export async function logout(sessionId: string) {
  await prisma.refresh_sessions.deleteMany({ where: { SessionId: sessionId } });
  return ok(null, 'Đã đăng xuất thành công');
}
