import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import {
  active,
  assignmentPrefix,
  categoryIdsByCode,
  dt,
  element,
  err,
  isNullOrWhiteSpace,
  loadCategories,
  newEnvelope,
  newNoiDung,
  normalizeOptional,
  parseMetadata,
  prisma,
  resolveCategoryId,
  serializeMetadata,
  tryDeserializeNoiDung,
  type ActionError,
  type Db,
  type Envelope,
} from './common.js';
import { EMPTY_GUID } from './binder.js';
import { enrolledToday, eventsByClass, softDeleteEvent, syncEventReceivers } from './distribution.js';
import {
  addMinutes,
  compareDateTime,
  dec,
  nowDotnet,
  roundEven2,
  stableSortBy,
  toDbDate,
  toJsonValue,
  type Decimal,
  type DotnetDateTime,
} from './dotnetTypes.js';
import type { AssignmentUpsertRequest } from './dtos.js';

// Bai tap / de thi THAT (baitap.LaMauNganHang = 0): danh sach, chi tiet, tao, sua, xoa mem.

const lc = (s: string) => s.toLowerCase();

/**
 * Ban .NET loi khi SUA bai co them cau hoi / lop moi (EF sinh UPDATE thay vi INSERT -> 500, khong luu).
 * Ban Node da SUA loi nay (false). Dat true chi khi can tai hien hanh vi cu de doi chieu.
 */
export const EMULATE_EF_NAVIGATION_ADD_BUG = false;

function computeStatusKey(
  publishMode: string | null,
  classCount: number,
  questionCount: number,
  openAt: DotnetDateTime | null,
  dueAt: DotnetDateTime | null,
): string {
  if (publishMode !== null && publishMode.toLowerCase() === 'draft') return 'DRAFT';
  if (classCount === 0 || questionCount === 0) return 'NEEDS_SETUP';
  const now = nowDotnet();
  if (openAt && compareDateTime(now, openAt) < 0) return 'SCHEDULED';
  if (dueAt && compareDateTime(now, dueAt) > 0) return 'CLOSED';
  return 'ACTIVE';
}

const buildFallbackAssignmentCode = (typeCode: string, id: string) =>
  `${assignmentPrefix(typeCode)}-${id.replaceAll('-', '').slice(0, 6).toUpperCase()}`;

async function loadActiveStudentsByClass(db: Db, classIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (classIds.length === 0) return map;
  const rows = await db.hocsinhlophoc.findMany({
    where: { AND: [{ MaLopHoc: { in: classIds } }, enrolledToday()] },
    select: { MaLopHoc: true, MaHocSinh: true },
  });
  for (const r of rows) {
    const list = map.get(lc(r.MaLopHoc)) ?? [];
    if (!list.includes(lc(r.MaHocSinh))) list.push(lc(r.MaHocSinh));
    map.set(lc(r.MaLopHoc), list);
  }
  return map;
}

interface QuestionRow {
  MaCauHoiDe: string;
  MaCauHoi: string | null;
  DiemCuaCau: Decimal | null;
  ThuTu: number | null;
  SoCau: string | null;
  NoiDung: unknown;
}

