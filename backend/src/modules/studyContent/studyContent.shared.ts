import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { config } from '../../config.js';
import { prisma } from '../../db.js';
import { fail } from '../../utils/apiResponse.js';
import { getCI } from '../../utils/dotnetCompat.js';
import { DOTNET_CONTENT_TYPES } from './dotnetContentTypes.js';

// =====================================================================================
// Ham dung chung cho 3 controller noi dung hoc tap (Admin/Teacher/StudentStudyContentController.cs).
// Ban .NET lap lai cac ham private nay trong tung controller; o day gom lai mot cho,
// cho nao 3 ban khac nhau (ResolveDocumentType, thong bao 403...) thi co tham so rieng.
// =====================================================================================

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** Dieu kien EF `x.DaXoa != true && x.TrangThai != false` (NULL van tinh la dang hoat dong). */
export const ACTIVE = {
  AND: [{ OR: [{ DaXoa: null }, { DaXoa: false }] }, { OR: [{ TrangThai: null }, { TrangThai: true }] }],
};
/** Dieu kien EF `x.DaXoa != true`. */
export const NOT_DELETED = { OR: [{ DaXoa: null }, { DaXoa: false }] };

// ---------------------------------------------------------------- Guid

const HEX32 = /^[0-9a-f]{32}$/i;
const GUID_D = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function hexToD(hex: string): string {
  const h = hex.toLowerCase();
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Guid.TryParse cua .NET (dung cho rang buoc route {x:guid}, [FromQuery], [FromForm]):
 * chap nhan dang D / N / B {..} / P (..), bo khoang trang dau cuoi. Tra ve dang D chu thuong hoac null.
 */
export function parseGuidLoose(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  let s = value.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) {
    s = s.slice(1, -1);
    return GUID_D.test(s) ? s.toLowerCase() : null;
  }
  if (GUID_D.test(s)) return s.toLowerCase();
  if (HEX32.test(s)) return hexToD(s);
  return null;
}

/** Guid lay tu DB -> chuoi chu thuong nhu Guid.ToString() cua .NET. */
export const g = (v: string): string => v.toLowerCase();
export const gn = (v: string | null | undefined): string | null => (v == null ? null : v.toLowerCase());

/**
 * Middleware: rang buoc route {name:guid}. Sai dinh dang -> bo qua route nay (ASP.NET khong khop route
 * -> 404 rong), dat TRUOC kiem tra quyen vi ben .NET khong co endpoint thi khong kiem tra quyen.
 */
export function guidRoute(...names: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const n of names) {
      if (!parseGuidLoose(req.params[n])) return next('route');
    }
    return next();
  };
}

/** Lay tham so route da qua guidRoute (dang D chu thuong). */
export const routeGuid = (req: Request, name: string): string => parseGuidLoose(req.params[name]) ?? EMPTY_GUID;

// ---------------------------------------------------------------- Loi validate tu dong cua [ApiController]

/** Danh sach loi theo thu tu ModelState them vao; khi tra ra se dao nguoc giong cach .NET duyet ModelState. */
export type ModelErrors = Array<[string, string]>;

function newTraceId(): string {
  return `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-00`;
}

/** 400 ValidationProblemDetails (Content-Type application/problem+json) y nhu ASP.NET. */
export function sendValidationProblem(res: Response, errors: ModelErrors) {
  const out: Record<string, string[]> = {};
  for (const [key, msg] of [...errors].reverse()) (out[key] ??= []).push(msg);
  res.status(400).setHeader('Content-Type', 'application/problem+json; charset=utf-8');
  return res.send(
    JSON.stringify({
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
      title: 'One or more validation errors occurred.',
      status: 400,
      errors: out,
      traceId: newTraceId(),
    }),
  );
}

/** 415 khi body [FromBody] khong phai JSON. */
export function sendUnsupportedMediaType(res: Response) {
  res.status(415).setHeader('Content-Type', 'application/problem+json; charset=utf-8');
  return res.send(
    JSON.stringify({
      type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16',
      title: 'Unsupported Media Type',
      status: 415,
      traceId: newTraceId(),
    }),
  );
}

