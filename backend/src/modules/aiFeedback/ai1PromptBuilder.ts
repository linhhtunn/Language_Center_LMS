// Chuyen tu Services/AiFeedback/Ai1PromptBuilder.cs - dung prompt AI1 tu cac cau hoc sinh da lam trong 1 nhom bai/dang goc.
//   - doan van / huong dan / danh sach tu dung chung chi dua 1 lan o dau nhom;
//   - phuong an viet thanh tung dong, giu the <u> danh dau phan gach chan;
//   - dua them truong ngoai "debai" va "giaithich" cua dap an.
import { grade } from '../../shared/autoGrader.js';
import { HuongDanChungAi1, TimDang } from './rubricLibrary.js';

/** 1 dong chitietnopbai kem cau hoi (baitapcauhoi) - tuong ung Chitietnopbai + MaCauHoiNavigation ben C#. */
export interface ChiTietNopBaiInput {
  MaChiTiet: string;
  DapAnHocVien: unknown; // cot JSON (Prisma da parse)
  DiemDatDuoc: unknown; // Prisma.Decimal | number | null
  TrangThaiChamTay: number | null;
  baitapcauhoi: { NoiDung: unknown; SoCau: string | null; ThuTu: number | null; DiemCuaCau: unknown } | null;
}

export interface Ai1Cau<T extends ChiTietNopBaiInput = ChiTietNopBaiInput> {
  Stt: number;
  ChiTiet: T;
  SoCau: string;
  /** CORRECT | PARTIAL | WRONG | BLANK | PENDING */
  KetQua: string;
  LaTuLuan: boolean;
  DapAnHocSinh: string | null;
  DapAnDung: string | null;
  GiaiThichGoc: string | null;
}

export interface Ai1Nhom<T extends ChiTietNopBaiInput = ChiTietNopBaiInput> {
  SystemPrompt: string;
  Prompt: string;
  Cau: Ai1Cau<T>[];
  SoCauDung: number;
}

/** BaiTapCauHoiNoiDung sau khi doc (System.Text.Json, PropertyNameCaseInsensitive). */
export interface NoiDungDoc {
  debai: unknown; // undefined = khong co truong
  dapan: unknown; // undefined = khong co truong
  giaithich: string | null;
  tieuchi: (string | null)[] | null;
  la_tu_luan: boolean;
  loai: string | null;
  tags: (string | null)[] | null;
  nhom_bai_goc: { ma_bai_tap_goc: string; ten_bai_tap_goc: string | null } | null;
}

const TruongDeBaiDaXuLy = new Set(['cauHoiGoc', 'luaChon', 'doanVanTruoc', 'doanVanSau', 'huongDan', 'doanVan', 'danhSachTu']);
const TruongNgoaiDeBaiBoQua = new Set(['debai', 'dapan', 'giaithich', 'tieuchi', 'la_tu_luan', 'loai', 'tags', 'nhom_bai_goc']);
const DoDaiDoanVanToiDa = 15000;
const GUID_D = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isBlank = (s: string | null | undefined) => s == null || s.trim() === '';

class BindError extends Error {}

function propCI(obj: Record<string, unknown>, name: string): unknown {
  let found: unknown = undefined;
  for (const k of Object.keys(obj)) if (k.toLowerCase() === name) found = obj[k];
  return found;
}
const str = (v: unknown): string | null => {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') throw new BindError();
  return v;
};
const strList = (v: unknown): (string | null)[] | null => {
  if (v === undefined || v === null) return null;
  if (!Array.isArray(v)) throw new BindError();
  return v.map((x) => str(x));
};

/**
 * ParseNoiDung: cot JSON baitapcauhoi.NoiDung -> BaiTapCauHoiNoiDung. Sai kieu (vd la_tu_luan khong phai bool,
 * ma_bai_tap_goc khong phai Guid) thi C# nem JsonException -> null, cau hoi bi bo qua.
 */
