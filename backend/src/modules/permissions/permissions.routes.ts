import { Router } from 'express';
import { requirePermission } from '../../middlewares/permission.js';
import { queryCI } from '../../utils/dotnetCompat.js';
import { bindBody, parseDotnetInt, routeInt, sendValidationProblem, type FieldSpec } from '../users/dotnetBinding.js';
import * as svc from './permission.service.js';

// Chuyen tu PermissionsController.cs - [Route("api/[controller]")] = /api/Permissions, [Authorize].
// Cac action tra thang object (KHONG boc ApiResponseDto), loi dang { message }.
const router = Router();

const createRoleFields: FieldSpec[] = [
  { name: 'TenVaiTro', type: 'string', default: '' },
  { name: 'PermissionCodes', type: 'string[]', default: [] },
];
const updateRoleFields: FieldSpec[] = [{ name: 'PermissionCodes', type: 'string[]', default: [] }];

const roleIdOf = (raw: string | string[] | undefined) => parseDotnetInt(String(raw))!;

// GET /api/Permissions/matrix
router.get('/api/Permissions/matrix', ...requirePermission('PAGE_ADMIN_PERMISSIONS_VIEW'), async (_req, res) => {
  res.json(await svc.getMatrix());
});

// GET /api/Permissions/roles/{roleId:int}
router.get(
  '/api/Permissions/roles/:roleId',
  routeInt('roleId'),
  ...requirePermission('PAGE_ADMIN_PERMISSIONS_VIEW'),
  async (req, res) => {
    const result = await svc.getRolePermissions(roleIdOf(req.params.roleId));
    if (!result) return res.status(404).json({ message: 'Không tìm thấy nhóm quyền.' });
    return res.json(result);
  },
);

// GET /api/Permissions/check?roleId=&permissionCode=
router.get('/api/Permissions/check', ...requirePermission('PAGE_ADMIN_PERMISSIONS_VIEW'), async (req, res) => {
  // Model binding [FromQuery] int roleId (thieu -> 0), [FromQuery] string permissionCode (bat buoc ngam dinh).
  const errors: Record<string, string[]> = {};
  const rawRoleId = queryCI(req, 'roleId');
  let roleId = 0;
  if (rawRoleId !== undefined) {
    const parsed = parseDotnetInt(rawRoleId);
    if (rawRoleId.trim() === '') errors.roleId = [`The value '${rawRoleId}' is invalid.`];
    else if (parsed === null) errors.roleId = [`The value '${rawRoleId}' is not valid.`];
    else roleId = parsed;
  }
  const permissionCode = queryCI(req, 'permissionCode');
  if (permissionCode === undefined || !permissionCode.trim()) {
    errors.permissionCode = ['The permissionCode field is required.'];
  }
  if (Object.keys(errors).length) return sendValidationProblem(res, errors);

  // Nhanh nay khong con toi duoc (model validation da chan) nhung giu nhu ban goc.
  if (!permissionCode || !permissionCode.trim()) return res.status(400).json({ message: 'permissionCode là bắt buộc.' });

  const hasPermission = await svc.checkPermission(roleId, permissionCode);
  return res.json({ roleId, permissionCode, hasPermission });
});

// POST /api/Permissions/roles
router.post('/api/Permissions/roles', ...requirePermission('PERMISSIONS_ROLE_CREATE'), async (req, res) => {
  const bound = bindBody<{ TenVaiTro: string; PermissionCodes: (string | null)[] }>(
    req,
    'backend.Controllers.CreateRoleRequest',
    'request',
    createRoleFields,
  );
  if (!bound.ok) return bound.send(res);
  const result = await svc.createRole(bound.value.TenVaiTro, bound.value.PermissionCodes ?? []);
  if (!result.success) return res.status(400).json({ message: result.message });
  return res.json(result.data);
});

// PUT /api/Permissions/roles/{roleId:int}
router.put(
  '/api/Permissions/roles/:roleId',
  routeInt('roleId'),
  ...requirePermission('PERMISSIONS_ROLE_EDIT'),
  async (req, res) => {
    const bound = bindBody<{ PermissionCodes: (string | null)[] }>(
      req,
      'backend.Controllers.UpdateRolePermissionsRequest',
      'request',
      updateRoleFields,
    );
    if (!bound.ok) return bound.send(res);
    const result = await svc.updateRolePermissions(roleIdOf(req.params.roleId), bound.value.PermissionCodes ?? []);
    if (!result.success) return res.status(404).json({ message: result.message });
    return res.json({ message: result.message });
  },
);

// DELETE /api/Permissions/roles/{roleId:int}
router.delete(
  '/api/Permissions/roles/:roleId',
  routeInt('roleId'),
  ...requirePermission('PERMISSIONS_ROLE_DELETE'),
  async (req, res) => {
    const result = await svc.deleteRole(roleIdOf(req.params.roleId));
    if (!result.success) {
      if (result.message === 'Không tìm thấy nhóm quyền.') return res.status(404).json({ message: result.message });
      return res.status(400).json({ message: result.message });
    }
    return res.json({ message: result.message });
  },
);

export default router;