/** BuildAssignmentDetailAsync -> AdminAssignmentDetailDto (hoac null). */
export async function buildAssignmentDetail(assignmentId: string) {
  const assignment = await prisma.baitap.findFirst({
    where: { AND: [{ MaBaiTap: assignmentId }, active] },
    include: { khoahoc: { select: { TenKhoaHoc: true } }, chitietdanhmuc: { select: { MaCode: true, TenChiTiet: true } } },
  });
  if (!assignment) return null;
  const metadata = parseMetadata(assignment.MoTa);
  const cats = await loadCategories(prisma, [assignment.TrinhDo, assignment.KyNang, assignment.MucDo]);

  // ORDER BY COALESCE(ThuTu, int.MaxValue), NoiDung - giu dung cau lenh EF sinh ra.
  const questionRows = await prisma.$queryRaw<QuestionRow[]>`
SELECT MaCauHoiDe, MaCauHoi, DiemCuaCau, ThuTu, SoCau, NoiDung
FROM baitapcauhoi
WHERE MaBaiTap = ${assignment.MaBaiTap}
ORDER BY COALESCE(ThuTu, 2147483647), NoiDung`;
  for (const r of questionRows) {
    if (typeof r.NoiDung === 'string') {
      try {
        r.NoiDung = JSON.parse(r.NoiDung);
      } catch {
        /* giu nguyen */
      }
    }
    if (r.DiemCuaCau !== null && !(typeof r.DiemCuaCau === 'object')) r.DiemCuaCau = dec(r.DiemCuaCau as unknown as string);
  }

  // Ban chup khong luu loai/muc do cau hoi, nen tra nguoc sang ngan hang de lay ma va nhan.
  const bankQuestionIds = [...new Set(questionRows.filter((x) => x.MaCauHoi).map((x) => lc(x.MaCauHoi!)))];
  const bankMeta = new Map<string, { LoaiCauHoiCode: string | null; LoaiCauHoiLabel: string | null; MucDoCode: string | null; MucDoLabel: string | null }>();
  if (bankQuestionIds.length) {
    const rows = await prisma.nganhangcauhoi.findMany({
      where: { MaCauHoi: { in: bankQuestionIds } },
      select: {
        MaCauHoi: true,
        chitietdanhmuc_nganhangcauhoi_LoaiCauHoiTochitietdanhmuc: { select: { MaCode: true, TenChiTiet: true } },
        chitietdanhmuc_nganhangcauhoi_MucDoTochitietdanhmuc: { select: { MaCode: true, TenChiTiet: true } },
      },
    });
    for (const r of rows) {
      const loai = r.chitietdanhmuc_nganhangcauhoi_LoaiCauHoiTochitietdanhmuc;
      const muc = r.chitietdanhmuc_nganhangcauhoi_MucDoTochitietdanhmuc;
      bankMeta.set(lc(r.MaCauHoi), {
        LoaiCauHoiCode: loai ? loai.MaCode : null,
        LoaiCauHoiLabel: loai ? loai.TenChiTiet : null,
        MucDoCode: muc ? muc.MaCode : null,
        MucDoLabel: muc ? muc.TenChiTiet : null,
      });
    }
  }

  const labelRows = await prisma.chitietdanhmuc.findMany({
    where: { nhomdanhmuc: { MaCode: 'LOAI_CAU_HOI' }, NOT: { MaCode: null } },
    select: { MaCode: true, TenChiTiet: true },
  });
  const loaiCauHoiLabels = new Map<string, string>();
  for (const r of labelRows) {
    if (loaiCauHoiLabels.has(r.MaCode!)) throw new Error(`An item with the same key has already been added. Key: ${r.MaCode}`);
    loaiCauHoiLabels.set(r.MaCode!, r.TenChiTiet);
  }

  const eventRows = await prisma.sukienlophoc.findMany({
    where: { AND: [{ MaBaiTap: assignment.MaBaiTap }, active] },
    select: { MaSuKien: true, MaLopHoc: true, HanNop: true, _count: { select: { nguoinhansukien: { where: active } } } },
  });
  const selectedClassIds = [...new Set(eventRows.map((x) => lc(x.MaLopHoc)))];
  let totalStudents = eventRows.reduce((s, x) => s + x._count.nguoinhansukien, 0);
  if (totalStudents === 0 && selectedClassIds.length > 0) {
    const fallback = await loadActiveStudentsByClass(prisma, selectedClassIds);
    totalStudents = [...fallback.values()].reduce((s, x) => s + x.length, 0);
  }

  const eventIds = eventRows.map((x) => x.MaSuKien);
  const submissions = eventIds.length
    ? await prisma.nopbai.findMany({
        where: { AND: [{ MaSuKien: { in: eventIds } }, active] },
        select: { MaSuKien: true, MaHocSinh: true, ThoiGianNop: true, DiemSo: true },
      })
    : [];
  const dueAtLookup = new Map(eventRows.map((x) => [lc(x.MaSuKien), x.HanNop]));
  const submitted = new Set(submissions.map((x) => lc(x.MaHocSinh))).size;
  const lateSubmitted = new Set(
    submissions
      .filter((x) => {
        const due = dueAtLookup.get(lc(x.MaSuKien));
        return x.ThoiGianNop && due && x.ThoiGianNop.getTime() > due.getTime();
      })
      .map((x) => lc(x.MaHocSinh)),
  ).size;

  const requiresManualReview =
    metadata.RequireManualReview ||
    questionRows.some((x) => {
      if (x.NoiDung === null || x.NoiDung === undefined) return false;
      const r = tryDeserializeNoiDung(x.NoiDung);
      return r.ok && r.value?.LaTuLuan === true;
    });
  const needsGrading = requiresManualReview ? new Set(submissions.filter((x) => x.DiemSo === null).map((x) => lc(x.MaHocSinh))).size : 0;

  const scored = submissions.filter((x) => x.DiemSo !== null).map((x) => dec(x.DiemSo!));
  const diemTrungBinh = scored.length ? roundEven2(scored.reduce((s, x) => s.plus(x), dec(0)).div(scored.length)) : null;

  const typeCode = assignment.chitietdanhmuc?.MaCode ?? '';
  const trinhDo = assignment.TrinhDo !== null ? cats.get(assignment.TrinhDo) : undefined;
  const kyNang = assignment.KyNang !== null ? cats.get(assignment.KyNang) : undefined;
  const mucDo = assignment.MucDo !== null ? cats.get(assignment.MucDo) : undefined;

  const selectedQuestions = questionRows.map((x) => {
    let noiDungObj = newNoiDung();
    if (x.NoiDung !== null && x.NoiDung !== undefined) {
      const r = tryDeserializeNoiDung(x.NoiDung);
      if (r.ok) noiDungObj = r.value ?? newNoiDung();
    }
    const meta = bankMeta.get(lc(x.MaCauHoi ?? EMPTY_GUID));
    // De sinh tu dong toan la cau chup (MaCauHoi = null): lay nhan tu danh muc theo ma "loai".
    const loaiCode = meta?.LoaiCauHoiCode ?? noiDungObj.Loai;
    let loaiLabel = meta?.LoaiCauHoiLabel ?? null;
    if (!loaiLabel && loaiCode) loaiLabel = loaiCauHoiLabels.get(loaiCode) ?? '';
    return {
      maCauHoiDe: lc(x.MaCauHoiDe),
      maCauHoi: lc(x.MaCauHoi ?? EMPTY_GUID),
      maKhoaHoc: lc(assignment.MaKhoaHoc),
      deBai: element(noiDungObj.DeBai),
      dapAn: element(noiDungObj.DapAn),
      giaiThich: noiDungObj.GiaiThich,
      loaiCauHoiCode: loaiCode,
      loaiCauHoiLabel: loaiLabel ?? '',
      mucDoCode: meta?.MucDoCode ?? '',
      mucDoLabel: meta?.MucDoLabel ?? '',
      laCauHoiTuLuan: noiDungObj.LaTuLuan,
      thuTu: x.ThuTu,
      diemCuaCau: x.DiemCuaCau ?? dec(0),
      soCau: x.SoCau,
    };
  });

  const submissionStats = { totalStudents, submitted, lateSubmitted, needsGrading };
  // System.Text.Json ghi thuoc tinh cua lop con (DetailDto) truoc, roi moi den lop cha (SummaryDto).
  const summary = {
    maBaiTap: lc(assignment.MaBaiTap),
    code: metadata.Code ?? buildFallbackAssignmentCode(typeCode, lc(assignment.MaBaiTap)),
    tenBaiTap: assignment.TenBaiTap,
    moTa: metadata.Description,
    maKhoaHoc: lc(assignment.MaKhoaHoc),
    tenKhoaHoc: assignment.khoahoc.TenKhoaHoc,
    loaiBaiTapCode: typeCode,
    loaiBaiTapLabel: assignment.chitietdanhmuc?.TenChiTiet ?? '',
    publishMode: metadata.PublishMode ?? 'DRAFT',
    statusKey: computeStatusKey(metadata.PublishMode, selectedClassIds.length, questionRows.length, metadata.OpenAt, metadata.DueAt),
    thoiGianLamBai: assignment.ThoiGianLamBai,
    diemToiDa: assignment.DiemToiDa ?? dec(0),
    maxAttempts: metadata.MaxAttempts,
    openAt: dt(metadata.OpenAt),
    dueAt: dt(metadata.DueAt),
    totalQuestions: questionRows.length,
    totalClasses: selectedClassIds.length,
    totalStudents,
    trinhDoLabel: trinhDo ? trinhDo.TenChiTiet : null,
    kyNangLabel: kyNang ? kyNang.TenChiTiet : null,
    mucDoLabel: mucDo ? mucDo.TenChiTiet : null,
    // Diem trung binh tinh tren cac bai da co diem, khong tinh bai cho cham.
    diemTrungBinh,
    selectedClassIds,
    updatedAt: assignment.ThoiGianSua ?? assignment.ThoiGianTao,
    submissionStats,
  };
  return {
    allowLateSubmission: metadata.AllowLateSubmission,
    showScoreWhenDone: metadata.ShowScoreWhenDone,
    showAnswerAfterDeadline: metadata.ShowAnswerAfterDeadline,
    shuffleQuestions: metadata.ShuffleQuestions,
    shuffleAnswers: metadata.ShuffleAnswers,
    autoGradeObjective: metadata.AutoGradeObjective,
    requireManualReview: metadata.RequireManualReview,
    accessCode: metadata.AccessCode,
    scoreMode: metadata.ScoreMode,
    selectedQuestions,
    ...summary,
  };
}

