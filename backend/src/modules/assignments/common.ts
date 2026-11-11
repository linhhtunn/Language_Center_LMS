import type { Request, Response } from 'express';
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../db.js';
import { fail } from '../../utils/apiResponse.js';
import {
  formatJsonDateTime,
  jsonColumnText,
  mysqlSortedKeys,
  parseJsonDateTime,
  type DotnetDateTime,
} from './dotnetTypes.js';

// Phan dung chung cua AdminAssignmentController: bo loc, danh muc, envelope MoTa, schema NoiDung.

export type Db = Prisma.TransactionClient | PrismaClient;

/** `x.DaXoa != true` (EF sinh `DaXoa <> 1 OR DaXoa IS NULL`) */
export const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };
/** `x.TrangThai != false` */
export const notDisabled = { OR: [{ TrangThai: null }, { TrangThai: true }] };
/** `x.DaXoa != true && x.TrangThai != false` */
export const active = { AND: [notDeleted, notDisabled] };

/** Ket qua loi cua action (IActionResult) - status + body. */
export interface ActionError {
  status: number;
  body: unknown;
}
export const err = (status: number, message: string, code: string): ActionError => ({ status, body: fail(message, code) });
export const sendError = (res: Response, e: ActionError) => res.status(e.status).json(e.body);

export const USER_INVALID = () => err(401, 'Khong xac dinh duoc nguoi dung hien tai.', 'ADMIN_ASSIGNMENT_USER_INVALID');

/** User.GetUserId() */
export function currentUserId(req: Request): string | null {
  const id = req.user?.userId;
  return typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id) ? id.toLowerCase() : null;
}

export const normalizeOptional = (v: string | null | undefined): string | null =>
  v === null || v === undefined || v.trim() === '' ? null : v.trim();

export const isNullOrWhiteSpace = (v: string | null | undefined) => v === null || v === undefined || v.trim() === '';

const eqIgnoreCase = (a: string | null | undefined, b: string) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();

export const isEssayTypeCode = (c: string | null | undefined) =>
  ['LCH_TRANSFORM', 'CQ_TU_LUAN', 'CQ_SENTENCE_TRANSFORM'].some((x) => eqIgnoreCase(c, x));
export const isMultipleChoiceQuestionTypeCode = (c: string | null | undefined) =>
  ['LCH_MCQ', 'CQ_TRAC_NGHIEM_1', 'CQ_TRAC_NGHIEM_NHIEU'].some((x) => eqIgnoreCase(c, x));
export const isMatchingQuestionTypeCode = (c: string | null | undefined) =>
  ['LCH_MATCHING', 'CQ_NOI_GHEP', 'CQ_MATCHING_HEADINGS', 'CQ_MATCHING_PARAGRAPH'].some((x) => eqIgnoreCase(c, x));
export const isChoiceBasedQuestionTypeCode = (c: string | null | undefined) =>
  isMultipleChoiceQuestionTypeCode(c) || isMatchingQuestionTypeCode(c);
export const isTextBasedQuestionTypeCode = (c: string | null | undefined) =>
  ['LCH_GAPFILL', 'CQ_DIEN_KHUYET_TU_NHAP', 'CQ_DIEN_TU_DANH_SACH', 'CQ_WORD_FORM', 'CQ_SHORT_ANSWER'].some((x) =>
    eqIgnoreCase(c, x),
  ) || isEssayTypeCode(c);

// ------------------------------- Danh muc -------------------------------------------

/** ResolveCategoryIdAsync: ma chi tiet danh muc theo ma nhom + ma code (con hieu luc). */
export async function resolveCategoryId(db: Db, groupCode: string | null | undefined, detailCode: string | null | undefined) {
  if (isNullOrWhiteSpace(groupCode) || isNullOrWhiteSpace(detailCode)) return null;
  const row = await db.chitietdanhmuc.findFirst({
    where: { AND: [active, { MaCode: detailCode!, nhomdanhmuc: { AND: [active, { MaCode: groupCode! }] } }] },
    select: { MaChiTiet: true },
  });
  return row?.MaChiTiet ?? null;
}

