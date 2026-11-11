// Chuyen tu Services/AiFeedback/AiFeedbackWorker.cs - xu ly tuan tu hang doi AiJob (AI1 -> AI2 -> AI3).
// Loi 1 job khong lam chet worker: log roi bo qua (startAiJobConsumer da bat loi tung job).
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../db.js';
import { enqueueAiJob, startAiJobConsumer, type AiJob } from '../../shared/aiJobQueue.js';
import { Ai1SchemaTraLoi, bindAi1TraLoi, serializeChiTiet, type Ai1ChiTietCau, type Ai1TraLoi } from './ai1KetQua.js';
import { DungNhom, ParseNoiDung, type Ai1Nhom } from './ai1PromptBuilder.js';
import { aiSettings, getLlmClient, type LlmClient } from './llmClient.js';
import { HuongDanChungAi2, HuongDanChungAi3 } from './rubricLibrary.js';

const Decimal = Prisma.Decimal;
type Dec = Prisma.Decimal;

let started = false;

/** Goi 1 lan khi khoi dong server (thay AddHostedService<AiFeedbackWorker>). */
export function startAiFeedbackWorker(signal?: AbortSignal): void {
  if (started) return;
  started = true;
  void startAiJobConsumer((job) => processAiJob(job), signal);
}

export async function processAiJob(job: AiJob, llm: LlmClient = getLlmClient()): Promise<void> {
  try {
    switch (job.kind) {
      case 'Ai1':
        await processAi1(job.maNopBai, llm);
        break;
      case 'Ai2':
        await processAi2(job.maNopBai, llm);
        break;
      case 'Ai3':
        await processAi3(job.maHocSinh, job.maKhoaHoc, llm);
        break;
    }
  } catch (err) {
    console.error('Loi khi xu ly AI job', job, err);
  }
}

async function getCategoryId(groupCode: string, detailCode: string): Promise<number | null> {
  const row = await prisma.chitietdanhmuc.findFirst({
    where: { MaCode: detailCode, nhomdanhmuc: { MaCode: groupCode }, OR: [{ DaXoa: null }, { DaXoa: false }] },
    select: { MaChiTiet: true },
  });
  return row?.MaChiTiet ?? null;
}

const toDec = (v: unknown): Dec | null => (v == null ? null : new Decimal(v as Prisma.Decimal.Value));

// ---- AI 1: nhan xet + tu cham tung nhom bai/dang ----

type ChiTietRow = Prisma.chitietnopbaiGetPayload<{ include: { baitapcauhoi: true } }>;

