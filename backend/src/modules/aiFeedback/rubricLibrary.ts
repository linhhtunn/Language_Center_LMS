// Chuyen tu Services/AiFeedback/RubricLibrary.cs (phan logic). Noi dung rubric/cach chua/kien thuc nen
// nam o rubricData.ts (sinh tu dong tu file C#, giu nguyen van).
import {
  CachChuaMacDinh,
  CachChuaTheoDang,
  GoiKienThucTheoDang,
  GoiKienThucTheoTag,
  HuongDanChungAi1,
  HuongDanChungAi2,
  HuongDanChungAi3,
  KienThucNen,
  RubricMacDinh,
  RubricTheoDang,
} from './rubricData.js';

export { HuongDanChungAi1, HuongDanChungAi2, HuongDanChungAi3 };

const TagChungChung = new Set(['grammar', 'vocabulary', 'reading', 'cloze_test']);

/** C# string.IsNullOrWhiteSpace */
const isBlank = (s: string | null | undefined) => s == null || s.trim() === '';

function BoDau(text: string): string {
  return text.normalize('NFD').replace(/\p{Mn}/gu, '').normalize('NFC').replaceAll('đ', 'd').replaceAll('Đ', 'D');
}

/**
 * Tim dang bai cho 1 nhom cau hoi: khop tu khoa voi ten bai goc da BO DAU, khong khop thi xet tags
 * (tag xuat hien nhieu nhat truoc, tag chung chung xep sau). Tra ve ma dang va doan rubric + cach chua
 * + kien thuc nen dua vao system prompt.
 */
export function TimDang(tenBaiTapGoc: string | null | undefined, tags: Iterable<string | null | undefined>): { maDang: string | null; noiDung: string } {
  const groups = new Map<string, number>();
  for (const t of tags) {
    if (isBlank(t)) continue;
    const k = t!.trim().toLowerCase();
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  // Array.sort on dinh: giu thu tu xuat hien dau tien khi bang nhau (nhu GroupBy + OrderBy cua LINQ).
  const tagTheoTanSuat = [...groups.entries()]
    .map(([key, count], i) => ({ key, count, i }))
    .sort((a, b) => b.count - a.count || (TagChungChung.has(a.key) ? 1 : 0) - (TagChungChung.has(b.key) ? 1 : 0) || a.i - b.i)
    .map((g) => g.key);

  const ten = BoDau(tenBaiTapGoc ?? '').toLowerCase();
  let dang = isBlank(ten) ? undefined : RubricTheoDang.find((d) => d.tuKhoa.some((k) => ten.includes(k)));

  if (!dang) {
    for (const tag of tagTheoTanSuat) {
      dang = RubricTheoDang.find((d) => d.tags.includes(tag));
      if (dang) break;
    }
  }

  const kienThuc = GhepKienThucNen(dang?.ma ?? null, tagTheoTanSuat);
  if (!dang) return { maDang: null, noiDung: RubricMacDinh + '\n\n' + CachChuaMacDinh + kienThuc };
  const cachChua = CachChuaTheoDang[dang.ma] ?? CachChuaMacDinh;
  return { maDang: dang.ma, noiDung: dang.rubric + '\n\n' + cachChua + kienThuc };
}

/** Kien thuc nen = goi cua dang bai + goi theo chu diem cua cac tag trong nhom. */
function GhepKienThucNen(maDang: string | null, tagTheoTanSuat: string[]): string {
  const maGoi: string[] = [];
  if (maDang != null && maDang in GoiKienThucTheoDang) maGoi.push(GoiKienThucTheoDang[maDang]);
  for (const tag of tagTheoTanSuat) {
    const goi = Object.hasOwn(GoiKienThucTheoTag, tag) ? GoiKienThucTheoTag[tag] : undefined;
    if (goi !== undefined && !maGoi.includes(goi)) maGoi.push(goi);
  }
  if (maGoi.length === 0) return '';
  let sb = '\n\n';
  sb += 'KIẾN THỨC NỀN (chỉ dùng phần liên quan đến từng câu; quy tắc có ngoại lệ – nếu đáp án là ngoại lệ thì nói rõ):\n';
  for (const ma of maGoi) sb += KienThucNen[ma].trimEnd() + '\n';
  return sb.trimEnd();
}