export interface CategoryRow {
  MaChiTiet: number;
  MaCode: string | null;
  TenChiTiet: string;
}

/** Thay cho cac navigation EF (LoaiCauHoiNavigation, MucDoNavigation...) khong co quan he trong Prisma. */
export async function loadCategories(db: Db, ids: (number | null | undefined)[]): Promise<Map<number, CategoryRow>> {
  const uniq = [...new Set(ids.filter((x): x is number => typeof x === 'number'))];
  if (uniq.length === 0) return new Map();
  const rows = await db.chitietdanhmuc.findMany({
    where: { MaChiTiet: { in: uniq } },
    select: { MaChiTiet: true, MaCode: true, TenChiTiet: true },
  });
  return new Map(rows.map((r) => [r.MaChiTiet, r]));
}

/** `x.XxxNavigation != null && x.XxxNavigation.MaCode == code` -> danh sach MaChiTiet co MaCode do. */
export async function categoryIdsByCode(db: Db, code: string): Promise<number[]> {
  const rows = await db.chitietdanhmuc.findMany({ where: { MaCode: code }, select: { MaChiTiet: true } });
  return rows.map((r) => r.MaChiTiet);
}

// ------------------------------- Kieu JsonElement ----------------------------------

/** JsonElement mac dinh (ValueKind = Undefined): System.Text.Json nem loi khi ghi ra. */
export const UNDEFINED_ELEMENT = Symbol('JsonElement.Undefined');
export type JsonElement = unknown;

/**
 * Ghi JsonElement ra response. default(JsonElement) lam .NET nem InvalidOperationException khi
 * serialize (-> 500), giu nguyen hanh vi do.
 */
export function element(v: unknown): unknown {
  if (v === UNDEFINED_ELEMENT) throw new Error('Operation is not valid due to the current state of the object. (default JsonElement)');
  return v;
}

/** HasValue(JsonElement?) */
export const hasJsonValue = (v: unknown) => v !== null && v !== undefined && v !== UNDEFINED_ELEMENT;

class JsonTypeError extends Error {}
const typeFail = (): never => {
  throw new JsonTypeError('json');
};
const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Duyet thuoc tinh nhu System.Text.Json (thu tu text MySQL, khong phan biet hoa thuong, key sau de key truoc). */
function forEachProp(o: Record<string, unknown>, names: string[], fn: (name: string, value: unknown) => void) {
  for (const key of mysqlSortedKeys(o)) {
    const name = names.find((n) => n.toLowerCase() === key.toLowerCase());
    if (name) fn(name, o[key]);
  }
}

const readStr = (v: unknown): string | null => (v === null ? null : typeof v === 'string' ? v : typeFail());
const readBool = (v: unknown): boolean => (typeof v === 'boolean' ? v : typeFail());
const readStrList = (v: unknown): (string | null)[] | null =>
  v === null ? null : Array.isArray(v) ? v.map(readStr) : typeFail();
const readInt = (v: unknown): number => {
  if (typeof v === 'number' && Number.isInteger(v) && Math.abs(v) <= 2147483647) return v;
  if (typeof v === 'string' && /^-?\d+$/.test(v) && Math.abs(Number(v)) <= 2147483647) return Number(v);
  return typeFail();
};
const readDateTime = (v: unknown): DotnetDateTime | null =>
  v === null ? null : typeof v === 'string' ? (parseJsonDateTime(v) ?? typeFail()) : typeFail();

// ------------------------------- BaiTapCauHoiNoiDung --------------------------------