export async function processAi1(maNopBai: string, llm: LlmClient): Promise<void> {
  if ((await prisma.nhanxetbaitapai1.count({ where: { MaNopBai: maNopBai } })) > 0) {
    console.info(`Nop bai ${maNopBai} da co nhan xet AI1, bo qua.`);
    return;
  }
  const nopBai = await prisma.nopbai.findUnique({
    where: { MaNopBai: maNopBai },
    // EF Include sap theo khoa chinh cua bang con.
    include: { chitietnopbai: { include: { baitapcauhoi: true }, orderBy: { MaChiTiet: 'asc' } } },
  });
  if (!nopBai) {
    console.warn(`Khong tim thay Nopbai ${maNopBai} de tao nhan xet AI1.`);
    return;
  }

  const chamDaChamId = await getCategoryId('TRANG_THAI_CHAM_BAI', 'CHAM_DA_CHAM');
  const chamChoChamId = await getCategoryId('TRANG_THAI_CHAM_BAI', 'CHAM_CHO_CHAM');

  const MAX = 2147483647;
  const chiTietTheoThuTu = [...nopBai.chitietnopbai].sort((a, b) => (a.baitapcauhoi?.ThuTu ?? MAX) - (b.baitapcauhoi?.ThuTu ?? MAX));

  // GroupBy giu thu tu xuat hien dau tien cua khoa (null la 1 nhom rieng).
  const nhomTheoBaiGoc = new Map<string | null, ChiTietRow[]>();
  for (const x of chiTietTheoThuTu) {
    const key = ParseNoiDung(x.baitapcauhoi?.NoiDung)?.nhom_bai_goc?.ma_bai_tap_goc ?? null;
    const list = nhomTheoBaiGoc.get(key);
    if (list) list.push(x);
    else nhomTheoBaiGoc.set(key, [x]);
  }

  const now = Date.now();
  const viecCanLam: { nhanXet: Ai1Row; nhom: Ai1Nhom<ChiTietRow> }[] = [];
  let thuTuNhom = 0;
  for (const [key, items] of nhomTheoBaiGoc) {
    const tenBaiTapGoc = ParseNoiDung(items[0].baitapcauhoi?.NoiDung)?.nhom_bai_goc?.ten_bai_tap_goc ?? null;
    const duLieu = DungNhom(tenBaiTapGoc, items);
    const nhanXet: Ai1Row = {
      MaNhanXet: randomUUID(),
      MaNopBai: maNopBai,
      MaBaiTapGoc: key,
      TenBaiTapGoc: tenBaiTapGoc,
      SoCauTong: items.length,
      SoCauDung: duLieu.SoCauDung,
      TrangThai: 'PENDING',
      // Cot datetime chi chinh xac den giay: lech moi nhom 1 giay de giu dung thu tu bai trong de.
      ThoiGianTao: new Date(now + 1000 * thuTuNhom++),
      NoiDungNhanXet: null,
      ChiTietCauHoi: null,
      DiemTuLuanAiCham: null,
      ThongBaoLoi: null,
      ThoiGianXong: null,
    };
    viecCanLam.push({ nhanXet, nhom: duLieu });
  }

  // Luu truoc cac nhom PENDING: trang ket qua hien "Dang phan tich..." cho tung nhom.
  if (viecCanLam.length > 0) await prisma.nhanxetbaitapai1.createMany({ data: viecCanLam.map((v) => ({ ...v.nhanXet })) });

  // Goi model song song vai nhom, ghi DB tuan tu theo thu tu xong.
  const gioiHan = new Semaphore(aiSettings.ai1SoNhomSongSong());
  const dangChay = new Map<number, Promise<{ i: number; raw: string | null; loi: string | null }>>();
  viecCanLam.forEach((v, i) => dangChay.set(i, goiAi1(i, v.nhanXet, v.nhom, llm, gioiHan)));

  while (dangChay.size > 0) {
    const { i, raw, loi } = await Promise.race(dangChay.values());
    dangChay.delete(i);
    const { nhanXet, nhom } = viecCanLam[i];
    const doiDiem = apDungKetQuaAi1(nhanXet, nhom, raw, loi, chamDaChamId);
    await prisma.$transaction([
      prisma.nhanxetbaitapai1.update({
        where: { MaNhanXet: nhanXet.MaNhanXet },
        data: {
          SoCauDung: nhanXet.SoCauDung,
          NoiDungNhanXet: nhanXet.NoiDungNhanXet,
          ChiTietCauHoi: nhanXet.ChiTietCauHoi,
          DiemTuLuanAiCham: nhanXet.DiemTuLuanAiCham,
          TrangThai: nhanXet.TrangThai,
          ThongBaoLoi: nhanXet.ThongBaoLoi,
          ThoiGianXong: nhanXet.ThoiGianXong,
        },
      }),
      ...doiDiem.map((c) =>
        prisma.chitietnopbai.update({ where: { MaChiTiet: c.MaChiTiet }, data: { DiemDatDuoc: c.DiemDatDuoc as Dec, TrangThaiChamTay: c.TrangThaiChamTay } }),
      ),
    ]);
  }

  // Bai co the vua het cau PENDING sau khi AI tu cham tu luan - cap nhat trang thai cham chung + tong diem.
  if (chamChoChamId != null && chamDaChamId != null) {
    const conPending = nopBai.chitietnopbai.some((x) => x.TrangThaiChamTay === chamChoChamId);
    const diemSo = nopBai.chitietnopbai.reduce((s, x) => s.add(toDec(x.DiemDatDuoc) ?? 0), new Decimal(0));
    await prisma.nopbai.update({
      where: { MaNopBai: maNopBai },
      data: { DiemSo: diemSo, ...(conPending ? {} : { TrangThaiChamBai: chamDaChamId }) },
    });
  }

  enqueueAiJob({ kind: 'Ai2', maNopBai });
}

