import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db.js';
import { requireAuth } from './auth.js';

// Chuyen tu AuthorizationMiddleware + PermissionHelper ben .NET.
// [AuthorizeByPermission("CODE")] -> requirePermission('CODE')

const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

/** Nguoi dung co ma quyen (TenQuyen) nay qua bat ky vai tro nao cua ho khong. maChucNang <= 0 = bo qua. */
export async function hasPermission(userId: string, permissionCode: string, maChucNang = 0): Promise<boolean> {
  const code = (permissionCode ?? '').trim().toUpperCase();
  if (!code) return false;
  try {
    const roles = await prisma.nguoidungvaitro.findMany({
      where: { MaNguoiDung: userId, ...notDeleted },
      select: { MaVaiTro: true },
    });
    if (roles.length === 0) return false;
    const rows = await prisma.vaitroquyen.findMany({
      where: {
        MaVaiTro: { in: roles.map((r) => r.MaVaiTro) },
        ...notDeleted,
        ...(maChucNang > 0 ? { quyen: { MaChucNang: maChucNang } } : {}),
      },
      select: { quyen: { select: { TenQuyen: true } } },
    });
    return rows.some((r) => r.quyen.TenQuyen.trim().toUpperCase() === code);
  } catch {
    return false;
  }
}

/** Theo ma quyen (MaQuyen so). */
export async function hasPermissionById(userId: string, permissionId: number, maChucNang = 0): Promise<boolean> {
  if (permissionId <= 0) return false;
  try {
    const roles = await prisma.nguoidungvaitro.findMany({
      where: { MaNguoiDung: userId, ...notDeleted },
      select: { MaVaiTro: true },
    });
    const count = await prisma.vaitroquyen.count({
      where: {
        MaVaiTro: { in: roles.map((r) => r.MaVaiTro) },
        MaQuyen: permissionId,
        ...notDeleted,
        ...(maChucNang > 0 ? { quyen: { MaChucNang: maChucNang } } : {}),
      },
    });
    return count > 0;
  } catch {
    return false;
  }
}

/** { MaChucNang: [TenQuyen...] } - PermissionHelper.GetUserPermissionsAsync */
export async function getUserPermissions(userId: string): Promise<Record<number, string[]>> {
  const result: Record<number, string[]> = {};
  const roles = await prisma.nguoidungvaitro.findMany({ where: { MaNguoiDung: userId, ...notDeleted } });
  if (roles.length === 0) return result;
  const rows = await prisma.vaitroquyen.findMany({
    where: { MaVaiTro: { in: roles.map((r) => r.MaVaiTro) }, ...notDeleted },
    select: { quyen: { select: { MaChucNang: true, TenQuyen: true } } },
  });
  for (const { quyen } of rows) {
    const list = (result[quyen.MaChucNang] ??= []);
    if (!list.includes(quyen.TenQuyen)) list.push(quyen.TenQuyen);
  }
  return result;
}

export async function getUserPrimaryRole(userId: string): Promise<string | null> {
  const link = await prisma.nguoidungvaitro.findFirst({
    where: { MaNguoiDung: userId, ...notDeleted },
    select: { vaitro: { select: { TenVaiTro: true } } },
  });
  return link?.vaitro.TenVaiTro ?? null;
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const count = await prisma.nguoidungvaitro.count({
    where: { MaNguoiDung: userId, ...notDeleted, vaitro: { TenVaiTro: roleName } },
  });
  return count > 0;
}

/**
 * Middleware: dang nhap + co ma quyen. Thieu/het han token -> 401 (de frontend tu refresh token);
 * khong du quyen -> 403 voi dung body cua ban .NET: { message, statusCode: 403 }.
 */
export function requirePermission(permissionCode: string, maChucNang = 0) {
  const check = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !(await hasPermission(req.user.userId, permissionCode, maChucNang))) {
      return res.status(403).json({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
    }
    return next();
  };
  return [requireAuth, check] as const;
}
