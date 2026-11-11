import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

// =====================================================================================
// Mo phong model binding + validation tu dong cua ASP.NET Core ([ApiController] + [FromBody]
// voi System.Text.Json JsonSerializerDefaults.Web) cho cac module users/permissions/courses.
// Da doi chieu thuc te voi backend .NET (cong 5099):
//  - Khong co Content-Type JSON                -> 415 ProblemDetails
//  - Body rong                                  -> 400 { "": [...non-empty body...], request: [...] }
//  - Gia tri sai kieu (vd accountType:"abc")   -> 400 { request: [...], "$.accountType": ["The JSON value could not be converted ..."] }
//  - Thuoc tinh string/List khong nullable = null -> 400 { Username: ["The Username field is required."] }
//  - So doc duoc tu chuoi ("3"), bool thi khong ("true" -> loi), ten thuoc tinh khong phan biet hoa thuong.
// (Ung vien dua vao src/utils dung chung.)
// =====================================================================================

/** traceId dang W3C cua ASP.NET: 00-<32 hex>-<16 hex>-00 */
export function traceId(): string {
  return `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-00`;
}

/** Tra ProblemDetails (application/problem+json) giong ASP.NET. */
export function sendProblem(res: Response, status: number, body: Record<string, unknown>) {
  return res
    .status(status)
    .type('application/problem+json')
    .json({ ...body, traceId: traceId() });
}

/** NotFound() / Unauthorized() khong body trong [ApiController] -> ProblemDetails (khong phai body rong). */
const CLIENT_ERRORS: Record<number, { type: string; title: string }> = {
  400: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1', title: 'Bad Request' },
  401: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.2', title: 'Unauthorized' },
  403: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.4', title: 'Forbidden' },
  404: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.5', title: 'Not Found' },
  415: { type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16', title: 'Unsupported Media Type' },
};
export function sendClientError(res: Response, status: 400 | 401 | 403 | 404 | 415) {
  return sendProblem(res, status, { ...CLIENT_ERRORS[status], status });
}

/** ValidationProblemDetails; thu tu key giong ModelStateDictionary (do dai roi ten, key long nhau sau cung). */
export function sendValidationProblem(res: Response, errors: Record<string, string[]>) {
  return sendProblem(res, 400, {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    title: 'One or more validation errors occurred.',
    status: 400,
    errors: orderModelStateKeys(errors),
  });
}

function orderModelStateKeys(errors: Record<string, string[]>): Record<string, string[]> {
  const cmp = (a: string, b: string) => {
    if (a.length !== b.length) return a.length - b.length;
    const x = a.toUpperCase();
    const y = b.toUpperCase();
    return x < y ? -1 : x > y ? 1 : 0;
  };
  const keys = Object.keys(errors);
  const rootKey = keys.filter((k) => k === '');
  const top = keys.filter((k) => k !== '' && !/[.[]/.test(k)).sort(cmp);
  const nested = keys.filter((k) => /[.[]/.test(k)).sort(cmp);
  const out: Record<string, string[]> = {};
  for (const k of [...rootKey, ...top, ...nested]) out[k] = errors[k];
  return out;
}

// ---------------------------------- Route constraints ----------------------------------

const HEX32 = /^[0-9a-f]{32}$/i;
/**
 * Rang buoc {id:guid} cua ASP.NET chap nhan ca dang D, N, B {..}, P (..).
 * Tra ve guid dang D chu thuong, hoac null neu khong khop (=> 404 khong body).
 */
export function parseGuidRoute(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) s = s.slice(1, -1);
  let hex: string;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) hex = s.replaceAll('-', '');
  else if (HEX32.test(s) && s === raw.trim()) hex = s;
  else return null;
  hex = hex.toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
/** int.TryParse(NumberStyles.Integer, Invariant): cho phep khoang trang dau/cuoi va dau +/-. */
export function parseDotnetInt(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^\s*[+-]?\d+\s*$/.test(raw)) return null;
  const n = Number(raw.trim());
  return Number.isSafeInteger(n) && n >= INT32_MIN && n <= INT32_MAX ? n : null;
}

// ---------------------------------- [FromBody] binding ----------------------------------

export type FieldType = 'string' | 'string?' | 'sbyte' | 'bool' | 'decimal?' | 'int[]' | 'string[]';
export interface FieldSpec {
  /** Ten thuoc tinh C# (PascalCase) - dung lam key loi "required". */
  name: string;
  type: FieldType;
  default: unknown;
}

const TYPE_NAMES: Record<FieldType, string> = {
  string: 'System.String',
  'string?': 'System.String',
  sbyte: 'System.SByte',
  bool: 'System.Boolean',
  'decimal?': 'System.Nullable`1[System.Decimal]',
  'int[]': 'System.Collections.Generic.List`1[System.Int32]',
  'string[]': 'System.Collections.Generic.List`1[System.String]',
};

const JSON_NUMBER = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
const JSON_INTEGER = /^-?\d+$/;

class ConvertError extends Error {
  constructor(
    public typeName: string,
    public index: number | null = null,
  ) {
    super(typeName);
  }
}

function readInt(v: unknown, min: number, max: number): number | null {
  if (typeof v === 'number') return Number.isInteger(v) && v >= min && v <= max ? v : null;
  // JsonNumberHandling.AllowReadingFromString (mac dinh cua Web): "3" -> 3
  if (typeof v === 'string' && JSON_INTEGER.test(v)) {
    const n = Number(v);
    return n >= min && n <= max ? n : null;
  }
  return null;
}

function convert(type: FieldType, v: unknown): unknown {
  switch (type) {
    case 'string':
    case 'string?':
      if (v === null || typeof v === 'string') return v;
      throw new ConvertError(TYPE_NAMES[type]);
    case 'sbyte': {
      const n = readInt(v, -128, 127);
      if (n === null) throw new ConvertError(TYPE_NAMES[type]);
      return n;
    }
    case 'bool':
      if (typeof v === 'boolean') return v;
      throw new ConvertError(TYPE_NAMES[type]);
    case 'decimal?':
      if (v === null) return null;
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && JSON_NUMBER.test(v)) return Number(v);
      throw new ConvertError(TYPE_NAMES[type]);
    case 'int[]':
    case 'string[]': {
      if (v === null) return null;
      if (!Array.isArray(v)) throw new ConvertError(TYPE_NAMES[type]);
      return v.map((el, i) => {
        if (type === 'int[]') {
          const n = readInt(el, INT32_MIN, INT32_MAX);
          if (n === null) throw new ConvertError('System.Int32', i);
          return n;
        }
        if (el === null || typeof el === 'string') return el;
        throw new ConvertError('System.String', i);
      });
    }
  }
}

