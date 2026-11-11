import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Prisma } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { prisma } from '../src/db.js';
import { Ai1SchemaTraLoi, serializeChiTiet } from '../src/modules/aiFeedback/ai1KetQua.js';
import { DungNhom, ParseNoiDung, type ChiTietNopBaiInput } from '../src/modules/aiFeedback/ai1PromptBuilder.js';
import { ChuyenSchema, ClaudeLlmClient, GeminiLlmClient, docNoiDungGemini, taoThamSoClaude, type LlmClient } from '../src/modules/aiFeedback/llmClient.js';
import { HuongDanChungAi1, HuongDanChungAi2, HuongDanChungAi3, TimDang } from '../src/modules/aiFeedback/rubricLibrary.js';
import {
  apDungKetQuaAi1,
  buildAi2Prompt,
  parseAi2Response,
  parseAi3Response,
  processAiJob,
  tiLePhanTram,
  tomTatLoiChoAi2,
} from '../src/modules/aiFeedback/worker.js';
import { _pendingAiJobs } from '../src/shared/aiJobQueue.js';

// Ket qua chuan sinh bang cach chay backend.dll goc (.NET 8, container Linux) tren cung fixture.
const golden = JSON.parse(readFileSync(new URL('./fixtures/aiFeedback.golden.json', import.meta.url), 'utf8'));
const IN = golden.input;
const OUT = golden.output;

type Item = { NoiDung: string; DapAnHocVien?: string | null; SoCau?: string | null; DiemCuaCau?: number | null; ThuTu?: number | null };
/** Gia lap dong Prisma: cot JSON da parse (giong Prisma doc tu MySQL). */
function toRows(items: Item[]): ChiTietNopBaiInput[] {
  return items.map((it) => ({
    MaChiTiet: randomUUID(),
    DapAnHocVien: it.DapAnHocVien == null ? null : JSON.parse(it.DapAnHocVien),
    DiemDatDuoc: new Prisma.Decimal(0),
    TrangThaiChamTay: null,
    baitapcauhoi: { NoiDung: JSON.parse(it.NoiDung), SoCau: it.SoCau ?? null, ThuTu: it.ThuTu ?? null, DiemCuaCau: it.DiemCuaCau ?? null },
  }));
}

describe('RubricLibrary (doi chieu .NET)', () => {
  it('huong dan chung AI1/AI2/AI3 giong het', () => {
    expect(HuongDanChungAi1).toBe(OUT.huongDanAi1);
    expect(HuongDanChungAi2).toBe(OUT.huongDanAi2);
    expect(HuongDanChungAi3).toBe(OUT.huongDanAi3);
  });
  it('TimDang: ma dang + rubric + cach chua + kien thuc nen', () => {
    IN.timDang.forEach(([ten, tags]: [string | null, string[]], i: number) => {
      expect(TimDang(ten, tags), `case ${i} ${ten}`).toEqual({ maDang: OUT.timDang[i].maDang, noiDung: OUT.timDang[i].noiDung });
    });
  });
});

describe('Ai1PromptBuilder (doi chieu .NET)', () => {
  it('ParseNoiDung: khoa nhom + ten bai goc, sai kieu -> null', () => {
    IN.parseNoiDung.forEach((s: string, i: number) => {
      const nd = ParseNoiDung(JSON.parse(s));
      const exp = OUT.groupKey[i];
      expect(nd != null, `case ${i}`).toBe(exp.ok);
      expect(nd?.nhom_bai_goc?.ma_bai_tap_goc ?? null).toBe(exp.key);
      expect(nd?.nhom_bai_goc?.ten_bai_tap_goc ?? null).toBe(exp.ten);
    });
  });
  it('DungNhom: system prompt, prompt va du kien tung cau', () => {
    IN.nhom.forEach((g: { ten: string | null; items: Item[] }, i: number) => {
      const rows = toRows(g.items);
      const nhom = DungNhom(g.ten, rows);
      const exp = OUT.nhom[i];
      expect(nhom.SystemPrompt, `nhom ${i} system`).toBe(exp.systemPrompt);
      expect(nhom.Prompt, `nhom ${i} prompt`).toBe(exp.prompt);
      expect(nhom.SoCauDung).toBe(exp.soCauDung);
      expect(
        nhom.Cau.map((c) => ({
          stt: c.Stt,
          soCau: c.SoCau,
          ketQua: c.KetQua,
          laTuLuan: c.LaTuLuan,
          dapAnHocSinh: c.DapAnHocSinh,
          dapAnDung: c.DapAnDung,
          giaiThichGoc: c.GiaiThichGoc,
          index: rows.indexOf(c.ChiTiet),
        })),
      ).toEqual(exp.cau);
    });
  });
});