export interface NoiDung {
  DeBai: JsonElement;
  DapAn: JsonElement;
  GiaiThich: string | null;
  TieuChi: (string | null)[] | null;
  LaTuLuan: boolean;
  Loai: string | null;
  Tags: (string | null)[] | null;
  NhomBaiGoc: { MaBaiTapGoc: string; TenBaiTapGoc: string | null } | null;
}

export const newNoiDung = (): NoiDung => ({
  DeBai: UNDEFINED_ELEMENT,
  DapAn: UNDEFINED_ELEMENT,
  GiaiThich: null,
  TieuChi: null,
  LaTuLuan: false,
  Loai: '',
  Tags: null,
  NhomBaiGoc: null,
});

/**
 * JsonSerializer.Deserialize<BaiTapCauHoiNoiDung>(json, Web). Nem loi khi sai kieu (nhu .NET).
 * `raw` la gia tri Prisma doc tu cot json. Tra null neu JSON la null.
 */
function deserializeNoiDungStrict(raw: unknown): NoiDung | null {
  if (raw === null) return null;
  if (!isObj(raw)) return typeFail();
  const nd = newNoiDung();
  forEachProp(raw, ['debai', 'dapan', 'giaithich', 'tieuchi', 'la_tu_luan', 'loai', 'tags', 'nhom_bai_goc'], (name, v) => {
    switch (name) {
      case 'debai': nd.DeBai = v; break;
      case 'dapan': nd.DapAn = v; break;
      case 'giaithich': nd.GiaiThich = readStr(v); break;
      case 'tieuchi': nd.TieuChi = readStrList(v); break;
      case 'la_tu_luan': nd.LaTuLuan = readBool(v); break;
      case 'loai': nd.Loai = readStr(v); break;
      case 'tags': nd.Tags = readStrList(v); break;
      case 'nhom_bai_goc': {
        if (v === null) { nd.NhomBaiGoc = null; break; }
        if (!isObj(v)) typeFail();
        const g = { MaBaiTapGoc: '00000000-0000-0000-0000-000000000000', TenBaiTapGoc: '' as string | null };
        forEachProp(v as Record<string, unknown>, ['ma_bai_tap_goc', 'ten_bai_tap_goc'], (n2, v2) => {
          if (n2 === 'ma_bai_tap_goc') {
            if (typeof v2 !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v2)) typeFail();
            g.MaBaiTapGoc = (v2 as string).toLowerCase();
          } else g.TenBaiTapGoc = readStr(v2);
        });
        nd.NhomBaiGoc = g;
        break;
      }
    }
  });
  return nd;
}

/** Deserialize trong try/catch: loi -> null (de noi goi tu chon gia tri mac dinh). */
export function tryDeserializeNoiDung(raw: unknown): { ok: true; value: NoiDung | null } | { ok: false } {
  try {
    return { ok: true, value: deserializeNoiDungStrict(raw) };
  } catch (e) {
    if (e instanceof JsonTypeError) return { ok: false };
    throw e;
  }
}

/** ParseQuestionBankContent: rong / loi -> new BaiTapCauHoiNoiDung(). */
export function parseQuestionBankContent(raw: unknown): NoiDung {
  if (raw === null || raw === undefined) return newNoiDung();
  const r = tryDeserializeNoiDung(raw);
  return r.ok ? (r.value ?? newNoiDung()) : newNoiDung();
}

/** JsonSerializer.Serialize(BaiTapCauHoiNoiDung, Web) -> gia tri ghi vao cot json. */
export function serializeNoiDung(nd: NoiDung) {
  return {
    debai: element(nd.DeBai),
    dapan: element(nd.DapAn),
    giaithich: nd.GiaiThich,
    tieuchi: nd.TieuChi,
    la_tu_luan: nd.LaTuLuan,
    loai: nd.Loai,
    tags: nd.Tags,
    nhom_bai_goc: nd.NhomBaiGoc
      ? { ma_bai_tap_goc: nd.NhomBaiGoc.MaBaiTapGoc, ten_bai_tap_goc: nd.NhomBaiGoc.TenBaiTapGoc }
      : null,
  };
}

