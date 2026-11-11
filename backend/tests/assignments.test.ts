import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '../src/db.js';
import { DotnetRandom, formatJsonDateTime, parseJsonDateTime } from '../src/modules/assignments/dotnetTypes.js';
import { app, auth } from './helpers.js';

// AdminAssignmentController -> /api/AdminAssignment/*. Du lieu thu co tien to TEST_ASSIGN_.
const B = '/api/AdminAssignment';
const KH = 'a55a0002-0000-4000-8000-000000000001';
const LOP = 'a55a0002-0000-4000-8000-000000000002';
const RUN = Date.now().toString(36).toUpperCase();

let admin: Record<string, string>;
const created = { exercises: [] as string[], assignments: [] as string[], banks: [] as string[] };

beforeAll(async () => {
  admin = await auth('admin');
  await prisma.khoahoc.upsert({
    where: { MaKhoaHoc: KH },
    update: {},
    create: { MaKhoaHoc: KH, TenKhoaHoc: 'TEST_ASSIGN_KhoaHoc vitest', TrangThai: true, DaXoa: false },
  });
  await prisma.lophoc.upsert({
    where: { MaLopHoc: LOP },
    update: {},
    create: { MaLopHoc: LOP, TenLop: 'TEST_ASSIGN_Lop vitest', TrangThai: true, DaXoa: false },
  });
  await prisma.chitietkhoahoc_lophoc.upsert({
    where: { MaKhoaHoc_MaLopHoc: { MaKhoaHoc: KH, MaLopHoc: LOP } },
    update: {},
    create: { MaKhoaHoc: KH, MaLopHoc: LOP, TrangThai: true, DaXoa: false },
  });
  const student = await prisma.hocsinh.findFirst({ where: { nguoidung: { Email: 'hocsinh@qltt.local' } } });
  if (student) {
    await prisma.hocsinhlophoc.upsert({
      where: { MaLopHoc_MaHocSinh: { MaLopHoc: LOP, MaHocSinh: student.MaHocSinh } },
      update: {},
      create: { MaLopHoc: LOP, MaHocSinh: student.MaHocSinh, NgayThamGia: new Date(Date.UTC(2025, 0, 1)), TrangThai: true, DaXoa: false },
    });
  }
});

afterAll(async () => {
  // Xoa mem qua API (giong thao tac cua admin), khong dung den du lieu seed.
  for (const id of created.assignments) await request(app).delete(`${B}/assignments/${id}`).set(admin);
  for (const id of created.exercises) await request(app).delete(`${B}/question-bank/${id}`).set(admin);
  for (const id of created.banks) await request(app).delete(`${B}/question-bank-groups/${id}`).set(admin);
  // Go hoc sinh demo khoi lop thu (dong do test tu them) de khong anh huong module khac.
  await prisma.hocsinhlophoc.deleteMany({ where: { MaLopHoc: LOP } });
});

describe('helpers .NET-compat', () => {
  it('DateTime giu Kind nhu System.Text.Json', () => {
    expect(formatJsonDateTime(parseJsonDateTime('2026-04-15T19:00')!)).toBe('2026-04-15T19:00:00');
    expect(formatJsonDateTime(parseJsonDateTime('2026-04-15T19:00:00.1200Z')!)).toBe('2026-04-15T19:00:00.12Z');
    expect(formatJsonDateTime(parseJsonDateTime('2026-01-01T08:00:00+07:00')!)).toBe('2026-01-01T01:00:00+00:00');
    expect(parseJsonDateTime('2026-01-01 08:00')).toBeNull();
  });

  it('Random(seed) tai lap duoc', () => {
    const a = new DotnetRandom(777);
    const b = new DotnetRandom(777);
    const xs = Array.from({ length: 10 }, () => a.next(100));
    expect(Array.from({ length: 10 }, () => b.next(100))).toEqual(xs);
    expect(xs.every((x) => x >= 0 && x < 100)).toBe(true);
  });
});

