import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { getCI, validationProblem } from '../../utils/dotnetCompat.js';
import { dec, parseJsonDateTime, type Decimal, type DotnetDateTime } from './dotnetTypes.js';

// =====================================================================================
// Mo phong model binding cua ASP.NET Core [ApiController] + System.Text.Json (Web defaults):
//  - ten thuoc tinh khong phan biet hoa thuong, so doc duoc tu chuoi ("5")
//  - sai kieu -> 400 { request: [...], "$.path": ["The JSON value could not be converted to ..."] }
//  - thuoc tinh string/List khong nullable gui null -> 400 { "Path.Prop": ["The X field is required."] }
//  - khong co body -> 400 { "": ["A non-empty request body is required."], request: [...] }
//  - khong co / sai Content-Type -> 415
// =====================================================================================

export type Scalar =
  | 'guid' | 'guid?' | 'int' | 'int?' | 'decimal' | 'decimal?' | 'bool'
  | 'string' | 'string?' | 'datetime' | 'datetime?' | 'json?';
export interface ListType { list: FieldType; nullable?: boolean }
export interface ObjType { obj: DtoSchema }
export type FieldType = Scalar | ListType | ObjType;

/** [ten C#, kieu, gia tri khoi tao (initializer) khi JSON khong co thuoc tinh nay] */
export type FieldDef = [name: string, type: FieldType, init?: () => unknown];
export interface DtoSchema { typeName: string; fields: FieldDef[] }

export const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const SCALAR_TYPE: Record<Scalar, string> = {
  guid: 'System.Guid',
  'guid?': 'System.Nullable`1[System.Guid]',
  int: 'System.Int32',
  'int?': 'System.Nullable`1[System.Int32]',
  decimal: 'System.Decimal',
  'decimal?': 'System.Nullable`1[System.Decimal]',
  bool: 'System.Boolean',
  string: 'System.String',
  'string?': 'System.String',
  datetime: 'System.DateTime',
  'datetime?': 'System.Nullable`1[System.DateTime]',
  'json?': 'System.Nullable`1[System.Text.Json.JsonElement]',
};

function typeName(t: FieldType): string {
  if (typeof t === 'string') return SCALAR_TYPE[t];
  if ('list' in t) return `System.Collections.Generic.List\`1[${typeName(t.list)}]`;
  return `backend.DTOs.${t.obj.typeName}`;
}

function defaultOf(t: FieldType): unknown {
  if (typeof t !== 'string') return null;
  switch (t) {
    case 'guid': return EMPTY_GUID;
    case 'int': return 0;
    case 'decimal': return dec(0);
    case 'bool': return false;
    case 'datetime': return { ms: -62135596800000, sub: 0, kind: 'Unspecified' } satisfies DotnetDateTime;
    default: return null;
  }
}

const GUID_D = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INT_RE = /^-?\d+$/;
const DEC_RE = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

class ConvError extends Error {
  constructor(public segs: (string | number)[], public tname: string) {
    super('conv');
  }
}

function readInt(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isInteger(v)) return v >= -2147483648 && v <= 2147483647 ? v : undefined;
  if (typeof v === 'string' && INT_RE.test(v)) {
    const n = Number(v);
    return n >= -2147483648 && n <= 2147483647 ? n : undefined;
  }
  return undefined;
}

function readDecimal(v: unknown): Decimal | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return dec(String(v));
  if (typeof v === 'string' && DEC_RE.test(v)) return dec(v);
  return undefined;
}

