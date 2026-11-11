import type { NextFunction, Request, Response } from 'express';
import { isGuid, validationProblem } from '../../utils/dotnetCompat.js';

// =====================================================================================
// Mo phong model binding [FromBody] cua ASP.NET Core (System.Text.Json, JsonSerializerDefaults.Web)
// cho cac DTO cua module classes/teachers/students/parents:
//  - ten thuoc tinh khong phan biet hoa thuong, thuoc tinh la bi bo qua;
//  - so doc duoc tu chuoi ("5" -> 5) nhu NumberHandling.AllowReadingFromString;
//  - sai kieu -> 400 { errors: { "<ten tham so>": [...required], "$.path": ["The JSON value could not be converted to ..."] } }
//    (System.Text.Json dung o loi dau tien theo thu tu trong tai lieu JSON);
//  - thuoc tinh kieu tham chieu khong nullable (string, List<T>, DTO) = null -> "The X field is required."
//    (implicit [Required] khi bat <Nullable>enable</Nullable>);
//  - thieu body -> { "": ["A non-empty request body is required."], "<ten tham so>": [...] };
//  - Content-Type khong phai JSON -> 415.
// Ham nay co the dua vao src/utils neu cac module khac can (ghi trong bao cao).
// =====================================================================================

export type Scalar = 'string' | 'string?' | 'guid' | 'guid?' | 'int' | 'int?' | 'bool' | 'bool?' | 'dateonly?';

export interface DtoSpec {
  /** Ten day du kieu CLR, dung trong thong bao loi, vd backend.DTOs.UpsertClassRequestDto */
  clrName: string;
  fields: FieldSpec[];
}

export type FieldType = Scalar | { list: Scalar | DtoSpec } | { dto: DtoSpec; nullable?: boolean };

export interface FieldSpec {
  /** Ten thuoc tinh C# (PascalCase) */
  name: string;
  type: FieldType;
  /** Gia tri mac dinh khi JSON khong co thuoc tinh nay (initializer trong C#). */
  default?: () => unknown;
}

const CLR: Record<Scalar, string> = {
  string: 'System.String',
  'string?': 'System.String',
  guid: 'System.Guid',
  'guid?': 'System.Nullable`1[System.Guid]',
  int: 'System.Int32',
  'int?': 'System.Nullable`1[System.Int32]',
  bool: 'System.Boolean',
  'bool?': 'System.Nullable`1[System.Boolean]',
  'dateonly?': 'System.Nullable`1[System.DateOnly]',
};

const GUID_D = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function clrNameOf(t: FieldType): string {
  if (typeof t === 'string') return CLR[t];
  if ('list' in t) {
    const inner = typeof t.list === 'string' ? CLR[t.list] : t.list.clrName;
    return `System.Collections.Generic.List\`1[${inner}]`;
  }
  return t.dto.clrName;
}

class ConvertError extends Error {
  constructor(
    public path: (string | number)[],
    message: string,
    /** true: loi do converter tu viet nem ra (giu nguyen message, khong them Path/LineNumber) */
    public raw = false,
  ) {
    super(message);
  }
}

/** DateOnlyJsonConverter.Read ben .NET: "yyyy-MM-dd" hoac DateTime.TryParse (AssumeUniversal|AdjustToUniversal). */
export function parseDotnetDateOnlyInput(s: string): Date | null {
  const exact = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (exact) {
    const [y, m, d] = [+exact[1], +exact[2], +exact[3]];
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d) return dt;
    return null;
  }
  const trimmed = s.trim();
  if (!trimmed || !/\d/.test(trimmed)) return null;
  const t = Date.parse(trimmed); // process chay TZ=UTC => chuoi khong mui gio duoc coi la UTC
  if (Number.isNaN(t)) return null;
  const dt = new Date(t);
  return new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
}

function convertScalar(t: Scalar, v: unknown, path: (string | number)[]): unknown {
  const nullable = t.endsWith('?') || t === 'string';
  if (v === null) {
    if (nullable) return null;
    throw new ConvertError(path, CLR[t]);
  }
  switch (t) {
    case 'string':
    case 'string?':
      if (typeof v === 'string') return v;
      break;
    case 'guid':
    case 'guid?':
      if (typeof v === 'string' && GUID_D.test(v)) return v.toLowerCase();
      break;
    case 'int':
    case 'int?': {
      let n: number | null = null;
      if (typeof v === 'number') n = v;
      else if (typeof v === 'string' && /^-?\d+$/.test(v)) n = Number(v);
      if (n !== null && Number.isInteger(n) && n >= -2147483648 && n <= 2147483647) return n;
      break;
    }
    case 'bool':
    case 'bool?':
      if (typeof v === 'boolean') return v;
      break;
    case 'dateonly?': {
      const d = typeof v === 'string' ? parseDotnetDateOnlyInput(v) : null;
      if (d) return d;
      throw new ConvertError(path, 'Unable to parse DateOnly value.', true);
    }
  }
  throw new ConvertError(path, CLR[t]);
}