describe('phan quyen va route', () => {
  it('khong co quyen ASSIGNMENTS_ADMIN_VIEW -> 403', async () => {
    const res = await request(app).get(`${B}/bootstrap`).set(await auth('student'));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: 'Bạn không có quyền truy cập tài nguyên này.', statusCode: 403 });
  });

  it('{id:guid} sai -> 404', async () => {
    const res = await request(app).get(`${B}/assignments/not-a-guid`).set(admin);
    expect(res.status).toBe(404);
  });

  it('bootstrap tra du cac nhom danh muc', async () => {
    const res = await request(app).get(`${B}/bootstrap`).set(admin);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Lay bootstrap bai tap admin thanh cong.');
    expect(Object.keys(res.body.data)).toEqual(['courses', 'classes', 'assignmentTypes', 'publishModes', 'questionTypes', 'difficultyLevels', 'levels', 'skills']);
    expect(res.body.data.courses.find((c: { maKhoaHoc: string }) => c.maKhoaHoc === KH)).toMatchObject({ soLopHoc: 1 });
    expect(res.body.data.assignmentTypes.map((x: { code: string }) => x.code)).toContain('EXAM');
  });
});

describe('model binding nhu ASP.NET', () => {
  it('body JSON thieu truong -> dung gia tri khoi tao, validate trong action', async () => {
    const res = await request(app).post(`${B}/question-bank-groups`).set(admin).send({});
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'ADMIN_BANK_GROUP_NAME_REQUIRED', message: 'Ten ngan hang de khong duoc de trong.' });
  });

  it('khong co Content-Type -> 415', async () => {
    const res = await request(app).post(`${B}/question-bank-groups`).set(admin);
    expect(res.status).toBe(415);
  });

  it('sai kieu -> loi $.path co vi tri byte', async () => {
    const res = await request(app).post(`${B}/assignments/distribute`).set(admin).send({ examIds: ['abc'] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({
      request: ['The request field is required.'],
      '$.examIds[0]': ['The JSON value could not be converted to System.Guid. Path: $.examIds[0] | LineNumber: 0 | BytePositionInLine: 17.'],
    });
  });

  it('string khong nullable = null -> Required', async () => {
    const res = await request(app).post(`${B}/question-bank/import`).set(admin).send({ questions: [{ loaiCauHoiCode: null }] });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({ 'Questions[0].LoaiCauHoiCode': ['The LoaiCauHoiCode field is required.'] });
  });

  it('query bool sai -> 400', async () => {
    const res = await request(app).get(`${B}/question-bank-groups?includeRetired=abc`).set(admin);
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual({ includeRetired: ["The value 'abc' is not valid."] });
  });
});

