import { Router, type Request, type Response } from 'express';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { isGuid, validationProblem } from '../../utils/dotnetCompat.js';
import { bodyOf, guidRoute, jsonBytePosition, queryDateOnly, queryString, sendBindingError, throwIfErrors, tryParseGuid } from '../schedule/dotnetBinding.js';
import * as svc from './attendance.service.js';

// Chuyen tu Controllers/AttendanceController.cs (khong co route cap lop - moi action co duong dan day du)
// va Controllers/AdminAttendanceController.cs ([Route("api/admin/attendance")]).

const router = Router();

type Handler = (req: Request, res: Response) => Promise<unknown>;
const handle = (fn: Handler) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (sendBindingError(res, err)) return;
    throw err;
  }
};

/** CanAccessClassAsync: Admin luon duoc; con lai phai la giao vien dang day lop. */
async function canAccessClass(req: Request, classId: string): Promise<boolean> {
  if (req.user?.role === 'Admin') return true;
  const teacherId = tryParseGuid(req.user?.profileId ?? '');
  if (!teacherId) return false;
  return svc.teacherCanAccessClass(classId, teacherId);
}

const SESSION_NOT_FOUND = () => fail('Khong tim thay buoi hoc trong lop.', 'SESSION_NOT_FOUND');

router.get(
  '/api/classes/:classId/sessions/:sessionId/attendance',
  guidRoute('classId', 'sessionId'),
  ...requirePermission('ATTENDANCE_VIEW'),
  handle(async (req, res) => {
    const { classId, sessionId } = req.params as { classId: string; sessionId: string };
    if (!isGuid(classId) || !isGuid(sessionId)) return res.status(404).end();
    const c = classId.toLowerCase();
    const s = sessionId.toLowerCase();
    if (!(await svc.sessionBelongsToClass(c, s))) return res.status(404).json(SESSION_NOT_FOUND());
    if (!(await canAccessClass(req, c))) return res.status(403).end();
    res.json(ok(await svc.getClassSessionAttendance(c, s)));
  }),
);

/**
 * Bind SaveAttendanceRequestDto { Items: [{ StudentId, Status, Note }] } giong System.Text.Json +
 * [Required] ngam dinh (Nullable enable, AllowEmptyStrings): Items = null hoac Status = null -> 400 ValidationProblem;
 * Status rong / thieu -> loi ATTENDANCE_INVALID_STATUS nhu ban .NET.
 */
function bindSaveRequest(body: unknown): svc.AttendanceItemInput[] {
  if (body === undefined || body === null) {
    throw Object.assign(new Error('binding'), {
      problem: { '': ['A non-empty request body is required.'], request: ['The request field is required.'] },
    });
  }
  const jsonError = (path: string, clr: string, at: Array<string | number> = []) =>
    Object.assign(new Error('binding'), {
      problem: {
        request: ['The request field is required.'],
        [path]: [`The JSON value could not be converted to ${clr}. Path: ${path} | LineNumber: 0 | BytePositionInLine: ${jsonBytePosition(body, at)}.`],
      },
    });
  if (typeof body !== 'object' || Array.isArray(body)) throw jsonError('$', 'backend.DTOs.SaveAttendanceRequestDto', []);

  const rec = body as Record<string, unknown>;
  const itemsKey = Object.keys(rec).find((k) => k.toLowerCase() === 'items');
  const rawItems = itemsKey === undefined ? [] : rec[itemsKey];
  if (rawItems === null) throw Object.assign(new Error('binding'), { problem: { Items: ['The Items field is required.'] } });
  if (!Array.isArray(rawItems)) throw jsonError(`$.${itemsKey}`, 'System.Collections.Generic.List`1[backend.DTOs.AttendanceItemRequestDto]', [itemsKey!]);

  const items: svc.AttendanceItemInput[] = [];
  const required: Record<string, string[]> = {};
  rawItems.forEach((raw, i) => {
    const base = `$.${itemsKey}[${i}]`;
    if (raw === null) {
      items.push({ studentId: '00000000-0000-0000-0000-000000000000', status: '', note: null });
      return;
    }
    if (typeof raw !== 'object' || Array.isArray(raw)) throw jsonError(base, 'backend.DTOs.AttendanceItemRequestDto', [itemsKey!, i]);
    const r = raw as Record<string, unknown>;
    const key = (n: string) => Object.keys(r).find((k) => k.toLowerCase() === n.toLowerCase());
    const kId = key('studentId');
    const kStatus = key('status');
    const kNote = key('note');
    let studentId = '00000000-0000-0000-0000-000000000000';
    if (kId !== undefined) {
      const v = r[kId];
      if (typeof v !== 'string' || !isGuid(v)) throw jsonError(`${base}.${kId}`, 'System.Guid', [itemsKey!, i, kId]);
      studentId = v.toLowerCase();
    }
    let status: string | null = '';
    if (kStatus !== undefined) {
      const v = r[kStatus];
      if (v !== null && typeof v !== 'string') throw jsonError(`${base}.${kStatus}`, 'System.String', [itemsKey!, i, kStatus]);
      status = v as string | null;
    }
    let note: string | null = null;
    if (kNote !== undefined) {
      const v = r[kNote];
      if (v !== null && typeof v !== 'string') throw jsonError(`${base}.${kNote}`, 'System.String', [itemsKey!, i, kNote]);
      note = v as string | null;
    }
    // [Required] ngam dinh (AllowEmptyStrings) chi bat Status = null.
    if (status === null) required[`Items[${i}].Status`] = ['The Status field is required.'];
    items.push({ studentId, status: status ?? '', note });
  });
  if (Object.keys(required).length > 0) throw Object.assign(new Error('binding'), { problem: required });
  return items;
}

