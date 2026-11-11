// Chuyen tu Services/AiFeedback/Ai1KetQua.cs - dang JSON AI1 tra ve cho 1 nhom cau hoi
// va dang 1 phan tu luu trong cot nhanxetbaitapai1.ChiTietCauHoi.

/** 1 dong phan tich: 1 phuong an hoac 1 y. */
export interface Ai1MucPhanTich {
  muc: string;
  chi_tiet: string;
  la_dap_an_dung: boolean;
  hoc_sinh_chon: boolean;
}

/** Phan AI viet cho 1 cau ("stt" = so thu tu [#n] trong prompt). */
export interface Ai1CauTraLoi {
  stt: number;
  phan_tich: Ai1MucPhanTich[];
  giai_thich: string | null;
  ly_do_sai: string | null;
  meo_ghi_nho: string | null;
  ghi_chu_de: string | null;
  diem_tu_luan: number | null;
}

export interface Ai1TraLoi {
  cau_hoi: Ai1CauTraLoi[];
  tong_quan: string | null;
}

/** 1 cau trong ChiTietCauHoi: phan AI viet + du kien backend dien (so cau, ket qua, dap an). */
export interface Ai1ChiTietCau extends Ai1CauTraLoi {
  so_cau: string;
  /** CORRECT | PARTIAL | WRONG | BLANK | PENDING */
  ket_qua: string;
  dap_an_hoc_sinh: string | null;
  dap_an_dung: string | null;
}

/**
 * Thu tu khoa khi ghi ChiTietCauHoi giong System.Text.Json: thuoc tinh lop con (Ai1ChiTietCau) truoc,
 * roi den lop cha (Ai1CauTraLoi). Gia tri null van duoc ghi.
 */
export function serializeChiTiet(items: Ai1ChiTietCau[]): string {
  return JSON.stringify(
    items.map((x) => ({
      so_cau: x.so_cau,
      ket_qua: x.ket_qua,
      dap_an_hoc_sinh: x.dap_an_hoc_sinh,
      dap_an_dung: x.dap_an_dung,
      stt: x.stt,
      phan_tich: x.phan_tich.map((p) =>
        p == null ? null : { muc: p.muc, chi_tiet: p.chi_tiet, la_dap_an_dung: p.la_dap_an_dung, hoc_sinh_chon: p.hoc_sinh_chon },
      ),
      giai_thich: x.giai_thich,
      ly_do_sai: x.ly_do_sai,
      meo_ghi_nho: x.meo_ghi_nho,
      ghi_chu_de: x.ghi_chu_de,
      diem_tu_luan: x.diem_tu_luan,
    })),
  );
}

/** Schema dang OpenAPI (Gemini responseSchema) ep model tra dung cau truc Ai1TraLoi. */
export function Ai1SchemaTraLoi(): Record<string, unknown> {
  return {
    type: 'OBJECT',
    properties: {
      cau_hoi: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            stt: { type: 'INTEGER' },
            phan_tich: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  muc: { type: 'STRING' },
                  chi_tiet: { type: 'STRING' },
                  la_dap_an_dung: { type: 'BOOLEAN' },
                  hoc_sinh_chon: { type: 'BOOLEAN' },
                },
                required: ['muc', 'chi_tiet', 'la_dap_an_dung', 'hoc_sinh_chon'],
                propertyOrdering: ['muc', 'chi_tiet', 'la_dap_an_dung', 'hoc_sinh_chon'],
              },
            },
            giai_thich: { type: 'STRING' },
            ly_do_sai: { type: 'STRING', nullable: true },
            meo_ghi_nho: { type: 'STRING', nullable: true },
            ghi_chu_de: { type: 'STRING', nullable: true },
            diem_tu_luan: { type: 'NUMBER', nullable: true },
          },
          required: ['stt', 'phan_tich', 'giai_thich'],
          propertyOrdering: ['stt', 'phan_tich', 'giai_thich', 'ly_do_sai', 'meo_ghi_nho', 'ghi_chu_de', 'diem_tu_luan'],
        },
      },
      tong_quan: { type: 'STRING' },
    },
    required: ['cau_hoi', 'tong_quan'],
    propertyOrdering: ['cau_hoi', 'tong_quan'],
  };
}

