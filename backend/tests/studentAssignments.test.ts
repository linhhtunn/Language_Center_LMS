import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { _pendingAiJobs } from '../src/shared/aiJobQueue.js';
import { app, auth, login } from './helpers.js';

// StudentAssignmentController: hoc sinh xem / lam / nop bai, xem ket qua + nhan xet AI.
// Du lieu thu tao truc tiep bang Prisma voi tien to TEST_SASSIGN_VT_ va xoa sach o afterAll.

const PREFIX = 'TEST_SASSIGN_VT_';
const BASE = '/api/StudentAssignment';
const DAY = 86_400_000;

const ids: Record<string, string> = {};
const q: Record<string, string> = {};
let khoa = '';
let khoa2 = '';
let studentId = '';
let studentUserId = '';

async function cleanup() {
  const bts = await prisma.baitap.findMany({ where: { TenBaiTap: { startsWith: PREFIX } }, select: { MaBaiTap: true } });
  const btIds = bts.map((b) => b.MaBaiTap);
  const evIds = (await prisma.sukienlophoc.findMany({ where: { MaBaiTap: { in: btIds } }, select: { MaSuKien: true } })).map((e) => e.MaSuKien);
  const nbIds = (await prisma.nopbai.findMany({ where: { MaSuKien: { in: evIds } }, select: { MaNopBai: true } })).map((n) => n.MaNopBai);
  await prisma.chatbot_exam_sessions.deleteMany({ where: { AssignmentId: { in: btIds } } });
  await prisma.nhanxetbaitapai1.deleteMany({ where: { MaNopBai: { in: nbIds } } });
  await prisma.nhanxetdekiemtraai2.deleteMany({ where: { MaNopBai: { in: nbIds } } });
  await prisma.chitietnopbai.deleteMany({ where: { MaNopBai: { in: nbIds } } });
  await prisma.nopbai.deleteMany({ where: { MaNopBai: { in: nbIds } } });
  await prisma.nguoinhansukien.deleteMany({ where: { MaSuKien: { in: evIds } } });
  await prisma.sukienlophoc.deleteMany({ where: { MaSuKien: { in: evIds } } });
  await prisma.baitapcauhoi.deleteMany({ where: { MaBaiTap: { in: btIds } } });
  await prisma.baitap.deleteMany({ where: { MaBaiTap: { in: btIds } } });
  const ks = (await prisma.khoahoc.findMany({ where: { TenKhoaHoc: { startsWith: PREFIX } }, select: { MaKhoaHoc: true } })).map((k) => k.MaKhoaHoc);
  await prisma.nhanxettienboai3.deleteMany({ where: { MaKhoaHoc: { in: ks } } });
  await prisma.lophoc.deleteMany({ where: { TenLop: { startsWith: PREFIX } } });
  await prisma.khoahoc.deleteMany({ where: { MaKhoaHoc: { in: ks } } });
}

