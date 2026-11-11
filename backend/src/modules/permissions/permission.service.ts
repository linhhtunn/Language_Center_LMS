import * as repo from './permission.repository.js';

// Chuyen tu Services/PermissionService.cs (+ IPermissionService).

const SYSTEM_ROLES = new Set(['Admin', 'Giao_Vien', 'Hoc_Sinh', 'Phu_Huynh']);

export async function getMatrix() {
  const permissions = await repo.getRawPermissions();
  const roles = await repo.getActiveRoles();
  const mappings = await repo.getActiveMappings();

  // GroupBy(MaChucNang, TenChucNang, MaTrang, TenTrang) - giu thu tu xuat hien dau tien nhu LINQ.
  const groups = new Map<string, repo.PermissionFlatDto[]>();
  for (const p of permissions) {
    const key = JSON.stringify([p.MaChucNang, p.TenChucNang, p.MaTrang, p.TenTrang]);
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  }
  const pages = [...groups.values()]
    .map((g) => ({
      maTrang: g[0].MaTrang,
      maChucNang: g[0].MaChucNang,
      tenChucNang: g[0].TenChucNang,
      tenTrang: g[0].TenTrang,
      quyens: g
        .map((p) => ({ maQuyen: p.MaQuyen, permissionCode: p.PermissionCode, thuTu: p.ThuTu }))
        .sort((a, b) => a.thuTu - b.thuTu),
    }))
    // OrderBy(maTrang) - cac ma deu dang "func_<so>" nen so sanh chuoi thuong cho cung ket qua.
    .sort((a, b) => (a.maTrang < b.maTrang ? -1 : a.maTrang > b.maTrang ? 1 : 0));

  return { roles, pages, mappings };
}

export async function getRolePermissions(roleId: number) {
  const role = await repo.getRoleById(roleId);
  if (!role) return null;
  const permissionCodes = await repo.getPermissionCodesByRoleId(roleId);
  return { roleId, roleName: role.TenVaiTro, permissionCodes };
}

export const checkPermission = (roleId: number, permissionCode: string) => repo.hasPermission(roleId, permissionCode);

type Result<T = undefined> = { success: boolean; message: string; data?: T };

export async function createRole(
  tenVaiTro: string,
  permissionCodes: (string | null)[],
): Promise<Result<{ maVaiTro: number; tenVaiTro: string }>> {
  if (!tenVaiTro || !tenVaiTro.trim()) return { success: false, message: 'Tên nhóm quyền không được để trống.' };

  const normalized = tenVaiTro.trim();
  if (await repo.roleNameExists(normalized)) return { success: false, message: 'Tên nhóm quyền đã tồn tại.' };

  const roleId = await repo.createRole(normalized);
  const permissionIds = await repo.getPermissionIdsByCodes(permissionCodes ?? []);
  await repo.replaceRolePermissions(roleId, permissionIds);

  return { success: true, message: 'Tạo vai trò thành công.', data: { maVaiTro: roleId, tenVaiTro: normalized } };
}

export async function updateRolePermissions(roleId: number, permissionCodes: (string | null)[]): Promise<Result> {
  const role = await repo.getRoleById(roleId);
  if (!role) return { success: false, message: 'Không tìm thấy nhóm quyền.' };

  const permissionIds = await repo.getPermissionIdsByCodes(permissionCodes ?? []);
  await repo.replaceRolePermissions(roleId, permissionIds);
  return { success: true, message: 'Cập nhật quyền thành công.' };
}

export async function deleteRole(roleId: number): Promise<Result> {
  const role = await repo.getRoleById(roleId);
  if (!role || role.DaXoa === true) return { success: false, message: 'Không tìm thấy nhóm quyền.' };

  if (SYSTEM_ROLES.has(role.TenVaiTro ?? '')) return { success: false, message: 'Không thể xoá vai trò hệ thống.' };

  if (await repo.hasAssignedUsers(roleId)) {
    return { success: false, message: 'Vai trò đang được gán cho người dùng, không thể xoá.' };
  }

  await repo.softDeleteRole(roleId);
  return { success: true, message: 'Xoá vai trò thành công.' };
}