type Detail = NonNullable<Awaited<ReturnType<typeof buildAssignmentDetail>>>;

/** ToSummary -> AdminAssignmentSummaryDto */
const toSummary = (d: Detail) => ({
  maBaiTap: d.maBaiTap,
  code: d.code,
  tenBaiTap: d.tenBaiTap,
  moTa: d.moTa,
  maKhoaHoc: d.maKhoaHoc,
  tenKhoaHoc: d.tenKhoaHoc,
  loaiBaiTapCode: d.loaiBaiTapCode,
  loaiBaiTapLabel: d.loaiBaiTapLabel,
  publishMode: d.publishMode,
  statusKey: d.statusKey,
  thoiGianLamBai: d.thoiGianLamBai,
  diemToiDa: d.diemToiDa,
  maxAttempts: d.maxAttempts,
  openAt: d.openAt,
  dueAt: d.dueAt,
  totalQuestions: d.totalQuestions,
  totalClasses: d.totalClasses,
  totalStudents: d.totalStudents,
  trinhDoLabel: d.trinhDoLabel,
  kyNangLabel: d.kyNangLabel,
  mucDoLabel: d.mucDoLabel,
  diemTrungBinh: d.diemTrungBinh,
  selectedClassIds: d.selectedClassIds,
  updatedAt: d.updatedAt,
  submissionStats: d.submissionStats,
});