describe('Ai1KetQua / ApDungKetQuaAi1 (doi chieu .NET)', () => {
  it('doc JSON AI1, cham tu luan, ghi ChiTietCauHoi giong het', () => {
    IN.apDung.forEach((c: { nhom: number; raw: string | null; loi?: string; cham: number | null }, i: number) => {
      const rows = toRows(IN.nhom[c.nhom].items);
      const nhom = DungNhom(IN.nhom[c.nhom].ten, rows);
      const nx = { SoCauDung: nhom.SoCauDung, TrangThai: 'PENDING', NoiDungNhanXet: null, ChiTietCauHoi: null, DiemTuLuanAiCham: null, ThongBaoLoi: null, ThoiGianXong: null } as Parameters<typeof apDungKetQuaAi1>[0];
      apDungKetQuaAi1(nx, nhom, c.raw ?? null, c.loi ?? null, c.cham ?? null);
      const exp = OUT.apDung[i];
      expect(nx.TrangThai, `case ${i}`).toBe(exp.TrangThai);
      expect(nx.ThongBaoLoi).toBe(exp.ThongBaoLoi);
      expect(nx.NoiDungNhanXet).toBe(exp.NoiDungNhanXet);
      expect(nx.ChiTietCauHoi, `case ${i} chitiet`).toBe(exp.ChiTietCauHoi);
      expect(nx.SoCauDung).toBe(exp.SoCauDung);
      expect(nx.DiemTuLuanAiCham?.toString() ?? null).toBe(exp.DiemTuLuanAiCham);
      expect(rows.map((r) => ({ DiemDatDuoc: String(r.DiemDatDuoc), TrangThaiChamTay: r.TrangThaiChamTay }))).toEqual(exp.items);
      expect(nx.ThoiGianXong).toBeInstanceOf(Date);
    });
  });
  it('schema Gemini + schema Claude (ChuyenSchema) giong het', () => {
    expect(Ai1SchemaTraLoi()).toEqual(OUT.geminiSchema);
    expect(JSON.stringify(ChuyenSchema(Ai1SchemaTraLoi()))).toBe(JSON.stringify(OUT.claudeSchema));
  });
  it('serializeChiTiet giu thu tu khoa cua System.Text.Json', () => {
    const s = serializeChiTiet([
      { so_cau: 'Câu 1', ket_qua: 'WRONG', dap_an_hoc_sinh: 'a', dap_an_dung: 'b', stt: 1, phan_tich: [], giai_thich: 'g', ly_do_sai: null, meo_ghi_nho: null, ghi_chu_de: null, diem_tu_luan: null },
    ]);
    expect(Object.keys(JSON.parse(s)[0])).toEqual(['so_cau', 'ket_qua', 'dap_an_hoc_sinh', 'dap_an_dung', 'stt', 'phan_tich', 'giai_thich', 'ly_do_sai', 'meo_ghi_nho', 'ghi_chu_de', 'diem_tu_luan']);
  });
});

