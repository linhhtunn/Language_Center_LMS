import { Router, type Request } from 'express';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { bindBody, parseGuidRoute, routeGuid, type FieldSpec } from './dotnetBinding.js';
import * as svc from './users.service.js';

// Chuyen tu UsersController.cs - [Route("api/users")], [Authorize] + [AuthorizeByPermission] tung action.
// Router gan o goc nen ghi du duong dan.
const router = Router();

const USER_NOT_FOUND = () => fail('Khong tim thay nguoi dung.', 'USER_NOT_FOUND');

const createFields: FieldSpec[] = [
  { name: 'Username', type: 'string', default: '' },
  { name: 'Password', type: 'string', default: '' },
  { name: 'FullName', type: 'string', default: '' },
  { name: 'Email', type: 'string?', default: null },
  { name: 'AccountType', type: 'sbyte', default: 0 },
  { name: 'RoleIds', type: 'int[]', default: [] },
];
const updateFields: FieldSpec[] = [
  { name: 'Username', type: 'string', default: '' },
  { name: 'FullName', type: 'string', default: '' },
  { name: 'Email', type: 'string?', default: null },
  { name: 'AccountType', type: 'sbyte', default: 0 },
  { name: 'Active', type: 'bool', default: true },
];
const rolesFields: FieldSpec[] = [{ name: 'RoleIds', type: 'int[]', default: [] }];

/** CreatedAtAction(GetById) -> header Location tuyet doi. */
const locationOf = (req: Request, id: string) => `${req.protocol}://${req.get('host')}/api/users/${id}`;

// GET /api/users
router.get('/api/users', ...requirePermission('PAGE_ADMIN_USERS_VIEW'), async (_req, res) => {
  res.json(ok(await svc.listUsers()));
});

// GET /api/users/{id:guid}
router.get('/api/users/:id', routeGuid('id'), ...requirePermission('PAGE_ADMIN_USERS_VIEW'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  const user = await svc.loadUserDto(id);
  return user ? res.json(ok(user)) : res.status(404).json(USER_NOT_FOUND());
});

// POST /api/users
router.post('/api/users', ...requirePermission('USERS_CREATE'), async (req, res) => {
  const bound = bindBody<svc.CreateUserRequest & Record<string, unknown>>(
    req,
    'backend.DTOs.CreateUserRequestDto',
    'request',
    createFields,
  );
  if (!bound.ok) return bound.send(res);
  const request = bound.value;

  const validation = await svc.validateCreate(request);
  if (validation) return res.status(400).json(validation);

  const id = await svc.createUser(request);
  const created = await svc.loadUserDto(id);
  return res.status(201).location(locationOf(req, id)).json(ok(created));
});

// PUT /api/users/{id:guid}
router.put('/api/users/:id', routeGuid('id'), ...requirePermission('USERS_EDIT'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  // Model binding/validation chay truoc action (400 truoc 404).
  const bound = bindBody<svc.UpdateUserRequest & Record<string, unknown>>(
    req,
    'backend.DTOs.UpdateUserRequestDto',
    'request',
    updateFields,
  );
  if (!bound.ok) return bound.send(res);
  const request = bound.value;

  if (!(await svc.findActiveUser(id))) return res.status(404).json(USER_NOT_FOUND());

  const validation = await svc.validateUpdate(id, request);
  if (validation) return res.status(400).json(validation);

  await svc.updateUser(id, request);
  return res.json(ok(await svc.loadUserDto(id)));
});

// DELETE /api/users/{id:guid}
router.delete('/api/users/:id', routeGuid('id'), ...requirePermission('USERS_DELETE'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  if (!(await svc.findActiveUser(id))) return res.status(404).json(USER_NOT_FOUND());
  await svc.softDeleteUser(id);
  return res.json(ok({ id }, 'Da xoa mem nguoi dung.'));
});

// PUT /api/users/{id:guid}/roles
router.put('/api/users/:id/roles', routeGuid('id'), ...requirePermission('USERS_EDIT'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  const bound = bindBody<{ RoleIds: number[] }>(req, 'backend.DTOs.UpdateUserRolesRequestDto', 'request', rolesFields);
  if (!bound.ok) return bound.send(res);
  const { RoleIds } = bound.value;

  if (!(await svc.findActiveUser(id))) return res.status(404).json(USER_NOT_FOUND());

  const roleValidation = await svc.validateRoleIds(RoleIds);
  if (roleValidation) return res.status(400).json(roleValidation);

  await svc.replaceUserRoles(id, RoleIds);
  await svc.ensureRoleProfiles(id, RoleIds);
  return res.json(ok(await svc.loadUserDto(id)));
});

export default router;