/**
 * [FromQuery] Guid / Guid? : thieu -> Guid.Empty (hoac null neu nullable); rong -> loi (khong nullable)
 * hoac null; sai dinh dang -> loi "The value 'x' is not valid.".
 */
export function bindQueryGuid(req: Request, name: string, nullable: true, errors: ModelErrors): string | null;
export function bindQueryGuid(req: Request, name: string, nullable: false, errors: ModelErrors): string;
export function bindQueryGuid(req: Request, name: string, nullable: boolean, errors: ModelErrors): string | null {
  const raw = getCI<unknown>(req.query, name);
  const value = Array.isArray(raw) ? (raw.length ? String(raw[0]) : undefined) : raw == null ? undefined : String(raw);
  if (value === undefined) return nullable ? null : EMPTY_GUID;
  if (value.trim() === '') {
    if (nullable) return null;
    errors.push([name, `The value '${value}' is invalid.`]);
    return EMPTY_GUID;
  }
  const parsed = parseGuidLoose(value);
  if (!parsed) {
    errors.push([name, `The value '${value}' is not valid.`]);
    return nullable ? null : EMPTY_GUID;
  }
  return parsed;
}

// ---------------------------------------------------------------- [FromBody] JSON (System.Text.Json)

type JsonPropType = 'guid' | 'string' | 'string?' | 'int?';
const JSON_TYPE_NAMES: Record<JsonPropType, string> = {
  guid: 'System.Guid',
  string: 'System.String',
  'string?': 'System.String',
  'int?': 'System.Nullable`1[System.Int32]',
};

const isJsonContentType = (req: Request) => !!req.is(['application/json', 'text/json', 'application/*+json']);

/**
 * Bind body JSON vao DTO giong [FromBody] + System.Text.Json (khong phan biet hoa thuong, cho doc so tu chuoi).
 * Tra ve null neu da gui phan hoi loi (415 / 400 ValidationProblem).
 * Thuoc tinh kieu `string` khong nullable ma gui null -> loi Required (Nullable enable ben .NET).
 */
export function bindJsonBody<T extends Record<string, unknown>>(
  req: Request,
  res: Response,
  paramName: string,
  dtoTypeName: string,
  schema: Record<string, JsonPropType>,
  defaults: T,
): T | null {
  if (!isJsonContentType(req)) {
    sendUnsupportedMediaType(res);
    return null;
  }
  const body = req.body as unknown;
  // body-parser doc body rong thanh {} -> nhan biet body rong qua header (Content-Length: 0 / khong co body).
  const contentLength = req.headers['content-length'];
  const emptyBody = contentLength === '0' || (contentLength === undefined && req.headers['transfer-encoding'] === undefined);
  if (emptyBody || body === undefined || body === null) {
    sendValidationProblem(res, [
      [paramName, `The ${paramName} field is required.`],
      ['', 'A non-empty request body is required.'],
    ]);
    return null;
  }
  const errors: ModelErrors = [];
  if (typeof body !== 'object' || Array.isArray(body)) {
    // Thu tu thuc te ben .NET: "$" truoc "dto" (danh sach bi dao nguoc khi tra ra).
    errors.push([paramName, `The ${paramName} field is required.`]);
    errors.push(['$', `The JSON value could not be converted to backend.DTOs.${dtoTypeName}. Path: $ | LineNumber: 0 | BytePositionInLine: 1.`]);
    sendValidationProblem(res, errors);
    return null;
  }

  const result: Record<string, unknown> = { ...defaults };
  const props = Object.keys(schema);
  for (const [jsonKey, value] of Object.entries(body as Record<string, unknown>)) {
    const prop = props.find((p) => p.toLowerCase() === jsonKey.toLowerCase());
    if (!prop) continue;
    const type = schema[prop];
    const converted = convertJsonValue(type, value);
    if (!converted.ok) {
      const pos = approxBytePosition(body, jsonKey);
      errors.push([
        `$.${jsonKey}`,
        `The JSON value could not be converted to ${JSON_TYPE_NAMES[type]}. Path: $.${jsonKey} | LineNumber: 0 | BytePositionInLine: ${pos}.`,
      ]);
      errors.push([paramName, `The ${paramName} field is required.`]);
      sendValidationProblem(res, errors);
      return null;
    }
    result[prop] = converted.value;
  }

  // Validate sau khi deserialize: string khong nullable = [Required] ngam dinh.
  for (const prop of props) {
    if (schema[prop] === 'string' && result[prop] === null) errors.push([prop, `The ${prop} field is required.`]);
  }
  if (errors.length) {
    sendValidationProblem(res, errors);
    return null;
  }
  return result as T;
}