export function ParseNoiDung(raw: unknown): NoiDungDoc | null {
  if (!isObj(raw)) return null; // cot JSON chua chuoi/mang/so -> Deserialize loi
  try {
    const ltl = propCI(raw, 'la_tu_luan');
    if (ltl !== undefined && typeof ltl !== 'boolean') throw new BindError();
    const nbgRaw = propCI(raw, 'nhom_bai_goc');
    let nhom: NoiDungDoc['nhom_bai_goc'] = null;
    if (nbgRaw !== undefined && nbgRaw !== null) {
      if (!isObj(nbgRaw)) throw new BindError();
      const ma = propCI(nbgRaw, 'ma_bai_tap_goc');
      let maGuid = EMPTY_GUID;
      if (ma !== undefined) {
        if (typeof ma !== 'string' || !GUID_D.test(ma)) throw new BindError();
        maGuid = ma.toLowerCase();
      }
      const ten = propCI(nbgRaw, 'ten_bai_tap_goc');
      nhom = { ma_bai_tap_goc: maGuid, ten_bai_tap_goc: ten === undefined ? '' : str(ten) };
    }
    const loai = propCI(raw, 'loai');
    return {
      debai: propCI(raw, 'debai'),
      dapan: propCI(raw, 'dapan'),
      giaithich: str(propCI(raw, 'giaithich')),
      tieuchi: strList(propCI(raw, 'tieuchi')),
      la_tu_luan: ltl === true,
      loai: loai === undefined ? '' : str(loai),
      tags: strList(propCI(raw, 'tags')),
      nhom_bai_goc: nhom,
    };
  } catch (e) {
    if (e instanceof BindError) return null;
    throw e;
  }
}

// ---------- Ghi JSON giong System.Text.Json / MySQL ----------

const hex4 = (c: number) => c.toString(16).toUpperCase().padStart(4, '0');

/** Chuoi JSON voi JavaScriptEncoder.Default (JsonNode.ToString()): escape ky tu ngoai ASCII va ky tu HTML. */
function stjDefaultString(s: string): string {
  let out = '"';
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\r') out += '\\r';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\b') out += '\\b';
    else if (ch === '\f') out += '\\f';
    else if (c < 0x20 || c > 0x7e || '"&\'<>+`'.includes(ch)) {
      if (c > 0xffff) {
        const h = c - 0x10000;
        out += '\\u' + hex4(0xd800 + (h >> 10)) + '\\u' + hex4(0xdc00 + (h & 0x3ff));
      } else out += '\\u' + hex4(c);
    } else out += ch;
  }
  return out + '"';
}

/** JsonNode.ToString() cho object/mang: WriteIndented (2 dau cach) + encoder mac dinh. */
function stjIndented(v: unknown, ind = ''): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return stjDefaultString(v);
  if (typeof v !== 'object') return String(v);
  const next = ind + '  ';
  if (Array.isArray(v)) return v.length === 0 ? '[]' : '[\n' + v.map((x) => next + stjIndented(x, next)).join(',\n') + '\n' + ind + ']';
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length === 0 ? '{}' : '{\n' + entries.map(([k, x]) => next + stjDefaultString(k) + ': ' + stjIndented(x, next)).join(',\n') + '\n' + ind + '}';
}

/** JsonNode.ToString(): chuoi -> chinh no, so/bool -> van ban, object/mang -> JSON thut dong. */
function nodeToString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v !== null && typeof v === 'object') return stjIndented(v);
  return String(v);
}

/** ToJsonString(UnsafeRelaxedJsonEscaping): JSON gon, giu nguyen chu Viet va the <u>. */
const relaxedJson = (v: unknown) => JSON.stringify(v);

/** GetRawText() cua JsonElement doc tu cot JSON MySQL: MySQL in JSON voi ", " va ": ". */
function mysqlJson(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return '[' + v.map(mysqlJson).join(', ') + ']';
  return '{' + Object.entries(v as Record<string, unknown>).map(([k, x]) => JSON.stringify(k) + ': ' + mysqlJson(x)).join(', ') + '}';
}

// ---------- Dung nhom ----------

