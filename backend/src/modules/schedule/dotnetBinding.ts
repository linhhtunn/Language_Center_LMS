import type { Request, Response } from 'express';
import { getCI, queryCI, validationProblem } from '../../utils/dotnetCompat.js';

// =====================================================================================
// Gia lap model binding cua ASP.NET Core ([ApiController]) cho module lich hoc / diem danh:
//  - Body JSON doc bang System.Text.Json (JsonSerializerDefaults.Web): khong phan biet hoa
//    thuong ten thuoc tinh, so doc duoc tu chuoi (AllowReadingFromString).
//  - Query / route doc bang TypeConverter (InvariantCulture), chuoi rong -> null.
//  - Sai kieu -> 400 ValidationProblemDetails.
// =====================================================================================

const GUID_D = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Guid.TryParse cua .NET: nhan cac dang D, N, B, P. Tra ve chuoi chu thuong dang D hoac null. */
export function tryParseGuid(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) s = s.slice(1, -1);
  if (/^[0-9a-f]{32}$/i.test(s)) {
    s = `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  }
  return GUID_D.test(s) ? s.toLowerCase() : null;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

function validDate(y: number, m: number, d: number): Date | null {
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

/**
 * Doc chuoi DateTime kieu ISO 8601 (System.Text.Json va query string invariant culture).
 * Khong co mui gio -> giu nguyen gio (server chay UTC). Co Z/offset -> doi ve UTC.
 * Query string con chap nhan dang M/d/yyyy cua InvariantCulture.
 */
export function parseDotnetDateTimeStrict(raw: unknown, allowInvariantSlash = false): Date | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/i.exec(s);
  if (iso) {
    const base = validDate(+iso[1], +iso[2], +iso[3]);
    if (!base) return null;
    const h = +(iso[4] ?? 0);
    const mi = +(iso[5] ?? 0);
    const se = +(iso[6] ?? 0);
    if (h > 23 || mi > 59 || se > 59) return null;
    const ms = iso[7] ? Math.floor(+`0.${iso[7]}` * 1000) : 0;
    let t = Date.UTC(+iso[1], +iso[2] - 1, +iso[3], h, mi, se, ms);
    const tz = iso[8];
    if (tz && tz.toUpperCase() !== 'Z') {
      const m = /^([+-])(\d{2}):?(\d{2})$/.exec(tz)!;
      const off = (+m[2] * 60 + +m[3]) * (m[1] === '-' ? -1 : 1);
      t -= off * 60_000;
    }
    return new Date(t);
  }
  if (allowInvariantSlash) {
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
    if (us) {
      const base = validDate(+us[3], +us[1], +us[2]);
      if (!base) return null;
      return new Date(Date.UTC(+us[3], +us[1] - 1, +us[2], +(us[4] ?? 0), +(us[5] ?? 0), +(us[6] ?? 0)));
    }
  }
  return null;
}

/** Lay phan ngay (DateOnly.FromDateTime(x.Date)) duoi dang Date 00:00 UTC. */
export function dateOnlyOf(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** DateOnlyJsonConverter cua ban .NET: "yyyy-MM-dd" hoac DateTime.TryParse (AssumeUniversal). */
export function parseDateOnlyConverter(raw: unknown): Date | null {
  if (typeof raw !== 'string') return null;
  const exact = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (exact) return validDate(+exact[1], +exact[2], +exact[3]);
  // DateTime.TryParse(InvariantCulture, AssumeUniversal | AdjustToUniversal) -> lay ngay UTC.
  const dt = parseInvariantDateTime(raw);
  return dt ? dateOnlyOf(dt.date) : null;
}

/** Hom nay theo gio server (DateTime.Today) - server chay UTC. */
export function today(): Date {
  return dateOnlyOf(new Date());
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** DayNumber cua DateOnly (so ngay ke tu 0001-01-01), dung de tinh hieu so ngay. */
export function dayNumber(d: Date): number {
  return Math.floor(d.getTime() / 86_400_000);
}

/** Dinh dang ngay theo chuoi format .NET don gian (dd, MM, yyyy) - dau "/" cua InvariantCulture. */
export function formatDate(d: Date, fmt: 'dd/MM' | 'dd/MM/yyyy'): string {
  const dd = pad(d.getUTCDate());
  const mm = pad(d.getUTCMonth() + 1);
  return fmt === 'dd/MM' ? `${dd}/${mm}` : `${dd}/${mm}/${d.getUTCFullYear()}`;
}

/** DateOnly.ToString() voi InvariantCulture (container .NET khong dat LANG) -> "MM/dd/yyyy". */
export function dateOnlyToString(d: Date): string {
  return `${pad(d.getUTCMonth() + 1)}/${pad(d.getUTCDate())}/${d.getUTCFullYear()}`;
}

/** So sanh chuoi giong Comparer<string>.Default (InvariantCulture, ICU). */
const invariantCollator = new Intl.Collator('en');
export const compareInvariant = (a: string, b: string) => invariantCollator.compare(a, b);

// ---------------------------------------------------------------------------------------
// Query / route binding
// ---------------------------------------------------------------------------------------

export class BindingError extends Error {
  constructor(public errors: Record<string, string[]>) {
    super('Model binding failed');
  }
}

/** Gui 400 ValidationProblem neu loi la BindingError; tra true neu da xu ly. */
export function sendBindingError(res: Response, err: unknown): boolean {
  if (err instanceof UnsupportedMediaType) {
    res.status(415).json({ type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16', title: 'Unsupported Media Type', status: 415 });
    return true;
  }
  if (err instanceof BindingError) {
    res.status(400).json(validationProblem(err.errors));
    return true;
  }
  return false;
}

function addError(errors: Record<string, string[]>, key: string, msg: string) {
  (errors[key] ??= []).push(msg);
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Gia lap DateTime.Parse(s, InvariantCulture) (model binding query string): nhan yyyy-M-d, yyyy/M/d, M/d/yyyy,
 * M-d-yyyy, "Jan 2 2026", "2 Jan 2026", kem gio tuy chon (T hoac khoang trang, AM/PM) va mui gio (Z / +07:00 ->
 * doi ve gio server = UTC). Tra them co hieu de DateOnly tu choi cac dang .NET khong nhan.
 */
export function parseInvariantDateTime(raw: string): { date: Date; spaceTime: boolean; zone: boolean } | null {
  const t = raw.trim();
  let y: number, m: number, dd: number, rest: string;
  let mm: RegExpExecArray | null;
  if ((mm = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t))) {
    [y, m, dd] = [+mm[1], +mm[2], +mm[3]];
  } else if ((mm = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(t))) {
    [y, m, dd] = [+mm[3], +mm[1], +mm[2]];
  } else if ((mm = /^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t))) {
    m = MONTHS.indexOf(mm[1].slice(0, 3).toLowerCase()) + 1;
    [y, dd] = [+mm[3], +mm[2]];
  } else if ((mm = /^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/.exec(t))) {
    m = MONTHS.indexOf(mm[2].slice(0, 3).toLowerCase()) + 1;
    [y, dd] = [+mm[3], +mm[1]];
  } else {
    return null;
  }
  if (m < 1 || !validDate(y, m, dd)) return null;
  rest = t.slice(mm[0].length);
  const r = /^(?:(T|\s+)(\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?\s*(AM|PM)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i.exec(rest);
  if (!r) return null;
  let h = r[2] ? +r[2] : 0;
  const mi = r[3] ? +r[3] : 0;
  const se = r[4] ? +r[4] : 0;
  if (r[6]) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (r[6].toUpperCase() === 'PM' ? 12 : 0);
  }
  if (h > 23 || mi > 59 || se > 59) return null;
  const ms = r[5] ? Math.floor(+('0.' + r[5]) * 1000) : 0;
  let time = Date.UTC(y, m - 1, dd, h, mi, se, ms);
  const zone = r[7];
  if (zone && zone.toUpperCase() !== 'Z') {
    const z = /^([+-])(\d{2}):?(\d{2})?$/.exec(zone)!;
    time -= (+z[2] * 60 + +(z[3] ?? 0)) * 60_000 * (z[1] === '-' ? -1 : 1);
  }
  return { date: new Date(time), spaceTime: !!r[1] && r[1] !== 'T' && r[1] !== 't', zone: !!zone };
}

/** Tham so action [FromQuery] DateTime? - rong -> null, sai -> loi "The value 'x' is not valid." */
export function queryDateTime(req: Request, name: string, errors: Record<string, string[]>): Date | null {
  const raw = queryCI(req, name);
  if (raw === undefined || raw.trim() === '') return null;
  const parsed = parseInvariantDateTime(raw);
  if (!parsed) addError(errors, name, `The value '${raw}' is not valid.`);
  return parsed?.date ?? null;
}

/**
 * [FromQuery] DateOnly? - nhu DateTime nhung .NET tu choi khi co mui gio hoac gio ngan cach bang khoang trang
 * (da doi chieu voi backend .NET: "2026-01-01T10:00:00" hop le, "2026-01-01 00:00" / "...Z" khong hop le).
 */
export function queryDateOnly(req: Request, name: string, errors: Record<string, string[]>): Date | null {
  const raw = queryCI(req, name);
  if (raw === undefined || raw.trim() === '') return null;
  const parsed = parseInvariantDateTime(raw);
  if (!parsed || parsed.zone || parsed.spaceTime) {
    addError(errors, name, `The value '${raw}' is not valid.`);
    return null;
  }
  return dateOnlyOf(parsed.date);
}

/** [FromQuery] int (khong nullable): thieu -> 0. */
export function queryIntRequired(req: Request, name: string, errors: Record<string, string[]>): number {
  const raw = queryCI(req, name);
  if (raw === undefined || raw.trim() === '') return 0;
  const t = raw.trim();
  if (!/^[+-]?\d+$/.test(t) || Math.abs(Number(t)) > 2147483647) {
    addError(errors, name, `The value '${raw}' is not valid.`);
    return 0;
  }
  return Number(t);
}

/** [FromQuery] string? - chuoi rong -> null (ConvertEmptyStringToNull). */
export function queryString(req: Request, name: string): string | null {
  const raw = queryCI(req, name);
  return raw === undefined || raw === '' ? null : raw;
}

/** Route {id} kieu Guid khong co rang buoc: sai -> 400 "The value 'x' is not valid." */
export function routeGuid(raw: string, name: string, errors: Record<string, string[]>): string {
  const g = tryParseGuid(raw);
  if (!g) {
    addError(errors, name, `The value '${raw}' is not valid.`);
    return '00000000-0000-0000-0000-000000000000';
  }
  return g;
}

export function throwIfErrors(errors: Record<string, string[]>) {
  if (Object.keys(errors).length > 0) throw new BindingError(errors);
}

// ---------------------------------------------------------------------------------------
// Body binding (System.Text.Json)
// ---------------------------------------------------------------------------------------

export type FieldKind = 'guid' | 'int' | 'sbyte' | 'string' | 'bool' | 'datetime' | 'dateonly' | 'guidList' | 'stringList' | 'intList';

export interface FieldSpec {
  kind: FieldKind;
  nullable?: boolean;
}

const CLR_NAME: Record<FieldKind, string> = {
  guid: 'System.Guid',
  int: 'System.Int32',
  sbyte: 'System.SByte',
  string: 'System.String',
  bool: 'System.Boolean',
  datetime: 'System.DateTime',
  dateonly: 'System.DateOnly',
  guidList: 'System.Collections.Generic.List`1[System.Guid]',
  stringList: 'System.Collections.Generic.List`1[System.String]',
  intList: 'System.Collections.Generic.List`1[System.Int32]',
};