describe('AI2/AI3 helpers (doi chieu .NET)', () => {
  it('ParseAi2Response / ParseAi3Response', () => {
    IN.ai2.forEach((r: string, i: number) => expect(parseAi2Response(r)).toEqual({ nhanXet: OUT.ai2[i].nhanXet, xepLoai: OUT.ai2[i].xepLoai }));
    IN.ai3.forEach((r: string, i: number) => expect(parseAi3Response(r)).toBe(OUT.ai3[i]));
  });
  it('TomTatLoiChoAi2', () => {
    IN.tomTat.forEach((r: string | null, i: number) => expect(tomTatLoiChoAi2(r), `case ${i}`).toBe(OUT.tomTat[i]));
  });
  it('ty le % theo decimal C# (Math.Round ve so chan)', () => {
    IN.tiLe.forEach(([d, c]: [number, number], i: number) => expect(tiLePhanTram(d, c), `${d}/${c}`).toBe(OUT.tiLe[i]));
  });
  it('prompt AI2 ghep nhan xet tung nhom + loi cu the', () => {
    const p = buildAi2Prompt([
      { TenBaiTapGoc: 'I. Phát âm', SoCauDung: 2, SoCauTong: 3, NoiDungNhanXet: 'Tốt', ChiTietCauHoi: IN.tomTat[2] },
      { TenBaiTapGoc: null, SoCauDung: null, SoCauTong: 1, NoiDungNhanXet: null, ChiTietCauHoi: null },
    ]);
    expect(p).toBe(
      'Tong so cau dung/tong: 2/4 (50%).\nNhan xet chi tiet tung bai/dang:\n--- I. Phát âm (2/3) ---\nTốt\n' +
        OUT.tomTat[2] +
        '\n\n--- (khong ro dang) (/1) ---\n\n\n',
    );
  });
});

// ---------------- LLM client (gia lap HTTP, khong goi API that) ----------------

function sse(events: unknown[]): Response {
  const body = events.map((e) => `event: ${(e as { type: string }).type}\ndata: ${JSON.stringify(e)}\n\n`).join('');
  return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

describe('ClaudeLlmClient', () => {
  const saved = { ...config.ai };
  afterAll(() => Object.assign(config.ai, saved));

  it('thieu API key -> loi giong ban .NET', async () => {
    config.ai.anthropicApiKey = '';
    await expect(new ClaudeLlmClient().generate('s', 'u')).rejects.toThrow('Chua cau hinh Claude:ApiKey');
  });

  it('tham so request giong C#: model, max_tokens 64000, system, structured output', () => {
    const p = taoThamSoClaude('claude-opus-5-5', 'SYS', 'USER', Ai1SchemaTraLoi());
    expect(p.model).toBe('claude-opus-5-5');
    expect(p.max_tokens).toBe(64000);
    expect(p.system).toBe('SYS');
    expect(p.messages).toEqual([{ role: 'user', content: 'USER' }]);
    expect(p.output_config).toEqual({ format: { type: 'json_schema', schema: OUT.claudeSchema } });
    expect('output_config' in taoThamSoClaude('m', 's', 'u', null)).toBe(false);
  });

  it('streaming: ghep text delta; schema bi tu choi (400) -> goi lai khong schema', async () => {
    config.ai.anthropicApiKey = 'test-key';
    const bodies: any[] = [];
    const fakeFetch = (async (_url: unknown, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      bodies.push(body);
      if (body.output_config?.format) return new Response(JSON.stringify({ type: 'error', error: { type: 'invalid_request_error', message: 'bad schema' } }), { status: 400, headers: { 'content-type': 'application/json' } });
      return sse([
        { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'x', content: [], stop_reason: null, usage: { input_tokens: 12, output_tokens: 0 } } },
        { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"nhan_' } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'xet":"ok"}' } },
        { type: 'content_block_stop', index: 0 },
        { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 5 } },
        { type: 'message_stop' },
      ]);
    }) as typeof fetch;
    const text = await new ClaudeLlmClient(fakeFetch).generate('SYS', 'USER', undefined, Ai1SchemaTraLoi());
    expect(text).toBe('{"nhan_xet":"ok"}');
    expect(bodies).toHaveLength(2);
    expect(bodies[0]).toMatchObject({ model: config.ai.claudeModel, max_tokens: 64000, system: 'SYS', stream: true });
    expect(bodies[1].output_config).toBeUndefined();
  });

  it('stop_reason max_tokens -> loi bi cat ngang', async () => {
    config.ai.anthropicApiKey = 'test-key';
    const fakeFetch = (async () =>
      sse([
        { type: 'message_start', message: { id: 'm', type: 'message', role: 'assistant', model: 'x', content: [], stop_reason: null, usage: { input_tokens: 1, output_tokens: 0 } } },
        { type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '{"a"' } },
        { type: 'message_delta', delta: { stop_reason: 'max_tokens' }, usage: { output_tokens: 5 } },
        { type: 'message_stop' },
      ])) as unknown as typeof fetch;
    await expect(new ClaudeLlmClient(fakeFetch).generate('s', 'u')).rejects.toThrow('Claude bi cat ngang vi vuot Claude:MaxTokens');
  });
});

