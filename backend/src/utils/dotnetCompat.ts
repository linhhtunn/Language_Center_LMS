import type { Request } from 'express';
import { Prisma } from '@prisma/client';

// =====================================================================================
// Cac ham giup backend Node tra du lieu GIONG HET ASP.NET (System.Text.Json) de frontend
// cu dung duoc nguyen ven. Moi module chuyen tu .NET nen dung cac ham o day.
// =====================================================================================

/**
 * Doi ten thuoc tinh theo dung thuat toan JsonNamingPolicy.CamelCase cua .NET:
 *   MaLop -> maLop, ID -> id, URLValue -> urlValue, MaHS -> maHS, HoTen -> hoTen.
 */
export function dotnetCamel(name: string): string {
  if (!name || !isUpper(name[0])) return name;
  const chars = [...name];
  for (let i = 0; i < chars.length; i++) {
    if (i === 1 && !isUpper(chars[i])) break;
    const hasNext = i + 1 < chars.length;
    if (i > 0 && hasNext && !isUpper(chars[i + 1])) {
      if (chars[i + 1] === ' ') chars[i] = chars[i].toLowerCase();
      break;
    }
    chars[i] = chars[i].toLowerCase();
  }
  return chars.join('');
}

function isUpper(c: string | undefined): boolean {
  return !!c && c !== c.toLowerCase() && c === c.toUpperCase();
}

/**
 * Doi moi key (de quy) sang camelCase kieu .NET. Dung khi controller .NET tra thang entity EF
 * (vd `return Ok(lophoc)`) - Prisma tra ve key PascalCase theo ten cot, phai doi lai.
 * Gia tri Date/Decimal giu nguyen (bo json replacer o app.ts se dinh dang).
 */
export function camelizeKeys<T = unknown>(value: unknown): T {
  if (Array.isArray(value)) return value.map((v) => camelizeKeys(v)) as T;
  if (value === null || typeof value !== 'object') return value as T;
  if (value instanceof Date || Prisma.Decimal.isDecimal(value) || Buffer.isBuffer(value)) return value as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value)) out[dotnetCamel(k)] = camelizeKeys(v);
  return out as T;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/**
 * DateTime cua .NET (Kind=Unspecified, doc tu MySQL) duoc ghi la "2026-11-11T13:41:30" - KHONG co "Z",
 * phan le giay chi xuat hien khi khac 0 (toi da 7 chu so, MySQL toi da 6).
 * Prisma doc DATETIME thanh Date co gio UTC = gio luu trong DB, nen lay bang getUTC*.
 */
export function formatDotnetDateTime(d: Date): string {
  const base = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const ms = d.getUTCMilliseconds();
  return ms ? `${base}.${pad(ms, 3).replace(/0+$/, '')}` : base;
}

/** Cot DATE map sang DateOnly ben .NET -> "yyyy-MM-dd". */
export function toDateOnly(d: Date | null | undefined): string | null {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Cot TIME map sang TimeOnly/TimeSpan ben .NET -> "HH:mm:ss". */
export function toTimeOnly(d: Date | null | undefined): string | null {
  if (!d) return null;
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "yyyy-MM-dd" (hoac ISO) -> Date luu vao cot DATE. Tra null neu sai dinh dang. */
export function parseDateOnly(s: unknown): Date | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "HH:mm" hoac "HH:mm:ss" -> Date dung cho cot TIME (ngay 1970-01-01 UTC). */
export function parseTimeOnly(s: unknown): Date | null {
  if (typeof s !== 'string') return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(s.trim());
  if (!m) return null;
  return new Date(Date.UTC(1970, 0, 1, +m[1], +m[2], +(m[3] ?? 0)));
}

/**
 * Doc DateTime client gui len giong .NET: chuoi KHONG co mui gio duoc giu nguyen gio do
 * (luu dung "wall clock" vao DB); chuoi co Z/+07:00 thi doi ve UTC.
 * Process chay TZ=UTC (xem config.ts) nen new Date("2026-01-01T08:00:00") = 08:00 UTC.
 */
export function parseDotnetDateTime(s: unknown): Date | null {
  if (s instanceof Date) return s;
  if (typeof s !== 'string' || !s.trim()) return null;
  const d = new Date(s.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Thoi diem hien tai, tuong duong DateTime.Now / DateTime.UtcNow (server chay UTC). */
export const now = () => new Date();

/** Replacer cho JSON.stringify cua Express: Date -> dinh dang .NET, Decimal/BigInt -> number. */
export function dotnetJsonReplacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  const raw = this[key];
  if (raw instanceof Date) return formatDotnetDateTime(raw);
  if (Prisma.Decimal.isDecimal(raw)) return (raw as Prisma.Decimal).toNumber();
  if (typeof raw === 'bigint') return Number(raw);
  return value;
}

// ---------- Doc input khong phan biet hoa thuong (model binding cua ASP.NET) ----------

/** Lay field trong object khong phan biet hoa thuong: getCI(body, 'maLop') khop MaLop/maLop/MALOP. */
export function getCI<T = unknown>(obj: unknown, key: string): T | undefined {
  if (!obj || typeof obj !== 'object') return undefined;
  const rec = obj as Record<string, unknown>;
  if (key in rec) return rec[key] as T;
  const lower = key.toLowerCase();
  for (const k of Object.keys(rec)) if (k.toLowerCase() === lower) return rec[k] as T;
  return undefined;
}

/** Query string khong phan biet hoa thuong ([FromQuery] ben .NET). Lay gia tri dau neu lap. */
export function queryCI(req: Request, key: string): string | undefined {
  const v = getCI<unknown>(req.query, key);
  if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
  return v === undefined || v === null ? undefined : String(v);
}

export function queryInt(req: Request, key: string): number | undefined {
  const v = queryCI(req, key);
  if (v === undefined || v.trim() === '') return undefined;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : undefined;
}

export function queryBool(req: Request, key: string): boolean | undefined {
  const v = queryCI(req, key)?.toLowerCase();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Kiem tra rang buoc {id:guid} cua route .NET (sai thi .NET tra 404). */
export const isGuid = (s: unknown): s is string => typeof s === 'string' && GUID_RE.test(s);

/**
 * Loi validate tu dong cua [ApiController] (400 ValidationProblemDetails):
 * { type, title, status: 400, errors: { Field: ["msg"] }, traceId }
 */
export function validationProblem(errors: Record<string, string[]>) {
  return {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    title: 'One or more validation errors occurred.',
    status: 400,
    errors,
  };
}