// ------------------------------- Envelope MoTa (ADMIN_ASSIGNMENT_V1) -----------------

export const ASSIGNMENT_METADATA_SCHEMA = 'ADMIN_ASSIGNMENT_V1';

export interface Envelope {
  Schema: string | null;
  Code: string | null;
  Description: string | null;
  PublishMode: string | null;
  OpenAt: DotnetDateTime | null;
  DueAt: DotnetDateTime | null;
  MaxAttempts: number;
  AllowLateSubmission: boolean;
  ShowScoreWhenDone: boolean;
  ShowAnswerAfterDeadline: boolean;
  ShuffleQuestions: boolean;
  ShuffleAnswers: boolean;
  AutoGradeObjective: boolean;
  RequireManualReview: boolean;
  AccessCode: string | null;
  ScoreMode: string | null;
  DanhSachTu: (string | null)[] | null;
  Status: string | null;
  AmThanhLink: string | null;
  HinhAnhLink: string | null;
}

export const newEnvelope = (init: Partial<Envelope> = {}): Envelope => ({
  Schema: ASSIGNMENT_METADATA_SCHEMA,
  Code: null,
  Description: null,
  PublishMode: 'DRAFT',
  OpenAt: null,
  DueAt: null,
  MaxAttempts: 1,
  AllowLateSubmission: false,
  ShowScoreWhenDone: false,
  ShowAnswerAfterDeadline: false,
  ShuffleQuestions: true,
  ShuffleAnswers: true,
  AutoGradeObjective: true,
  RequireManualReview: true,
  AccessCode: null,
  ScoreMode: 'AUTO_EQUAL',
  DanhSachTu: null,
  Status: null,
  AmThanhLink: null,
  HinhAnhLink: null,
  ...init,
});

const ENVELOPE_PROPS: (keyof Envelope)[] = [
  'Schema', 'Code', 'Description', 'PublishMode', 'OpenAt', 'DueAt', 'MaxAttempts', 'AllowLateSubmission',
  'ShowScoreWhenDone', 'ShowAnswerAfterDeadline', 'ShuffleQuestions', 'ShuffleAnswers', 'AutoGradeObjective',
  'RequireManualReview', 'AccessCode', 'ScoreMode', 'DanhSachTu', 'Status', 'AmThanhLink', 'HinhAnhLink',
];

function deserializeEnvelopeStrict(raw: unknown): Envelope | null {
  if (raw === null) return null;
  if (!isObj(raw)) return typeFail();
  const env = newEnvelope();
  const rec = env as unknown as Record<string, unknown>;
  forEachProp(raw, ENVELOPE_PROPS as string[], (name, v) => {
    switch (name as keyof Envelope) {
      case 'OpenAt':
      case 'DueAt':
        rec[name] = readDateTime(v);
        break;
      case 'MaxAttempts':
        rec[name] = readInt(v);
        break;
      case 'AllowLateSubmission':
      case 'ShowScoreWhenDone':
      case 'ShowAnswerAfterDeadline':
      case 'ShuffleQuestions':
      case 'ShuffleAnswers':
      case 'AutoGradeObjective':
      case 'RequireManualReview':
        rec[name] = readBool(v);
        break;
      case 'DanhSachTu':
        rec[name] = readStrList(v);
        break;
      default:
        rec[name] = readStr(v);
    }
  });
  return env;
}

/**
 * ParseMetadata: cot baitap.MoTa (json). Khong dung envelope -> coi la mo ta thuan (Description = chuoi goc).
 * `raw` = gia tri Prisma doc tu cot json.
 */