export async function getAssignments(filters: {
  courseId: string | null;
  assignmentType: string | null;
  status: string | null;
  search: string | null;
}) {
  const and: object[] = [{ LaMauNganHang: false }, active];
  if (filters.courseId) and.push({ MaKhoaHoc: filters.courseId });
  if (!isNullOrWhiteSpace(filters.assignmentType)) {
    and.push({ LoaiBaiTap: { in: await categoryIdsByCode(prisma, filters.assignmentType!) } });
  }
  if (!isNullOrWhiteSpace(filters.search)) {
    // Ban .NET: `TenBaiTap.Contains(kw) || MoTa.Contains(kw)` - Pomelo dich MoTa (cot json) thanh
    // CAST(... AS json) nen MySQL bao loi va tim kiem LUON tra 500. Ban Node tim dung y do:
    // ten bai hoac noi dung mo ta (doi JSON ra chuoi), khong phan biet hoa thuong / dau.
    const pattern = `%${filters.search!.trim().replace(/[\\%_]/g, (c) => '\\' + c)}%`;
    const hits = await prisma.$queryRaw<{ MaBaiTap: string }[]>`
      SELECT MaBaiTap FROM baitap
      WHERE TenBaiTap LIKE ${pattern}
         OR (MoTa IS NOT NULL AND CAST(MoTa AS CHAR) COLLATE utf8mb4_unicode_ci LIKE ${pattern})`;
    and.push({ MaBaiTap: { in: hits.map((h) => h.MaBaiTap) } });
  }
  const rows = await prisma.baitap.findMany({ where: { AND: and }, select: { MaBaiTap: true, ThoiGianSua: true, ThoiGianTao: true } });
  const key = (x: (typeof rows)[number]) => (x.ThoiGianSua ?? x.ThoiGianTao)?.getTime() ?? -8.64e15;
  const ordered = stableSortBy(rows, (a, b) => key(b) - key(a));

  const results = [];
  for (const row of ordered) {
    const detail = await buildAssignmentDetail(row.MaBaiTap);
    if (!detail) continue;
    if (!isNullOrWhiteSpace(filters.status) && detail.statusKey.toLowerCase() !== filters.status!.toLowerCase()) continue;
    results.push(toSummary(detail));
  }
  return ok(results, 'Lay danh sach bai tap admin thanh cong.');
}

