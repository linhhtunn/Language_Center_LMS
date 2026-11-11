import { randomUUID } from 'node:crypto';
import { Router, type Request, type Response } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { isGuid, validationProblem } from '../../utils/dotnetCompat.js';
import {
  bindBody,
  bodyOf,
  BindingError,
  dateOnlyOf,
  guidRoute,
  queryDateTime,
  queryIntRequired,
  queryString,
  routeGuid,
  sendBindingError,
  throwIfErrors,
  tryParseGuid,
} from './dotnetBinding.js';
import * as svc from './schedule.service.js';
import * as changeRequests from './scheduleChangeRequest.service.js';
import { isMySqlLockConflict } from './scheduleGenerator.service.js';

// Chuyen tu Controllers/ScheduleController.cs - [Authorize] + [Route("api/[controller]")] => /api/Schedule/...
// Router gan o goc nen moi route ghi du duong dan. Route chu dat truoc route tham so.

const router = Router();
const BASE = '/api/Schedule';
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** DateTime.MinValue.Date -> DateOnly 0001-01-01 (gia tri mac dinh khi body thieu NgayHoc). */
function minDate(): Date {
  const d = new Date(0);
  d.setUTCFullYear(1, 0, 1);
  return d;
}

type Handler = (req: Request, res: Response) => Promise<unknown>;

/** Loi binding -> 400 ValidationProblem; loi khac de errorHandler chung xu ly (500). */
const handle = (fn: Handler) => async (req: Request, res: Response) => {
  try {
    await fn(req, res);
  } catch (err) {
    if (sendBindingError(res, err)) return;
    throw err;
  }
};

const send = (res: Response, r: svc.HttpResult) => (r.body === undefined ? res.status(r.status).end() : res.status(r.status).json(r.body));

const LOCK_CONFLICT = { error: 'Lịch vừa được cập nhật bởi yêu cầu khác. Hãy tải lại và thử lại.' };

const buoiHocSpec = {
  maLopHoc: { kind: 'guid' },
  maPhongHoc: { kind: 'guid', nullable: true },
  ngayHoc: { kind: 'datetime' },
  maTietBatDau: { kind: 'int' },
  maTietKetThuc: { kind: 'int' },
  tieuDe: { kind: 'string' },
  noiDung: { kind: 'string' },
} as const;

function readBuoiHoc(body: unknown, clr: string): svc.BuoiHocInput {
  const b = bindBody(body, buoiHocSpec, 'dto', clr);
  return {
    maLopHoc: (b.maLopHoc as string | undefined) ?? EMPTY_GUID,
    maPhongHoc: (b.maPhongHoc as string | null | undefined) ?? null,
    ngayHoc: b.ngayHoc ? dateOnlyOf(b.ngayHoc as Date) : minDate(),
    maTietBatDau: (b.maTietBatDau as number | undefined) ?? 0,
    maTietKetThuc: (b.maTietKetThuc as number | undefined) ?? 0,
    tieuDe: (b.tieuDe as string | null | undefined) ?? null,
    noiDung: (b.noiDung as string | null | undefined) ?? null,
  };
}

/**
 * studentId/teacherId/parentId tu query (cho dev) hoac claim "profileId".
 * Ban .NET con thu FindFirst("sub") nhung claim nay da bi doi thanh NameIdentifier nen luon null.
 */
function resolveProfileFromQuery(req: Request, queryName: string): string | null {
  const raw = queryString(req, queryName) ?? req.user?.profileId ?? null;
  return raw ? tryParseGuid(raw) : null;
}

function readWeekStart(req: Request): Date | null {
  const errors: Record<string, string[]> = {};
  const d = queryDateTime(req, 'weekStart', errors);
  throwIfErrors(errors);
  return d;
}

// ---------------- Tao buoi hoc ----------------

router.post(BASE, requireAuth, handle(async (req, res) => {
  const dto = readBuoiHoc(bodyOf(req), 'backend.DTOs.CreateBuoiHocDto');
  try {
    return send(res, await svc.createBuoiHoc(dto));
  } catch (err) {
    if (isMySqlLockConflict(err)) return res.status(409).json(LOCK_CONFLICT);
    throw err;
  }
}));