function convertInt(value: unknown, min: number, max: number): number | undefined {
  if (typeof value === 'number') return Number.isInteger(value) && value >= min && value <= max ? value : undefined;
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    const n = Number(value);
    return n >= min && n <= max ? n : undefined;
  }
  return undefined;
}

const FAIL = Symbol('fail');

function convertValue(kind: FieldKind, nullable: boolean, value: unknown): unknown {
  if (value === null) {
    if (kind === 'string' || kind.endsWith('List') || nullable) return null;
    return FAIL;
  }
  switch (kind) {
    case 'guid':
      return typeof value === 'string' && GUID_D.test(value) ? value.toLowerCase() : FAIL;
    case 'int':
      return convertInt(value, -2147483648, 2147483647) ?? FAIL;
    case 'sbyte':
      return convertInt(value, -128, 127) ?? FAIL;
    case 'string':
      return typeof value === 'string' ? value : FAIL;
    case 'bool':
      return typeof value === 'boolean' ? value : FAIL;
    case 'datetime': {
      const d = parseDotnetDateTimeStrict(value);
      return d ?? FAIL;
    }
    case 'dateonly': {
      const d = parseDateOnlyConverter(value);
      return d ?? FAIL;
    }
    case 'guidList':
    case 'stringList':
    case 'intList': {
      if (!Array.isArray(value)) return FAIL;
      const inner: FieldKind = kind === 'guidList' ? 'guid' : kind === 'intList' ? 'int' : 'string';
      const out: unknown[] = [];
      for (const v of value) {
        const c = convertValue(inner, false, v);
        if (c === FAIL) return FAIL;
        out.push(c);
      }
      return out;
    }
  }
}

