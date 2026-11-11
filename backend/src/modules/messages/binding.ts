import type { Request, Response } from 'express';
import { getCI, isGuid, validationProblem } from '../../utils/dotnetCompat.js';

// Mo phong model binding + validate tu dong cua [ApiController] (ASP.NET Core 8, <Nullable>enable</Nullable>)
// cho cac DTO cua MessagesController / NotificationController:
//  - Body rong              -> { "": ["A non-empty request body is required."], "<param>": ["The <param> field is required."] }
//  - Sai kieu (vd Guid)     -> { "<param>": [...], "$.<field>": ["The JSON value could not be converted to System.Guid. ..."] }
//  - string khong nullable = null -> { "<Field>": ["The <Field> field is required."] } (chuoi rong "" van hop le voi JSON)
//  - Route Guid khong co rang buoc :guid sai -> { "id": ["The value 'abc' is not valid."] }

export class ModelState {
  errors: Record<string, string[]> = {};
  add(key: string, message: string) {
    (this.errors[key] ??= []).push(message);
  }
  required(field: string) {
    this.add(field, `The ${field} field is required.`);
  }
  get isValid() {
    return Object.keys(this.errors).length === 0;
  }
  send(res: Response) {
    return res.status(400).json(validationProblem(this.errors));
  }
}

/** Loi khi System.Text.Json khong doc duoc gia tri (dung ngay, giong .NET). */
export class JsonConversionError extends Error {
  constructor(
    public jsonPath: string,
    public netType: string,
  ) {
    super(`The JSON value could not be converted to ${netType}. Path: ${jsonPath} | LineNumber: 0 | BytePositionInLine: 0.`);
  }
}

/** Doc body JSON; tra null neu body rong (da ghi loi vao ms). */
export function readJsonBody(req: Request, paramName: string, ms: ModelState): Record<string, unknown> | null {
  const body = req.body as unknown;
  if (body === undefined || body === null || (typeof body === 'object' && !Array.isArray(body) && Object.keys(body).length === 0 && !hasRawBody(req))) {
    ms.add('', 'A non-empty request body is required.');
    ms.required(paramName);
    return null;
  }
  if (typeof body !== 'object' || Array.isArray(body)) throw new JsonConversionError('$', 'object');
  return body as Record<string, unknown>;
}

function hasRawBody(req: Request): boolean {
  const len = Number(req.headers['content-length'] ?? 0);
  return len > 0 || req.headers['transfer-encoding'] !== undefined;
}

/** Ten thuoc tinh JSON client gui (de ghi dung "$.<ten>" trong thong bao loi). */
function jsonName(body: Record<string, unknown>, key: string): string {
  const lower = key.toLowerCase();
  return Object.keys(body).find((k) => k.toLowerCase() === lower) ?? key;
}

/** Guid (kieu gia tri): thieu -> Guid.Empty; null/sai -> loi chuyen doi. */
export function bodyGuid(body: Record<string, unknown>, key: string): string {
  const v = getCI(body, key);
  if (v === undefined) return '00000000-0000-0000-0000-000000000000';
  if (!isGuid(v)) throw new JsonConversionError(`$.${jsonName(body, key)}`, 'System.Guid');
  return v.toLowerCase();
}

/** string khong nullable: thieu -> gia tri mac dinh cua DTO (undefined neu DTO la `= null!`); null -> required. */
export function bodyString(
  body: Record<string, unknown>,
  key: string,
  field: string,
  ms: ModelState,
  defaultValue: string | null,
  nullable = false,
): string | null {
  const v = getCI(body, key);
  if (v === undefined) {
    if (defaultValue === null && !nullable) ms.required(field);
    return defaultValue;
  }
  if (v === null) {
    if (!nullable) ms.required(field);
    return null;
  }
  if (typeof v !== 'string') throw new JsonConversionError(`$.${jsonName(body, key)}`, 'System.String');
  return v;
}

/** List<string> / List<Guid>. */
export function bodyList(
  body: Record<string, unknown>,
  key: string,
  field: string,
  ms: ModelState,
  opts: { element: 'string' | 'guid'; nullable: boolean; defaultValue: string[] | null },
): string[] | null {
  const v = getCI(body, key);
  if (v === undefined) return opts.defaultValue;
  if (v === null) {
    if (!opts.nullable) ms.required(field);
    return null;
  }
  const name = jsonName(body, key);
  const netType =
    opts.element === 'guid' ? 'System.Collections.Generic.List`1[System.Guid]' : 'System.Collections.Generic.List`1[System.String]';
  if (!Array.isArray(v)) throw new JsonConversionError(`$.${name}`, netType);
  return v.map((item, i) => {
    if (opts.element === 'guid') {
      if (!isGuid(item)) throw new JsonConversionError(`$.${name}[${i}]`, 'System.Guid');
      return item.toLowerCase();
    }
    if (item !== null && typeof item !== 'string') throw new JsonConversionError(`$.${name}[${i}]`, 'System.String');
    return item as string;
  });
}

/** Ghi loi chuyen doi JSON theo thu tu cua .NET: "<param>" truoc, "$.field" sau. */
export function sendConversionError(res: Response, paramName: string, err: JsonConversionError, ms?: ModelState) {
  const errors: Record<string, string[]> = { ...(ms?.errors ?? {}) };
  errors[paramName] = [`The ${paramName} field is required.`];
  errors[err.jsonPath] = [err.message];
  return res.status(400).json(validationProblem(errors));
}

/** Route Guid khong co rang buoc `:guid` -> sai thi 400 "The value 'x' is not valid." */
export function routeGuid(value: string, name: string, ms: ModelState): string | null {
  if (isGuid(value)) return value.toLowerCase();
  ms.add(name, `The value '${value}' is not valid.`);
  return null;
}

/** [FromQuery] int: sai -> "The value 'x' is not valid." */
export function queryIntStrict(req: Request, key: string, ms: ModelState, defaultValue: number): number {
  const raw = getCI<unknown>(req.query, key);
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === undefined || v === null || String(v) === '') return defaultValue;
  const s = String(v).trim();
  if (!/^[+-]?\d+$/.test(s) || Math.abs(Number(s)) > 2147483647) {
    ms.add(key, `The value '${String(v)}' is not valid.`);
    return defaultValue;
  }
  return Number.parseInt(s, 10);
}

/** Multer (busboy) doc ten file dang latin1 -> doi lai UTF-8 de giu ten tieng Viet. */
export function fixUploadName(name: string): string {
  if (/[^\x00-\xff]/.test(name)) return name;
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}