interface Ai1Row {
  MaNhanXet: string;
  MaNopBai: string;
  MaBaiTapGoc: string | null;
  TenBaiTapGoc: string | null;
  SoCauTong: number;
  SoCauDung: number;
  TrangThai: string;
  ThoiGianTao: Date;
  NoiDungNhanXet: string | null;
  ChiTietCauHoi: string | null;
  DiemTuLuanAiCham: Dec | null;
  ThongBaoLoi: string | null;
  ThoiGianXong: Date | null;
}

class Semaphore {
  private waiters: (() => void)[] = [];
  constructor(private count: number) {}
  async wait() {
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>((r) => this.waiters.push(r));
  }
  release() {
    const w = this.waiters.shift();
    if (w) w();
    else this.count++;
  }
}

/** Goi model cho 1 nhom; khong nem loi - loi tra ve qua `loi` de vong chinh ghi FAILED. */
async function goiAi1(i: number, nhanXet: Ai1Row, nhom: Ai1Nhom<ChiTietRow>, llm: LlmClient, gioiHan: Semaphore) {
  await gioiHan.wait();
  try {
    const raw = await llm.generate(nhom.SystemPrompt, nhom.Prompt, undefined, Ai1SchemaTraLoi());
    return { i, raw, loi: null };
  } catch (err) {
    console.warn(`AI1 loi khi xu ly nhom ${nhanXet.TenBaiTapGoc} cua nop bai ${nhanXet.MaNopBai}`, err);
    return { i, raw: null, loi: (err as Error)?.message ?? String(err) };
  } finally {
    gioiHan.release();
  }
}

const chuoiHoacNull = (text: string | null | undefined): string | null =>
  text == null || text.trim() === '' || text.trim().toLowerCase() === 'null' ? null : text.trim();

/**
 * Ghep JSON AI1 voi du kien tung cau (ket qua, dap an) roi luu ChiTietCauHoi; NoiDungNhanXet chi giu doan tong quan.
 * Cau tu luan duoc AI cham theo diem_tu_luan. Tra ve cac dong chitietnopbai da doi diem (de ghi DB).
 */