function convert(v: unknown, t: FieldType, segs: (string | number)[]): unknown {
  const fail = (): never => {
    throw new ConvError(segs, typeName(t));
  };
  if (typeof t === 'string') {
    const nullable = t.endsWith('?') || t === 'string';
    if (v === null) return nullable ? null : fail();
    switch (t) {
      case 'guid':
      case 'guid?':
        return typeof v === 'string' && GUID_D.test(v) ? v.toLowerCase() : fail();
      case 'int':
      case 'int?': {
        const n = readInt(v);
        return n === undefined ? fail() : n;
      }
      case 'decimal':
      case 'decimal?': {
        const d = readDecimal(v);
        return d === undefined ? fail() : d;
      }
      case 'bool':
        return typeof v === 'boolean' ? v : fail();
      case 'string':
      case 'string?':
        return typeof v === 'string' ? v : fail();
      case 'datetime':
      case 'datetime?': {
        const d = typeof v === 'string' ? parseJsonDateTime(v) : null;
        return d ?? fail();
      }
      case 'json?':
        return v;
    }
  }
  if ('list' in t) {
    if (v === null) return null;
    if (!Array.isArray(v)) return fail();
    return v.map((item, i) => convert(item, t.list, [...segs, i]));
  }
  if (v === null) return null;
  if (typeof v !== 'object' || Array.isArray(v)) return fail();
  return convertObject(v as Record<string, unknown>, t.obj, segs);
}

function convertObject(src: Record<string, unknown>, schema: DtoSchema, segs: (string | number)[]) {
  const out: Record<string, unknown> = {};
  for (const [name, t, init] of schema.fields) out[name] = init ? init() : defaultOf(t);
  // Duyet theo thu tu trong JSON (System.Text.Json dung o loi dau tien gap phai).
  for (const key of Object.keys(src)) {
    const def = schema.fields.find(([n]) => n.toLowerCase() === key.toLowerCase());
    if (!def) continue;
    out[def[0]] = convert(src[key], def[1], [...segs, key]);
  }
  return out;
}

function requiredErrors(value: Record<string, unknown>, schema: DtoSchema, prefix: string, errors: Record<string, string[]>) {
  for (const [name, t] of schema.fields) {
    const v = value[name];
    const key = `${prefix}${name}`;
    const nonNullable = t === 'string' || (typeof t === 'object' && 'list' in t && !t.nullable);
    if (v === null && nonNullable) {
      (errors[key] ??= []).push(`The ${name} field is required.`);
      continue;
    }
    if (typeof t === 'object' && 'list' in t && Array.isArray(v) && typeof t.list === 'object' && 'obj' in t.list) {
      const inner = t.list.obj;
      v.forEach((item, i) => {
        if (item && typeof item === 'object') requiredErrors(item as Record<string, unknown>, inner, `${key}[${i}].`, errors);
      });
    } else if (typeof t === 'object' && 'obj' in t && v && typeof v === 'object') {
      requiredErrors(v as Record<string, unknown>, t.obj, `${key}.`, errors);
    }
  }
}

/** Vi tri byte ngay sau token dau tien cua gia tri tai `segs` khi body duoc ghi gon (axios gui JSON.stringify). */
function bytePosition(body: unknown, segs: (string | number)[]): number {
  let pos = 0;
  const walk = (v: unknown, depth: number): boolean => {
    if (depth === segs.length) {
      pos += v !== null && typeof v === 'object' ? 1 : Buffer.byteLength(JSON.stringify(v) ?? 'null', 'utf8');
      return true;
    }
    const seg = segs[depth];
    if (Array.isArray(v)) {
      pos += 1;
      for (let i = 0; i < v.length; i++) {
        if (i > 0) pos += 1;
        if (i === seg) return walk(v[i], depth + 1);
        pos += Buffer.byteLength(JSON.stringify(v[i]) ?? 'null', 'utf8');
      }
      return false;
    }
    if (v && typeof v === 'object') {
      pos += 1;
      const entries = Object.entries(v as Record<string, unknown>);
      for (let i = 0; i < entries.length; i++) {
        if (i > 0) pos += 1;
        const [k, val] = entries[i];
        pos += Buffer.byteLength(JSON.stringify(k), 'utf8') + 1;
        if (k === seg) return walk(val, depth + 1);
        pos += Buffer.byteLength(JSON.stringify(val) ?? 'null', 'utf8');
      }
    }
    return false;
  };
  walk(body, 0);
  return pos;
}

function jsonPath(segs: (string | number)[]): string {
  return segs.reduce<string>((p, s) => (typeof s === 'number' ? `${p}[${s}]` : `${p}.${s}`), '$');
}

