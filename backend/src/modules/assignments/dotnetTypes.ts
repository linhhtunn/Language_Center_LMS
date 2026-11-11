import os from 'node:os';
import { Prisma } from '@prisma/client';

// =====================================================================================
// Cac kieu/ham mo phong hanh vi .NET ma AdminAssignmentController phu thuoc vao:
//  - DateTime doc tu JSON (giu Kind: Unspecified / Utc / Local) va ghi lai dung dinh dang
//  - System.Random(seed) (thuat toan Knuth cu, Net5CompatSeedImpl) de cung seed ra cung de
//  - Chuoi JSON MySQL tra ve cho cot json (EF doc cot json thanh string nguyen van)
//  - So sanh chuoi theo culture (LINQ OrderBy tren string)
// =====================================================================================

export type Decimal = Prisma.Decimal;
export const Dec = Prisma.Decimal;
export const dec = (v: number | string | Prisma.Decimal) => new Prisma.Decimal(v);
export const isDecimal = (v: unknown): v is Prisma.Decimal => Prisma.Decimal.isDecimal(v);

/** Math.Round(decimal, 2, MidpointRounding.AwayFromZero) */
export const roundAway2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
/** Math.Round(decimal, 2) - mac dinh ToEven */
export const roundEven2 = (d: Prisma.Decimal) => d.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_EVEN);

// ------------------------------- DateTime ---------------------------------------------

export type DateTimeKind = 'Unspecified' | 'Utc' | 'Local';

/**
 * DateTime cua .NET: `ms` = gio "tren dong ho" (wall clock) tinh nhu UTC epoch ms,
 * `sub` = phan le duoi 1ms tinh theo tick 100ns (0..9999), `kind` = DateTimeKind.
 * Phep so sanh DateTime ben .NET bo qua Kind nen chi so (ms, sub).
 */
export interface DotnetDateTime {
  ms: number;
  sub: number;
  kind: DateTimeKind;
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

const ISO_RE =
  /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,16}))?)?(Z|[+-]\d{2}(?::?\d{2})?)?)?$/;

/** Doc DateTime theo System.Text.Json (ISO 8601-1:2019). Sai dinh dang -> null. */
export function parseJsonDateTime(s: string): DotnetDateTime | null {
  const m = ISO_RE.exec(s);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, frac, zone] = m;
  const Y = +y, M = +mo, D = +d, H = hh ? +hh : 0, MI = mi ? +mi : 0, S = ss ? +ss : 0;
  if (M < 1 || M > 12 || D < 1 || H > 23 || MI > 59 || S > 59) return null;
  const check = new Date(Date.UTC(2000, M - 1, D, H, MI, S));
  check.setUTCFullYear(Y, M - 1, D);
  const base = check.getTime();
  if (check.getUTCFullYear() !== Y || check.getUTCMonth() !== M - 1 || check.getUTCDate() !== D) return null;
  const f7 = (frac ?? '').slice(0, 7).padEnd(7, '0');
  const ms = Number(f7.slice(0, 3));
  const sub = Number(f7.slice(3));
  let wall = base + ms;
  let kind: DateTimeKind = 'Unspecified';
  if (zone === 'Z') kind = 'Utc';
  else if (zone) {
    const sign = zone[0] === '-' ? -1 : 1;
    const digits = zone.slice(1).replace(':', '');
    const oh = +digits.slice(0, 2);
    const om = digits.length > 2 ? +digits.slice(2, 4) : 0;
    if (oh > 14 || om > 59) return null;
    // Chuyen ve gio dia phuong cua may chu (process chay TZ=UTC).
    const utc = wall - sign * (oh * 60 + om) * 60000;
    wall = utc - new Date(utc).getTimezoneOffset() * 60000;
    kind = 'Local';
  }
  return { ms: wall, sub, kind };
}

/** Ghi DateTime nhu System.Text.Json: yyyy-MM-ddTHH:mm:ss[.fffffff bo so 0 cuoi][Z|+hh:mm]. */
export function formatJsonDateTime(v: DotnetDateTime): string {
  const d = new Date(v.ms);
  let s = `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  const frac = `${pad(d.getUTCMilliseconds(), 3)}${pad(v.sub, 4)}`.replace(/0+$/, '');
  if (frac) s += `.${frac}`;
  if (v.kind === 'Utc') s += 'Z';
  else if (v.kind === 'Local') {
    const off = -new Date(v.ms).getTimezoneOffset();
    const a = Math.abs(off);
    s += `${off < 0 ? '-' : '+'}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
  }
  return s;
}

/** DateTime.CompareTo (bo qua Kind). */
export function compareDateTime(a: DotnetDateTime, b: DotnetDateTime): number {
  return a.ms !== b.ms ? a.ms - b.ms : a.sub - b.sub;
}

export const addMinutes = (v: DotnetDateTime, minutes: number): DotnetDateTime => ({ ...v, ms: v.ms + minutes * 60000 });

/** Ghi DateTime vao cot DATETIME: EF/Pomelo ghi nguyen gio tren dong ho, khong doi mui gio. */
export const toDbDate = (v: DotnetDateTime | null | undefined): Date | null => (v ? new Date(v.ms) : null);

/** DateTime.Now (process chay UTC) duoi dang DotnetDateTime Kind=Local. */
export const nowDotnet = (): DotnetDateTime => ({ ms: Date.now(), sub: 0, kind: 'Local' });