export function apDungKetQuaAi1<T extends { MaChiTiet: string; DiemDatDuoc: unknown; TrangThaiChamTay: number | null; baitapcauhoi: { DiemCuaCau: unknown } | null }>(
  nhanXet: Omit<Ai1Row, 'MaNopBai' | 'MaBaiTapGoc' | 'TenBaiTapGoc' | 'SoCauTong' | 'ThoiGianTao' | 'MaNhanXet'>,
  nhom: Ai1Nhom<T & Parameters<typeof DungNhom>[1][number]>,
  raw: string | null,
  loi: string | null,
  chamDaChamId: number | null,
): T[] {
  nhanXet.ThoiGianXong = new Date();
  if (raw == null) {
    nhanXet.TrangThai = 'FAILED';
    nhanXet.ThongBaoLoi = loi;
    return [];
  }

  const traLoi = docTraLoiAi1(raw);
  if (traLoi == null) {
    // Model khong tra JSON dung dang: van luu chu de hoc sinh doc duoc.
    nhanXet.NoiDungNhanXet = raw.trim();
    nhanXet.TrangThai = 'DONE';
    return [];
  }

  const theoStt = new Map<number, Ai1TraLoi['cau_hoi'][number]>();
  for (const x of traLoi.cau_hoi) if (!theoStt.has(x.stt)) theoStt.set(x.stt, x);
  const chiTiet: Ai1ChiTietCau[] = [];
  const diemTuLuan: Dec[] = [];
  const doiDiem: T[] = [];

  for (const cau of nhom.Cau) {
    const ai = theoStt.get(cau.Stt);
    const muc: Ai1ChiTietCau = {
      so_cau: cau.SoCau,
      ket_qua: cau.KetQua,
      dap_an_hoc_sinh: cau.DapAnHocSinh,
      dap_an_dung: cau.DapAnDung,
      stt: cau.Stt,
      phan_tich: ai?.phan_tich ?? [],
      // AI bo sot cau nao thi van con giai thich cua dap an cho hoc sinh doc.
      giai_thich: chuoiHoacNull(ai?.giai_thich) ?? cau.GiaiThichGoc,
      ly_do_sai: null,
      meo_ghi_nho: chuoiHoacNull(ai?.meo_ghi_nho),
      ghi_chu_de: chuoiHoacNull(ai?.ghi_chu_de),
      diem_tu_luan: null,
    };

    const diemAi = ai?.diem_tu_luan;
    if (cau.LaTuLuan && cau.KetQua === 'PENDING' && diemAi != null && chamDaChamId != null) {
      const diem = Math.min(Math.max(diemAi, 0), 100);
      const diemToiDa = toDec(cau.ChiTiet.baitapcauhoi?.DiemCuaCau) ?? new Decimal(1);
      cau.ChiTiet.DiemDatDuoc = diemToiDa.mul(diem).div(100).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
      cau.ChiTiet.TrangThaiChamTay = chamDaChamId;
      doiDiem.push(cau.ChiTiet);

      muc.diem_tu_luan = diem;
      muc.ket_qua = diem >= 100 ? 'CORRECT' : diem > 0 ? 'PARTIAL' : 'WRONG';
      diemTuLuan.push(new Decimal(diem));
    }

    muc.ly_do_sai = muc.ket_qua === 'WRONG' || muc.ket_qua === 'PARTIAL' ? chuoiHoacNull(ai?.ly_do_sai) : null;
    chiTiet.push(muc);
  }

  nhanXet.NoiDungNhanXet = chuoiHoacNull(traLoi.tong_quan) ?? 'AI chưa viết nhận xét chung cho phần này.';
  nhanXet.ChiTietCauHoi = serializeChiTiet(chiTiet);
  nhanXet.SoCauDung = chiTiet.filter((x) => x.ket_qua === 'CORRECT').length;
  nhanXet.DiemTuLuanAiCham =
    diemTuLuan.length > 0
      ? diemTuLuan.reduce((s, d) => s.add(d), new Decimal(0)).div(diemTuLuan.length).toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
      : null;
  nhanXet.TrangThai = 'DONE';
  nhanXet.ThongBaoLoi = null;
  return doiDiem;
}

export function docTraLoiAi1(raw: string): Ai1TraLoi | null {
  const root = tryExtractJsonObject(raw);
  if (root === undefined) return null;
  const traLoi = bindAi1TraLoi(root);
  if (traLoi == null) return null;
  traLoi.cau_hoi = (traLoi.cau_hoi ?? []).filter((x) => x != null);
  return traLoi.cau_hoi.length > 0 || (traLoi.tong_quan != null && traLoi.tong_quan.trim() !== '') ? traLoi : null;
}

// ---- AI 2: tong hop nhan xet ca bai kiem tra ----

