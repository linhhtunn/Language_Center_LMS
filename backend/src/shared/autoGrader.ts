// Chuyen tu Helpers/AutoGrader.cs - cham tu dong cac cau khach quan.
//
// Dap an chuan nam trong baitapcauhoi.NoiDung ("dapan"), cau truc khac nhau theo dang bai:
//   chuoi   -> trac nghiem, dien tu      : dung/sai, khong phan biet hoa thuong
//   object  -> noi ghep {trai: phai}     : cham theo ti le cap ghep dung
//   mang    -> sap xep cau, nhieu dap an : cham theo ti le vi tri dung
// Cau tu luan (la_tu_luan = true) khong cham may, tra ve PENDING.

export type KetQua = 'CORRECT' | 'PARTIAL' | 'WRONG' | 'BLANK' | 'PENDING';

export interface GradeResult {
  /** Ti le dung 0..1 */
  tiLe: number;
  ketQua: KetQua;
}

const blank = (): GradeResult => ({ tiLe: 0, ketQua: 'BLANK' });
const pending = (): GradeResult => ({ tiLe: 0, ketQua: 'PENDING' });
const fromRatio = (r: number): GradeResult => ({ tiLe: r, ketQua: r >= 1 ? 'CORRECT' : r > 0 ? 'PARTIAL' : 'WRONG' });

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function hasValue(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (isObject(v)) return Object.keys(v).length > 0;
  return true;
}

function toText(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  // Mang 1 phan tu (vd trac nghiem gui ["A"]) coi nhu chinh phan tu do.
  if (Array.isArray(v)) return v.length === 1 ? toText(v[0]) : v.map(toText).join('|');
  return JSON.stringify(v);
}

const normalize = (s: string) => s.trim().split(' ').filter(Boolean).join(' ');

function sameScalar(expected: unknown, actual: unknown): boolean {
  const a = normalize(toText(expected));
  const b = normalize(toText(actual));
  return a.length > 0 && a.toLowerCase() === b.toLowerCase();
}

function gradeMap(chuan: Record<string, unknown>, hocVien: unknown): GradeResult {
  if (!isObject(hocVien)) return fromRatio(0);
  const keys = Object.keys(chuan);
  if (keys.length === 0) return pending();
  const dung = keys.filter((k) => k in hocVien && sameScalar(chuan[k], hocVien[k])).length;
  return fromRatio(dung / keys.length);
}

function gradeArray(chuan: unknown[], hocVien: unknown): GradeResult {
  if (!Array.isArray(hocVien)) return fromRatio(0);
  if (chuan.length === 0) return pending();
  let dung = 0;
  for (let i = 0; i < chuan.length; i++) if (i < hocVien.length && sameScalar(chuan[i], hocVien[i])) dung++;
  return fromRatio(dung / chuan.length);
}

/** dapAnChuan / dapAnHocVien la gia tri JSON da parse (string | number | array | object | null). */
export function grade(dapAnChuan: unknown, dapAnHocVien: unknown, laTuLuan: boolean): GradeResult {
  if (laTuLuan) return pending();
  if (!hasValue(dapAnHocVien)) return blank();
  if (!hasValue(dapAnChuan)) return pending();
  if (isObject(dapAnChuan)) return gradeMap(dapAnChuan, dapAnHocVien);
  if (Array.isArray(dapAnChuan)) return gradeArray(dapAnChuan, dapAnHocVien);
  return fromRatio(sameScalar(dapAnChuan, dapAnHocVien) ? 1 : 0);
}

/** Schema JSON cua nganhangcauhoi.NoiDungChiTiet va baitapcauhoi.NoiDung (Helpers/BaiTapCauHoiNoiDung.cs). */
export interface BaiTapCauHoiNoiDung {
  debai?: unknown;
  dapan?: unknown;
  giaithich?: string | null;
  tieuchi?: string[] | null;
  la_tu_luan?: boolean;
  loai?: string;
  tags?: string[] | null;
  nhom_bai_goc?: { ma_bai_tap_goc: string; ten_bai_tap_goc: string } | null;
}

/** Parse an toan cot NoiDung (chuoi JSON). Loi -> null. */
export function parseNoiDung(raw: string | null | undefined): BaiTapCauHoiNoiDung | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    return isObject(v) ? (v as BaiTapCauHoiNoiDung) : null;
  } catch {
    return null;
  }
}