router.get(`${BASE}/sample-payload`, requireAuth, handle(async (_req, res) => {
  res.json(await svc.getSamplePayload());
}));

// ---------------- Bang lich ----------------

router.get(`${BASE}/admin-board`, requireAuth, handle(async (req, res) => {
  const weekStart = readWeekStart(req);
  res.json(await svc.getAdminBoard(weekStart));
}));

router.get(`${BASE}/teacher-board`, requireAuth, handle(async (req, res) => {
  const weekStart = readWeekStart(req);
  try {
    const teacherId = resolveProfileFromQuery(req, 'teacherId');
    if (!teacherId) return res.status(401).json({ message: 'Không thể xác định giáo viên hiện tại.' });
    res.json(await svc.getTeacherBoard(weekStart, teacherId));
  } catch (err) {
    console.error('GetTeacherBoard failed', err);
    const e = err as Error;
    res.status(500).json({ success: false, message: 'Internal server error', error: e?.message ?? String(err), trace: e?.stack ?? String(err) });
  }
}));

// Ban .NET khong kiem tra quyen duyet/tu choi (ai dang nhap cung goi duoc) -> Node yeu cau SCHEDULE_CHANGE_REQUEST_ADMIN.
router.put(`${BASE}/reschedule-requests/:id/approve`, guidRoute('id'), ...requirePermission('SCHEDULE_CHANGE_REQUEST_ADMIN'), handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  const result = await changeRequests.approveRequest(id.toLowerCase(), null);
  if (!result.success) {
    if (result.message.startsWith('Lịch vừa được cập nhật') || result.message.startsWith('Lịch đã thay đổi đồng thời')) {
      return res.status(409).json({ message: result.message });
    }
    return res.status(400).json({ message: result.message });
  }
  res.json({ message: result.message, id: result.maYeuCau });
}));

router.put(`${BASE}/reschedule-requests/:id/reject`, guidRoute('id'), ...requirePermission('SCHEDULE_CHANGE_REQUEST_ADMIN'), handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  const result = await changeRequests.rejectRequest(id.toLowerCase(), null);
  if (!result.success) return res.status(400).json({ message: result.message });
  res.json({ message: result.message, id: result.maYeuCau });
}));

// ---------------- Phong hoc ----------------

router.get(`${BASE}/rooms`, requireAuth, handle(async (_req, res) => {
  res.json(await svc.getRooms());
}));

router.post(`${BASE}/rooms/create`, requireAuth, handle(async (req, res) => {
  const b = bindBody(bodyOf(req), { tenPhong: { kind: 'string' }, sucChua: { kind: 'int', nullable: true } }, 'dto', 'backend.DTOs.CreateRoomDto');
  const tenPhong = b.tenPhong as string | null | undefined;
  // <Nullable>enable</Nullable>: "string TenPhong" khong nullable => [Required] ngam dinh (chi bat null/thieu).
  if (tenPhong === undefined || tenPhong === null) {
    return res.status(400).json(validationProblem({ TenPhong: ['The TenPhong field is required.'] }));
  }
  if (tenPhong.trim() === '') return res.status(400).json(fail('Tên phòng học không được để trống.', 'ROOM_NAME_REQUIRED'));
  const sucChua = (b.sucChua as number | null | undefined) ?? null;
  if (sucChua === null || sucChua <= 0) {
    return res.status(400).json(fail('Sức chứa phòng phải lớn hơn 0.', 'ROOM_CAPACITY_REQUIRED'));
  }
  const roomName = tenPhong.trim();
  if (roomName.length > 50) return res.status(400).json(fail('Tên phòng học không được vượt quá 50 ký tự.', 'ROOM_NAME_TOO_LONG'));

  const exists = await prisma.phonghoc.count({ where: { OR: [{ DaXoa: null }, { DaXoa: false }], TenPhong: roomName } });
  if (exists > 0) return res.status(400).json(fail('Tên phòng học đã tồn tại.', 'ROOM_NAME_EXISTS'));

  const room = await prisma.phonghoc.create({
    data: { MaPhongHoc: randomUUID(), TenPhong: roomName, SucChua: sucChua, TrangThai: true, DaXoa: false, ThoiGianTao: new Date() },
  });
  res.json(ok({ roomId: room.MaPhongHoc }, `Đã tạo phòng học ${room.TenPhong} thành công.`));
}));