export async function processAi2(maNopBai: string, llm: LlmClient): Promise<void> {
  const nopBai = await prisma.nopbai.findUnique({ where: { MaNopBai: maNopBai } });
  if (!nopBai) {
    console.warn(`Khong tim thay Nopbai ${maNopBai} de tao nhan xet AI2.`);
    return;
  }
  const nhomAi1 = await prisma.nhanxetbaitapai1.findMany({ where: { MaNopBai: maNopBai, TrangThai: 'DONE' }, orderBy: { ThoiGianTao: 'asc' } });

  const existing = await prisma.nhanxetdekiemtraai2.findUnique({ where: { MaNopBai: maNopBai } });
  const nhanXet = existing ?? {
    MaNhanXet: randomUUID(),
    MaNopBai: maNopBai,
    ThoiGianTao: new Date(),
    NoiDungNhanXet: null as string | null,
    XepLoai: null as string | null,
    TrangThai: 'PENDING',
    ThongBaoLoi: null as string | null,
    ThoiGianXong: null as Date | null,
  };

  try {
    if (nhomAi1.length === 0) {
      nhanXet.NoiDungNhanXet = 'Chưa có dữ liệu nhận xét chi tiết để tổng hợp.';
      nhanXet.XepLoai = null;
    } else {
      const raw = await llm.generate(HuongDanChungAi2, buildAi2Prompt(nhomAi1));
      const { nhanXet: text, xepLoai } = parseAi2Response(raw);
      nhanXet.NoiDungNhanXet = text;
      nhanXet.XepLoai = xepLoai;
    }
    nhanXet.TrangThai = 'DONE';
    nhanXet.ThongBaoLoi = null;
    nhanXet.ThoiGianXong = new Date();
  } catch (err) {
    console.warn(`AI2 loi khi tong hop nop bai ${maNopBai}`, err);
    nhanXet.TrangThai = 'FAILED';
    nhanXet.ThongBaoLoi = (err as Error)?.message ?? String(err);
    nhanXet.ThoiGianXong = new Date();
  }

  const data = {
    NoiDungNhanXet: nhanXet.NoiDungNhanXet,
    XepLoai: nhanXet.XepLoai,
    TrangThai: nhanXet.TrangThai,
    ThongBaoLoi: nhanXet.ThongBaoLoi,
    ThoiGianXong: nhanXet.ThoiGianXong,
  };
  if (existing == null)
    await prisma.nhanxetdekiemtraai2.create({ data: { MaNhanXet: nhanXet.MaNhanXet, MaNopBai: maNopBai, ThoiGianTao: nhanXet.ThoiGianTao, ...data } });
  else await prisma.nhanxetdekiemtraai2.update({ where: { MaNhanXet: existing.MaNhanXet }, data });

  if (nhanXet.TrangThai !== 'DONE') return;

  const maKhoaHoc = await resolveKhoaHoc(maNopBai);
  if (maKhoaHoc == null) return;

  const nopBaiCungHocSinh = await prisma.nhanxetdekiemtraai2.findMany({
    where: { TrangThai: 'DONE', nopbai: { MaHocSinh: nopBai.MaHocSinh } },
    select: { MaNopBai: true },
  });
  let soLanCungKhoaHoc = 0;
  for (const x of nopBaiCungHocSinh) if ((await resolveKhoaHoc(x.MaNopBai)) === maKhoaHoc) soLanCungKhoaHoc++;
  if (soLanCungKhoaHoc >= 2) enqueueAiJob({ kind: 'Ai3', maHocSinh: nopBai.MaHocSinh, maKhoaHoc });
}

/** Ty le % kieu decimal C#: Math.Round(100m * dung / tong, 1) (lam tron ve so chan), in theo scale cua decimal. */
export function tiLePhanTram(tongDung: number, tongCau: number): string {
  if (!(tongCau > 0)) return '0';
  const num = 100 * tongDung;
  if (num % tongCau === 0) return String(num / tongCau);
  if ((num * 10) % tongCau === 0) return ((num * 10) / tongCau / 10).toFixed(1);
  const n10 = 1000 * tongDung;
  let q = Math.floor(n10 / tongCau);
  const r = n10 - q * tongCau;
  if (2 * r > tongCau || (2 * r === tongCau && q % 2 === 1)) q++;
  return (q / 10).toFixed(1);
}