/** DateTime.Today -> DateOnly dung cho cot DATE. */
export function todayDateOnly(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/** DateTime.Now.ToString(format) cho cac dinh dang yyMMdd / yyMMddHHmmss. */
export function formatNow(fmt: 'yyMMdd' | 'yyMMddHHmmss'): string {
  const d = new Date();
  const base = `${pad(d.getUTCFullYear() % 100)}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
  return fmt === 'yyMMdd' ? base : `${base}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

// ------------------------------- System.Random ---------------------------------------

/** new Random(seed) cua .NET (thuat toan subtractive cua Knuth - Net5CompatSeedImpl). */
export class DotnetRandom {
  private readonly seedArray = new Array<number>(56).fill(0);
  private inext = 0;
  private inextp = 21;

  constructor(seed: number) {
    const MBIG = 2147483647;
    const MSEED = 161803398;
    const subtraction = seed === -2147483648 ? MBIG : Math.abs(seed);
    let mj = MSEED - subtraction;
    this.seedArray[55] = mj;
    let mk = 1;
    let ii = 0;
    for (let i = 1; i < 55; i++) {
      if ((ii += 21) >= 55) ii -= 55;
      this.seedArray[ii] = mk;
      mk = mj - mk;
      if (mk < 0) mk += MBIG;
      mj = this.seedArray[ii];
    }
    for (let k = 1; k < 5; k++) {
      for (let i = 1; i < 56; i++) {
        let n = i + 30;
        if (n >= 55) n -= 55;
        this.seedArray[i] -= this.seedArray[1 + n];
        if (this.seedArray[i] < 0) this.seedArray[i] += MBIG;
      }
    }
  }

  private internalSample(): number {
    const MBIG = 2147483647;
    let locINext = this.inext;
    if (++locINext >= 56) locINext = 1;
    let locINextp = this.inextp;
    if (++locINextp >= 56) locINextp = 1;
    let retVal = this.seedArray[locINext] - this.seedArray[locINextp];
    if (retVal === MBIG) retVal--;
    if (retVal < 0) retVal += MBIG;
    this.seedArray[locINext] = retVal;
    this.inext = locINext;
    this.inextp = locINextp;
    return retVal;
  }

  /** Random.Next(maxValue) */
  next(maxValue: number): number {
    return Math.trunc(this.internalSample() * (1.0 / 2147483647) * maxValue);
  }
}

/** Environment.TickCount (ms tu luc khoi dong may, kieu int32). */
export const tickCount = () => Math.trunc(os.uptime() * 1000) | 0;

/** Fisher-Yates tai cho, dung chung mot Random de tai lap duoc theo seed. */
export function shuffle<T>(items: T[], random: DotnetRandom): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = random.next(i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
}

export function pickDistinct<T>(pool: readonly T[], count: number, random: DotnetRandom): T[] {
  const copy = [...pool];
  shuffle(copy, random);
  return copy.slice(0, Math.max(0, count));
}

// ------------------------------- So sanh chuoi ---------------------------------------

const collator = new Intl.Collator('und');
/** Comparer<string>.Default (InvariantCulture, ICU) - null dung truoc. */
export function cultureCompare(a: string | null | undefined, b: string | null | undefined): number {
  if (a == null) return b == null ? 0 : -1;
  if (b == null) return 1;
  return collator.compare(a, b);
}

/** Enumerable.OrderBy (on dinh). */
export function stableSortBy<T>(items: readonly T[], cmp: (a: T, b: T) => number): T[] {
  return items
    .map((v, i) => ({ v, i }))
    .sort((x, y) => cmp(x.v, y.v) || x.i - y.i)
    .map((x) => x.v);
}

// ------------------------------- Chuoi JSON kieu MySQL -------------------------------

const utf8Len = (s: string) => Buffer.byteLength(s, 'utf8');

function mysqlKeyCompare(a: string, b: string): number {
  const la = utf8Len(a), lb = utf8Len(b);
  if (la !== lb) return la - lb;
  return Buffer.compare(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
}

/** Thu tu key ma MySQL luu trong cot json: theo do dai roi theo byte. */
export const mysqlSortedKeys = (o: Record<string, unknown>) => Object.keys(o).sort(mysqlKeyCompare);

function mysqlString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === '"') out += '\\"';
    else if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (c < 0x20) out += `\\u${c.toString(16).padStart(4, '0')}`;
    else out += ch;
  }
  return out + '"';
}

/**
 * Chuoi ma MySQL tra ve khi doc cot json (EF Core doc cot json thanh string nguyen van):
 * `{"a": 1, "b": [1, 2]}` - co khoang trang sau ':' va ',', key sap theo do dai.
 */
export function mysqlJsonText(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return mysqlString(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (isDecimal(v)) return v.toString();
  if (Array.isArray(v)) return `[${v.map(mysqlJsonText).join(', ')}]`;
  const o = v as Record<string, unknown>;
  return `{${mysqlSortedKeys(o).map((k) => `${mysqlString(k)}: ${mysqlJsonText(o[k])}`).join(', ')}}`;
}

/** Gia tri Prisma tra ve cho cot json -> "string" EF doc duoc (null giu null). */
export const jsonColumnText = (v: unknown): string | null => (v === null || v === undefined ? null : mysqlJsonText(v));

/** Doi gia tri (co the chua Decimal / DotnetDateTime) thanh JSON thuan de ghi vao cot json qua Prisma. */
export function toJsonValue(v: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(v, function (this: Record<string, unknown>, key: string, value: unknown) {
    const raw = this[key];
    if (isDecimal(raw)) return (raw as Prisma.Decimal).toNumber();
    return value;
  })) as Prisma.InputJsonValue;
}