beforeAll(async () => {
  await cleanup();
  const s = await login('student');
  studentUserId = s.userId;
  const student = await prisma.hocsinh.findFirstOrThrow({ where: { MaNguoiDung: s.userId } });
  studentId = student.MaHocSinh;
  const admin = await prisma.nguoidung.findFirstOrThrow({ where: { Email: 'admin@qltt.local' } });

  khoa = randomUUID();
  khoa2 = randomUUID();
  await prisma.khoahoc.createMany({ data: [{ MaKhoaHoc: khoa, TenKhoaHoc: `${PREFIX}Khoa` }, { MaKhoaHoc: khoa2, TenKhoaHoc: `${PREFIX}Khoa2` }] });
  const lopA = randomUUID();
  const lopB = randomUUID();
  await prisma.lophoc.createMany({ data: [{ MaLopHoc: lopA, TenLop: `${PREFIX}Lop A` }, { MaLopHoc: lopB, TenLop: `${PREFIX}Lop B` }] });

  const mk = async (
    key: string,
    moTa: unknown,
    opts: { hanNop?: Date | null; bank?: boolean; lops?: string[]; questions?: { key: string; ThuTu: number | null; DiemCuaCau: number | null; NoiDung: unknown }[]; order?: number } = {},
  ) => {
    const id = randomUUID();
    ids[key] = id;
    await prisma.baitap.create({
      data: {
        MaBaiTap: id, MaKhoaHoc: khoa, TenBaiTap: PREFIX + key, MoTa: moTa as never, LoaiBaiTap: 48, ThoiGianLamBai: 30, DiemToiDa: 10,
        TrinhDo: 39, KyNang: 45, MucDo: 41, HuongDanChung: 'HD', NoiDungNguCanhChung: 'NC', LaMauNganHang: opts.bank ?? false,
        ThoiGianTao: new Date(Date.UTC(2026, 0, 1) + (opts.order ?? 0) * 1000),
      },
    });
    for (const qq of opts.questions ?? []) {
      q[qq.key] = randomUUID();
      await prisma.baitapcauhoi.create({ data: { MaBaiTap: id, MaCauHoiDe: q[qq.key], SoCau: qq.key, ThuTu: qq.ThuTu, DiemCuaCau: qq.DiemCuaCau, NoiDung: qq.NoiDung as never } });
    }
    for (const lop of opts.lops ?? [lopA]) {
      const ev = randomUUID();
      await prisma.sukienlophoc.create({ data: { MaSuKien: ev, MaLopHoc: lop, MaNguoiDung: admin.MaNguoiDung, DangSuKien: 51, MaBaiTap: id, NoiDung: 'Ghi chu', HanNop: opts.hanNop ?? null } });
      await prisma.nguoinhansukien.create({ data: { MaSuKien: ev, MaHocSinh: studentId } });
    }
  };

  await mk(
    'Open',
    { code: 'DE-01', description: 'Bai mo', openAt: '2026-01-01T08:00:00Z', dueAt: '2099-01-01T08:00:00+07:00', maxAttempts: 2, showAnswerAfterDeadline: true, danhSachTu: ['grow'], amThanhLink: '/a.mp3' },
    {
      order: 9,
      lops: [lopA, lopB],
      questions: [
        { key: 'mc', ThuTu: 1, DiemCuaCau: 2, NoiDung: { debai: { cauHoi: 'Pick', luaChon: ['A', 'B'] }, dapan: 'B', giaithich: 'Vi B', tieuchi: ['g'] } },
        { key: 'match', ThuTu: 2, DiemCuaCau: 3, NoiDung: { debai: { danhSachTrai: ['1', '2', '3'], danhSachPhai: ['a', 'b', 'c'] }, dapan: { 1: 'a', 2: 'b', 3: 'c' } } },
        { key: 'arr', ThuTu: 3, DiemCuaCau: 1.15, NoiDung: { debai: { danhSach: ['x', 'y', 'z', 'w'] }, dapan: ['x', 'y', 'z', 'w'] } },
        { key: 'essay', ThuTu: 4, DiemCuaCau: 2, NoiDung: { debai: 'Viet', la_tu_luan: true } },
        { key: 'fill', ThuTu: null, DiemCuaCau: null, NoiDung: { debai: { doanVanTruoc: 'I', doanVanSau: 'x' }, dapan: 'growing' } },
        { key: 'bad', ThuTu: 6, DiemCuaCau: 1, NoiDung: { dapan: 'A', la_tu_luan: 'yes' } },
      ],
    },
  );
  await mk('Pending', { openAt: new Date(Date.now() + 10 * DAY).toISOString().slice(0, 19) }, { order: 8, questions: [{ key: 'p1', ThuTu: 1, DiemCuaCau: 1, NoiDung: { dapan: 'A' } }] });
  await mk('Closed', { description: 'Het han' }, { order: 7, hanNop: new Date(Date.now() - DAY) });
  await mk('Once', 'Mo ta cu', { order: 6, questions: [{ key: 'o1', ThuTu: 1, DiemCuaCau: 1, NoiDung: { dapan: 'A' } }] });
  await mk('Bank', { description: 'bank' }, { order: 10, bank: true });
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const mine = (rows: { tenBaiTap: string }[]) => rows.filter((r) => r.tenBaiTap.startsWith(PREFIX));

describe('quyen + dinh tuyen', () => {
  it('khong token -> 401; sai guid -> 404; sai method -> 405', async () => {
    expect((await request(app).get(BASE)).status).toBe(401);
    expect((await request(app).get(`${BASE}/khong-phai-guid/result`)).status).toBe(404);
    const r = await request(app).delete(`${BASE}/${randomUUID()}`);
    expect(r.status).toBe(405);
    expect(r.headers.allow).toBe('GET');
  });

  it('giao vien khong co quyen STUDY_CONTENT_STUDENT -> 403', async () => {
    const res = await request(app).get(BASE).set(await auth('teacher'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });

  it('admin co quyen nhung khong co ho so hoc sinh -> 400 (list) / 404 (cac API khac)', async () => {
    const h = await auth('admin');
    const list = await request(app).get(BASE).set(h);
    expect(list.status).toBe(400);
    expect(list.body).toMatchObject({ success: false, code: 'STUDENT_PROFILE_NOT_FOUND', message: 'Không tìm thấy hồ sơ học sinh.' });
    expect((await request(app).get(`${BASE}/ai-progress`).set(h)).status).toBe(404);
    expect((await request(app).post(`${BASE}/${ids.Open}/submit`).set(h).send({})).status).toBe(404);
  });
});

describe('GET /api/StudentAssignment', () => {
  it('chi tra bai duoc giao, dung trang thai va envelope', async () => {
    const res = await request(app).get(BASE).set(await auth('student'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, message: 'Lấy danh sách bài tập thành công', code: 'SUCCESS' });
    const rows = mine(res.body.data);
    expect(rows.map((r: { tenBaiTap: string }) => r.tenBaiTap)).toEqual([`${PREFIX}Open`, `${PREFIX}Pending`, `${PREFIX}Closed`, `${PREFIX}Once`]);
    const [open, pending, closed, once] = rows;
    expect(Object.keys(open)).toEqual([
      'maBaiTap', 'tenBaiTap', 'moTa', 'thoiGianLamBai', 'diemToiDa', 'huongDanChung', 'noiDungNguCanhChung', 'soLuongCauHoi', 'danhSachTu',
      'amThanhLink', 'hinhAnhLink', 'loaiBaiTap', 'trinhDo', 'kyNang', 'mucDo', 'code', 'tenLop', 'ghiChuGiaoBai', 'moLuc', 'hanNop',
      'soLanLamToiDa', 'trangThai', 'coTheLamBai', 'soLanDaNop', 'daNop', 'diemGanNhat', 'dangChoCham', 'soLanConLai', 'cauHoi',
    ]);
    expect(open).toMatchObject({
      maBaiTap: ids.Open, moTa: 'Bai mo', code: 'DE-01', soLuongCauHoi: 6, loaiBaiTap: 'Bài tập', trinhDo: 'IELTS', kyNang: 'Đọc', mucDo: 'Cơ bản',
      huongDanChung: null, danhSachTu: null, moLuc: '2026-01-01T08:00:00Z', hanNop: '2099-01-01T01:00:00+00:00', soLanLamToiDa: 2,
      trangThai: 'OPEN', coTheLamBai: true, soLanDaNop: 0, daNop: false, soLanConLai: 2, cauHoi: [],
    });
    expect(open.tenLop.split(', ').sort()).toEqual([`${PREFIX}Lop A`, `${PREFIX}Lop B`]);
    expect(pending).toMatchObject({ trangThai: 'PENDING', coTheLamBai: false });
    expect(closed).toMatchObject({ trangThai: 'CLOSED', coTheLamBai: false, moTa: 'Het han' });
    expect(closed.hanNop).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    // MoTa la chuoi JSON (khong phai object) -> ca van ban JSON thanh mo ta, nhu ban .NET.
    expect(once).toMatchObject({ moTa: '"Mo ta cu"', soLanLamToiDa: 1, trangThai: 'OPEN' });
  });
});

describe('GET /api/StudentAssignment/{id}', () => {
  it('bai dang mo -> 200, an dap an, khoa chatbot', async () => {
    const res = await request(app).get(`${BASE}/${ids.Open.toUpperCase()}`).set(await auth('student'));
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lấy thông tin bài tập thành công.');
    const d = res.body.data;
    expect(d).toMatchObject({ huongDanChung: 'HD', noiDungNguCanhChung: 'NC', danhSachTu: ['grow'], amThanhLink: '/a.mp3', hinhAnhLink: null });
    expect(d.cauHoi.map((c: { soCau: string }) => c.soCau)).toEqual(['mc', 'match', 'arr', 'essay', 'bad', 'fill']);
    expect(d.cauHoi[0]).toEqual({
      maCauHoiDe: q.mc, diemCuaCau: 2, thuTu: 1, soCau: 'mc',
      noiDung: { debai: { cauHoi: 'Pick', luaChon: ['A', 'B'] }, tieuchi: ['g'], la_tu_luan: false, loai: 'multiple-choice' },
    });
    expect(d.cauHoi[1].noiDung.loai).toBe('matching');
    expect(d.cauHoi[2].noiDung.loai).toBe('sentence-arrangement');
    expect(d.cauHoi[3].noiDung).toEqual({ debai: 'Viet', tieuchi: null, la_tu_luan: true, loai: 'multiple-choice' });
    expect(d.cauHoi[4].noiDung).toEqual({}); // la_tu_luan sai kieu -> STJ loi -> object rong
    expect(d.cauHoi[5].noiDung.loai).toBe('fill-in-the-blanks');
    const session = await prisma.chatbot_exam_sessions.findUnique({ where: { UserId_AssignmentId: { UserId: studentUserId, AssignmentId: ids.Open } } });
    expect(session).not.toBeNull();
  });

  it('chua toi gio -> 400 ASSIGNMENT_NOT_OPEN; khong duoc giao -> 404', async () => {
    const a = await request(app).get(`${BASE}/${ids.Pending}`).set(await auth('student'));
    expect(a.status).toBe(400);
    expect(a.body).toMatchObject({ success: false, code: 'ASSIGNMENT_NOT_OPEN', message: 'Bài này hiện không thể bắt đầu làm.' });
    for (const id of [ids.Bank, randomUUID()]) {
      const b = await request(app).get(`${BASE}/${id}`).set(await auth('student'));
      expect(b.status).toBe(404);
      expect(b.body.code).toBe('ASSIGNMENT_NOT_FOUND');
    }
  });
});

describe('POST /api/StudentAssignment/{id}/submit', () => {
  it('body sai -> 415 / 400 ValidationProblem giong ASP.NET', async () => {
    const h = await auth('student');
    const a = await request(app).post(`${BASE}/${ids.Open}/submit`).set(h).set('Content-Type', 'text/plain').send('{}');
    expect(a.status).toBe(415);
    expect(a.body).toMatchObject({ title: 'Unsupported Media Type', status: 415 });
    const b = await request(app).post(`${BASE}/${ids.Open}/submit`).set(h).set('Content-Type', 'application/json');
    expect(b.status).toBe(400);
    expect(b.body.errors).toEqual({ '': ['A non-empty request body is required.'], request: ['The request field is required.'] });
    const c = await request(app).post(`${BASE}/${ids.Open}/submit`).set(h).send({ cauTraLoi: [{ maCauHoiDe: 'x' }] });
    expect(c.body.errors['$.cauTraLoi[0].maCauHoiDe'][0]).toBe(
      'The JSON value could not be converted to System.Guid. Path: $.cauTraLoi[0].maCauHoiDe | LineNumber: 0 | BytePositionInLine: 31.',
    );
    const d = await request(app).post(`${BASE}/${ids.Open}/submit`).set(h).send({ cauTraLoi: null });
    expect(d.body.errors).toEqual({ CauTraLoi: ['The CauTraLoi field is required.'] });
  });

  it('ngoai cua so -> 400 ASSIGNMENT_CLOSED; khong duoc giao -> 404', async () => {
    const h = await auth('student');
    const a = await request(app).post(`${BASE}/${ids.Pending}/submit`).set(h).send({});
    expect(a.status).toBe(400);
    expect(a.body).toMatchObject({ code: 'ASSIGNMENT_CLOSED', message: 'Bài tập chưa tới giờ làm.' });
    const b = await request(app).post(`${BASE}/${ids.Closed}/submit`).set(h).send({});
    expect(b.body).toMatchObject({ code: 'ASSIGNMENT_CLOSED', message: 'Bài tập đã quá hạn nộp.' });
    const c = await request(app).post(`${BASE}/${randomUUID()}/submit`).set(h).send({});
    expect(c.status).toBe(404);
  });

  it('cham tu dong, luu nopbai/chitietnopbai, mo khoa chatbot, xep job AI1', async () => {
    const res = await request(app)
      .post(`${BASE}/${ids.Open}/submit`)
      .set(await auth('student'))
      .send({
        thoiGianThucTeGiay: '125', // Web defaults: so doc duoc tu chuoi
        cauTraLoi: [
          { maCauHoiDe: q.mc, dapAn: 'x' },
          { maCauHoiDe: q.match, dapAn: { 1: 'a', 2: 'b', 3: 'x' }, danhDauXemLai: true },
          { maCauHoiDe: q.arr, dapAn: ['x', 'y', 'q', 'q'] },
          { maCauHoiDe: q.essay, dapAn: 'Đoạn văn' },
          { maCauHoiDe: q.bad, dapAn: 'A' },
          { maCauHoiDe: q.mc.toUpperCase(), dapAn: ' b ' }, // trung cau -> lay cau sau cung
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Nộp bài thành công.');
    const d = res.body.data;
    expect(d).toMatchObject({
      maBaiTap: ids.Open, lanNop: 1, thoiGianThucTeGiay: 125, diemSo: 4.58, diemToiDa: 10.15, tongSoCau: 6, soCauDung: 3, soCauSai: 0,
      soCauChuaLam: 1, soCauChoCham: 2, dangChoCham: true, soLanConLai: 1, choXemDapAn: true,
    });
    expect(d.thoiGianNop).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?\+00:00$/);
    expect(d.chiTiet.map((c: { ketQua: string; diemDatDuoc: number }) => [c.ketQua, c.diemDatDuoc])).toEqual([
      ['CORRECT', 2], ['PARTIAL', 2], ['PARTIAL', 0.58], ['PENDING', 0], ['PENDING', 0], ['BLANK', 0],
    ]);
    expect(d.chiTiet[0]).toMatchObject({ dapAnDung: 'B', giaiThich: 'Vi B', dapAnHocVien: ' b ' });
    expect(d.chiTiet[1].danhDauXemLai).toBe(true);

    const nb = await prisma.nopbai.findUniqueOrThrow({ where: { MaNopBai: d.maNopBai }, include: { chitietnopbai: true } });
    expect(nb).toMatchObject({ MaHocSinh: studentId, LanNop: 1, ThoiGianThucTe: 125, TrangThaiChamBai: 24 });
    expect(nb.DiemSo?.toNumber()).toBe(4.58);
    const essay = nb.chitietnopbai.find((c) => c.MaCauHoi === q.essay)!;
    // Ban .NET luu 0.00 (EF bo qua null o cot co mac dinh) -> cau chua cham thanh SAI. Ban Node luu NULL.
    expect(essay.DiemDatDuoc).toBeNull();
    expect(essay).toMatchObject({ DapAnHocVien: 'Đoạn văn', TrangThaiCau: 21, TrangThaiChamTay: 24 });
    const fill = nb.chitietnopbai.find((c) => c.MaCauHoi === q.fill)!;
    expect(fill).toMatchObject({ DapAnHocVien: null, TrangThaiCau: 20, TrangThaiChamTay: 25 });
    expect(nb.chitietnopbai.find((c) => c.MaCauHoi === q.match)!.TrangThaiCau).toBe(22);

    const session = await prisma.chatbot_exam_sessions.findUnique({ where: { UserId_AssignmentId: { UserId: studentUserId, AssignmentId: ids.Open } } });
    expect(session).toBeNull();
    expect(_pendingAiJobs()).toContainEqual({ kind: 'Ai1', maNopBai: d.maNopBai });
  });

  it('het luot nop -> 400 ASSIGNMENT_ATTEMPTS_EXCEEDED', async () => {
    const h = await auth('student');
    expect((await request(app).post(`${BASE}/${ids.Once}/submit`).set(h).send({ thoiGianThucTeGiay: -9 })).body.data.thoiGianThucTeGiay).toBe(0);
    const res = await request(app).post(`${BASE}/${ids.Once}/submit`).set(h).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'ASSIGNMENT_ATTEMPTS_EXCEEDED', message: 'Bạn đã nộp bài này rồi. Bài này chỉ được nộp một lần.' });
    const detail = await request(app).get(`${BASE}/${ids.Once}`).set(h);
    expect(detail.status).toBe(400);
  });
});

describe('GET result / ai-feedback / ai-progress', () => {
  it('result: cau tu luan chua cham -> PENDING (ban .NET bao WRONG)', async () => {
    const h = await auth('student');
    const res = await request(app).get(`${BASE}/${ids.Open}/result`).set(h);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lấy kết quả thành công.');
    const d = res.body.data;
    expect(d).toMatchObject({ lanNop: 1, diemSo: 4.58, diemToiDa: 10.15, soCauDung: 3, soCauSai: 0, soCauChuaLam: 1, soCauChoCham: 2, dangChoCham: true, soLanConLai: 1 });
    expect(d.thoiGianNop).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    expect(d.chiTiet.map((c: { ketQua: string }) => c.ketQua)).toEqual(['CORRECT', 'PARTIAL', 'PARTIAL', 'PENDING', 'PENDING', 'BLANK']);

    // Bai nop cu do ban .NET luu 0.00 (TrangThaiChamTay = cho cham) -> van hien la PENDING.
    await prisma.chitietnopbai.updateMany({ where: { MaNopBai: d.maNopBai, MaCauHoi: q.essay }, data: { DiemDatDuoc: 0 } });
    const legacy = (await request(app).get(`${BASE}/${ids.Open}/result`).set(h)).body.data;
    expect(legacy.chiTiet.map((c: { ketQua: string }) => c.ketQua)).toEqual(['CORRECT', 'PARTIAL', 'PARTIAL', 'PENDING', 'PENDING', 'BLANK']);
    expect(legacy).toMatchObject({ soCauSai: 0, soCauChoCham: 2, dangChoCham: true });
    expect(d.chiTiet[1].dapAnHocVien).toEqual({ 1: 'a', 2: 'b', 3: 'x' });

    const none = await request(app).get(`${BASE}/${ids.Pending}/result`).set(await auth('student'));
    expect(none.status).toBe(404);
    expect(none.body).toMatchObject({ code: 'SUBMISSION_NOT_FOUND', message: 'Bạn chưa nộp bài này.' });
  });

  it('list sau khi nop: so lan, diem gan nhat, SUBMITTED khi het luot', async () => {
    const rows = mine((await request(app).get(BASE).set(await auth('student'))).body.data);
    expect(rows.find((r: { maBaiTap: string }) => r.maBaiTap === ids.Open)).toMatchObject({ soLanDaNop: 1, daNop: true, diemGanNhat: 4.58, dangChoCham: true, soLanConLai: 1, trangThai: 'OPEN' });
    expect(rows.find((r: { maBaiTap: string }) => r.maBaiTap === ids.Once)).toMatchObject({ soLanDaNop: 1, soLanConLai: 0, trangThai: 'SUBMITTED', coTheLamBai: false });
  });

  it('ai-feedback: dang xu ly khi chua co AI1, roi doc nhanxetbaitapai1/ai2', async () => {
    const h = await auth('student');
    const first = await request(app).get(`${BASE}/${ids.Open}/ai-feedback`).set(h);
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({ dangXuLy: true, choXemChiTiet: true, nhanXetTungBai: [], nhanXetTongThe: null });
    const maNopBai = first.body.data.maNopBai;
    await prisma.nhanxetbaitapai1.createMany({
      data: [
        { MaNhanXet: randomUUID(), MaNopBai: maNopBai, TenBaiTapGoc: 'G1', SoCauDung: 1, SoCauTong: 2, ChiTietCauHoi: '[{"so_cau":1}]', DiemTuLuanAiCham: 1.5, TrangThai: 'DONE', ThoiGianTao: new Date(Date.UTC(2026, 0, 2)) },
        { MaNhanXet: randomUUID(), MaNopBai: maNopBai, ChiTietCauHoi: '{hong', TrangThai: 'PENDING', ThoiGianTao: new Date(Date.UTC(2026, 0, 3)) },
      ],
    });
    await prisma.nhanxetdekiemtraai2.create({ data: { MaNhanXet: randomUUID(), MaNopBai: maNopBai, NoiDungNhanXet: 'Tot', XepLoai: 'KHA', TrangThai: 'DONE' } });
    const res = await request(app).get(`${BASE}/${ids.Open}/ai-feedback`).set(h);
    expect(res.body.message).toBe('Lấy nhận xét AI thành công.');
    expect(res.body.data).toEqual({
      maNopBai,
      dangXuLy: true,
      choXemChiTiet: true,
      nhanXetTungBai: [
        { maBaiTapGoc: null, tenBaiTapGoc: 'G1', soCauDung: 1, soCauTong: 2, noiDungNhanXet: null, diemTuLuanAiCham: 1.5, chiTietCauHoi: [{ so_cau: 1 }], coChiTietCauHoi: true, trangThai: 'DONE' },
        { maBaiTapGoc: null, tenBaiTapGoc: null, soCauDung: null, soCauTong: null, noiDungNhanXet: null, diemTuLuanAiCham: null, chiTietCauHoi: null, coChiTietCauHoi: true, trangThai: 'PENDING' },
      ],
      nhanXetTongThe: { noiDungNhanXet: 'Tot', xepLoai: 'KHA', trangThai: 'DONE' },
    });
  });

  it('ai-progress: ban DONE moi nhat cho moi khoa hoc', async () => {
    await prisma.nhanxettienboai3.createMany({
      data: [
        { MaNhanXet: randomUUID(), MaHocSinh: studentId, MaKhoaHoc: khoa, NoiDungNhanXet: 'cu', TrangThai: 'DONE', ThoiGianTao: new Date(Date.UTC(2090, 0, 1)) },
        { MaNhanXet: randomUUID(), MaHocSinh: studentId, MaKhoaHoc: khoa, NoiDungNhanXet: 'moi', TrangThai: 'DONE', ThoiGianTao: new Date(Date.UTC(2090, 0, 5, 3, 4, 5)) },
        { MaNhanXet: randomUUID(), MaHocSinh: studentId, MaKhoaHoc: khoa, NoiDungNhanXet: 'dang chay', TrangThai: 'PENDING', ThoiGianTao: new Date(Date.UTC(2090, 0, 9)) },
        { MaNhanXet: randomUUID(), MaHocSinh: studentId, MaKhoaHoc: khoa2, NoiDungNhanXet: 'k2', TrangThai: 'DONE', ThoiGianTao: new Date(Date.UTC(2089, 0, 1)) },
      ],
    });
    const res = await request(app).get(`${BASE}/ai-progress`).set(await auth('student'));
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lấy nhận xét tiến bộ thành công.');
    const rows = res.body.data.filter((r: { tenKhoaHoc: string }) => r.tenKhoaHoc.startsWith(PREFIX));
    expect(rows).toEqual([
      { maKhoaHoc: khoa, tenKhoaHoc: `${PREFIX}Khoa`, noiDungNhanXet: 'moi', thoiGianTao: '2090-01-05T03:04:05' },
      { maKhoaHoc: khoa2, tenKhoaHoc: `${PREFIX}Khoa2`, noiDungNhanXet: 'k2', thoiGianTao: '2089-01-01T00:00:00' },
    ]);
  });
});