describe('GeminiLlmClient', () => {
  const saved = { ...config.ai };
  afterAll(() => Object.assign(config.ai, saved));

  it('payload REST + bo schema khi 400 + thu lai 429 theo retryDelay', async () => {
    config.ai.geminiApiKey = 'g-key';
    config.ai.geminiModel = 'gemini-3.8-flash';
    const calls: { url: string; headers: Record<string, string>; body: any }[] = [];
    const replies = [
      new Response('{"error":"schema"}', { status: 400 }),
      new Response('{"error":{"details":[{"retryDelay":"2.5s"}]}}', { status: 429 }),
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'nghi', thought: true }, { text: '{"nhan_xet":' }, { text: '"x"}' }] } }] }), { status: 200 }),
    ];
    const delays: number[] = [];
    const client = new GeminiLlmClient(
      (async (url: string, init: RequestInit) => {
        calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
        return replies.shift()!;
      }) as unknown as typeof fetch,
      async (ms) => void delays.push(ms),
    );
    const text = await client.generate('SYS', 'USER', undefined, Ai1SchemaTraLoi());
    expect(text).toBe('{"nhan_xet":"x"}');
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    expect(calls[0].headers['x-goog-api-key']).toBe('g-key');
    expect(calls[0].body).toEqual({
      systemInstruction: { parts: [{ text: 'SYS' }] },
      contents: [{ role: 'user', parts: [{ text: 'USER' }] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: OUT.geminiSchema },
    });
    expect(calls[1].body.generationConfig).toEqual({ responseMimeType: 'application/json' });
    expect(delays).toEqual([4000]); // ceil(2.5) + 1 giay
  });

  it('loi khong thu lai -> "Gemini tra ve loi <status>: <body>"; khong co candidate -> blockReason', async () => {
    config.ai.geminiApiKey = 'g-key';
    const client = new GeminiLlmClient((async () => new Response('forbidden', { status: 403 })) as unknown as typeof fetch);
    await expect(client.generate('s', 'u')).rejects.toThrow('Gemini tra ve loi 403: forbidden');
    expect(() => docNoiDungGemini('{"promptFeedback":{"blockReason":"SAFETY"}}')).toThrow('Gemini khong tra ve ket qua (blockReason: SAFETY).');
    expect(() => docNoiDungGemini('{"candidates":[{"finishReason":"MAX_TOKENS","content":{"parts":[]}}]}')).toThrow('Gemini tra ve noi dung rong (finishReason: MAX_TOKENS).');
  });
});

// ---------------- Worker ghi DB (database that, du lieu TEST_AI_) ----------------

const tag = `TEST_AI_${Date.now().toString(36)}`;
const ids = {
  user: randomUUID(),
  hs: randomUUID(),
  kh: randomUUID(),
  lop: randomUUID(),
  bt: randomUUID(),
  sk: randomUUID(),
  q: [randomUUID(), randomUUID(), randomUUID()],
  nb: [randomUUID(), randomUUID()],
};
const GROUP_A = randomUUID();
const GROUP_B = randomUUID();
let choCham = 0;
let daCham = 0;

const calls: { system: string; prompt: string; schema: unknown }[] = [];
const mockLlm: LlmClient = {
  async generate(system, prompt, _signal, schema) {
    calls.push({ system, prompt, schema });
    if (system === HuongDanChungAi2) return 'Ket qua: {"nhan_xet":"Tổng hợp AI2","xep_loai":"Kha"}';
    if (system === HuongDanChungAi3) return '{"nhan_xet":"Tiến bộ AI3"}';
    if (prompt.includes('DẠNG BÀI: TEST_AI Viết')) {
      return JSON.stringify({ cau_hoi: [{ stt: 1, phan_tich: [], giai_thich: 'Bài viết ổn', ly_do_sai: 'Thiếu ý', diem_tu_luan: 80 }], tong_quan: 'Viết khá' });
    }
    return JSON.stringify({
      cau_hoi: [
        { stt: 1, phan_tich: [{ muc: 'A. x', chi_tiet: 'đúng', la_dap_an_dung: true, hoc_sinh_chon: true }], giai_thich: 'Vì A', ly_do_sai: null },
        { stt: 2, phan_tich: [], giai_thich: 'Vì B', ly_do_sai: 'Bạn chọn nhầm' },
      ],
      tong_quan: 'Phần trắc nghiệm tốt',
    });
  },
};