router.get(`${BASE}/rooms/:id`, guidRoute('id'), requireAuth, handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  const room = await svc.findActiveRoom(id.toLowerCase());
  if (!room) return res.status(404).json(fail('Không tìm thấy phòng học.'));
  res.json({ id: svc.lg(room.MaPhongHoc), tenPhong: room.TenPhong, sucChua: room.SucChua ?? null, active: room.TrangThai ?? null });
}));

router.put(`${BASE}/rooms/:id`, guidRoute('id'), requireAuth, handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  const b = bindBody(bodyOf(req), { tenPhong: { kind: 'string' }, sucChua: { kind: 'int', nullable: true }, trangThai: { kind: 'bool', nullable: true } }, 'dto', 'backend.DTOs.UpdateRoomDto');
  const room = await svc.findActiveRoom(id.toLowerCase());
  if (!room) return res.status(404).json(fail('Không tìm thấy phòng học.'));

  const sucChua = (b.sucChua as number | null | undefined) ?? null;
  if (sucChua !== null && sucChua <= 0) return res.status(400).json(fail('Sức chứa phòng phải lớn hơn 0.', 'ROOM_INVALID_CAPACITY'));

  const data: { TenPhong?: string; SucChua?: number; TrangThai?: boolean; ThoiGianSua: Date } = { ThoiGianSua: new Date() };
  const tenPhong = (b.tenPhong as string | null | undefined) ?? null;
  if (tenPhong !== null && tenPhong.trim() !== '') {
    const newName = tenPhong.trim();
    if (newName.length > 50) return res.status(400).json(fail('Tên phòng học không được vượt quá 50 ký tự.', 'ROOM_NAME_TOO_LONG'));
    const exists = await prisma.phonghoc.count({
      where: { MaPhongHoc: { not: room.MaPhongHoc }, OR: [{ DaXoa: null }, { DaXoa: false }], TenPhong: newName },
    });
    if (exists > 0) return res.status(400).json(fail('Tên phòng học đã tồn tại.', 'ROOM_NAME_EXISTS'));
    data.TenPhong = newName;
  }
  if (sucChua !== null) data.SucChua = sucChua;
  const trangThai = (b.trangThai as boolean | null | undefined) ?? null;
  if (trangThai !== null) data.TrangThai = trangThai;

  const updated = await prisma.phonghoc.update({ where: { MaPhongHoc: room.MaPhongHoc }, data });
  res.json(ok({ roomId: svc.lg(updated.MaPhongHoc) }, `Đã cập nhật phòng học ${updated.TenPhong} thành công.`));
}));

router.delete(`${BASE}/rooms/:id`, guidRoute('id'), requireAuth, handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  const room = await svc.findActiveRoom(id.toLowerCase());
  if (!room) return res.status(404).json(fail('Không tìm thấy phòng học.'));
  await prisma.phonghoc.update({ where: { MaPhongHoc: room.MaPhongHoc }, data: { DaXoa: true, ThoiGianSua: new Date() } });
  res.json(ok({ roomId: id.toLowerCase() }, 'Đã xóa phòng học.'));
}));

// ---------------- Phong / giao vien con trong ----------------

function readAvailabilityQuery(req: Request) {
  const errors: Record<string, string[]> = {};
  const ngayHoc = queryDateTime(req, 'ngayHoc', errors);
  const start = queryIntRequired(req, 'maTietBatDau', errors);
  const end = queryIntRequired(req, 'maTietKetThuc', errors);
  throwIfErrors(errors);
  // Thieu ngayHoc -> DateTime.MinValue (khong buoi hoc nao trung) -> null.
  return { date: ngayHoc ? dateOnlyOf(ngayHoc) : null, start, end };
}