/**
 * Bind body JSON vao DTO. Thuoc tinh thieu -> undefined (goi ham tu dat gia tri mac dinh).
 * Sai kieu -> BindingError giong .NET: { "$.Ten": ["The JSON value could not be converted to ..."], "dto": ["The dto field is required."] }.
 */
export function bindBody<T extends Record<string, FieldSpec>>(
  body: unknown,
  spec: T,
  paramName = 'dto',
  dtoClr = 'backend.DTOs.' + paramName,
): { [K in keyof T]: unknown } {
  if (body === undefined || body === null) {
    throw new BindingError({ '': ['A non-empty request body is required.'], [paramName]: [`The ${paramName} field is required.`] });
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new BindingError({
      $: [`The JSON value could not be converted to ${dtoClr}. Path: $ | LineNumber: 0 | BytePositionInLine: 1.`],
      [paramName]: [`The ${paramName} field is required.`],
    });
  }
  const rec = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [name, fs] of Object.entries(spec)) {
    const actualKey = Object.keys(rec).find((k) => k.toLowerCase() === name.toLowerCase());
    if (actualKey === undefined) {
      out[name] = undefined;
      continue;
    }
    const converted = convertValue(fs.kind, !!fs.nullable, rec[actualKey]);
    if (converted === FAIL) {
      const clr = fs.nullable && !['string'].includes(fs.kind) && !fs.kind.endsWith('List')
        ? `System.Nullable\`1[${CLR_NAME[fs.kind]}]`
        : CLR_NAME[fs.kind];
      throw new BindingError({
        [paramName]: [`The ${paramName} field is required.`],
        // DateOnlyJsonConverter nem JsonException co san thong diep -> .NET giu nguyen thong diep do.
        [`$.${actualKey}`]: [
          fs.kind === 'dateonly'
            ? 'Unable to parse DateOnly value.'
            : `The JSON value could not be converted to ${clr}. Path: $.${actualKey} | LineNumber: 0 | BytePositionInLine: ${jsonBytePosition(body, [actualKey])}.`,
        ],
      });
    }
    out[name] = converted;
  }
  return out as { [K in keyof T]: unknown };
}

