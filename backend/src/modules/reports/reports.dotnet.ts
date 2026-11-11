
// =====================================================================================
// Cac ham mo phong DUNG HANH VI .NET ma ReportsService.cs dung, de so lieu (ke ca so "gia lap"
// deterministic khi DB trong) ra giong het ban cu:
//  - Math.Round mac dinh cua C# la lam tron ngan hang (MidpointRounding.ToEven).
//  - new Random(seed) cua .NET dung thuat toan Knuth subtractive (Net5CompatSeedImpl).
//  - HashSeed = BitConverter.ToInt32(MD5(UTF8(input)), 0).
// =====================================================================================

const INT_MAX = 2147483647;

/** Math.Round(double) cua .NET: lam tron ve so nguyen gan nhat, dung giua thi ve so chan. */
export function roundHalfEven(x: number): number {
  if (!Number.isFinite(x)) return x;
  const f = Math.floor(x);
  const diff = x - f;
  if (diff < 0.5) return f;
  if (diff > 0.5) return f + 1;
  return f % 2 === 0 ? f : f + 1;
}

/** Math.Round(double, digits) cua .NET 8 (ToEven): nhan 10^digits, Round, chia lai. */
export function dotnetRound(value: number, digits = 0): number {
  if (digits === 0) return roundHalfEven(value);
  if (Math.abs(value) < 1e16) {
    const power10 = 10 ** digits;
    return roundHalfEven(value * power10) / power10;
  }
  return value;
}

/** Enumerable.Average(double) cua .NET: cong tuan tu roi chia. Danh sach rong -> nem loi nhu .NET. */
export function average(values: number[]): number {
  if (values.length === 0) throw new Error('Sequence contains no elements');
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

// (Ban .NET co HashSeed/Random/SeededNumber/SeededInt de BIA so lieu bao cao - ban Node da bo.)

/** Guid.ToString("N"): 32 ky tu hex thuong, khong gach. */
export const guidN = (id: string) => id.toLowerCase().replaceAll('-', '');

const GUID_D = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GUID_N = /^[0-9a-f]{32}$/i;

/**
 * Guid.TryParse cua .NET (dung cho rang buoc route {x:guid} va [FromQuery] Guid): chap nhan dang
 * D (co gach), N (32 so), B {..} va P (..). Tra ve chuoi dang D chu thuong, sai dinh dang -> null.
 */
export function parseGuid(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('(') && s.endsWith(')'))) s = s.slice(1, -1);
  if (GUID_D.test(s)) return s.toLowerCase();
  if (GUID_N.test(s)) {
    const n = s.toLowerCase();
    return `${n.slice(0, 8)}-${n.slice(8, 12)}-${n.slice(12, 16)}-${n.slice(16, 20)}-${n.slice(20)}`;
  }
  return null;
}

/** string.IsNullOrWhiteSpace (char.IsWhiteSpace khong coi U+FEFF la khoang trang). */
export function isNullOrWhiteSpace(s: string | null | undefined): boolean {
  if (s == null) return true;
  return /^[\s]*$/u.test(s) && !s.includes('﻿');
}

/**
 * So sanh chuoi mac dinh cua .NET (CurrentCulture). Container .NET chay khong dat LANG nen la
 * InvariantCulture + ICU -> tuong duong bo so sanh goc (root) cua ICU.
 */
export const cultureCompare = new Intl.Collator('und').compare;

/** double.ToString() cua .NET (InvariantCulture, dang ngan nhat khu hoi) cho cac gia tri thong thuong. */
export const fmtDouble = (n: number) => String(n);

/**
 * double.ToString("F<digits>") cua .NET Core 3.0+: lam tron tu gia tri nhi phan CHINH XAC; neu dung giua
 * thi ve chu so chan (Dragon4 cua .NET) - vd 9.25 -> "9.2", 7.75 -> "7.8" (JS toFixed cho "9.3").
 */
export function fmtFixed(n: number, digits: number): string {
  if (!Number.isFinite(n)) return String(n);
  const neg = n < 0 || Object.is(n, -0);
  const exact = Math.abs(n).toFixed(100); // khai trien thap phan chinh xac cua so double
  const [intPart, frac] = exact.split('.');
  const kept = intPart + frac.slice(0, digits);
  const rest = frac.slice(digits);
  let roundUp: boolean;
  if (rest[0] > '5') roundUp = true;
  else if (rest[0] < '5') roundUp = false;
  else if (/[1-9]/.test(rest.slice(1))) roundUp = true;
  else roundUp = Number(kept[kept.length - 1]) % 2 === 1; // dung giua -> chan
  let digitsStr = kept;
  if (roundUp) {
    const arr = kept.split('').map(Number);
    let i = arr.length - 1;
    while (i >= 0) {
      if (arr[i] === 9) {
        arr[i] = 0;
        i--;
      } else {
        arr[i]++;
        break;
      }
    }
    digitsStr = (i < 0 ? '1' : '') + arr.join('');
  }
  const ip = digitsStr.slice(0, digitsStr.length - digits).replace(/^0+(?=\d)/, '') || '0';
  const fp = digits > 0 ? '.' + digitsStr.slice(digitsStr.length - digits) : '';
  const out = ip + fp;
  return neg && /[1-9]/.test(out) ? '-' + out : out;
}

/** double.ToString("F1"). */
export const fmtF1 = (n: number) => fmtFixed(n, 1);

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

/** DateTime.ToString("yyyy-MM-dd HH:mm:ss") voi Date doc tu Prisma (gio UTC = gio trong DB). */
export function fmtDateTime(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** DateOnly.ToString("yyyy-MM-dd"). */
export function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** DateOnly.FromDateTime(DateTime.UtcNow) -> Date luc 00:00 UTC. */
export function todayUtc(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400000);
}

/** "\"" + s.Replace("\"", "\"\"") + "\"" - o CSV co dau nhay kep. */
export const csvQuote = (s: string) => `"${s.replaceAll('"', '""')}"`;

/** StringBuilder.AppendLine tren Linux (ban .NET chay trong container Linux) -> "\n". */
export const NL = '\n';
