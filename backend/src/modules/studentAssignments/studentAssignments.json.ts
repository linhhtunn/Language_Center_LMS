import { randomBytes } from 'node:crypto';
import { formatDotnetDateTime, isGuid } from '../../utils/dotnetCompat.js';

// =====================================================================================
// Mo phong cach System.Text.Json (STJ) doc du lieu trong StudentAssignmentService.cs:
//   JsonSerializer.Deserialize<T>(raw, { PropertyNameCaseInsensitive = true })
// STJ nghiem ngat ve kieu: sai kieu 1 truong -> nem JsonException -> service bat lai va
// roi ve gia tri mac dinh. Phai giu dung hanh vi nay de ket qua giong ban .NET.
// =====================================================================================

class StjError extends Error {}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);

function readString(v: unknown): string | null {
  if (v === null || typeof v === 'string') return v;
  throw new StjError('string');
}

function readBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  throw new StjError('bool');
}

function readInt32(v: unknown): number {
  if (typeof v === 'number' && Number.isInteger(v) && v >= -2147483648 && v <= 2147483647) return v;
  throw new StjError('int');
}

function readStringList(v: unknown): (string | null)[] | null {
  if (v === null) return null;
  if (!Array.isArray(v)) throw new StjError('list');
  return v.map((x) => readString(x));
}

function readGuid(v: unknown): string {
  // STJ chi nhan Guid dang "D" (36 ky tu, co gach noi).
  if (isGuid(v)) return v.toLowerCase();
  throw new StjError('guid');
}

// ---------------------------------- DateTime ----------------------------------------

/**
 * DateTime cua .NET giu ca "Kind": chuoi khong mui gio -> Unspecified, "Z" -> Utc,
 * "+07:00" -> Local (doi ve gio dia phuong cua server). Khi ghi JSON, STJ ghi lai hau to
 * tuong ung (Unspecified: khong hau to, Utc: "Z", Local: "+hh:mm").
 * `wall` la "gio tuong" luu trong cac truong UTC cua Date (cung quy uoc voi cot DATETIME
 * Prisma doc ra), nen so sanh truc tiep duoc voi new Date() khi process chay TZ=UTC.
 */
export class NetDateTime {
  constructor(
    public readonly wall: Date,
    public readonly kind: 'Unspecified' | 'Utc' | 'Local',
    /** Phan le giay (toi da 7 chu so, da bo so 0 cuoi). */
    public readonly frac: string,
    /** Do lech gio dia phuong (phut), chi dung khi kind = Local. */
    public readonly offsetMinutes = 0,
  ) {}

  getTime(): number {
    return this.wall.getTime();
  }