export function buildAi2Prompt(
  nhomAi1: { TenBaiTapGoc: string | null; SoCauDung: number | null; SoCauTong: number | null; NoiDungNhanXet: string | null; ChiTietCauHoi: string | null }[],
): string {
  const tongDung = nhomAi1.reduce((s, x) => s + (x.SoCauDung ?? 0), 0);
  const tongCau = nhomAi1.reduce((s, x) => s + (x.SoCauTong ?? 0), 0);
  let sb = '';
  sb += `Tong so cau dung/tong: ${tongDung}/${tongCau} (${tiLePhanTram(tongDung, tongCau)}%).\n`;
  sb += 'Nhan xet chi tiet tung bai/dang:\n';
  for (const n of nhomAi1) {
    sb += `--- ${n.TenBaiTapGoc ?? '(khong ro dang)'} (${n.SoCauDung ?? ''}/${n.SoCauTong ?? ''}) ---\n`;
    sb += (n.NoiDungNhanXet ?? '') + '\n';
    const loiCuThe = tomTatLoiChoAi2(n.ChiTietCauHoi);
    if (loiCuThe != null) sb += loiCuThe + '\n';
    sb += '\n';
  }
  return sb;
}

/** 1 lop co the gan nhieu khoa hoc - lay khoa hoc gan lien ket som nhat lam dai dien. */
async function resolveKhoaHoc(maNopBai: string): Promise<string | null> {
  const nb = await prisma.nopbai.findUnique({ where: { MaNopBai: maNopBai }, select: { sukienlophoc: { select: { MaLopHoc: true } } } });
  const maLopHoc = nb?.sukienlophoc?.MaLopHoc;
  if (maLopHoc == null) return null;
  const row = await prisma.chitietkhoahoc_lophoc.findFirst({
    where: { MaLopHoc: maLopHoc, OR: [{ DaXoa: null }, { DaXoa: false }] },
    orderBy: { ThoiGianTao: 'asc' },
    select: { MaKhoaHoc: true },
  });
  return row?.MaKhoaHoc ?? null;
}

// ---- AI 3: so sanh tien bo qua cac lan nop bai ----

const ddMMyyyy = (d: Date | null) =>
  d == null ? '' : `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`;

export async function processAi3(maHocSinh: string, maKhoaHoc: string, llm: LlmClient): Promise<void> {
  const lichSu = await prisma.nhanxetdekiemtraai2.findMany({
    where: { TrangThai: 'DONE', nopbai: { MaHocSinh: maHocSinh } },
    include: { nopbai: true },
    orderBy: { nopbai: { ThoiGianNop: 'asc' } },
  });
  const cungKhoaHoc: typeof lichSu = [];
  for (const item of lichSu) if ((await resolveKhoaHoc(item.nopbai.MaNopBai)) === maKhoaHoc) cungKhoaHoc.push(item);

  if (cungKhoaHoc.length < 2) {
    console.info(`Hoc sinh ${maHocSinh} chua du 2 lan nop bai da cham AI2 trong khoa hoc ${maKhoaHoc}, bo qua AI3.`);
    return;
  }

  const soLanToiDaSoSanh = 5;
  const xetGanDay = cungKhoaHoc.slice(-soLanToiDaSoSanh);
  let sb = '';
  let stt = 1;
  for (const nx of xetGanDay) {
    sb += `--- Lan ${stt} - ${ddMMyyyy(nx.nopbai.ThoiGianNop)} - Xep loai: ${nx.XepLoai ?? '(khong ro)'} ---\n`;
    sb += (nx.NoiDungNhanXet ?? '') + '\n';
    sb += '\n';
    stt++;
  }

  const nhanXet = {
    MaNhanXet: randomUUID(),
    MaHocSinh: maHocSinh,
    MaKhoaHoc: maKhoaHoc,
    DanhSachNopBaiSoSanh: xetGanDay.map((x) => x.nopbai.MaNopBai),
    ThoiGianTao: new Date(),
    NoiDungNhanXet: null as string | null,
    TrangThai: 'PENDING',
    ThongBaoLoi: null as string | null,
    ThoiGianXong: null as Date | null,
  };
  try {
    const raw = await llm.generate(HuongDanChungAi3, sb);
    nhanXet.NoiDungNhanXet = parseAi3Response(raw);
    nhanXet.TrangThai = 'DONE';
  } catch (err) {
    console.warn(`AI3 loi khi so sanh tien bo hoc sinh ${maHocSinh} khoa hoc ${maKhoaHoc}`, err);
    nhanXet.TrangThai = 'FAILED';
    nhanXet.ThongBaoLoi = (err as Error)?.message ?? String(err);
  }
  nhanXet.ThoiGianXong = new Date();
  await prisma.nhanxettienboai3.create({ data: nhanXet });
}