function convert(t: FieldType, v: unknown, path: (string | number)[]): unknown {
  if (typeof t === 'string') return convertScalar(t, v, path);
  if ('list' in t) {
    if (v === null) return null;
    if (!Array.isArray(v)) throw new ConvertError(path, clrNameOf(t));
    return v.map((item, i) => {
      const p = [...path, i];
      if (typeof t.list === 'string') return convertScalar(t.list, item, p);
      if (item === null) return null;
      return convertObject(t.list, item, p);
    });
  }
  if (v === null) return null;
  return convertObject(t.dto, v, path);
}

function convertObject(spec: DtoSpec, v: unknown, path: (string | number)[]): Record<string, unknown> {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new ConvertError(path, spec.clrName);
  const out: Record<string, unknown> = {};
  for (const f of spec.fields) out[f.name] = f.default ? f.default() : null;
  for (const [key, value] of Object.entries(v as Record<string, unknown>)) {
    const f = spec.fields.find((x) => x.name.toLowerCase() === key.toLowerCase());
    if (!f) continue;
    out[f.name] = convert(f.type, value, [...path, key]);
  }
  return out;
}

/** Implicit [Required]: thuoc tinh tham chieu khong nullable ma = null. Tra ve loi theo thu tu khai bao. */
function validateRequired(spec: DtoSpec, obj: Record<string, unknown>, prefix: string, errors: Record<string, string[]>) {
  for (const f of spec.fields) {
    const key = prefix ? `${prefix}.${f.name}` : f.name;
    const val = obj[f.name];
    const t = f.type;
    const isRequiredRef =
      t === 'string' || (typeof t === 'object' && 'list' in t) || (typeof t === 'object' && 'dto' in t && !t.nullable);
    if (val === null || val === undefined) {
      if (isRequiredRef) errors[key] = [`The ${f.name} field is required.`];
      continue;
    }
    if (typeof t === 'object' && 'list' in t && typeof t.list !== 'string' && Array.isArray(val)) {
      const inner = t.list;
      val.forEach((item, i) => {
        if (item && typeof item === 'object') validateRequired(inner, item as Record<string, unknown>, `${key}[${i}]`, errors);
      });
    } else if (typeof t === 'object' && 'dto' in t) {
      validateRequired(t.dto, val as Record<string, unknown>, key, errors);
    }
  }
}

// ---------- vi tri byte (BytePositionInLine) cua token loi, tinh tren JSON gon cua body ----------

const utf8Len = (s: string) => Buffer.byteLength(s, 'utf8');

/** Vi tri ngay sau token tai `path` khi serialize gon (giong JSON axios/fetch gui len). */
function bytePositionAfter(root: unknown, path: (string | number)[]): number {
  let pos = 0;
  let found = -1;
  const walk = (v: unknown, depth: number, onPath: boolean): void => {
    const target = onPath && depth === path.length;
    if (Array.isArray(v)) {
      pos += 1;
      if (target) found = pos;
      v.forEach((item, i) => {
        if (found >= 0) return;
        if (i > 0) pos += 1;
        walk(item, depth + 1, onPath && path[depth] === i);
      });
      pos += 1;
      return;
    }
    if (v && typeof v === 'object') {
      pos += 1;
      if (target) found = pos;
      Object.entries(v as Record<string, unknown>).forEach(([k, item], i) => {
        if (found >= 0) return;
        if (i > 0) pos += 1;
        pos += utf8Len(JSON.stringify(k)) + 1;
        walk(item, depth + 1, onPath && path[depth] === k);
      });
      pos += 1;
      return;
    }
    pos += utf8Len(JSON.stringify(v) ?? 'null');
    if (target) found = pos;
  };
  walk(root, 0, true);
  return found >= 0 ? found : pos;
}

function jsonPath(path: (string | number)[]): string {
  let s = '$';
  for (const p of path) s += typeof p === 'number' ? `[${p}]` : /^[A-Za-z_][A-Za-z0-9_]*$/.test(p) ? `.${p}` : `['${p}']`;
  return s;
}

export type BindResult<T> = { ok: true; value: T } | { ok: false; status: number; body: unknown };

