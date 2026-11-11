import { Router, type Request, type RequestHandler, type Response } from 'express';
import { requirePermission } from '../../middlewares/permission.js';
import { ok } from '../../utils/apiResponse.js';
import { isGuid } from '../../utils/dotnetCompat.js';
import { upload } from '../../utils/upload.js';
import { getBootstrap, uploadQuestionBankAsset } from './bootstrap.js';
import {
  deleteQuestionBankGroup,
  getQuestionBankGroups,
  updateQuestionBankGroupStatus,
  upsertQuestionBankGroup,
} from './questionBankGroups.js';
import {
  deleteQuestionBankItem,
  getQuestionBank,
  getQuestionBankDetail,
  updateQuestionBankItemStatus,
  upsertBankExercise,
} from './bankExercises.js';
import { importQuestionBank } from './questionImport.js';
import { generateExams, generateExamsFromBank, saveSourcePool } from './examGenerator.js';
import { distributeAssignments, getDistributionTargets } from './distribution.js';
import { deleteAssignment, getAssignmentDetail, getAssignments, upsertAssignment } from './assignmentsAdmin.js';
import { bindBody, QueryReader, sendValidationProblem, type DtoSchema } from './binder.js';
import { currentUserId, sendError, USER_INVALID, type ActionError } from './common.js';
import {
  AssignmentUpsertSchema,
  BankExerciseUpsertSchema,
  DistributeSchema,
  ExamGenerateSchema,
  GeneratedExamBatchSchema,
  QuestionBankGroupUpsertSchema,
  QuestionBankImportSchema,
  SourcePoolUpsertSchema,
  StatusRequestSchema,
  type AssignmentUpsertRequest,
  type BankExerciseUpsertRequest,
  type DistributeRequest,
  type ExamGenerateRequest,
  type GeneratedExamBatchRequest,
  type QuestionBankGroupUpsertRequest,
  type QuestionBankImportRequest,
  type SourcePoolUpsertRequest,
  type StatusRequest,
} from './dtos.js';

// Chuyen tu Controllers/AdminAssignmentController.cs - [Route("api/AdminAssignment")],
// [AuthorizeByPermission("ASSIGNMENTS_ADMIN_VIEW")] cho ca controller (24 action).
const router = Router();
const BASE = '/api/AdminAssignment';
const perm = requirePermission('ASSIGNMENTS_ADMIN_VIEW');

/** Rang buoc {x:guid}: sai -> khong khop route (.NET tra 404) - kiem tra TRUOC khi xac thuc. */
const guidParams =
  (...names: string[]): RequestHandler =>
  (req, _res, next) => {
    for (const n of names) if (!isGuid(req.params[n])) return next('route');
    return next();
  };

const param = (req: Request, name: string) => String(req.params[name]).toLowerCase();

type Result = ActionError | { body: unknown };
const send = (res: Response, r: Result) => ('status' in r ? sendError(res, r) : res.json(r.body));

/** Action co [FromBody]: binding + validate tu dong ([ApiController]) truoc, roi moi chay action. */
function withBody<T>(schema: DtoSchema, action: (req: Request, res: Response, userId: string, body: T) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    const bound = bindBody<T>(req, schema);
    if (!bound.ok) return bound.send(res);
    const userId = currentUserId(req);
    if (!userId) return sendError(res, USER_INVALID());
    return action(req, res, userId, bound.value);
  };
}

/** Action khong co body nhung can User.GetUserId(). */
function withUser(action: (req: Request, res: Response, userId: string) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    const userId = currentUserId(req);
    if (!userId) return sendError(res, USER_INVALID());
    return action(req, res, userId);
  };
}

// ---------------------------------------------------------------- upload asset
router.post(
  `${BASE}/question-bank/assets`,
  ...perm,
  upload.any(),
  withUser(async (req, res, userId) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const file = files.find((f) => f.fieldname.toLowerCase() === 'file');
    send(res, await uploadQuestionBankAsset(userId, file));
  }),
);

// ---------------------------------------------------------------- bootstrap
router.get(`${BASE}/bootstrap`, ...perm, async (_req, res) => {
  res.json(await getBootstrap());
});

// ---------------------------------------------------------------- ngan hang de (nganhangde)
router.get(`${BASE}/question-bank-groups`, ...perm, async (req, res) => {
  const q = new QueryReader(req);
  const includeRetired = q.bool('includeRetired', true);
  if (q.hasErrors) return sendValidationProblem(res, q.errors);
  res.json(await getQuestionBankGroups(includeRetired));
});

router.post(
  `${BASE}/question-bank-groups`,
  ...perm,
  withBody<QuestionBankGroupUpsertRequest>(QuestionBankGroupUpsertSchema, async (_req, res, userId, body) => {
    send(res, await upsertQuestionBankGroup(userId, null, body));
  }),
);

router.put(
  `${BASE}/question-bank-groups/:bankId`,
  guidParams('bankId'),
  ...perm,
  withBody<QuestionBankGroupUpsertRequest>(QuestionBankGroupUpsertSchema, async (req, res, userId, body) => {
    send(res, await upsertQuestionBankGroup(userId, param(req, 'bankId'), body));
  }),
);

router.patch(
  `${BASE}/question-bank-groups/:bankId/status`,
  guidParams('bankId'),
  ...perm,
  withBody<StatusRequest>(StatusRequestSchema, async (req, res, userId, body) => {
    send(res, await updateQuestionBankGroupStatus(userId, param(req, 'bankId'), body));
  }),
);

router.delete(
  `${BASE}/question-bank-groups/:bankId`,
  guidParams('bankId'),
  ...perm,
  withUser(async (req, res, userId) => {
    send(res, await deleteQuestionBankGroup(userId, param(req, 'bankId')));
  }),
);