export { getCI };

/**
 * Rang buoc route {x:guid}: khong khop -> ASP.NET khong chon action nao -> 404 (truoc ca xac thuc/phan quyen).
 * Dat TRUOC requireAuth / requirePermission.
 */
export function guidRoute(...names: string[]) {
  return (req: Request, res: Response, next: (err?: unknown) => void) => {
    for (const n of names) {
      const v = req.params[n];
      if (typeof v !== 'string' || !GUID_D.test(v)) {
        res.status(404).end();
        return;
      }
    }
    next();
  };
}

/**
 * BytePositionInLine trong thong bao loi System.Text.Json: vi tri byte NGAY SAU token gay loi
 * (voi object/array: sau dau mo ngoac). Tinh lai bang cach tuan tu hoa body dang gon (JSON.stringify)
 * - trung voi body frontend gui (axios dung JSON.stringify).
 */
export function jsonBytePosition(root: unknown, path: Array<string | number>): number {
  let pos = 0;
  let found = 0;
  const same = (p: Array<string | number>) => p.length === path.length && p.every((x, i) => x === path[i]);
  const visit = (v: unknown, p: Array<string | number>) => {
    if (v !== null && typeof v === 'object') {
      pos += 1;
      if (same(p)) found = pos;
      if (Array.isArray(v)) {
        v.forEach((x, i) => {
          if (i) pos += 1;
          visit(x === undefined ? null : x, [...p, i]);
        });
      } else {
        let first = true;
        for (const [k, x] of Object.entries(v)) {
          if (x === undefined) continue;
          if (!first) pos += 1;
          first = false;
          pos += Buffer.byteLength(JSON.stringify(k)) + 1;
          visit(x, [...p, k]);
        }
      }
      pos += 1;
    } else {
      pos += Buffer.byteLength(JSON.stringify(v) ?? 'null');
      if (same(p)) found = pos;
    }
  };
  visit(root, []);
  return found;
}

/** Loi 415 khi [FromBody] nhung request khong co Content-Type JSON (giong ASP.NET). */
export class UnsupportedMediaType extends Error {}

/**
 * Body cho [FromBody]: tra undefined neu request khong co noi dung (Express/body-parser de {} hoac undefined),
 * nem UnsupportedMediaType neu Content-Type khong phai JSON.
 */
export function bodyOf(req: Request): unknown {
  const len = req.headers['content-length'];
  const hasBody = req.headers['transfer-encoding'] !== undefined || (len !== undefined && len !== '0');
  const ct = String(req.headers['content-type'] ?? '');
  if (!/^application\/([\w.+-]+\+)?json\b/i.test(ct)) throw new UnsupportedMediaType();
  return hasBody ? req.body : undefined;
}