function convertJsonValue(type: JsonPropType, value: unknown): { ok: true; value: unknown } | { ok: false } {
  switch (type) {
    case 'guid':
      return typeof value === 'string' && GUID_D.test(value) ? { ok: true, value: value.toLowerCase() } : { ok: false };
    case 'string':
    case 'string?':
      return value === null || typeof value === 'string' ? { ok: true, value } : { ok: false };
    case 'int?': {
      if (value === null) return { ok: true, value: null };
      let n: number | null = null;
      if (typeof value === 'number' && Number.isInteger(value)) n = value;
      else if (typeof value === 'string' && /^-?\d+$/.test(value)) n = Number(value);
      if (n === null || n > 2147483647 || n < -2147483648) return { ok: false };
      return { ok: true, value: n };
    }
  }
}

/** Uoc luong BytePositionInLine cua System.Text.Json (body da parse lai thanh JSON gon). */
function approxBytePosition(body: unknown, key: string): number {
  const text = JSON.stringify(body);
  const keyToken = `${JSON.stringify(key)}:`;
  const idx = text.indexOf(keyToken);
  if (idx < 0) return 0;
  const valueText = JSON.stringify((body as Record<string, unknown>)[key]) ?? '';
  return Buffer.byteLength(text.slice(0, idx + keyToken.length) + valueText, 'utf8');
}

// ---------------------------------------------------------------- [FromForm] (multipart / urlencoded)

const isFormContentType = (req: Request) => !!req.is(['multipart/form-data', 'application/x-www-form-urlencoded']);

/** Gia tri form (khong phan biet hoa thuong, lay gia tri dau tien neu lap). undefined neu khong co. */
export function formValue(req: Request, key: string): string | undefined {
  if (!isFormContentType(req) || !req.body || typeof req.body !== 'object') return undefined;
  const v = getCI<unknown>(req.body, key);
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v === undefined || v === null ? undefined : String(v);
}

/** Thuoc tinh `string?` bind tu form: rong/khoang trang -> null (ConvertEmptyStringToNull). */
export function formString(req: Request, key: string): string | null {
  const v = formValue(req, key);
  return v === undefined || v.trim() === '' ? null : v;
}

/** Thuoc tinh Guid (khong nullable) bind tu form. Thieu -> Guid.Empty; sai -> loi ModelState. */
export function formGuid(req: Request, key: string, errors: ModelErrors): string {
  const v = formValue(req, key);
  if (v === undefined) return EMPTY_GUID;
  if (v.trim() === '') {
    errors.push([key, `The value '${v}' is invalid.`]);
    return EMPTY_GUID;
  }
  const parsed = parseGuidLoose(v);
  if (!parsed) {
    errors.push([key, `The value '${v}' is not valid for ${key}.`]);
    return EMPTY_GUID;
  }
  return parsed;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  size: number;
  buffer: Buffer;
}

/**
 * IFormFile? File bind tu multipart: file dau tien co ten field "file" (khong phan biet hoa thuong).
 * Giong FormFileModelBinder: bo qua phan tu rong khong co ten file.
 * Busboy mac dinh doc ten file theo latin1 -> doi lai UTF-8 de giu ten tieng Viet nhu IFormFile.FileName.
 */
export function formFile(req: Request, key: string): UploadedFile | null {
  const files = (req.files as UploadedFile[] | undefined) ?? [];
  const list = Array.isArray(files) ? files : [];
  for (const f of list) {
    if (f.fieldname.toLowerCase() !== key.toLowerCase()) continue;
    if (f.size === 0 && !f.originalname) continue;
    return { ...f, originalname: fixLatin1FileName(f.originalname) };
  }
  return null;
}