export const traceId = () => `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-00`;

export function sendValidationProblem(res: Response, errors: Record<string, string[]>) {
  return res.status(400).json({ ...validationProblem(errors), traceId: traceId() });
}

export type BindResult<T> = { ok: true; value: T } | { ok: false; send: (res: Response) => unknown };

/** [FromBody] AdminXxxDto request */
export function bindBody<T = Record<string, unknown>>(req: Request, schema: DtoSchema): BindResult<T> {
  const contentType = String(req.headers['content-type'] ?? '').toLowerCase();
  const isJson = /^(application\/json|text\/json|application\/[^;]*\+json)\s*(;|$)/.test(contentType);
  if (!isJson) {
    return {
      ok: false,
      send: (res) =>
        res.status(415).json({
          type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16',
          title: 'Unsupported Media Type',
          status: 415,
          traceId: traceId(),
        }),
    };
  }
  const body = req.body as unknown;
  if (body === undefined || body === null) {
    return {
      ok: false,
      send: (res) =>
        sendValidationProblem(res, { '': ['A non-empty request body is required.'], request: ['The request field is required.'] }),
    };
  }
  let value: Record<string, unknown>;
  try {
    value = convert(body, { obj: schema }, []) as Record<string, unknown>;
  } catch (e) {
    if (!(e instanceof ConvError)) throw e;
    const path = jsonPath(e.segs);
    const msg = `The JSON value could not be converted to ${e.tname}. Path: ${path} | LineNumber: 0 | BytePositionInLine: ${bytePosition(body, e.segs)}.`;
    const errors: Record<string, string[]> =
      path === '$' ? { $: [msg], request: ['The request field is required.'] } : { request: ['The request field is required.'], [path]: [msg] };
    return { ok: false, send: (res) => sendValidationProblem(res, errors) };
  }
  const errors: Record<string, string[]> = {};
  requiredErrors(value, schema, '', errors);
  if (Object.keys(errors).length > 0) return { ok: false, send: (res) => sendValidationProblem(res, errors) };
  return { ok: true, value: value as T };
}

// ------------------------------- [FromQuery] -----------------------------------------

const GUID_ANY = /^(?:\{([0-9a-f-]{36})\}|\(([0-9a-f-]{36})\)|([0-9a-f-]{36})|([0-9a-f]{32}))$/i;

function parseGuidLoose(s: string): string | null {
  const m = GUID_ANY.exec(s.trim());
  if (!m) return null;
  const raw = m[1] ?? m[2] ?? m[3];
  if (raw) return GUID_D.test(raw) ? raw.toLowerCase() : null;
  const n = m[4].toLowerCase();
  return `${n.slice(0, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}-${n.slice(16, 20)}-${n.slice(20)}`;
}

/** Doc tham so query nhu SimpleTypeModelBinder; loi duoc gom vao `errors`. */
export class QueryReader {
  readonly errors: Record<string, string[]> = {};
  constructor(private readonly req: Request) {}

  private raw(name: string): string | undefined {
    const v = getCI<unknown>(this.req.query, name);
    if (Array.isArray(v)) return v.length ? String(v[0]) : undefined;
    return v === undefined || v === null ? undefined : String(v);
  }

  guid(name: string): string | null {
    const v = this.raw(name);
    if (v === undefined || v.trim() === '') return null;
    const g = parseGuidLoose(v);
    if (!g) (this.errors[name] ??= []).push(`The value '${v}' is not valid.`);
    return g;
  }

  str(name: string): string | null {
    const v = this.raw(name);
    return v === undefined ? null : v;
  }

  bool(name: string, def: boolean): boolean {
    const v = this.raw(name);
    if (v === undefined) return def;
    if (v.trim() === '') {
      (this.errors[name] ??= []).push(`The value '${v}' is invalid.`);
      return def;
    }
    const t = v.trim().toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
    (this.errors[name] ??= []).push(`The value '${v}' is not valid.`);
    return def;
  }

  get hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
}