async function createSubmission(maNopBai: string, thoiGianNop: Date) {
  await prisma.nopbai.create({ data: { MaNopBai: maNopBai, MaSuKien: ids.sk, MaHocSinh: ids.hs, ThoiGianNop: thoiGianNop, TrangThaiChamBai: choCham } });
  const answers = [JSON.stringify('A'), JSON.stringify('C'), JSON.stringify('My essay')];
  for (let i = 0; i < 3; i++) {
    await prisma.chitietnopbai.create({
      data: {
        MaChiTiet: randomUUID(),
        MaNopBai: maNopBai,
        MaCauHoi: ids.q[i],
        DapAnHocVien: JSON.parse(answers[i]),
        DiemDatDuoc: i === 0 ? 1 : 0,
        TrangThaiChamTay: i === 2 ? choCham : null,
      },
    });
  }
}

describe('AiFeedbackWorker ghi DB (LLM gia lap)', () => {
  beforeAll(async () => {
    const cat = await prisma.chitietdanhmuc.findMany({ where: { nhomdanhmuc: { MaCode: 'TRANG_THAI_CHAM_BAI' } } });
    choCham = cat.find((x) => x.MaCode === 'CHAM_CHO_CHAM')!.MaChiTiet;
    daCham = cat.find((x) => x.MaCode === 'CHAM_DA_CHAM')!.MaChiTiet;
    await prisma.nguoidung.create({ data: { MaNguoiDung: ids.user, LoaiTaiKhoan: 3, TenDangNhap: tag, MatKhauHash: 'x', HoTen: tag } });
    await prisma.hocsinh.create({ data: { MaHocSinh: ids.hs, MaNguoiDung: ids.user } });
    await prisma.khoahoc.create({ data: { MaKhoaHoc: ids.kh, TenKhoaHoc: tag } });
    await prisma.lophoc.create({ data: { MaLopHoc: ids.lop, TenLop: tag } });
    await prisma.chitietkhoahoc_lophoc.create({ data: { MaKhoaHoc: ids.kh, MaLopHoc: ids.lop } });
    await prisma.baitap.create({ data: { MaBaiTap: ids.bt, MaKhoaHoc: ids.kh, TenBaiTap: tag } });
    const nd = (i: number) =>
      i < 2
        ? {
            loai: 'CQ_TRAC_NGHIEM_1',
            tags: ['grammar'],
            dapan: i === 0 ? 'A' : 'B',
            debai: { cauHoiGoc: `Q${i}`, luaChon: [{ id: 'A', text: 'x' }, { id: 'B', text: 'y' }, { id: 'C', text: 'z' }] },
            nhom_bai_goc: { ma_bai_tap_goc: GROUP_A, ten_bai_tap_goc: 'TEST_AI Choose the best answer' },
          }
        : { la_tu_luan: true, debai: { cauHoiGoc: 'Write' }, nhom_bai_goc: { ma_bai_tap_goc: GROUP_B, ten_bai_tap_goc: 'TEST_AI Viết' } };
    for (let i = 0; i < 3; i++)
      await prisma.baitapcauhoi.create({ data: { MaCauHoiDe: ids.q[i], MaBaiTap: ids.bt, ThuTu: i + 1, DiemCuaCau: i === 2 ? 2 : 1, SoCau: `Câu ${i + 1}`, NoiDung: nd(i) } });
    await prisma.sukienlophoc.create({ data: { MaSuKien: ids.sk, MaLopHoc: ids.lop, MaNguoiDung: ids.user, MaBaiTap: ids.bt } });
    await createSubmission(ids.nb[0], new Date('2026-11-01T08:00:00Z'));
    await createSubmission(ids.nb[1], new Date('2026-11-05T08:00:00Z'));
  });

  afterAll(async () => {
    await prisma.nhanxettienboai3.deleteMany({ where: { MaHocSinh: ids.hs } });
    await prisma.chitietnopbai.deleteMany({ where: { MaNopBai: { in: ids.nb } } });
    await prisma.nopbai.deleteMany({ where: { MaNopBai: { in: ids.nb } } }); // nhanxet AI1/AI2 xoa theo cascade
    await prisma.sukienlophoc.deleteMany({ where: { MaSuKien: ids.sk } });
    await prisma.baitapcauhoi.deleteMany({ where: { MaBaiTap: ids.bt } });
    await prisma.baitap.deleteMany({ where: { MaBaiTap: ids.bt } });
    await prisma.chitietkhoahoc_lophoc.deleteMany({ where: { MaLopHoc: ids.lop } });
    await prisma.lophoc.deleteMany({ where: { MaLopHoc: ids.lop } });
    await prisma.khoahoc.deleteMany({ where: { MaKhoaHoc: ids.kh } });
    await prisma.hocsinh.deleteMany({ where: { MaHocSinh: ids.hs } });
    await prisma.nguoidung.deleteMany({ where: { MaNguoiDung: ids.user } });
  });

  it('AI1: tao 1 dong nhanxetbaitapai1 moi nhom, tu cham tu luan, cap nhat nopbai, xep AI2 vao hang doi', async () => {
    await processAiJob({ kind: 'Ai1', maNopBai: ids.nb[0] }, mockLlm);
    const rows = await prisma.nhanxetbaitapai1.findMany({ where: { MaNopBai: ids.nb[0] }, orderBy: { ThoiGianTao: 'asc' } });
    expect(rows).toHaveLength(2);
    const [a, b] = rows;
    expect(a).toMatchObject({ MaBaiTapGoc: GROUP_A, TenBaiTapGoc: 'TEST_AI Choose the best answer', SoCauTong: 2, SoCauDung: 1, TrangThai: 'DONE', NoiDungNhanXet: 'Phần trắc nghiệm tốt', ThongBaoLoi: null, DiemTuLuanAiCham: null });
    expect(b).toMatchObject({ MaBaiTapGoc: GROUP_B, SoCauTong: 1, SoCauDung: 0, TrangThai: 'DONE', NoiDungNhanXet: 'Viết khá' });
    expect(Number(b.DiemTuLuanAiCham)).toBe(80);
    expect(b.ThoiGianTao!.getTime() - a.ThoiGianTao!.getTime()).toBe(1000); // lech 1 giay giu thu tu nhom
    const ct = JSON.parse(a.ChiTietCauHoi!);
    expect(ct[1]).toEqual({ so_cau: 'Câu 2', ket_qua: 'WRONG', dap_an_hoc_sinh: 'C. z', dap_an_dung: 'B. y', stt: 2, phan_tich: [], giai_thich: 'Vì B', ly_do_sai: 'Bạn chọn nhầm', meo_ghi_nho: null, ghi_chu_de: null, diem_tu_luan: null });
    expect(JSON.parse(b.ChiTietCauHoi!)[0]).toMatchObject({ ket_qua: 'PARTIAL', diem_tu_luan: 80, ly_do_sai: 'Thiếu ý' });

    const essay = await prisma.chitietnopbai.findFirst({ where: { MaNopBai: ids.nb[0], MaCauHoi: ids.q[2] } });
    expect(Number(essay!.DiemDatDuoc)).toBe(1.6); // 2 diem * 80%
    expect(essay!.TrangThaiChamTay).toBe(daCham);
    const nb = await prisma.nopbai.findUnique({ where: { MaNopBai: ids.nb[0] } });
    expect(nb!.TrangThaiChamBai).toBe(daCham);
    expect(Number(nb!.DiemSo)).toBe(2.6);

    const ai1Calls = calls.filter((c) => c.schema);
    expect(ai1Calls).toHaveLength(2);
    expect(ai1Calls.every((c) => c.system.startsWith(HuongDanChungAi1 + '\n\n'))).toBe(true);
    expect(_pendingAiJobs()).toContainEqual({ kind: 'Ai2', maNopBai: ids.nb[0] });

    // Chay lai: da co nhan xet -> bo qua, khong goi model
    const before = calls.length;
    await processAiJob({ kind: 'Ai1', maNopBai: ids.nb[0] }, mockLlm);
    expect(calls.length).toBe(before);
  });

  it('AI1 loi model -> nhom FAILED kem ThongBaoLoi', async () => {
    const failing: LlmClient = { generate: async () => Promise.reject(new Error('Claude tra ve noi dung rong (stop_reason: end_turn).')) };
    await processAiJob({ kind: 'Ai1', maNopBai: ids.nb[1] }, failing);
    const rows = await prisma.nhanxetbaitapai1.findMany({ where: { MaNopBai: ids.nb[1] } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.TrangThai === 'FAILED' && r.ThongBaoLoi === 'Claude tra ve noi dung rong (stop_reason: end_turn).')).toBe(true);
    const nb = await prisma.nopbai.findUnique({ where: { MaNopBai: ids.nb[1] } });
    expect(nb!.TrangThaiChamBai).toBe(choCham); // cau tu luan van cho cham
    // Lam lai bang model tot cho buoc sau
    await prisma.nhanxetbaitapai1.deleteMany({ where: { MaNopBai: ids.nb[1] } });
    await processAiJob({ kind: 'Ai1', maNopBai: ids.nb[1] }, mockLlm);
  });

  it('AI2: tong hop vao nhanxetdekiemtraai2; lan thu 2 cung khoa hoc -> xep AI3', async () => {
    const before = calls.length;
    await processAiJob({ kind: 'Ai2', maNopBai: ids.nb[0] }, mockLlm);
    const ai2 = await prisma.nhanxetdekiemtraai2.findUnique({ where: { MaNopBai: ids.nb[0] } });
    expect(ai2).toMatchObject({ NoiDungNhanXet: 'Tổng hợp AI2', XepLoai: 'Kha', TrangThai: 'DONE', ThongBaoLoi: null });
    const call = calls[before];
    expect(call.system).toBe(HuongDanChungAi2);
    expect(call.schema).toBeUndefined();
    expect(call.prompt.startsWith('Tong so cau dung/tong: 1/3 (33.3%).\nNhan xet chi tiet tung bai/dang:\n--- TEST_AI Choose the best answer (1/2) ---\nPhần trắc nghiệm tốt\nLoi cu the:\n- Câu 2 (sai): Bạn chọn nhầm\n\n')).toBe(true);
    expect(_pendingAiJobs().some((j) => j.kind === 'Ai3')).toBe(false); // moi 1 lan

    await processAiJob({ kind: 'Ai2', maNopBai: ids.nb[1] }, mockLlm);
    expect(_pendingAiJobs()).toContainEqual({ kind: 'Ai3', maHocSinh: ids.hs, maKhoaHoc: ids.kh });

    // Chay lai AI2 -> cap nhat dong cu, khong tao trung
    await processAiJob({ kind: 'Ai2', maNopBai: ids.nb[0] }, mockLlm);
    expect(await prisma.nhanxetdekiemtraai2.count({ where: { MaNopBai: ids.nb[0] } })).toBe(1);
  });

  it('AI3: so sanh tien bo, luu nhanxettienboai3', async () => {
    const before = calls.length;
    await processAiJob({ kind: 'Ai3', maHocSinh: ids.hs, maKhoaHoc: ids.kh }, mockLlm);
    const ai3 = await prisma.nhanxettienboai3.findFirst({ where: { MaHocSinh: ids.hs, MaKhoaHoc: ids.kh } });
    expect(ai3).toMatchObject({ NoiDungNhanXet: 'Tiến bộ AI3', TrangThai: 'DONE', ThongBaoLoi: null, DanhSachNopBaiSoSanh: ids.nb });
    expect(calls[before].system).toBe(HuongDanChungAi3);
    expect(calls[before].prompt).toBe(
      '--- Lan 1 - 01/11/2026 - Xep loai: Kha ---\nTổng hợp AI2\n\n--- Lan 2 - 05/11/2026 - Xep loai: Kha ---\nTổng hợp AI2\n\n',
    );
  });
});