const bytes = (s: string) => Buffer.byteLength(s, 'utf8');
/** Do dai token JSON dau tien cua gia tri (object/array chi tinh dau mo ngoac). */
const tokenLen = (v: unknown) => (v !== null && typeof v === 'object' ? 1 : bytes(JSON.stringify(v)));

/**
 * BytePositionInLine ma System.Text.Json bao (cuoi token gay loi). Tinh tren ban JSON gon
 * (JSON.stringify) - trung voi body that khi client gui JSON khong xuong dong (axios, fetch).
 */
function bytePosition(body: Record<string, unknown>, key: string, index: number | null): number {
  let pos = 1; // '{'
  for (const [k, v] of Object.entries(body)) {
    pos += bytes(JSON.stringify(k)) + 1; // "key":
    if (k === key) {
      if (index === null) return pos + tokenLen(v);
      const arr = v as unknown[];
      pos += 1; // '['
      for (let i = 0; i < index; i++) pos += bytes(JSON.stringify(arr[i])) + 1;
      return pos + tokenLen(arr[index]);
    }
    pos += bytes(JSON.stringify(v)) + 1; // value + ','
  }
  return pos;
}

export type BindResult<T> = { ok: true; value: T } | { ok: false; send: (res: Response) => unknown };

/**
 * Doc [FromBody] giong ASP.NET. `dtoType` = ten day du lop C# (dung trong thong bao loi "$"),
 * `paramName` = ten tham so action (vd "request").
 */
export function bindBody<T extends Record<string, unknown>>(
  req: Request,
  dtoType: string,
  paramName: string,
  fields: FieldSpec[],
): BindResult<T> {
  const ctype = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (!(ctype === 'application/json' || (ctype.startsWith('application/') && ctype.endsWith('+json')))) {
    return { ok: false, send: (res) => sendClientError(res, 415) };
  }
  const requiredMsg = `The ${paramName} field is required.`;
  const body: unknown = req.body;
  const empty = body === undefined || body === null || req.headers['content-length'] === '0';
  if (empty) {
    return {
      ok: false,
      send: (res) =>
        sendValidationProblem(res, { '': ['A non-empty request body is required.'], [paramName]: [requiredMsg] }),
    };
  }
  if (typeof body !== 'object' || Array.isArray(body)) {
    const msg = `The JSON value could not be converted to ${dtoType}. Path: $ | LineNumber: 0 | BytePositionInLine: 1.`;
    return { ok: false, send: (res) => sendValidationProblem(res, { $: [msg], [paramName]: [requiredMsg] }) };
  }

  const obj = body as Record<string, unknown>;
  const value: Record<string, unknown> = {};
  for (const f of fields) value[f.name] = Array.isArray(f.default) ? [...f.default] : f.default;

  for (const [key, raw] of Object.entries(obj)) {
    // PropertyNameCaseInsensitive = true: khop chinh xac (camelCase) truoc, roi khong phan biet hoa thuong.
    const spec =
      fields.find((f) => f.name[0].toLowerCase() + f.name.slice(1) === key) ??
      fields.find((f) => f.name.toLowerCase() === key.toLowerCase());
    if (!spec) continue;
    try {
      value[spec.name] = convert(spec.type, raw);
    } catch (e) {
      if (!(e instanceof ConvertError)) throw e;
      const path = `$.${key}${e.index === null ? '' : `[${e.index}]`}`;
      const msg = `The JSON value could not be converted to ${e.typeName}. Path: ${path} | LineNumber: 0 | BytePositionInLine: ${bytePosition(obj, key, e.index)}.`;
      return { ok: false, send: (res) => sendValidationProblem(res, { [paramName]: [requiredMsg], [path]: [msg] }) };
    }
  }

  // Nullable reference types bat: string/List khong nullable ma = null -> [Required] ngam dinh.
  const errors: Record<string, string[]> = {};
  for (const f of fields) {
    if ((f.type === 'string' || f.type === 'int[]' || f.type === 'string[]') && value[f.name] === null) {
      errors[f.name] = [`The ${f.name} field is required.`];
    }
  }
  if (Object.keys(errors).length) return { ok: false, send: (res) => sendValidationProblem(res, errors) };
  return { ok: true, value: value as T };
}

/**
 * Middleware rang buoc route ({id:guid}, {roleId:int}): khong khop -> 404 khong body, chay TRUOC
 * kiem tra quyen (ben .NET route khong khop thi khong co endpoint nen khong qua AuthorizationMiddleware).
 */
export function routeGuid(param: string) {
  return (req: Request, res: Response, next: () => void) =>
    parseGuidRoute(req.params[param]) ? next() : res.status(404).end();
}
export function routeInt(param: string) {
  return (req: Request, res: Response, next: () => void) =>
    parseDotnetInt(req.params[param]) !== null ? next() : res.status(404).end();
}