export function parseMetadata(raw: unknown): Envelope {
  if (raw === null || raw === undefined) return newEnvelope();
  const text = jsonColumnText(raw);
  if (text === null || text.trim() === '') return newEnvelope();
  try {
    const env = deserializeEnvelopeStrict(raw);
    if (env && typeof env.Schema === 'string' && env.Schema.toLowerCase() === ASSIGNMENT_METADATA_SCHEMA.toLowerCase()) return env;
  } catch (e) {
    if (!(e instanceof JsonTypeError)) throw e;
  }
  return newEnvelope({ Description: text });
}

/** SerializeMetadata -> gia tri ghi vao cot json (ten thuoc tinh camelCase nhu JsonSerializerDefaults.Web). */
export function serializeMetadata(env: Envelope) {
  env.Schema = ASSIGNMENT_METADATA_SCHEMA;
  return {
    schema: env.Schema,
    code: env.Code,
    description: env.Description,
    publishMode: env.PublishMode,
    openAt: env.OpenAt ? formatJsonDateTime(env.OpenAt) : null,
    dueAt: env.DueAt ? formatJsonDateTime(env.DueAt) : null,
    maxAttempts: env.MaxAttempts,
    allowLateSubmission: env.AllowLateSubmission,
    showScoreWhenDone: env.ShowScoreWhenDone,
    showAnswerAfterDeadline: env.ShowAnswerAfterDeadline,
    shuffleQuestions: env.ShuffleQuestions,
    shuffleAnswers: env.ShuffleAnswers,
    autoGradeObjective: env.AutoGradeObjective,
    requireManualReview: env.RequireManualReview,
    accessCode: env.AccessCode,
    scoreMode: env.ScoreMode,
    danhSachTu: env.DanhSachTu,
    status: env.Status,
    amThanhLink: env.AmThanhLink,
    hinhAnhLink: env.HinhAnhLink,
  };
}

export const dt = (v: DotnetDateTime | null | undefined) => (v ? formatJsonDateTime(v) : null);

// ------------------------------- EmbedSharedContext ---------------------------------

/**
 * Chen bai doc / huong dan / word bank / bai goc vao ban chup cua cau hoi khi sinh de.
 * `noiDung` = gia tri cot json cua cau con nguon; tra ve gia tri ghi vao cau moi.
 */
export function embedSharedContext(
  noiDung: unknown,
  huongDan: string | null,
  doanVan: string | null,
  danhSachTu: (string | null)[] | null,
  maBaiTapGoc: string | null,
  tenBaiTapGoc: string | null,
): unknown {
  if (isNullOrWhiteSpace(huongDan) && isNullOrWhiteSpace(doanVan) && !(danhSachTu && danhSachTu.length > 0) && maBaiTapGoc === null) {
    return noiDung;
  }
  if (!isObj(noiDung)) return noiDung;
  const node = structuredClone(noiDung) as Record<string, unknown>;
  const deBai = node.debai;
  if (!isObj(deBai)) return noiDung;
  if (!isNullOrWhiteSpace(huongDan) && (deBai.huongDan === undefined || deBai.huongDan === null)) deBai.huongDan = huongDan;
  if (!isNullOrWhiteSpace(doanVan) && (deBai.doanVan === undefined || deBai.doanVan === null)) deBai.doanVan = doanVan;
  if (danhSachTu && danhSachTu.length > 0 && (deBai.danhSachTu === undefined || deBai.danhSachTu === null)) {
    deBai.danhSachTu = [...danhSachTu];
  }
  if (maBaiTapGoc !== null && (node.nhom_bai_goc === undefined || node.nhom_bai_goc === null)) {
    node.nhom_bai_goc = { ma_bai_tap_goc: maBaiTapGoc.toLowerCase(), ten_bai_tap_goc: tenBaiTapGoc ?? '' };
  }
  return node;
}

/** BuildFallbackAssignmentCode / GenerateAssignmentCode: tien to theo loai bai. */
export const assignmentPrefix = (typeCode: string) => (typeCode === 'EXAM' ? 'EX' : typeCode === 'QUIZ' ? 'KT' : 'BT');

export { prisma };