// ---------- Doc JSON model tra ve (System.Text.Json: PropertyNameCaseInsensitive + AllowReadingFromString) ----------

class JsonBindError extends Error {}

function prop(obj: Record<string, unknown>, name: string): unknown {
  // Khong phan biet hoa thuong; trung ten thi gia tri sau ghi de (nhu STJ).
  let found: unknown = undefined;
  for (const k of Object.keys(obj)) if (k.toLowerCase() === name) found = obj[k];
  return found;
}

const NUM_STR = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/;

function readInt(v: unknown): number {
  let n: number;
  if (typeof v === 'number') n = v;
  else if (typeof v === 'string' && NUM_STR.test(v)) n = Number(v);
  else throw new JsonBindError('int');
  if (!Number.isInteger(n) || n < -2147483648 || n > 2147483647) throw new JsonBindError('int');
  return n;
}

function readDecimal(v: unknown): number | null {
  if (v === null) return null;
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && NUM_STR.test(v)) return Number(v);
  throw new JsonBindError('decimal');
}

function readString(v: unknown): string | null {
  if (v === null) return null;
  if (typeof v === 'string') return v;
  throw new JsonBindError('string');
}

function readBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  throw new JsonBindError('bool');
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

function readMuc(v: unknown): Ai1MucPhanTich | null {
  if (v === null) return null;
  if (!isObj(v)) throw new JsonBindError('muc');
  const muc = prop(v, 'muc');
  const chiTiet = prop(v, 'chi_tiet');
  const la = prop(v, 'la_dap_an_dung');
  const hs = prop(v, 'hoc_sinh_chon');
  return {
    // string khong nullable nhung STJ van gan null neu JSON la null
    muc: muc === undefined ? '' : (readString(muc) as string),
    chi_tiet: chiTiet === undefined ? '' : (readString(chiTiet) as string),
    la_dap_an_dung: la === undefined ? false : readBool(la),
    hoc_sinh_chon: hs === undefined ? false : readBool(hs),
  };
}

function readCau(v: unknown): Ai1CauTraLoi | null {
  if (v === null) return null;
  if (!isObj(v)) throw new JsonBindError('cau');
  const get = (n: string) => prop(v, n);
  const pt = get('phan_tich');
  let phanTich: Ai1MucPhanTich[] = [];
  if (pt === null) phanTich = null as unknown as Ai1MucPhanTich[];
  else if (pt !== undefined) {
    if (!Array.isArray(pt)) throw new JsonBindError('phan_tich');
    phanTich = pt.map(readMuc) as Ai1MucPhanTich[];
  }
  const str = (n: string) => {
    const x = get(n);
    return x === undefined ? null : readString(x);
  };
  const stt = get('stt');
  const diem = get('diem_tu_luan');
  return {
    stt: stt === undefined ? 0 : readInt(stt),
    phan_tich: phanTich,
    giai_thich: str('giai_thich'),
    ly_do_sai: str('ly_do_sai'),
    meo_ghi_nho: str('meo_ghi_nho'),
    ghi_chu_de: str('ghi_chu_de'),
    diem_tu_luan: diem === undefined ? null : readDecimal(diem),
  };
}

/** Deserialize<Ai1TraLoi>: loi kieu du lieu -> null (nhu bat JsonException ben C#). */
export function bindAi1TraLoi(root: unknown): Ai1TraLoi | null {
  try {
    if (root === null) return null;
    if (!isObj(root)) throw new JsonBindError('root');
    const ch = prop(root, 'cau_hoi');
    let cauHoi: (Ai1CauTraLoi | null)[] | null = [];
    if (ch === null) cauHoi = null;
    else if (ch !== undefined) {
      if (!Array.isArray(ch)) throw new JsonBindError('cau_hoi');
      cauHoi = ch.map(readCau);
    }
    const tq = prop(root, 'tong_quan');
    return { cau_hoi: cauHoi as Ai1CauTraLoi[], tong_quan: tq === undefined ? null : readString(tq) };
  } catch (e) {
    if (e instanceof JsonBindError) return null;
    throw e;
  }
}