// ---- Tien ich chung ----

/** Vai loi cu the (tu ChiTietCauHoi cua AI1) de AI2 nhan xet sat bai lam hon; gioi han 8 cau, 220 ky tu. */
export function tomTatLoiChoAi2(chiTietJson: string | null): string | null {
  if (chiTietJson == null || chiTietJson.trim() === '') return null;
  let list: unknown;
  try {
    list = JSON.parse(chiTietJson);
  } catch {
    return null;
  }
  if (list === null) return null;
  if (!Array.isArray(list)) return null;
  const get = (o: Record<string, unknown>, name: string) => {
    let f: unknown = undefined;
    for (const k of Object.keys(o)) if (k.toLowerCase() === name) f = o[k];
    return typeof f === 'string' ? f : f === undefined || f === null ? null : undefined;
  };
  const items: { soCau: string; ketQua: string; lyDoSai: string | null; giaiThich: string | null }[] = [];
  for (const x of list) {
    if (x === null || typeof x !== 'object' || Array.isArray(x)) return null;
    const o = x as Record<string, unknown>;
    const soCau = get(o, 'so_cau');
    const ketQua = get(o, 'ket_qua');
    const lyDoSai = get(o, 'ly_do_sai');
    const giaiThich = get(o, 'giai_thich');
    if (soCau === undefined || ketQua === undefined || lyDoSai === undefined || giaiThich === undefined) return null; // sai kieu -> JsonException
    const hasKq = Object.keys(o).some((k) => k.toLowerCase() === 'ket_qua');
    items.push({ soCau: soCau ?? '', ketQua: hasKq ? (ketQua as string) : 'BLANK', lyDoSai, giaiThich });
  }
  const loi = items
    .filter((x) => x.ketQua === 'WRONG' || x.ketQua === 'PARTIAL' || x.ketQua === 'BLANK')
    .slice(0, 8)
    .map((x) => {
      let noiDung = x.lyDoSai ?? x.giaiThich ?? '';
      if (noiDung.length > 220) noiDung = noiDung.slice(0, 220) + '...';
      return `- ${x.soCau} (${x.ketQua === 'BLANK' ? 'bo trong' : 'sai'}): ${noiDung}`;
    });
  return loi.length > 0 ? 'Loi cu the:\n' + loi.join('\n') : null;
}

/** Doc JSON model tra ve, du model co lo them chu/markdown fence xung quanh. undefined = khong doc duoc. */
export function tryExtractJsonObject(raw: string | null): Record<string, unknown> | undefined {
  if (raw == null || raw.trim() === '') return undefined;
  let text = raw.trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end < start) return undefined;
  text = text.slice(start, end + 1);
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseAi2Response(raw: string): { nhanXet: string; xepLoai: string | null } {
  const root = tryExtractJsonObject(raw);
  if (root === undefined) return { nhanXet: raw.trim(), xepLoai: null };
  const nx = root['nhan_xet'];
  const xl = root['xep_loai'];
  return { nhanXet: typeof nx === 'string' ? nx : raw.trim(), xepLoai: typeof xl === 'string' ? xl : null };
}

export function parseAi3Response(raw: string): string {
  const root = tryExtractJsonObject(raw);
  if (root === undefined) return raw.trim();
  const nx = root['nhan_xet'];
  return typeof nx === 'string' ? nx : raw.trim();
}