export async function getAssignmentDetail(assignmentId: string): Promise<ActionError | { body: unknown }> {
  const detail = await buildAssignmentDetail(assignmentId);
  if (!detail) return err(404, 'Khong tim thay bai tap.', 'ADMIN_ASSIGNMENT_NOT_FOUND');
  return { body: ok(detail, 'Lay chi tiet bai tap thanh cong.') };
}

async function loadAssignmentForWrite(assignmentId: string) {
  return prisma.baitap.findFirst({
    where: { AND: [{ MaBaiTap: assignmentId }, active] },
    include: {
      baitapcauhoi: { orderBy: { MaCauHoiDe: 'asc' }, select: { MaCauHoiDe: true, MaCauHoi: true } },
      sukienlophoc: { orderBy: { MaSuKien: 'asc' }, include: { nguoinhansukien: true } },
    },
  });
}

export async function deleteAssignment(userId: string, assignmentId: string): Promise<ActionError | { body: unknown }> {
  const assignment = await loadAssignmentForWrite(assignmentId);
  if (!assignment) return err(404, 'Khong tim thay bai tap.', 'ADMIN_ASSIGNMENT_NOT_FOUND');
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.baitap.update({
      where: { MaBaiTap: assignment.MaBaiTap },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    });
    // Baitapcauhoi khong con TrangThai/DaXoa: an theo bai tap.
    for (const ev of assignment.sukienlophoc) await softDeleteEvent(tx, ev, userId, now);
  });
  return { body: ok({ assignmentId }, 'Xoa mem bai tap thanh cong.') };
}

