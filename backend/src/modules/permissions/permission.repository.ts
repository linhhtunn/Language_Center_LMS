import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';

// Chuyen tu Repositories/PermissionRepository.cs (+ IPermissionRepository).
// Cac truy van khong co ORDER BY ben EF duoc viet bang SQL tuong duong de MySQL tra cung thu tu dong.

const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };

/** (code ?? "").Trim().ToUpperInvariant() */
export const normalizePermissionCode = (code: string | null | undefined) => (code ?? '').trim().toUpperCase();

export interface PermissionFlatDto {
  MaChucNang: number;
  MaQuyen: number;
  PermissionCode: string;
  TenChucNang: string;
  MaTrang: string;
  TenTrang: string;
  ThuTu: number;
}

export interface RoleLiteDto {
  maVaiTro: number;
  tenVaiTro: string;
}

export interface RolePermissionMapDto {
  maVaiTro: number;
  maQuyen: number;
}

/** Danh sach quyen tho (KHONG loc DaXoa, giong ban .NET) sap theo MaChucNang, MaQuyen. */
export async function getRawPermissions(): Promise<PermissionFlatDto[]> {
  const rows = await prisma.quyen.findMany({
    orderBy: [{ MaChucNang: 'asc' }, { MaQuyen: 'asc' }],
    select: { MaChucNang: true, MaQuyen: true, TenQuyen: true, chucnang: { select: { TenChucNang: true } } },
  });
  return rows.map((x) => ({
    MaChucNang: x.MaChucNang,
    MaQuyen: x.MaQuyen,
    PermissionCode: x.TenQuyen,
    TenChucNang: x.chucnang.TenChucNang,
    MaTrang: `func_${x.MaChucNang}`,
    TenTrang: x.chucnang.TenChucNang,
    ThuTu: x.MaQuyen,
  }));
}

/** Vai tro con hieu luc (khong ORDER BY - giong EF). */
export async function getActiveRoles(): Promise<RoleLiteDto[]> {
  const rows = await prisma.$queryRaw<{ MaVaiTro: number; TenVaiTro: string }[]>`
    SELECT v.MaVaiTro, v.TenVaiTro FROM vaitro AS v WHERE (v.DaXoa IS NULL) OR NOT (v.DaXoa)`;
  return rows.map((r) => ({ maVaiTro: Number(r.MaVaiTro), tenVaiTro: r.TenVaiTro }));
}

/** Mapping vai tro - quyen con hieu luc. */
export async function getActiveMappings(): Promise<RolePermissionMapDto[]> {
  const rows = await prisma.$queryRaw<{ MaVaiTro: number; MaQuyen: number }[]>`
    SELECT v.MaVaiTro, v.MaQuyen FROM vaitroquyen AS v WHERE (v.DaXoa IS NULL) OR NOT (v.DaXoa)`;
  return rows.map((r) => ({ maVaiTro: Number(r.MaVaiTro), maQuyen: Number(r.MaQuyen) }));
}

/** Tim vai tro theo ma (KHONG loc DaXoa). */
export function getRoleById(roleId: number) {
  return prisma.vaitro.findFirst({ where: { MaVaiTro: roleId } });
}

export async function roleNameExists(roleName: string): Promise<boolean> {
  return (await prisma.vaitro.count({ where: { TenVaiTro: roleName, ...notDeleted } })) > 0;
}

/** Ma quyen (chuoi) -> MaQuyen. So khop UPPER(TRIM(TenQuyen)) nhu ban .NET. */
export async function getPermissionIdsByCodes(permissionCodes: (string | null)[] | null): Promise<number[]> {
  const normalized = [
    ...new Set((permissionCodes ?? []).filter((x): x is string => !!x && !!x.trim()).map(normalizePermissionCode)),
  ];
  if (normalized.length === 0) return [];
  const rows = await prisma.$queryRaw<{ MaQuyen: number }[]>`
    SELECT q.MaQuyen FROM quyen AS q
    WHERE UPPER(TRIM(COALESCE(q.TenQuyen, ''))) IN (${Prisma.join(normalized)})`;
  return rows.map((r) => Number(r.MaQuyen));
}

export async function getPermissionCodesByRoleId(roleId: number): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ TenQuyen: string }[]>`
    SELECT q.TenQuyen FROM vaitroquyen AS v
    INNER JOIN quyen AS q ON v.MaQuyen = q.MaQuyen
    WHERE (v.MaVaiTro = ${roleId}) AND ((v.DaXoa IS NULL) OR NOT (v.DaXoa))`;
  return rows.map((r) => r.TenQuyen);
}

export async function hasPermission(roleId: number, permissionCode: string): Promise<boolean> {
  const code = normalizePermissionCode(permissionCode);
  if (!code.trim()) return false;
  const rows = await prisma.$queryRaw<{ ok: bigint | number }[]>`
    SELECT EXISTS (
      SELECT 1 FROM vaitroquyen AS v
      INNER JOIN quyen AS q ON v.MaQuyen = q.MaQuyen
      WHERE ((v.MaVaiTro = ${roleId}) AND ((v.DaXoa IS NULL) OR NOT (v.DaXoa)))
        AND (UPPER(TRIM(COALESCE(q.TenQuyen, ''))) = ${code})) AS ok`;
  return Number(rows[0]?.ok ?? 0) === 1;
}

export async function createRole(roleName: string): Promise<number> {
  const role = await prisma.vaitro.create({ data: { TenVaiTro: roleName } });
  return role.MaVaiTro;
}

/** Xoa cung TOAN BO mapping cu cua vai tro roi them moi (mot SaveChanges = mot transaction). */
export async function replaceRolePermissions(roleId: number, permissionIds: number[] | null): Promise<void> {
  const ids = permissionIds ?? [];
  await prisma.$transaction([
    prisma.vaitroquyen.deleteMany({ where: { MaVaiTro: roleId } }),
    prisma.vaitroquyen.createMany({
      data: ids.map((MaQuyen) => ({ MaVaiTro: roleId, MaQuyen, TrangThai: true, DaXoa: false })),
    }),
  ]);
}

export async function hasAssignedUsers(roleId: number): Promise<boolean> {
  return (await prisma.nguoidungvaitro.count({ where: { MaVaiTro: roleId, ...notDeleted } })) > 0;
}

/** Xoa mem vai tro va cac mapping quyen con hieu luc. */
export async function softDeleteRole(roleId: number): Promise<void> {
  const now = new Date();
  await prisma.vaitro.findFirstOrThrow({ where: { MaVaiTro: roleId } });
  await prisma.$transaction([
    prisma.vaitroquyen.updateMany({
      where: { MaVaiTro: roleId, ...notDeleted },
      data: { DaXoa: true, TrangThai: false, ThoiGianSua: now },
    }),
    prisma.vaitro.update({ where: { MaVaiTro: roleId }, data: { DaXoa: true, TrangThai: false, ThoiGianSua: now } }),
  ]);
}
