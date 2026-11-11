import { Router, type Request } from 'express';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { bindBody, parseGuidRoute, routeGuid, type FieldSpec } from '../users/dotnetBinding.js';
import * as svc from './courses.service.js';

// Chuyen tu CoursesController.cs - [Route("api/courses")], [Authorize]; tao/sua/xoa them [AuthorizeByPermission].
const router = Router();

const COURSE_NOT_FOUND = () => fail('Khong tim thay khoa hoc.', 'COURSE_NOT_FOUND');

const upsertFields: FieldSpec[] = [
  { name: 'Name', type: 'string', default: '' },
  { name: 'Description', type: 'string?', default: null },
  { name: 'BasePrice', type: 'decimal?', default: null },
  { name: 'Active', type: 'bool', default: true },
];

const bindUpsert = (req: Request) =>
  bindBody<svc.UpsertCourseRequest & Record<string, unknown>>(
    req,
    'backend.DTOs.UpsertCourseRequestDto',
    'request',
    upsertFields,
  );

// GET /api/courses
router.get('/api/courses', requireAuth, async (_req, res) => {
  res.json(ok(await svc.listCourses()));
});

// GET /api/courses/{id:guid}
router.get('/api/courses/:id', routeGuid('id'), requireAuth, async (req, res) => {
  const course = await svc.findActiveCourse(parseGuidRoute(req.params.id)!);
  return course ? res.json(ok(svc.toDto(course))) : res.status(404).json(COURSE_NOT_FOUND());
});

// POST /api/courses
router.post('/api/courses', ...requirePermission('COURSES_CREATE'), async (req, res) => {
  const bound = bindUpsert(req);
  if (!bound.ok) return bound.send(res);
  const validation = await svc.validateRequest(bound.value);
  if (validation) return res.status(400).json(validation);

  const dto = await svc.createCourse(bound.value);
  return res
    .status(201)
    .location(`${req.protocol}://${req.get('host')}/api/courses/${dto.id}`)
    .json(ok(dto));
});

// PUT /api/courses/{id:guid}
router.put('/api/courses/:id', routeGuid('id'), ...requirePermission('COURSES_EDIT'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  const bound = bindUpsert(req);
  if (!bound.ok) return bound.send(res);

  const course = await svc.findActiveCourse(id);
  if (!course) return res.status(404).json(COURSE_NOT_FOUND());

  const validation = await svc.validateRequest(bound.value, id);
  if (validation) return res.status(400).json(validation);

  return res.json(ok(await svc.updateCourse(course, bound.value)));
});

// DELETE /api/courses/{id:guid}
router.delete('/api/courses/:id', routeGuid('id'), ...requirePermission('COURSES_DELETE'), async (req, res) => {
  const id = parseGuidRoute(req.params.id)!;
  if (!(await svc.findActiveCourse(id))) return res.status(404).json(COURSE_NOT_FOUND());
  await svc.softDeleteCourse(id);
  return res.json(ok({ id }, 'Da xoa mem khoa hoc.'));
});

export default router;