describe('ngan hang de -> bai tap mau -> sinh de -> giao bai', () => {
  let bankId = '';
  const exerciseIds: string[] = [];

  it('tao ngan hang de', async () => {
    const res = await request(app)
      .post(`${B}/question-bank-groups`)
      .set(admin)
      .send({ maCode: `TEST_ASSIGN_${RUN}`, tenNganHang: `TEST_ASSIGN_NH ${RUN}`, maKhoaHoc: KH, trinhDoCode: 'IELTS', trangThai: 'active' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tao ngan hang de thanh cong.');
    expect(res.body.data).toMatchObject({ maCode: `TEST_ASSIGN_${RUN}`, trangThai: 'ACTIVE', trinhDoCode: 'IELTS', soBaiTap: 0 });
    bankId = res.body.data.maNganHang;
    created.banks.push(bankId);

    const dup = await request(app).post(`${B}/question-bank-groups`).set(admin).send({ maCode: `TEST_ASSIGN_${RUN}`, tenNganHang: 'x' });
    expect(dup.status).toBe(400);
    expect(dup.body.code).toBe('ADMIN_BANK_GROUP_CODE_DUPLICATED');
  });

  it('tao 3 bai tap mau (1 nhap) va doc lai', async () => {
    for (const [i, status] of ['APPROVED', '', 'draft'].entries()) {
      const res = await request(app)
        .post(`${B}/question-bank`)
        .set(admin)
        .send({
          maKhoaHoc: KH,
          maNganHang: bankId,
          trangThaiDuyet: status,
          code: `TEST-${i}`,
          tenBaiTap: `TEST_ASSIGN_BT ${RUN} ${i}`,
          huongDanChung: 'Chọn đáp án đúng',
          noiDungNguCanhChung: 'Đoạn văn chung',
          loaiCauHoiCode: 'CQ_TRAC_NGHIEM_1',
          mucDoCode: 'TRUNG_BINH',
          danhSachTu: ['apple'],
          cauHoiCon: [
            { diemCuaCau: 2, deBai: { cauHoiGoc: 'Q1', luaChon: [{ id: 'A', text: 'a' }] }, dapAn: 'A' },
            { deBai: { cauHoiGoc: 'Q2' }, dapAn: 'B', giaiThich: ' vì B ' },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.data.trangThaiDuyet).toBe(status === 'draft' ? 'DRAFT' : 'APPROVED');
      expect(res.body.data.cauHoiCon).toHaveLength(2);
      expect(res.body.data.cauHoiCon[0]).toMatchObject({ soCau: 'Câu 1', thuTu: 1, diemCuaCau: 2, dapAn: 'A' });
      expect(res.body.data.cauHoiCon[1]).toMatchObject({ soCau: 'Câu 2', diemCuaCau: 1, giaiThich: 'vì B' });
      exerciseIds.push(res.body.data.maBaiTap);
      created.exercises.push(res.body.data.maBaiTap);
    }
    const list = await request(app).get(`${B}/question-bank?bankId=${bankId}`).set(admin);
    expect(list.body.data.map((x: { maBaiTap: string }) => x.maBaiTap)).toEqual(exerciseIds);

    const detail = await request(app).get(`${B}/question-bank/${exerciseIds[0]}`).set(admin);
    expect(detail.body.data).toMatchObject({ code: 'TEST-0', danhSachTu: ['apple'], loaiCauHoiCode: 'CQ_TRAC_NGHIEM_1', ghiChu: null });

    const patch = await request(app).patch(`${B}/question-bank/${exerciseIds[1]}/status`).set(admin).send({ trangThai: 'pending' });
    expect(patch.body.data).toEqual({ exerciseId: exerciseIds[1], trangThai: 'PENDING' });
    const back = await request(app).patch(`${B}/question-bank/${exerciseIds[1]}/status`).set(admin).send({ trangThai: 'approved' });
    expect(back.status).toBe(200);
  });

  let examIds: string[] = [];
  it('sinh de tu ngan hang: cung seed -> cung bo bai, chia deu diem', async () => {
    const body = {
      templateName: `TEST_ASSIGN_De ${RUN}`,
      totalScore: 10,
      durationMinutes: 30,
      examCount: 2,
      seed: 4242,
      maDePrefix: `T${RUN}`.slice(0, 10),
      sections: [{ rowId: 'r1', requiredCount: 2, scoreWeight: 0, sectionOrder: 1 }],
    };
    const tooMany = await request(app)
      .post(`${B}/question-bank-groups/${bankId}/generate`)
      .set(admin)
      .send({ ...body, sections: [{ rowId: 'r1', requiredCount: 3 }] });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.message).toBe(
      'Phan 1 (r1): kho chi co 2 bai da duyet nhung can 3. Hay them bai vao ngan hang nguon hoac giam so bai cua phan nay.',
    );

    const a = await request(app).post(`${B}/question-bank-groups/${bankId}/generate`).set(admin).send(body);
    const b = await request(app).post(`${B}/question-bank-groups/${bankId}/generate`).set(admin).send(body);
    expect(a.status).toBe(200);
    expect(a.body.data.seed).toBe(4242);
    expect(a.body.data.warnings).toHaveLength(1);
    const picks = (r: typeof a) => r.body.data.exams.map((e: { sections: { items: { maBaiTapNguon: string }[] }[] }) => e.sections[0].items.map((i) => i.maBaiTapNguon));
    expect(picks(b)).toEqual(picks(a));
    for (const e of a.body.data.exams) {
      expect(e.tongSoCau).toBe(4);
      expect(e.tongDiem).toBe(10);
      expect(e.code).toMatch(/-\d{6}-\d{3}$/);
    }
    const codes = [...a.body.data.exams, ...b.body.data.exams].map((e: { code: string }) => e.code);
    expect(new Set(codes).size).toBe(4);
    examIds = [...a.body.data.exams, ...b.body.data.exams].map((e: { maBaiTap: string }) => e.maBaiTap);
    created.assignments.push(...examIds);

    const detail = await request(app).get(`${B}/assignments/${examIds[0]}`).set(admin);
    expect(detail.body.data).toMatchObject({ statusKey: 'DRAFT', publishMode: 'DRAFT', loaiBaiTapCode: 'EXAM', totalQuestions: 4, diemToiDa: 10 });
    expect(detail.body.data.selectedQuestions.map((q: { diemCuaCau: number }) => q.diemCuaCau)).toEqual([2.5, 2.5, 2.5, 2.5]);
    expect(detail.body.data.selectedQuestions[0].deBai).toMatchObject({ huongDan: 'Chọn đáp án đúng', doanVan: 'Đoạn văn chung', danhSachTu: ['apple'] });
  });

  it('giao bai cho lop', async () => {
    const res = await request(app)
      .post(`${B}/assignments/distribute`)
      .set(admin)
      .send({ examIds: examIds.slice(0, 2), classIds: [LOP], openAt: '2026-01-01T07:00', dueAt: '2099-01-01T07:00', soLanLamToiDa: 99, seed: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Giao bai thanh cong.');
    expect(res.body.data.tongHocSinh).toBe(1);
    expect(res.body.data.exams.filter((e: { soHocSinh: number }) => e.soHocSinh === 1)).toHaveLength(1);
    const giao = res.body.data.exams.find((e: { soHocSinh: number }) => e.soHocSinh === 1);
    const detail = await request(app).get(`${B}/assignments/${giao.maBaiTap}`).set(admin);
    expect(detail.body.data).toMatchObject({
      publishMode: 'ACTIVE',
      statusKey: 'ACTIVE',
      maxAttempts: 10,
      openAt: '2026-01-01T07:00:00',
      dueAt: '2099-01-01T07:00:00',
      selectedClassIds: [LOP],
      totalStudents: 1,
    });

    const bank = await request(app).post(`${B}/assignments/distribute`).set(admin).send({ examIds: [exerciseIds[0]], classIds: [LOP] });
    expect(bank.status).toBe(400);
    expect(bank.body.code).toBe('ADMIN_DISTRIBUTE_BANK_TEMPLATE');
  });

  it('xoa ngan hang con bai -> 400', async () => {
    const res = await request(app).delete(`${B}/question-bank-groups/${bankId}`).set(admin);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Ngan hang dang chua 3 bai tap. Hay xoa hoac chuyen cac bai tap truoc.');
  });
});

describe('bai tap / de thi', () => {
  let id = '';
  it('tao, doc, sua, xoa mem', async () => {
    const bad = await request(app).post(`${B}/assignments`).set(admin).send({ tenBaiTap: 'x', diemToiDa: 1, loaiBaiTapCode: 'EXAM', maKhoaHoc: KH });
    expect(bad.body.code).toBe('ADMIN_ASSIGNMENT_DURATION_INVALID');

    const res = await request(app)
      .post(`${B}/assignments`)
      .set(admin)
      .send({
        tenBaiTap: `TEST_ASSIGN_BaiTap ${RUN}`,
        moTa: ' mô tả ',
        maKhoaHoc: KH,
        loaiBaiTapCode: 'QUIZ',
        publishMode: 'ACTIVE',
        thoiGianLamBai: 20,
        diemToiDa: '10',
        openAt: '2026-01-01T08:00',
        accessCode: '  ',
        selectedClassIds: [LOP],
        selectedQuestions: [],
      });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Tao bai tap thanh cong.');
    id = res.body.data.maBaiTap;
    created.assignments.push(id);
    expect(res.body.data).toMatchObject({
      moTa: 'mô tả',
      loaiBaiTapCode: 'QUIZ',
      statusKey: 'NEEDS_SETUP',
      openAt: '2026-01-01T08:00:00',
      dueAt: '2026-01-01T08:20:00',
      accessCode: null,
      totalClasses: 1,
      totalStudents: 1,
      submissionStats: { totalStudents: 1, submitted: 0, lateSubmitted: 0, needsGrading: 0 },
    });
    expect(res.body.data.code).toMatch(/^KT-\d{3}$/);
    expect(Object.keys(res.body.data).slice(0, 2)).toEqual(['allowLateSubmission', 'showScoreWhenDone']);

    const list = await request(app).get(`${B}/assignments?courseId=${KH}&status=needs_setup`).set(admin);
    expect(list.body.data.map((x: { maBaiTap: string }) => x.maBaiTap)).toContain(id);
    expect(Object.keys(list.body.data[0])).not.toContain('selectedQuestions');

    const upd = await request(app)
      .put(`${B}/assignments/${id}`)
      .set(admin)
      .send({ tenBaiTap: 'TEST_ASSIGN_BaiTap upd', maKhoaHoc: KH, loaiBaiTapCode: 'HOMEWORK', publishMode: 'DRAFT', diemToiDa: 5, selectedClassIds: [] });
    expect(upd.status).toBe(200);
    expect(upd.body.data).toMatchObject({ statusKey: 'DRAFT', thoiGianLamBai: 0, totalClasses: 0 });
    // Nhu ban .NET: khong gui code -> sinh lai ma theo loai bai moi.
    expect(upd.body.data.code).toMatch(/^BT-\d{3}$/);

    const del = await request(app).delete(`${B}/assignments/${id}`).set(admin);
    expect(del.body).toMatchObject({ success: true, message: 'Xoa mem bai tap thanh cong.', data: { assignmentId: id } });
    const gone = await request(app).get(`${B}/assignments/${id}`).set(admin);
    expect(gone.status).toBe(404);
    expect(gone.body.code).toBe('ADMIN_ASSIGNMENT_NOT_FOUND');
  });

  it('tim kiem theo ten va mo ta (ban .NET luon 500 - da sua)', async () => {
    const res = await request(app)
      .post(`${B}/assignments`)
      .set(admin)
      .send({
        tenBaiTap: `TEST_ASSIGN_Tim ${RUN}`,
        moTa: `Ôn tập ThìHiệnTại_${RUN}`,
        maKhoaHoc: KH,
        loaiBaiTapCode: 'HOMEWORK',
        publishMode: 'DRAFT',
        diemToiDa: 10,
        selectedClassIds: [],
      });
    expect(res.status).toBe(200);
    const sid = res.body.data.maBaiTap;
    created.assignments.push(sid);
    const ids = async (q: string) => {
      const r = await request(app).get(`${B}/assignments?search=${encodeURIComponent(q)}`).set(admin);
      expect(r.status).toBe(200);
      return r.body.data.map((x: { maBaiTap: string }) => x.maBaiTap);
    };

    expect(await ids(`test_assign_tim ${RUN}`)).toEqual([sid]); // ten, khong phan biet hoa thuong
    expect(await ids(`thìhiệntại_${RUN}`)).toEqual([sid]); // trong mo ta (cot json), tieng Viet
    expect(await ids(`khong-co-${RUN}`)).toEqual([]);
    expect(await ids(`%_${RUN}`)).toEqual([]); // % va _ duoc escape, khong thanh ky tu dai dien
  });

  it('sua bai them cau hoi + lop moi duoc luu (ban .NET 500, khong luu - da sua)', async () => {
    const imp = await request(app)
      .post(`${B}/question-bank/import`)
      .set(admin)
      .send({ questions: [{ maKhoaHoc: KH, loaiCauHoiCode: 'CQ_TU_LUAN', mucDoCode: 'CO_BAN', deBai: { html: `TEST_ASSIGN_Sua ${RUN}` } }] });
    expect(imp.status).toBe(200);
    const maCauHoi = imp.body.data.importedQuestions[0].maCauHoi as string;
    expect(maCauHoi).toBeTruthy();
    created.exercises.push(maCauHoi);

    const base = { tenBaiTap: `TEST_ASSIGN_Sua ${RUN}`, maKhoaHoc: KH, loaiBaiTapCode: 'HOMEWORK', publishMode: 'DRAFT', diemToiDa: 10 };
    const c = await request(app).post(`${B}/assignments`).set(admin).send({ ...base, selectedClassIds: [], selectedQuestions: [] });
    expect(c.status).toBe(200);
    const aid = c.body.data.maBaiTap as string;
    created.assignments.push(aid);
    expect(c.body.data).toMatchObject({ totalClasses: 0 });

    const u = await request(app)
      .put(`${B}/assignments/${aid}`)
      .set(admin)
      .send({ ...base, code: c.body.data.code, selectedClassIds: [LOP], selectedQuestions: [{ maCauHoi, thuTu: 1, diemCuaCau: 10 }] });
    expect(u.status).toBe(200);
    expect(u.body.data).toMatchObject({ totalClasses: 1, totalStudents: 1 });

    const detail = await request(app).get(`${B}/assignments/${aid}`).set(admin);
    expect(detail.body.data.selectedClassIds).toEqual([LOP]);
    expect(detail.body.data.selectedQuestions.map((q: { maCauHoi: string }) => q.maCauHoi)).toEqual([maCauHoi]);
    expect(await prisma.baitapcauhoi.count({ where: { MaBaiTap: aid } })).toBe(1);
    expect(await prisma.sukienlophoc.count({ where: { MaBaiTap: aid, MaLopHoc: LOP, OR: [{ DaXoa: null }, { DaXoa: false }] } })).toBe(1);
  });
});

describe('import ngan hang cau hoi (nganhangcauhoi)', () => {
  it('import theo duong cu va duong JSON, loi thi rollback ca lo', async () => {
    const ok = await request(app)
      .post(`${B}/question-bank/import`)
      .set(admin)
      .send({
        questions: [
          {
            maKhoaHoc: KH,
            loaiCauHoiCode: 'CQ_TRAC_NGHIEM_1',
            mucDoCode: 'CO_BAN',
            noiDungCauHoi: `TEST_ASSIGN_Q ${RUN}`,
            choiceAnswers: [{ noiDungDapAn: ' A ', laDapAnDung: true }, { tenDapAn: 'Z', noiDungDapAn: 'B' }],
          },
          { maKhoaHoc: KH, loaiCauHoiCode: 'CQ_TU_LUAN', mucDoCode: 'CO_BAN', deBai: { html: `TEST_ASSIGN_E ${RUN}` } },
        ],
      });
    expect(ok.status).toBe(200);
    expect(ok.body.data.importedCount).toBe(2);
    const [q1, q2] = ok.body.data.importedQuestions;
    expect(Object.keys(q1).slice(0, 3)).toEqual(['noiDungCauHoiCha', 'choiceAnswers', 'textAnswers']);
    expect(q1.dapAn).toEqual([
      { id: 'A', noi_dung: 'A', la_dung: true, gia_tri_doi_chieu: null },
      { id: 'Z', noi_dung: 'B', la_dung: false, gia_tri_doi_chieu: null },
    ]);
    expect(q1).toMatchObject({ noiDungCauHoi: `TEST_ASSIGN_Q ${RUN}`, soDapAnLuaChon: 2, laCauHoiTuLuan: false });
    expect(q2).toMatchObject({ laCauHoiTuLuan: true, dapAn: [], noiDungCauHoi: `TEST_ASSIGN_E ${RUN}` });

    const before = await prisma.nganhangcauhoi.count({ where: { MaKhoaHoc: KH } });
    const fail = await request(app)
      .post(`${B}/question-bank/import`)
      .set(admin)
      .send({
        questions: [
          { maKhoaHoc: KH, loaiCauHoiCode: 'CQ_TU_LUAN', mucDoCode: 'CO_BAN', deBai: 'ok' },
          { maKhoaHoc: KH, loaiCauHoiCode: 'CQ_TRAC_NGHIEM_1', mucDoCode: 'CO_BAN', noiDungCauHoi: 'x', choiceAnswers: [{ noiDungDapAn: 'a' }] },
        ],
      });
    expect(fail.status).toBe(400);
    expect(fail.body.message).toBe('Import that bai o dong 2. Hay kiem tra lai du lieu cau hoi.');
    expect(await prisma.nganhangcauhoi.count({ where: { MaKhoaHoc: KH } })).toBe(before);
  });
});