export function DungNhom<T extends ChiTietNopBaiInput>(tenBaiTapGoc: string | null | undefined, items: T[]): Ai1Nhom<T> {
  const cauList: Ai1Cau<T>[] = [];
  const tags: (string | null)[] = [];
  let phanCau = '';
  let huongDan: string | null = null;
  let doanVan: string | null = null;
  let danhSachTu: string | null = null;
  let soCauDung = 0;
  let stt = 0;

  for (const chiTiet of items) {
    const rawNoiDung = chiTiet.baitapcauhoi?.NoiDung;
    const noiDung = ParseNoiDung(rawNoiDung);
    const node = isObj(rawNoiDung) ? rawNoiDung : null;
    if (noiDung == null || node == null) continue;

    stt++;
    tags.push(...(noiDung.tags ?? []));
    const deBai = isObj(node['debai']) ? (node['debai'] as Record<string, unknown>) : null;

    huongDan ??= ChuoiKhongRong(deBai?.['huongDan']);
    doanVan ??= ChuoiKhongRong(deBai?.['doanVan']);
    if (danhSachTu == null) {
      const ds = deBai?.['danhSachTu'];
      danhSachTu = Array.isArray(ds) && ds.length > 0 ? ds.map((x) => (x == null ? '' : nodeToString(x))).join(', ') : null;
    }

    const luaChon = DocLuaChon(deBai?.['luaChon']);
    const dapAnHocVien = chiTiet.DapAnHocVien ?? null;
    const dapAnChuan = noiDung.dapan === undefined ? null : noiDung.dapan;
    const g = grade(dapAnChuan, dapAnHocVien, noiDung.la_tu_luan);
    if (g.ketQua === 'CORRECT') soCauDung++;

    const soCauDb = chiTiet.baitapcauhoi?.SoCau;
    const soCau = isBlank(soCauDb) ? `Câu ${stt}` : soCauDb!;
    const dapAnDungPrompt = MoTaDapAn(dapAnChuan, luaChon);
    const dapAnHocSinhPrompt = MoTaDapAn(dapAnHocVien, luaChon);

    phanCau += `[#${stt}] ${soCau}\n`;
    phanCau += ThemDeBai(node, deBai, luaChon);
    phanCau += `Đáp án đúng: ${dapAnDungPrompt ?? '(không có)'}\n`;
    phanCau += `Học sinh trả lời: ${dapAnHocSinhPrompt ?? '(bỏ trống)'}\n`;
    phanCau += `Kết quả: ${NhanKetQua(g.ketQua, noiDung.la_tu_luan)}\n`;
    if (!isBlank(noiDung.giaithich)) phanCau += `Giải thích tham khảo: ${noiDung.giaithich!.trim()}\n`;
    phanCau += '\n';

    cauList.push({
      Stt: stt,
      ChiTiet: chiTiet,
      SoCau: soCau,
      KetQua: g.ketQua,
      LaTuLuan: noiDung.la_tu_luan,
      DapAnHocSinh: BoTheHtml(dapAnHocSinhPrompt),
      DapAnDung: BoTheHtml(dapAnDungPrompt),
      GiaiThichGoc: isBlank(noiDung.giaithich) ? null : noiDung.giaithich!.trim(),
    });
  }

  let prompt = `DẠNG BÀI: ${tenBaiTapGoc ?? '(không rõ)'}\n`;
  if (huongDan != null) prompt += `HƯỚNG DẪN CỦA ĐỀ: ${huongDan}\n`;
  if (doanVan != null) {
    const doan = doanVan.length > DoDaiDoanVanToiDa ? doanVan.slice(0, DoDaiDoanVanToiDa) + '...' : doanVan;
    prompt += 'ĐOẠN VĂN DÙNG CHUNG CHO CÁC CÂU:\n';
    prompt += '"""\n';
    prompt += doan + '\n';
    prompt += '"""\n';
  }
  if (danhSachTu != null) prompt += `DANH SÁCH TỪ CHO SẴN: ${danhSachTu}\n`;
  prompt += '\n';
  prompt += `CÁC CÂU HỌC SINH ĐÃ LÀM (${cauList.length} câu, đúng ${soCauDung}):\n`;
  prompt += '\n';
  prompt += phanCau;

  const { noiDung: rubricVaCachChua } = TimDang(tenBaiTapGoc, tags);

  return {
    SystemPrompt: HuongDanChungAi1 + '\n\n' + rubricVaCachChua,
    Prompt: prompt,
    Cau: cauList,
    SoCauDung: soCauDung,
  };
}