router.get(`${BASE}/available-rooms`, requireAuth, handle(async (req, res) => {
  const q = readAvailabilityQuery(req);
  res.json(await svc.getAvailableRooms(q.date, q.start, q.end));
}));

router.get(`${BASE}/available-teachers`, requireAuth, handle(async (req, res) => {
  const q = readAvailabilityQuery(req);
  res.json(await svc.getAvailableTeachers(q.date, q.start, q.end));
}));

// ---------------- Hoc sinh / phu huynh ----------------

router.get(`${BASE}/student-classes`, requireAuth, handle(async (req, res) => {
  const studentId = resolveProfileFromQuery(req, 'studentId');
  if (!studentId) return res.status(401).json({ message: 'Không thể xác định học sinh hiện tại.' });
  res.json(await svc.getStudentClasses(studentId));
}));

router.get(`${BASE}/student-class-detail/:classId`, guidRoute('classId'), requireAuth, handle(async (req, res) => {
  const classId = String(req.params.classId);
  if (!isGuid(classId)) return res.status(404).end();
  const studentId = resolveProfileFromQuery(req, 'studentId');
  if (!studentId) return res.status(401).json({ message: 'Không thể xác định học sinh hiện tại.' });
  send(res, await svc.getStudentClassDetail(classId.toLowerCase(), studentId));
}));

router.get(`${BASE}/student-board`, requireAuth, handle(async (req, res) => {
  const weekStart = readWeekStart(req);
  const studentId = resolveProfileFromQuery(req, 'studentId');
  if (!studentId) return res.status(401).json({ message: 'Không thể xác định học sinh hiện tại.' });
  res.json(await svc.getStudentBoard(weekStart, studentId));
}));

router.get(`${BASE}/parent-board`, requireAuth, handle(async (req, res) => {
  const weekStart = readWeekStart(req);
  const parentId = resolveProfileFromQuery(req, 'parentId');
  if (!parentId) return res.status(401).json({ message: 'Không thể xác định phụ huynh hiện tại.' });
  res.json(await svc.getParentBoard(weekStart, parentId));
}));

// ---------------- Yeu cau doi lich ----------------

/** User.GetProfileId() ?? User.GetUserId() */
function teacherIdFromToken(req: Request): string | null {
  return tryParseGuid(req.user?.profileId ?? '') ?? tryParseGuid(req.user?.userId ?? '');
}

router.post(`${BASE}/change-request`, requireAuth, handle(async (req, res) => {
  const b = bindBody(bodyOf(req), {
    maBuoiHoc: { kind: 'guid' },
    loaiYeuCau: { kind: 'sbyte' },
    ngayHocDeXuat: { kind: 'dateonly', nullable: true },
    maTietBatDauDeXuat: { kind: 'int', nullable: true },
    maTietKetThucDeXuat: { kind: 'int', nullable: true },
    maPhongHocDeXuat: { kind: 'guid', nullable: true },
    lyDo: { kind: 'string' },
  }, 'dto', 'backend.DTOs.CreateScheduleChangeRequestDto');
  const maGiangVien = teacherIdFromToken(req);
  if (!maGiangVien) return res.status(401).json({ error: 'Không thể lấy thông tin giáo viên từ token' });

  const result = await changeRequests.createScheduleChangeRequest(maGiangVien, {
    maBuoiHoc: (b.maBuoiHoc as string | undefined) ?? EMPTY_GUID,
    loaiYeuCau: (b.loaiYeuCau as number | undefined) ?? 0,
    ngayHocDeXuat: (b.ngayHocDeXuat as Date | null | undefined) ?? null,
    maTietBatDauDeXuat: (b.maTietBatDauDeXuat as number | null | undefined) ?? null,
    maTietKetThucDeXuat: (b.maTietKetThucDeXuat as number | null | undefined) ?? null,
    maPhongHocDeXuat: (b.maPhongHocDeXuat as string | null | undefined) ?? null,
    lyDo: (b.lyDo as string | null | undefined) ?? null,
  });
  res.status(result.success ? 200 : 400).json(result);
}));