  toJSON(): string {
    const base = formatDotnetDateTime(new Date(Math.floor(this.wall.getTime() / 1000) * 1000));
    const frac = this.frac ? `.${this.frac}` : '';
    if (this.kind === 'Utc') return `${base}${frac}Z`;
    if (this.kind === 'Local') {
      const sign = this.offsetMinutes < 0 ? '-' : '+';
      const abs = Math.abs(this.offsetMinutes);
      return `${base}${frac}${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
    }
    return `${base}${frac}`;
  }
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(Z|[+-]\d{2}:\d{2})?)?$/;

/** DateTime theo dinh dang ISO 8601 ma STJ chap nhan; sai -> nem loi. */
function readDateTime(v: unknown): NetDateTime | null {
  if (v === null) return null;
  if (typeof v !== 'string') throw new StjError('datetime');
  const m = DATE_RE.exec(v);
  if (!m) throw new StjError('datetime');
  const [, y, mo, d, hh = '0', mi = '0', ss = '0', fracRaw = '', zone] = m;
  const year = +y, month = +mo, day = +d, hour = +hh, minute = +mi, second = +ss;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth || hour > 23 || minute > 59 || second > 59) {
    throw new StjError('datetime');
  }
  const frac7 = fracRaw.slice(0, 7);
  const ms = frac7 ? Number(frac7.padEnd(3, '0').slice(0, 3)) : 0;
  const frac = frac7.replace(/0+$/, '');
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second, ms));
  if (year < 100) wall.setUTCFullYear(year);
  if (!zone) return new NetDateTime(wall, 'Unspecified', frac);
  if (zone === 'Z') return new NetDateTime(wall, 'Utc', frac);
  // Co offset -> .NET doi sang gio dia phuong cua server (DateTimeKind.Local).
  const sign = zone[0] === '-' ? -1 : 1;
  const offset = sign * (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(4, 6)));
  const instant = wall.getTime() - offset * 60_000;
  const localOffset = -new Date(instant).getTimezoneOffset();
  return new NetDateTime(new Date(instant + localOffset * 60_000), 'Local', frac, localOffset);
}

/** DateTime.Now cua .NET (Kind = Local) -> STJ ghi kem offset, vd "2026-11-11T07:10:44.1133138+00:00". */
export function netLocal(instant: Date): NetDateTime {
  const offset = -instant.getTimezoneOffset();
  const frac = String(instant.getUTCMilliseconds()).padStart(3, '0').replace(/0+$/, '');
  return new NetDateTime(new Date(instant.getTime() + offset * 60_000), 'Local', frac, offset);
}

/** Moc thoi gian (ms) de so sanh DateTime cua .NET (so sanh Ticks, bo qua Kind). */
export const ticks = (v: Date | NetDateTime): number => v.getTime();

// ---------------------------------- Envelope (baitap.MoTa) ---------------------------

export interface AssignmentEnvelope {
  code: string | null;
  description: string | null;
  openAt: NetDateTime | null;
  dueAt: NetDateTime | null;
  maxAttempts: number;
  showAnswerAfterDeadline: boolean;
  danhSachTu: (string | null)[] | null;
  amThanhLink: string | null;
  hinhAnhLink: string | null;
}

const defaultEnvelope = (): AssignmentEnvelope => ({
  code: null,
  description: null,
  openAt: null,
  dueAt: null,
  maxAttempts: 1,
  showAnswerAfterDeadline: false,
  danhSachTu: null,
  amThanhLink: null,
  hinhAnhLink: null,
});

/**
 * ParseEnvelope: baitap.MoTa (van ban JSON MySQL tra ve). Rong -> mac dinh; JSON hop le
 * nhung sai kieu / khong phai object -> coi ca chuoi la mo ta (giong catch ben .NET).
 */
export function parseEnvelope(raw: string | null | undefined): AssignmentEnvelope {
  if (raw == null || raw.trim() === '') return defaultEnvelope();
  try {
    const v: unknown = JSON.parse(raw);
    if (v === null) return defaultEnvelope();
    if (!isPlainObject(v)) throw new StjError('object');
    const env = defaultEnvelope();
    for (const [k, val] of Object.entries(v)) {
      switch (k.toLowerCase()) {
        case 'code': env.code = readString(val); break;
        case 'description': env.description = readString(val); break;
        case 'openat': env.openAt = readDateTime(val); break;
        case 'dueat': env.dueAt = readDateTime(val); break;
        case 'maxattempts': env.maxAttempts = readInt32(val); break;
        case 'showanswerafterdeadline': env.showAnswerAfterDeadline = readBool(val); break;
        case 'danhsachtu': env.danhSachTu = readStringList(val); break;
        case 'amthanhlink': env.amThanhLink = readString(val); break;
        case 'hinhanhlink': env.hinhAnhLink = readString(val); break;
        default: break;
      }
    }
    return env;
  } catch {
    return { ...defaultEnvelope(), description: raw };
  }
}

// ---------------------------------- baitapcauhoi.NoiDung -----------------------------

/** Ket qua JsonSerializer.Deserialize<BaiTapCauHoiNoiDung>. `undefined` = JsonValueKind.Undefined. */
export interface NoiDungStrict {
  deBai: unknown;
  dapAn: unknown;
  giaiThich: string | null;
  tieuChi: (string | null)[] | null;
  laTuLuan: boolean;
  loai: string | null;
}

/**
 * Doc NoiDung (gia tri JSON Prisma da parse) dung kieu nhu STJ.
 * Tra null khi JSON la `null`; nem loi khi sai kieu (noi goi tu bat nhu ban .NET).
 */
export function deserializeNoiDung(value: unknown): NoiDungStrict | null {
  if (value === null || value === undefined) return null;
  if (!isPlainObject(value)) throw new StjError('object');
  const r: NoiDungStrict = { deBai: undefined, dapAn: undefined, giaiThich: null, tieuChi: null, laTuLuan: false, loai: '' };
  for (const [k, v] of Object.entries(value)) {
    switch (k.toLowerCase()) {
      case 'debai': r.deBai = v; break;
      case 'dapan': r.dapAn = v; break;
      case 'giaithich': r.giaiThich = readString(v); break;
      case 'tieuchi': r.tieuChi = readStringList(v); break;
      case 'la_tu_luan': r.laTuLuan = readBool(v); break;
      case 'loai': r.loai = readString(v); break;
      case 'tags': readStringList(v); break;
      case 'nhom_bai_goc':
        if (v !== null) {
          if (!isPlainObject(v)) throw new StjError('object');
          for (const [k2, v2] of Object.entries(v)) {
            const key = k2.toLowerCase();
            if (key === 'ma_bai_tap_goc') readGuid(v2);
            else if (key === 'ten_bai_tap_goc') readString(v2);
          }
        }
        break;
      default: break;
    }
  }
  return r;
}

/** JsonElement.ToString(): chuoi -> gia tri, object/mang -> van ban JSON, null -> "". */
export function jsonElementToString(v: unknown): string {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'number') return String(v);
  return JSON.stringify(v);
}

/** ParseQuestionContent: (DapAn, GiaiThich, LaTuLuan); loi -> (null, null, false). */
export function parseQuestionContent(value: unknown): { dapAn: unknown; giaiThich: string | null; laTuLuan: boolean } {
  try {
    const parsed = deserializeNoiDung(value);
    if (!parsed) return { dapAn: null, giaiThich: null, laTuLuan: false };
    return { dapAn: parsed.dapAn === undefined ? null : parsed.dapAn, giaiThich: parsed.giaiThich, laTuLuan: parsed.laTuLuan };
  } catch {
    return { dapAn: null, giaiThich: null, laTuLuan: false };
  }
}

/** JsonDocument.Parse(raw) an toan: rong/loi -> null. */
export function parseJsonText(raw: string | null | undefined): unknown {
  if (raw == null || raw.trim() === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ---------------------------------- Model binding StudentSubmitRequestDto ------------

export interface StudentAnswer {
  maCauHoiDe: string;
  dapAn: unknown;
  danhDauXemLai: boolean;
}

export interface StudentSubmitRequest {
  thoiGianThucTeGiay: number;
  /** Phan tu null duoc STJ chap nhan (ban .NET se loi NullReference khi cham). */
  cauTraLoi: (StudentAnswer | null)[];
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** traceId dang W3C cua ASP.NET ("00-<32 hex>-<16 hex>-00"). */
export const traceId = () => `00-${randomBytes(16).toString('hex')}-${randomBytes(8).toString('hex')}-00`;

export function problem(errors: Record<string, string[]>) {
  return {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
    title: 'One or more validation errors occurred.',
    status: 400,
    errors,
    traceId: traceId(),
  };
}

export function unsupportedMediaType() {
  return {
    type: 'https://tools.ietf.org/html/rfc9110#section-15.5.16',
    title: 'Unsupported Media Type',
    status: 415,
    traceId: traceId(),
  };
}

class BindError extends Error {
  constructor(public path: string, public typeName: string, public pos: number) {
    super(typeName);
  }
}

const tokenText = (v: unknown) => (v !== null && typeof v === 'object' ? (Array.isArray(v) ? '[' : '{') : JSON.stringify(v));

/**
 * Bind body theo [FromBody] + [ApiController] (JsonSerializerDefaults.Web: khong phan biet
 * hoa thuong, so doc duoc tu chuoi). Tra { value } hoac { error } (body ValidationProblem).
 * BytePositionInLine duoc tinh tren JSON gon (axios gui dung dang nay).
 */
export function bindSubmitRequest(body: unknown): { value: StudentSubmitRequest } | { error: ReturnType<typeof problem> } {
  if (body === undefined || body === null) {
    return { error: problem({ '': ['A non-empty request body is required.'], request: ['The request field is required.'] }) };
  }
  let out = '';
  const bytes = (s: string) => Buffer.byteLength(s, 'utf8');
  const fail = (path: string, typeName: string, v: unknown): never => {
    throw new BindError(path, typeName, bytes(out + tokenText(v)));
  };
  const result: StudentSubmitRequest = { thoiGianThucTeGiay: 0, cauTraLoi: [] };
  let cauTraLoiNull = false;
  try {
    if (!isPlainObject(body)) fail('$', 'backend.DTOs.StudentSubmitRequestDto', body);
    const root = body as Record<string, unknown>;
    out += '{';
    Object.entries(root).forEach(([k, v], i) => {
      if (i > 0) out += ',';
      out += `${JSON.stringify(k)}:`;
      const key = k.toLowerCase();
      if (key === 'thoigianthuctegiay') {
        let n: number | null = null;
        if (typeof v === 'number' && Number.isInteger(v)) n = v;
        else if (typeof v === 'string' && /^-?\d+$/.test(v)) n = Number(v);
        if (n === null || n < -2147483648 || n > 2147483647) fail(`$.${k}`, 'System.Int32', v);
        result.thoiGianThucTeGiay = n as number;
        out += JSON.stringify(v);
      } else if (key === 'cautraloi') {
        if (v === null) {
          cauTraLoiNull = true;
          out += 'null';
          return;
        }
        if (!Array.isArray(v)) fail(`$.${k}`, 'System.Collections.Generic.List`1[backend.DTOs.StudentAnswerDto]', v);
        const list: (StudentAnswer | null)[] = [];
        out += '[';
        (v as unknown[]).forEach((item, j) => {
          if (j > 0) out += ',';
          const itemPath = `$.${k}[${j}]`;
          if (item === null) {
            list.push(null);
            out += 'null';
            return;
          }
          if (!isPlainObject(item)) fail(itemPath, 'backend.DTOs.StudentAnswerDto', item);
          const answer: StudentAnswer = { maCauHoiDe: EMPTY_GUID, dapAn: null, danhDauXemLai: false };
          out += '{';
          Object.entries(item as Record<string, unknown>).forEach(([k2, v2], x) => {
            if (x > 0) out += ',';
            out += `${JSON.stringify(k2)}:`;
            const key2 = k2.toLowerCase();
            if (key2 === 'macauhoide') {
              if (!isGuid(v2)) fail(`${itemPath}.${k2}`, 'System.Guid', v2);
              answer.maCauHoiDe = (v2 as string).toLowerCase();
            } else if (key2 === 'dapan') {
              answer.dapAn = v2;
            } else if (key2 === 'danhdauxemlai') {
              if (typeof v2 !== 'boolean') fail(`${itemPath}.${k2}`, 'System.Boolean', v2);
              answer.danhDauXemLai = v2 as boolean;
            }
            out += JSON.stringify(v2);
          });
          out += '}';
          list.push(answer);
        });
        out += ']';
        result.cauTraLoi = list;
      } else {
        out += JSON.stringify(v);
      }
    });
  } catch (e) {
    if (!(e instanceof BindError)) throw e;
    const msg = `The JSON value could not be converted to ${e.typeName}. Path: ${e.path} | LineNumber: 0 | BytePositionInLine: ${e.pos}.`;
    const errors: Record<string, string[]> =
      e.path === '$'
        ? { $: [msg], request: ['The request field is required.'] }
        : { request: ['The request field is required.'], [e.path]: [msg] };
    return { error: problem(errors) };
  }
  if (cauTraLoiNull) return { error: problem({ CauTraLoi: ['The CauTraLoi field is required.'] }) };
  return { value: result };
}

/** Rang buoc {id:guid} cua ASP.NET (Guid.TryParse): nhan dang D, N, B, P. Tra ve dang D chu thuong. */
export function parseRouteGuid(s: string): string | null {
  const t = s.trim();
  let hex: string | null = null;
  let m = /^([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})$/i.exec(t);
  if (!m) m = /^\{([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\}$/i.exec(t);
  if (!m) m = /^\(([0-9a-f]{8})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{4})-([0-9a-f]{12})\)$/i.exec(t);
  if (m) hex = m.slice(1).join('');
  else if (/^[0-9a-f]{32}$/i.test(t)) hex = t;
  if (!hex) return null;
  hex = hex.toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