function ThemDeBai(node: Record<string, unknown>, deBai: Record<string, unknown> | null, luaChon: [string, string][]): string {
  let sb = '';
  const cauHoi = ChuoiKhongRong(deBai?.['cauHoiGoc']);
  if (cauHoi != null) sb += `Câu hỏi: ${cauHoi}\n`;

  const truoc = ChuoiKhongRong(deBai?.['doanVanTruoc']);
  const sau = ChuoiKhongRong(deBai?.['doanVanSau']);
  if (truoc != null || sau != null) sb += `Ngữ cảnh chỗ trống: ${truoc ?? ''} ______ ${sau ?? ''}`.trim() + '\n';

  if (luaChon.length > 0) {
    sb += 'Các phương án:\n';
    for (const [id, text] of luaChon) sb += id === '' ? `  ${text}\n` : `  ${id}. ${text}\n`;
  }

  // Truong con lai (trong va ngoai "debai"): chep JSON de khong bo sot du lieu cua dang moi.
  const khac: Record<string, unknown> = {};
  if (deBai != null) for (const [key, value] of Object.entries(deBai)) if (!TruongDeBaiDaXuLy.has(key) && value != null) khac[key] = value;
  for (const [key, value] of Object.entries(node)) if (!TruongNgoaiDeBaiBoQua.has(key) && value != null) khac[key] = value;
  if (Object.keys(khac).length > 0) sb += `Dữ liệu khác của đề: ${relaxedJson(khac)}\n`;
  return sb;
}

function DocLuaChon(node: unknown): [string, string][] {
  const ketQua: [string, string][] = [];
  if (!Array.isArray(node)) return ketQua;
  for (const item of node) {
    if (isObj(item)) {
      const id = item['id'];
      const text = item['text'];
      ketQua.push([id == null ? '' : nodeToString(id), text == null ? relaxedJson(item) : nodeToString(text)]);
    } else if (item != null) {
      ketQua.push(['', nodeToString(item)]);
    }
  }
  return ketQua;
}

/** Dap an chuoi / mang / object -> mo ta; trung id phuong an thi ghi kem noi dung ("B. trea<u>s</u>ure"). */
function MoTaDapAn(value: unknown, luaChon: [string, string][]): string | null {
  if (value === undefined || value === null) return null;

  const KemNoiDung = (giaTri: string) => {
    const g = giaTri.trim().toLowerCase();
    const pa = luaChon.find(([id]) => id !== '' && id.toLowerCase() === g);
    return pa === undefined ? giaTri : `${pa[0]}. ${pa[1]}`;
  };

  let text: string;
  if (typeof value === 'string') text = KemNoiDung(value);
  else if (Array.isArray(value)) text = value.map((x) => (typeof x === 'string' ? KemNoiDung(x) : mysqlJson(x))).join(' → ');
  else if (isObj(value)) text = Object.entries(value).map(([k, v]) => `${k} → ${typeof v === 'string' ? v : mysqlJson(v)}`).join(' · ');
  else text = mysqlJson(value);

  return isBlank(text) ? null : text;
}

function NhanKetQua(ketQua: string, laTuLuan: boolean): string {
  switch (ketQua) {
    case 'CORRECT':
      return 'ĐÚNG';
    case 'PARTIAL':
      return 'ĐÚNG MỘT PHẦN';
    case 'BLANK':
      return 'BỎ TRỐNG';
    case 'PENDING':
      return laTuLuan ? 'CÂU TỰ LUẬN – bạn phải chấm diem_tu_luan theo rubric' : 'CHỜ CHẤM';
    default:
      return 'SAI';
  }
}

const BoTheHtml = (text: string | null) => (text == null ? null : text.replace(/<[^>]+>/g, ''));

/** Chi nhan gia tri JSON kieu chuoi, khong rong. */
function ChuoiKhongRong(node: unknown): string | null {
  if (typeof node !== 'string') return null;
  return isBlank(node) ? null : node.trim();
}