async function validateRequest(request: AssignmentUpsertRequest): Promise<ActionError | null> {
  if (isNullOrWhiteSpace(request.TenBaiTap)) return err(400, 'Ten bai tap khong duoc de trong.', 'ADMIN_ASSIGNMENT_TITLE_REQUIRED');
  if (request.DiemToiDa.lte(0)) return err(400, 'Diem toi da phai lon hon 0.', 'ADMIN_ASSIGNMENT_SCORE_INVALID');
  if (request.LoaiBaiTapCode.toLowerCase() !== 'homework' && (request.ThoiGianLamBai === null || request.ThoiGianLamBai <= 0)) {
    return err(400, 'Thoi gian lam bai phai lon hon 0.', 'ADMIN_ASSIGNMENT_DURATION_INVALID');
  }
  if (request.OpenAt && request.DueAt && compareDateTime(request.DueAt, request.OpenAt) <= 0) {
    return err(400, 'Han nop phai sau gio mo bai.', 'ADMIN_ASSIGNMENT_DUE_DATE_INVALID');
  }
  const courseExists = await prisma.khoahoc.count({ where: { AND: [{ MaKhoaHoc: request.MaKhoaHoc }, active] } });
  if (!courseExists) return err(404, 'Khong tim thay khoa hoc.', 'ADMIN_ASSIGNMENT_COURSE_NOT_FOUND');

  const classIds = [...new Set(request.SelectedClassIds.filter((x) => x !== EMPTY_GUID))];
  if (classIds.length > 0) {
    const matched = await prisma.chitietkhoahoc_lophoc.count({
      where: { AND: [{ MaKhoaHoc: request.MaKhoaHoc, MaLopHoc: { in: classIds } }, active] },
    });
    if (matched !== classIds.length) return err(400, 'Co lop hoc khong thuoc khoa hoc da chon.', 'ADMIN_ASSIGNMENT_CLASS_INVALID');
  }

  const questionIds = [...new Set((request.SelectedQuestions ?? []).map((x) => x!.MaCauHoi).filter((x) => x !== EMPTY_GUID))];
  if (questionIds.length > 0) {
    const matched = await prisma.nganhangcauhoi.count({
      where: { AND: [{ MaKhoaHoc: request.MaKhoaHoc, MaCauHoi: { in: questionIds } }, active] },
    });
    if (matched !== questionIds.length) return err(400, 'Co cau hoi khong thuoc khoa hoc da chon.', 'ADMIN_ASSIGNMENT_QUESTION_INVALID');
  }
  return null;
}

function resolveDueAt(request: AssignmentUpsertRequest): DotnetDateTime | null {
  if (request.DueAt) return request.DueAt;
  if (request.LoaiBaiTapCode.toLowerCase() === 'homework') return null;
  if (request.OpenAt && request.ThoiGianLamBai !== null && request.ThoiGianLamBai > 0) return addMinutes(request.OpenAt, request.ThoiGianLamBai);
  return null;
}

const resolveEventTypeCode = (c: string) => (c === 'EXAM' ? 'TO_CHUC_THI' : c === 'QUIZ' ? 'TO_CHUC_KIEM_TRA' : 'GIAO_BAI');

async function generateAssignmentCode(typeCode: string) {
  const ids = await categoryIdsByCode(prisma, typeCode);
  const count = await prisma.baitap.count({ where: { AND: [active, { LoaiBaiTap: { in: ids } }] } });
  return `${assignmentPrefix(typeCode)}-${String(count + 1).padStart(3, '0')}`;
}