/** ProblemDetails cua ASP.NET duoc ghi voi Content-Type application/problem+json. */
export function sendProblem(res: Response, status: number, body: unknown) {
  return res.status(status).type('application/problem+json; charset=utf-8').send(JSON.stringify(body));
}

/** Dieu kien EF `x.Cot != false` (NULL cung tinh la "co") cho Prisma. */
export const notFalse = <K extends string>(col: K) => ({ OR: [{ [col]: null }, { [col]: true }] }) as Record<string, unknown>;

function isJsonContentType(ct: string | undefined): boolean {
  if (!ct) return false;
  const mime = ct.split(';')[0].trim().toLowerCase();
  return mime === 'application/json' || mime === 'text/json' || /^application\/[^/]+\+json$/.test(mime);
}

function hasEmptyBody(req: Request): boolean {
  const len = req.headers['content-length'];
  if (len !== undefined) return Number(len) === 0;
  return !req.headers['transfer-encoding'];
}

/**
 * Bind [FromBody] <paramName> theo `spec`. Tra ve gia tri da chuyen kieu (key = ten thuoc tinh C#)
 * hoac { status, body } de tra thang cho client.
 */
export function bindBody<T = Record<string, unknown>>(req: Request, spec: DtoSpec, paramName: string): BindResult<T> {
  if (!isJsonContentType(req.headers['content-type'])) {
    return {
      ok: false,
      status: 415,
      body: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16', title: 'Unsupported Media Type', status: 415 },
    };
  }
  if (hasEmptyBody(req) || req.body === undefined) {
    return {
      ok: false,
      status: 400,
      body: validationProblem({ '': ['A non-empty request body is required.'], [paramName]: [`The ${paramName} field is required.`] }),
    };
  }
  let value: Record<string, unknown>;
  try {
    value = convertObject(spec, req.body, []);
  } catch (e) {
    if (!(e instanceof ConvertError)) throw e;
    const p = jsonPath(e.path);
    const msg = e.raw
      ? e.message
      : `The JSON value could not be converted to ${e.message}. Path: ${p} | LineNumber: 0 | BytePositionInLine: ${bytePositionAfter(req.body, e.path)}.`;
    const required = { [paramName]: [`The ${paramName} field is required.`] };
    // Thu tu key giong .NET: loi o goc "$" dung truoc, loi o thuoc tinh dung sau ten tham so.
    const errors = e.path.length === 0 ? { [p]: [msg], ...required } : { ...required, [p]: [msg] };
    return { ok: false, status: 400, body: validationProblem(errors) };
  }
  const errors: Record<string, string[]> = {};
  validateRequired(spec, value, '', errors);
  if (Object.keys(errors).length > 0) return { ok: false, status: 400, body: validationProblem(errors) };
  return { ok: true, value: value as T };
}

// ---------- tien ich nho dung chung trong cac module cua nhom nay ----------

/** Dieu kien EF `x.Cot != true` (NULL cung tinh la "khong") cho Prisma. */
export const notTrue = <K extends string>(col: K) => ({ OR: [{ [col]: null }, { [col]: false }] }) as Record<string, unknown>;

/** Guid.TryParse cua .NET: chap nhan dang D, N, B {..}, P (..). Tra ve dang D chu thuong hoac null. */
export function tryParseGuid(s: string | undefined | null): string | null {
  if (typeof s !== 'string') return null;
  let v = s.trim();
  if ((v.startsWith('{') && v.endsWith('}')) || (v.startsWith('(') && v.endsWith(')'))) v = v.slice(1, -1);
  if (GUID_D.test(v)) return v.toLowerCase();
  if (/^[0-9a-fA-F]{32}$/.test(v)) {
    const h = v.toLowerCase();
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  return null;
}

/** DateOnly.ToString() voi culture mac dinh cua server .NET (invariant/en-US): "MM/dd/yyyy". */
export function dotnetDateOnlyToString(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())}/${d.getUTCFullYear()}`;
}

/** DateOnly.FromDateTime(DateTime.Today) - ngay hien tai cua server (TZ=UTC). */
export function todayDateOnly(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * Rang buoc route {name:guid}: sai dinh dang thi .NET khong khop route -> 404 (truoc ca xac thuc).
 * Dung next('route') de cac router khac van co co hoi khop; khong ai khop thi notFound tra 404.
 */
export const guidParams =
  (...names: string[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    for (const n of names) {
      const v = req.params[n];
      if (!isGuid(v)) return next('route');
      req.params[n] = v.toLowerCase();
    }
    return next();
  };