router.post(
  '/api/classes/:classId/sessions/:sessionId/attendance',
  guidRoute('classId', 'sessionId'),
  ...requirePermission('ATTENDANCE_EDIT'),
  async (req: Request, res: Response) => {
    const { classId, sessionId } = req.params as { classId: string; sessionId: string };
    if (!isGuid(classId) || !isGuid(sessionId)) return res.status(404).end();
    let items: svc.AttendanceItemInput[];
    try {
      items = bindSaveRequest(bodyOf(req));
    } catch (err) {
      if (sendBindingError(res, err)) return;
      const problem = (err as { problem?: Record<string, string[]> }).problem;
      if (problem) return res.status(400).json(validationProblem(problem));
      throw err;
    }
    const c = classId.toLowerCase();
    const s = sessionId.toLowerCase();
    if (!(await svc.sessionBelongsToClass(c, s))) return res.status(404).json(SESSION_NOT_FOUND());
    if (!(await canAccessClass(req, c))) return res.status(403).end();

    const result = await svc.saveClassSessionAttendance(c, s, items);
    if (!result.ok) return res.status(400).json(fail(result.message, result.code));
    res.json(ok({ classId: c, sessionId: s, count: result.count }, 'Da luu diem danh.'));
  },
);

router.get(
  '/api/parents/:parentUserId/children/attendance',
  guidRoute('parentUserId'),
  ...requirePermission('ATTENDANCE_VIEW_PARENT'),
  handle(async (req, res) => {
    const parentUserId = String(req.params.parentUserId);
    if (!isGuid(parentUserId)) return res.status(404).end();
    const currentUserId = tryParseGuid(req.user?.userId ?? '');
    if (!currentUserId || currentUserId !== parentUserId.toLowerCase()) return res.status(403).end();

    const parent = await svc.findParentProfile(currentUserId);
    if (!parent) return res.status(404).json(fail('Khong tim thay ho so phu huynh.', 'PARENT_NOT_FOUND'));
    res.json(ok(await svc.getParentChildrenAttendance(parent.MaPhuHuynh)));
  }),
);

router.get(
  '/api/students/me/attendance',
  ...requirePermission('ATTENDANCE_VIEW_STUDENT'),
  handle(async (req, res) => {
    const studentId = tryParseGuid(req.user?.profileId ?? '');
    if (!studentId) return res.status(404).json(fail('Khong tim thay ho so hoc sinh.', 'STUDENT_PROFILE_NOT_FOUND'));
    if (!(await svc.studentExists(studentId))) return res.status(404).json(fail('Khong tim thay hoc sinh.', 'STUDENT_NOT_FOUND'));
    res.json(ok(await svc.getStudentAttendance(studentId)));
  }),
);

// ---------------- AdminAttendanceController ----------------

router.get(
  '/api/admin/attendance',
  ...requirePermission('ATTENDANCE_ADMIN_VIEW'),
  handle(async (req, res) => {
    const errors: Record<string, string[]> = {};
    const classCode = queryString(req, 'classCode');
    const status = queryString(req, 'status');
    const fromDate = queryDateOnly(req, 'fromDate', errors);
    const toDate = queryDateOnly(req, 'toDate', errors);
    throwIfErrors(errors);
    try {
      const data = await svc.getAllAttendanceSummaries(classCode, status, fromDate, toDate);
      res.json(ok(data, 'Lấy danh sách điểm danh thành công.', 'SUCCESS', 'ATTENDANCE.GET_ALL_SUCCESS'));
    } catch (err) {
      console.error('[AdminAttendance] Lỗi khi lấy danh sách điểm danh.', err);
      res.status(500).json(fail('Đã xảy ra lỗi phía server. Vui lòng thử lại sau.', 'ATTENDANCE.GET_ALL_FAILED', 'ATTENDANCE.GET_ALL_FAILED'));
    }
  }),
);

export default router;