/** UpsertAssignmentAsync */
export async function upsertAssignment(
  userId: string,
  assignmentId: string | null,
  request: AssignmentUpsertRequest,
): Promise<ActionError | { detail: Detail }> {
  const validationError = await validateRequest(request);
  if (validationError) return validationError;

  const assignmentTypeId = await resolveCategoryId(prisma, 'LOAI_BAI_TAP', request.LoaiBaiTapCode);
  const publishModeId = await resolveCategoryId(prisma, 'TRANG_THAI_SU_KIEN', request.PublishMode);
  const eventTypeId = await resolveCategoryId(prisma, 'DANG_SU_KIEN', resolveEventTypeCode(request.LoaiBaiTapCode));
  if (assignmentTypeId === null || publishModeId === null || eventTypeId === null) {
    return err(400, 'Thieu danh muc cau hinh bai tap.', 'ADMIN_ASSIGNMENT_CATEGORY_MISSING');
  }

  const existing = assignmentId ? await loadAssignmentForWrite(assignmentId) : null;
  if (assignmentId && !existing) return err(404, 'Khong tim thay bai tap.', 'ADMIN_ASSIGNMENT_NOT_FOUND');

  const now = new Date();
  const id = existing ? existing.MaBaiTap : randomUUID();
  const resolvedCode = isNullOrWhiteSpace(request.Code) ? await generateAssignmentCode(request.LoaiBaiTapCode) : request.Code!.trim();

  const envelope: Envelope = newEnvelope({
    Code: resolvedCode,
    Description: normalizeOptional(request.MoTa),
    PublishMode: request.PublishMode,
    OpenAt: request.OpenAt,
    DueAt: resolveDueAt(request),
    MaxAttempts: request.MaxAttempts,
    AllowLateSubmission: request.AllowLateSubmission,
    ShowScoreWhenDone: request.ShowScoreWhenDone,
    ShowAnswerAfterDeadline: request.ShowAnswerAfterDeadline,
    ShuffleQuestions: request.ShuffleQuestions,
    ShuffleAnswers: request.ShuffleAnswers,
    AutoGradeObjective: request.AutoGradeObjective,
    RequireManualReview: request.RequireManualReview,
    AccessCode: normalizeOptional(request.AccessCode),
    ScoreMode: request.ScoreMode,
  });

  const fields: Record<string, unknown> = {
    MaKhoaHoc: request.MaKhoaHoc,
    TenBaiTap: request.TenBaiTap.trim(),
    LoaiBaiTap: assignmentTypeId,
    ThoiGianLamBai: request.LoaiBaiTapCode.toLowerCase() === 'homework' ? 0 : Math.max(0, request.ThoiGianLamBai ?? 0),
    DiemToiDa: request.DiemToiDa,
    NguoiSua: userId,
    ThoiGianSua: now,
    TrangThai: true,
    DaXoa: false,
    MoTa: toJsonValue(serializeMetadata(envelope)),
  };
  // Bo trong = giu nguyen trinh do / muc do / ky nang dang co.
  if (!isNullOrWhiteSpace(request.TrinhDoCode)) fields.TrinhDo = await resolveCategoryId(prisma, 'TRINH_DO', request.TrinhDoCode!.trim());
  if (!isNullOrWhiteSpace(request.MucDoCode)) fields.MucDo = await resolveCategoryId(prisma, 'MUC_DO', request.MucDoCode!.trim());
  if (!isNullOrWhiteSpace(request.KyNangCode)) fields.KyNang = await resolveCategoryId(prisma, 'KY_NANG', request.KyNangCode!.trim());

  // ---- Chuan bi dong bo cau hoi (chi khi request gui danh sach) ----
  const requestedMap = new Map<string, { ThuTu: number; Diem: Decimal }>();
  let sourceQuestions = new Map<string, unknown>();
  let newQuestionIds: string[] = [];
  if (request.SelectedQuestions !== null) {
    for (const item of request.SelectedQuestions) {
      if (item!.MaCauHoi === EMPTY_GUID || requestedMap.has(item!.MaCauHoi)) continue;
      requestedMap.set(item!.MaCauHoi, { ThuTu: item!.ThuTu ?? 0, Diem: item!.DiemCuaCau ?? dec(0) });
    }
    const existingQuestionIds = new Set((existing?.baitapcauhoi ?? []).filter((x) => x.MaCauHoi).map((x) => lc(x.MaCauHoi!)));
    newQuestionIds = [...requestedMap.keys()].filter((x) => !existingQuestionIds.has(x));
    if (newQuestionIds.length) {
      const rows = await prisma.nganhangcauhoi.findMany({
        where: { MaCauHoi: { in: newQuestionIds } },
        select: { MaCauHoi: true, NoiDungChiTiet: true },
      });
      sourceQuestions = new Map(rows.map((r) => [lc(r.MaCauHoi), r.NoiDungChiTiet]));
    }
  }

  // ---- Chuan bi dong bo su kien lop ----
  const dueAt = resolveDueAt(request);
  const requestedClassIds = [...new Set(request.SelectedClassIds.filter((x) => x !== EMPTY_GUID))];
  const activeStudentsByClass = await loadActiveStudentsByClass(prisma, requestedClassIds);
  const events = existing?.sukienlophoc ?? [];
  const existingEventsByClass = eventsByClass(events);

  // LOI CUA BAN .NET (giu nguyen): khi SUA bai, cau hoi moi (baitapcauhoi) va su kien lop moi
  // (sukienlophoc) duoc them qua navigation cua entity dang track, khoa Guid da gan san nen EF
  // coi la ban ghi cu -> sinh UPDATE -> DbUpdateConcurrencyException -> 500, khong luu gi ca.
  // Doi EMULATE_EF_NAVIGATION_ADD_BUG = false de sua loi nay.
  if (
    EMULATE_EF_NAVIGATION_ADD_BUG &&
    existing &&
    (newQuestionIds.length > 0 || requestedClassIds.some((c) => !existingEventsByClass.has(c)))
  ) {
    throw new Error(
      'DbUpdateConcurrencyException: The database operation was expected to affect 1 row(s), but actually affected 0 row(s).',
    );
  }

  await prisma.$transaction(
    async (tx) => {
      if (existing) await tx.baitap.update({ where: { MaBaiTap: id }, data: fields });
      else await tx.baitap.create({ data: { MaBaiTap: id, NguoiTao: userId, ThoiGianTao: now, ...fields } as never });

      // SyncQuestionSelectionsAsync: cau CHUP (MaCauHoi = null) khong thuoc ngan hang -> khong dung toi.
      if (request.SelectedQuestions !== null) {
        for (const row of existing?.baitapcauhoi ?? []) {
          if (!row.MaCauHoi) continue;
          const item = requestedMap.get(lc(row.MaCauHoi));
          if (!item) {
            await tx.baitapcauhoi.delete({ where: { MaCauHoiDe: row.MaCauHoiDe } });
            continue;
          }
          await tx.baitapcauhoi.update({
            where: { MaCauHoiDe: row.MaCauHoiDe },
            data: { ThuTu: item.ThuTu, DiemCuaCau: item.Diem, NguoiSua: userId, ThoiGianSua: now },
          });
        }
        if (newQuestionIds.length) {
          await tx.baitapcauhoi.createMany({
            data: newQuestionIds.map((qid) => {
              const item = requestedMap.get(qid)!;
              const json = sourceQuestions.get(qid);
              return {
                MaCauHoiDe: randomUUID(),
                MaBaiTap: id,
                MaCauHoi: qid,
                ThuTu: item.ThuTu,
                DiemCuaCau: item.Diem,
                // Snapshot JSON tu ngan hang.
                NoiDung: json === null || json === undefined ? {} : (json as object),
                NguoiTao: userId,
                ThoiGianTao: now,
              };
            }),
          });
        }
      }

      // SyncClassEventsAsync
      for (const ev of events) {
        if (!requestedClassIds.includes(lc(ev.MaLopHoc))) await softDeleteEvent(tx, ev, userId, now);
      }
      for (const classId of requestedClassIds) {
        const ev = existingEventsByClass.get(classId);
        const data = {
          MaNguoiDung: userId,
          DangSuKien: eventTypeId,
          HanNop: toDbDate(dueAt),
          MaTrangThai: publishModeId,
          NoiDung: `${isNullOrWhiteSpace(request.TenBaiTap) ? 'Bai tap' : request.TenBaiTap.trim()} [${request.LoaiBaiTapCode}]`,
          NguoiSua: userId,
          ThoiGianSua: now,
          TrangThai: true,
          DaXoa: false,
        };
        let maSuKien: string;
        if (ev) {
          maSuKien = ev.MaSuKien;
          await tx.sukienlophoc.update({ where: { MaSuKien: maSuKien }, data });
        } else {
          maSuKien = randomUUID();
          await tx.sukienlophoc.create({
            data: { MaSuKien: maSuKien, MaLopHoc: classId, MaBaiTap: id, NguoiTao: userId, ThoiGianTao: now, ...data },
          });
        }
        await syncEventReceivers(tx, maSuKien, ev?.nguoinhansukien ?? [], activeStudentsByClass.get(classId) ?? [], userId, now);
      }
    },
    { maxWait: 10000, timeout: 120000 },
  );

  const detail = await buildAssignmentDetail(id);
  return { detail: detail! };
}