router.get(`${BASE}/change-requests/pending`, ...requirePermission('SCHEDULE_CHANGE_REQUEST_ADMIN'), handle(async (_req, res) => {
  res.json(await changeRequests.getPendingRequests());
}));

router.get(`${BASE}/change-requests/my-requests`, requireAuth, handle(async (req, res) => {
  const maGiangVien = teacherIdFromToken(req);
  if (!maGiangVien) return res.status(401).json({ error: 'Không thể lấy thông tin giáo viên từ token' });
  res.json(await changeRequests.getRequestsByTeacher(maGiangVien));
}));

router.get(`${BASE}/change-requests/:maYeuCau`, requireAuth, handle(async (req, res) => {
  const errors: Record<string, string[]> = {};
  const id = routeGuid(String(req.params.maYeuCau), 'maYeuCau', errors);
  throwIfErrors(errors);
  const request = await changeRequests.getRequestById(id);
  if (!request) return res.status(404).json({ error: 'Yêu cầu không tồn tại' });
  res.json(request);
}));

function readApprove(body: unknown) {
  const b = bindBody(body, { maYeuCau: { kind: 'guid' }, trangThaiDuyet: { kind: 'sbyte' }, ghiChuAdmin: { kind: 'string' } }, 'dto', 'backend.DTOs.ApproveScheduleChangeRequestDto');
  return {
    maYeuCau: (b.maYeuCau as string | undefined) ?? EMPTY_GUID,
    trangThaiDuyet: (b.trangThaiDuyet as number | undefined) ?? 0,
    ghiChuAdmin: (b.ghiChuAdmin as string | null | undefined) ?? null,
  };
}

router.post(`${BASE}/change-request/approve`, ...requirePermission('SCHEDULE_CHANGE_REQUEST_ADMIN'), handle(async (req, res) => {
  const dto = readApprove(bodyOf(req));
  if (dto.trangThaiDuyet !== 1 && dto.trangThaiDuyet !== 2) {
    return res.status(400).json({ error: 'Trạng thái không hợp lệ (1: Duyệt, 2: Từ chối)' });
  }
  const result =
    dto.trangThaiDuyet === 1
      ? await changeRequests.approveRequest(dto.maYeuCau, dto.ghiChuAdmin)
      : await changeRequests.rejectRequest(dto.maYeuCau, dto.ghiChuAdmin);
  res.status(result.success ? 200 : 400).json(result);
}));

router.post(`${BASE}/change-request/reject`, ...requirePermission('SCHEDULE_CHANGE_REQUEST_ADMIN'), handle(async (req, res) => {
  const dto = readApprove(bodyOf(req));
  const result = await changeRequests.rejectRequest(dto.maYeuCau, dto.ghiChuAdmin);
  res.status(result.success ? 200 : 400).json(result);
}));

// ---------------- Route tham so (dat cuoi) ----------------

router.put(`${BASE}/:id`, requireAuth, handle(async (req, res) => {
  const errors: Record<string, string[]> = {};
  const id = routeGuid(String(req.params.id), 'id', errors);
  let dto: svc.BuoiHocInput | null = null;
  try {
    dto = readBuoiHoc(bodyOf(req), 'backend.DTOs.UpdateBuoiHocDto');
  } catch (err) {
    if (!(err instanceof BindingError)) throw err;
    Object.assign(errors, err.errors);
  }
  throwIfErrors(errors);
  try {
    return send(res, await svc.updateBuoiHoc(id, dto!));
  } catch (err) {
    if (isMySqlLockConflict(err)) return res.status(409).json(LOCK_CONFLICT);
    throw err;
  }
}));

router.delete(`${BASE}/:id`, guidRoute('id'), requireAuth, handle(async (req, res) => {
  const id = String(req.params.id);
  if (!isGuid(id)) return res.status(404).end();
  send(res, await svc.deleteBuoiHoc(id.toLowerCase()));
}));

export default router;