function fixLatin1FileName(name: string): string {
  if (!name || [...name].some((c) => c.charCodeAt(0) > 0xff)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

// ---------------------------------------------------------------- Phan hoi loi nghiep vu dung chung

export const notFoundFail = (res: Response, message: string, code: string) => res.status(404).json(fail(message, code));
export const badRequestFail = (res: Response, message: string, code: string) => res.status(400).json(fail(message, code));

export const COURSE_NOT_FOUND = ['Không tìm thấy khóa học.', 'STUDY_CONTENT_COURSE_NOT_FOUND'] as const;
export const CLASS_NOT_FOUND = ['Lớp học không thuộc khóa học đã chọn.', 'STUDY_CONTENT_CLASS_NOT_FOUND'] as const;
export const DOCUMENT_NOT_FOUND = ['Không tìm thấy tài liệu.', 'STUDY_CONTENT_DOCUMENT_NOT_FOUND'] as const;
export const DOCUMENT_CLASS_MISMATCH = ['Tài liệu không thuộc lớp đã chọn.', 'STUDY_CONTENT_DOCUMENT_CLASS_MISMATCH'] as const;

/** Ket qua kiem tra kieu (gia tri, loi) cua cac ham private ben .NET. */
export type Check<T> = { ok: true; value: T } | { ok: false; send: (res: Response) => unknown };
export const okCheck = <T>(value: T): Check<T> => ({ ok: true, value });
export const errCheck = <T>(status: number, message: string, code: string): Check<T> => ({
  ok: false,
  send: (res) => res.status(status).json(fail(message, code)),
});

// ---------------------------------------------------------------- Duong dan / URL / ten file

/** IsStoredStudyMaterialPath */
export function isStoredStudyMaterialPath(p: string): boolean {
  const l = p.toLowerCase();
  return l.startsWith('/uploads/study-materials/') || l.startsWith('uploads/study-materials/');
}

function tryParseAbsoluteUri(s: string | null | undefined): URL | null {
  if (s == null) return null;
  try {
    return new URL(s.trim());
  } catch {
    return null;
  }
}

/** IsExternalUrl: Uri tuyet doi voi scheme http/https. */
export function isExternalUrl(p: string | null | undefined): boolean {
  const u = tryParseAbsoluteUri(p);
  return !!u && (u.protocol === 'http:' || u.protocol === 'https:');
}

/** Path.GetExtension (Linux): tu dau '.' cuoi cung sau '/' cuoi cung; '.' o cuoi -> "". */
export function getExtension(p: string): string {
  const dot = p.lastIndexOf('.');
  const slash = p.lastIndexOf('/');
  if (dot < 0 || dot < slash || dot === p.length - 1) return '';
  return p.slice(dot);
}

/** Path.GetFileName (Linux). */
function getFileName(p: string): string {
  return p.slice(p.lastIndexOf('/') + 1);
}

/** Uri.UnescapeDataString: giai ma %XX, chuoi % hong thi giu nguyen. */
function unescapeDataString(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s.replace(/(?:%[0-9a-fA-F]{2})+/g, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
}

/** Phan tu cuoi cua Uri.Segments ("/", "a/", "b.pdf"). */
function lastUriSegment(u: URL): string | null {
  const segs = u.pathname.match(/[^/]*\/|[^/]+$/g);
  return segs && segs.length ? segs[segs.length - 1] : null;
}

/**
 * ResolveDocumentDisplayName ban TeacherStudyContentController (ban Admin khong duoc goi).
 * Luu y: link "https://host" (khong co path) -> Segments = ["/"] -> tra ve "" (loi cua ban goc, giu nguyen).
 */
export function resolveDocumentDisplayName(
  requestedName: string | null | undefined,
  uploadedFileName: string | null | undefined,
  link: string | null | undefined,
  fallbackName: string | null = null,
): string {
  if (requestedName != null && requestedName.trim() !== '') return requestedName.trim();
  if (uploadedFileName != null && uploadedFileName.trim() !== '') return uploadedFileName.trim();
  if (link != null && link.trim() !== '') {
    const u = tryParseAbsoluteUri(link);
    if (u) {
      const last = lastUriSegment(u);
      if (last != null && last.trim() !== '') return unescapeDataString(last.replace(/^\/+|\/+$/g, ''));
    }
    const fileName = getFileName(link);
    if (fileName.trim() !== '') return fileName;
  }
  return fallbackName?.trim() ?? 'tai-lieu';
}

/** ResolveDocumentType. variant 'admin': lay ten neu co, khong thi link; 'scoped' (Teacher/Student): lay ten neu ten co duoi file. */
export function resolveDocumentType(fileName: string | null, link: string | null, variant: 'admin' | 'scoped'): string {
  let source: string | null;
  if (variant === 'admin') source = fileName != null && fileName.trim() !== '' ? fileName : link;
  else source = getExtension(fileName ?? '').trim() !== '' ? fileName : link;
  switch (getExtension(source ?? '').toLowerCase()) {
    case '.pdf':
      return 'PDF';
    case '.mp4':
    case '.mov':
    case '.avi':
    case '.mkv':
    case '.webm':
      return 'Video';
    case '.mp3':
    case '.wav':
    case '.m4a':
      return 'Audio';
    case '.doc':
    case '.docx':
      return 'Word';
    case '.xls':
    case '.xlsx':
      return 'Excel';
    case '.ppt':
    case '.pptx':
      return 'PowerPoint';
    case '.txt':
      return 'Text';
    case '.zip':
    case '.rar':
      return 'Archive';
    default:
      return 'File';
  }
}

export function normalizeOptional(value: string | null | undefined): string | null {
  return value == null || value.trim() === '' ? null : value.trim();
}

// ---------------------------------------------------------------- DTO

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export interface DocumentRow {
  MaTaiLieu: string;
  MaChuongHoc: string;
  TenTaiLieu: string | null;
  LinkTaiLieu: string | null;
  MoTa: string | null;
  ThoiGianTao: Date | null;
}

/** BuildDocumentDto -> StudyContentDocumentDto. NgayDang "yyyy-MM-ddTHH:mm:ss.fffZ", NgayDangHienThi "dd/MM/yyyy". */
export function buildDocumentDto(d: DocumentRow, variant: 'admin' | 'scoped') {
  const createdAt = d.ThoiGianTao ?? new Date();
  const link = d.LinkTaiLieu ?? '';
  const y = pad(createdAt.getUTCFullYear(), 4);
  const mo = pad(createdAt.getUTCMonth() + 1);
  const da = pad(createdAt.getUTCDate());
  return {
    maTaiLieu: g(d.MaTaiLieu),
    maChuongHoc: g(d.MaChuongHoc),
    tenTaiLieu: d.TenTaiLieu ?? '',
    linkTaiLieu: link,
    moTa: d.MoTa,
    loaiTaiLieu: resolveDocumentType(d.TenTaiLieu, link, variant),
    ngayDang: `${y}-${mo}-${da}T${pad(createdAt.getUTCHours())}:${pad(createdAt.getUTCMinutes())}:${pad(createdAt.getUTCSeconds())}.${pad(createdAt.getUTCMilliseconds(), 3)}Z`,
    ngayDangHienThi: `${da}/${mo}/${y}`,
    laLinkNgoai: isExternalUrl(link),
  };
}

export type StudyContentDocumentDto = ReturnType<typeof buildDocumentDto>;

export interface ChapterDto {
  maChuong: string;
  maKhoaHoc: string;
  maLopHoc: string | null;
  tenLop: string | null;
  tenChuong: string;
  moTa: string | null;
  thuTu: number | null;
  taiLieu: StudyContentDocumentDto[];
}

/** DateOnly.ToString("yyyy-MM-dd") */
export const dateOnlyString = (d: Date | null | undefined): string | null =>
  d ? `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` : null;

/** DateOnly.FromDateTime(DateTime.UtcNow) -> Date 00:00 UTC de so sanh voi cot DATE. */
export function todayDateOnly(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * So sanh chuoi trong bo nho (LINQ OrderBy tren List<string>) = so sanh theo van hoa hien tai.
 * Container .NET chay voi InvariantCulture + ICU -> dung collator goc (root) cua ICU.
 */
const invariantCollator = new Intl.Collator('und');
export const compareCulture = (a: string | null, b: string | null): number => {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  return invariantCollator.compare(a, b);
};

// ---------------------------------------------------------------- BuildOverviewAsync (dung chung)

interface ChapterRawRow {
  MaChuong: string;
  MaKhoaHoc: string;
  MaLopHoc: string | null;
  TenLop: string | null;
  TenChuong: string;
  MoTa: string | null;
  ThuTu: number | bigint | null;
}

/**
 * Doc chuong + tai lieu giong BuildOverviewAsync / GetContents ben .NET. Dung SQL tuong duong cau EF sinh ra
 * (LEFT JOIN lophoc, ORDER BY theo collation MySQL) de thu tu sap xep khop ban cu.
 *  - classId co gia tri -> chi chuong cua lop do
 *  - visibleClassIds khac rong -> chuong co MaLopHoc thuoc danh sach
 *  - con lai -> tat ca chuong cua khoa hoc (ban Admin)
 */
export async function loadChaptersWithDocuments(
  courseId: string,
  classId: string | null,
  visibleClassIds: string[] | null,
  variant: 'admin' | 'scoped',
): Promise<ChapterDto[]> {
  let classFilter = Prisma.empty;
  if (classId) classFilter = Prisma.sql`AND c.MaLopHoc = ${classId}`;
  else if (visibleClassIds && visibleClassIds.length > 0)
    classFilter = Prisma.sql`AND c.MaLopHoc IS NOT NULL AND c.MaLopHoc IN (${Prisma.join(visibleClassIds)})`;

  const chapters = await prisma.$queryRaw<ChapterRawRow[]>`
    SELECT c.MaChuong, c.MaKhoaHoc, c.MaLopHoc, l.TenLop, c.TenChuong, c.MoTa, c.ThuTu
    FROM chuonghoc AS c
    LEFT JOIN lophoc AS l ON c.MaLopHoc = l.MaLopHoc
    WHERE c.MaKhoaHoc = ${courseId}
      AND (c.DaXoa <> TRUE OR c.DaXoa IS NULL)
      AND (c.TrangThai <> FALSE OR c.TrangThai IS NULL)
      ${classFilter}
    ORDER BY CASE WHEN l.MaLopHoc IS NOT NULL THEN l.TenLop ELSE '' END,
      COALESCE(c.ThuTu, 2147483647), c.TenChuong`;

  const chapterIds = chapters.map((c) => c.MaChuong);
  const documents =
    chapterIds.length === 0
      ? []
      : await prisma.$queryRaw<DocumentRow[]>`
          SELECT t.MaTaiLieu, t.MaChuongHoc, t.TenTaiLieu, t.LinkTaiLieu, t.MoTa, t.ThoiGianTao
          FROM tailieu AS t
          WHERE t.MaChuongHoc IN (${Prisma.join(chapterIds)})
            AND (t.DaXoa <> TRUE OR t.DaXoa IS NULL)
            AND (t.TrangThai <> FALSE OR t.TrangThai IS NULL)
          ORDER BY COALESCE(t.ThoiGianTao, '0001-01-01 00:00:00') DESC`;

  const lookup = new Map<string, StudyContentDocumentDto[]>();
  for (const d of documents) {
    const key = g(d.MaChuongHoc);
    const list = lookup.get(key) ?? [];
    list.push(buildDocumentDto(d, variant));
    lookup.set(key, list);
  }

  return chapters.map((c) => ({
    maChuong: g(c.MaChuong),
    maKhoaHoc: g(c.MaKhoaHoc),
    maLopHoc: gn(c.MaLopHoc),
    tenLop: c.TenLop,
    tenChuong: c.TenChuong,
    moTa: c.MoTa,
    thuTu: c.ThuTu == null ? null : Number(c.ThuTu),
    taiLieu: lookup.get(g(c.MaChuong)) ?? [],
  }));
}

// ---------------------------------------------------------------- Tai file (PhysicalFile)

/** Duong dan tren dia cua link "/uploads/study-materials/..." (wwwroot/uploads -> config.uploadsDir). Chan "../". */
export function studyMaterialDiskPath(link: string): string | null {
  const rel = link.replace(/^\/+/, '');
  const rest = rel.slice('uploads/'.length);
  const root = path.resolve(config.uploadsDir);
  const full = path.resolve(root, rest);
  return full === root || full.startsWith(root + path.sep) ? full : null;
}

/** FileExtensionContentTypeProvider.TryGetContentType(TenTaiLieu) (lay tu dau '.' cuoi cung). */
export function contentTypeForName(name: string | null | undefined): string {
  if (!name || name.trim() === '') return 'application/octet-stream';
  const i = name.lastIndexOf('.');
  if (i < 0) return 'application/octet-stream';
  return DOTNET_CONTENT_TYPES[name.slice(i).toLowerCase()] ?? 'application/octet-stream';
}

const TOKEN_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const ATTR_CHAR_RE = /[!#$&+\-.^_`|~0-9A-Za-z]/;

/** ContentDispositionHeaderValue.SetHttpFileName -> "attachment; filename=...; filename*=UTF-8''..." */
export function contentDisposition(fileName: string): string {
  if (!fileName) return 'attachment';
  // filename: ky tu ngoai ASCII -> '_' ; can thi dat trong ngoac kep.
  let ascii = [...fileName].map((c) => (c.charCodeAt(0) > 0x7f ? '_' : c)).join('');
  let needsQuotes = false;
  if (ascii.length > 1 && ascii.startsWith('"') && ascii.endsWith('"')) {
    ascii = ascii.slice(1, -1);
    needsQuotes = true;
  } else if (!TOKEN_RE.test(ascii)) {
    needsQuotes = true;
  }
  if (needsQuotes) ascii = `"${ascii.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  // filename*: RFC 5987
  let star = "UTF-8''";
  for (const ch of fileName) {
    if (ATTR_CHAR_RE.test(ch)) star += ch;
    else for (const b of Buffer.from(ch, 'utf8')) star += `%${b.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return `attachment; filename=${ascii}; filename*=${star}`;
}

/**
 * Phan tai tai lieu dung chung cho 3 controller (sau khi da kiem tra quyen):
 * link rong -> 404; link ngoai -> 302; khong phai file trong study-materials -> 400; file khong ton tai -> 404;
 * con lai tra file voi Content-Type theo TenTaiLieu va Content-Disposition attachment.
 */
export async function sendStoredDocument(req: Request, res: Response, tenTaiLieu: string, linkTaiLieu: string | null) {
  const link = linkTaiLieu?.trim();
  if (!link) {
    return notFoundFail(res, 'Tài liệu chưa có đường dẫn tải xuống.', 'STUDY_CONTENT_DOCUMENT_LINK_MISSING');
  }
  if (isExternalUrl(link)) {
    res.status(302).setHeader('Location', link);
    return res.end();
  }
  if (!isStoredStudyMaterialPath(link)) {
    return badRequestFail(res, 'Tài liệu không hỗ trợ tải xuống qua hệ thống.', 'STUDY_CONTENT_DOCUMENT_LINK_INVALID');
  }
  const diskPath = studyMaterialDiskPath(link);
  const stat = diskPath ? await fs.promises.stat(diskPath).catch(() => null) : null;
  if (!diskPath || !stat || !stat.isFile()) {
    return notFoundFail(res, 'Không tìm thấy file tài liệu trên máy chủ.', 'STUDY_CONTENT_DOCUMENT_FILE_NOT_FOUND');
  }

  // Last-Modified lam tron giay; ho tro If-Modified-Since / If-Unmodified-Since nhu FileResultExecutorBase.
  const lastModified = new Date(Math.floor(stat.mtimeMs / 1000) * 1000);
  const ims = Date.parse(String(req.headers['if-modified-since'] ?? ''));
  const ius = Date.parse(String(req.headers['if-unmodified-since'] ?? ''));
  res.setHeader('Last-Modified', lastModified.toUTCString());
  if (!Number.isNaN(ius) && lastModified.getTime() > ius) {
    res.status(412);
    return res.end();
  }
  if (!Number.isNaN(ims) && lastModified.getTime() <= ims) {
    res.status(304);
    return res.end();
  }

  res.status(200);
  res.setHeader('Content-Type', contentTypeForName(tenTaiLieu));
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', contentDisposition(tenTaiLieu));
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(diskPath);
    stream.on('error', reject);
    res.on('finish', resolve);
    res.on('close', resolve);
    stream.pipe(res);
  });
  return undefined;
}