router.post(
  `${BASE}/question-bank-groups/:bankId/generate`,
  guidParams('bankId'),
  ...perm,
  withBody<ExamGenerateRequest>(ExamGenerateSchema, async (req, res, userId, body) => {
    send(res, await generateExamsFromBank(userId, param(req, 'bankId'), body));
  }),
);

// ---------------------------------------------------------------- bai tap mau trong ngan hang
router.get(`${BASE}/question-bank`, ...perm, async (req, res) => {
  const q = new QueryReader(req);
  const filters = {
    courseId: q.guid('courseId'),
    bankId: q.guid('bankId'),
    search: q.str('search'),
    questionType: q.str('questionType'),
    difficulty: q.str('difficulty'),
  };
  if (q.hasErrors) return sendValidationProblem(res, q.errors);
  res.json(await getQuestionBank(filters));
});

router.post(
  `${BASE}/question-bank/import`,
  ...perm,
  withBody<QuestionBankImportRequest>(QuestionBankImportSchema, async (_req, res, userId, body) => {
    send(res, await importQuestionBank(userId, body));
  }),
);

router.get(`${BASE}/question-bank/:exerciseId`, guidParams('exerciseId'), ...perm, async (req, res) => {
  send(res, await getQuestionBankDetail(param(req, 'exerciseId')));
});

router.post(
  `${BASE}/question-bank`,
  ...perm,
  withBody<BankExerciseUpsertRequest>(BankExerciseUpsertSchema, async (_req, res, userId, body) => {
    const r = await upsertBankExercise(userId, null, body);
    if ('status' in r) return sendError(res, r);
    res.json(ok(r.detail, 'Tao bai tap thanh cong.'));
  }),
);

router.put(
  `${BASE}/question-bank/:exerciseId`,
  guidParams('exerciseId'),
  ...perm,
  withBody<BankExerciseUpsertRequest>(BankExerciseUpsertSchema, async (req, res, userId, body) => {
    const r = await upsertBankExercise(userId, param(req, 'exerciseId'), body);
    if ('status' in r) return sendError(res, r);
    res.json(ok(r.detail, 'Cap nhat bai tap thanh cong.'));
  }),
);

router.patch(
  `${BASE}/question-bank/:exerciseId/status`,
  guidParams('exerciseId'),
  ...perm,
  withBody<StatusRequest>(StatusRequestSchema, async (req, res, userId, body) => {
    send(res, await updateQuestionBankItemStatus(userId, param(req, 'exerciseId'), body));
  }),
);

router.delete(
  `${BASE}/question-bank/:exerciseId`,
  guidParams('exerciseId'),
  ...perm,
  withUser(async (req, res, userId) => {
    send(res, await deleteQuestionBankItem(userId, param(req, 'exerciseId')));
  }),
);

router.post(
  `${BASE}/question-bank/:bankId/source-pool`,
  guidParams('bankId'),
  ...perm,
  withBody<SourcePoolUpsertRequest>(SourcePoolUpsertSchema, async (req, res, userId, body) => {
    send(res, await saveSourcePool(userId, param(req, 'bankId'), body));
  }),
);

router.post(
  `${BASE}/question-bank/:bankId/generate-exams`,
  guidParams('bankId'),
  ...perm,
  withBody<GeneratedExamBatchRequest>(GeneratedExamBatchSchema, async (_req, res, userId, body) => {
    send(res, await generateExams(userId, body));
  }),
);

// ---------------------------------------------------------------- giao bai
router.get(`${BASE}/distribution-targets`, ...perm, async (req, res) => {
  const q = new QueryReader(req);
  const courseId = q.guid('courseId');
  if (q.hasErrors) return sendValidationProblem(res, q.errors);
  res.json(await getDistributionTargets(courseId));
});

router.post(
  `${BASE}/assignments/distribute`,
  ...perm,
  withBody<DistributeRequest>(DistributeSchema, async (_req, res, userId, body) => {
    send(res, await distributeAssignments(userId, body));
  }),
);

// ---------------------------------------------------------------- bai tap / de thi
router.get(`${BASE}/assignments`, ...perm, async (req, res) => {
  const q = new QueryReader(req);
  const filters = {
    courseId: q.guid('courseId'),
    assignmentType: q.str('assignmentType'),
    status: q.str('status'),
    search: q.str('search'),
  };
  if (q.hasErrors) return sendValidationProblem(res, q.errors);
  res.json(await getAssignments(filters));
});

router.get(`${BASE}/assignments/:assignmentId`, guidParams('assignmentId'), ...perm, async (req, res) => {
  send(res, await getAssignmentDetail(param(req, 'assignmentId')));
});

router.post(
  `${BASE}/assignments`,
  ...perm,
  withBody<AssignmentUpsertRequest>(AssignmentUpsertSchema, async (_req, res, userId, body) => {
    const r = await upsertAssignment(userId, null, body);
    if ('status' in r) return sendError(res, r);
    res.json(ok(r.detail, 'Tao bai tap thanh cong.'));
  }),
);

router.put(
  `${BASE}/assignments/:assignmentId`,
  guidParams('assignmentId'),
  ...perm,
  withBody<AssignmentUpsertRequest>(AssignmentUpsertSchema, async (req, res, userId, body) => {
    const r = await upsertAssignment(userId, param(req, 'assignmentId'), body);
    if ('status' in r) return sendError(res, r);
    res.json(ok(r.detail, 'Cap nhat bai tap thanh cong.'));
  }),
);

router.delete(
  `${BASE}/assignments/:assignmentId`,
  guidParams('assignmentId'),
  ...perm,
  withUser(async (req, res, userId) => {
    send(res, await deleteAssignment(userId, param(req, 'assignmentId')));
  }),
);

export default router;
