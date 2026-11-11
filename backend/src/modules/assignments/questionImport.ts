import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import {
  active,
  element,
  err,
  hasJsonValue,
  isChoiceBasedQuestionTypeCode,
  isEssayTypeCode,
  isMatchingQuestionTypeCode,
  isMultipleChoiceQuestionTypeCode,
  isNullOrWhiteSpace,
  isTextBasedQuestionTypeCode,
  loadCategories,
  newNoiDung,
  normalizeOptional,
  parseQuestionBankContent,
  prisma,
  resolveCategoryId,
  serializeNoiDung,
  UNDEFINED_ELEMENT,
  type ActionError,
  type Db,
  type NoiDung,
} from './common.js';
import { stableSortBy, toJsonValue } from './dotnetTypes.js';
import { EMPTY_GUID } from './binder.js';
import type { ChoiceAnswerUpsertRequest, QuestionBankImportRequest, QuestionBankUpsertRequest, TextAnswerUpsertRequest } from './dtos.js';

// POST question-bank/import: ghi vao bang nganhangcauhoi (ngan hang cau hoi kieu cu), trong mot giao dich.

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** ExtractQuestionContent: rut text thuan tu de bai. */
export function extractQuestionContent(deBai: unknown): string {
  if (typeof deBai === 'string') return deBai;
  if (!isObj(deBai)) return '';
  for (const key of ['html', 'text', 'cauHoiGoc', 'doanVan', 'noiDung']) {
    const v = deBai[key];
    if (typeof v === 'string' && v.trim() !== '') return v;
  }
  for (const key of ['danhSach', 'danhSachTrai', 'luaChon']) {
    const list = deBai[key];
    if (!Array.isArray(list)) continue;
    const parts = list
      .map((item) => (isObj(item) && typeof item.text === 'string' ? item.text : null))
      .filter((x): x is string => x !== null && x.trim() !== '')
      .slice(0, 3);
    if (parts.length > 0) return parts.join(' / ');
  }
  return '';
}

function parseChoiceAnswers(dapan: unknown) {
  if (!Array.isArray(dapan)) return [];
  return dapan
    .filter(isObj)
    .map((item, index) => ({
      maDapAn: EMPTY_GUID,
      tenDapAn: typeof item.id === 'string' ? item.id : String.fromCharCode(65 + index),
      noiDungDapAn: typeof item.noi_dung === 'string' ? item.noi_dung : '',
      laDapAnDung: item.la_dung === true,
      giaTriDoiChieu: typeof item.gia_tri_doi_chieu === 'string' ? item.gia_tri_doi_chieu : null,
      thuTu: index + 1,
    }))
    .filter((x) => x.noiDungDapAn.trim() !== '');
}

function parseTextAnswers(dapan: unknown) {
  if (!Array.isArray(dapan)) return [];
  return dapan
    .filter(isObj)
    .map((item) => ({
      maDapAnDien: EMPTY_GUID,
      dapAnChuan: typeof item.dap_an_chuan === 'string' ? item.dap_an_chuan : '',
      dapAnThayThe: typeof item.dap_an_thay_the === 'string' ? item.dap_an_thay_the : null,
      phanBietHoaThuong: item.phan_biet_hoa_thuong === true,
    }))
    .filter((x) => x.dapAnChuan.trim() !== '');
}

const normalizeChoiceAnswers = (answers: ChoiceAnswerUpsertRequest[] | null) =>
  (answers ?? [])
    .filter((x) => !isNullOrWhiteSpace(x.NoiDungDapAn))
    .map((x) => ({
      TenDapAn: normalizeOptional(x.TenDapAn),
      NoiDungDapAn: x.NoiDungDapAn.trim(),
      LaDapAnDung: x.LaDapAnDung,
      GiaTriDoiChieu: normalizeOptional(x.GiaTriDoiChieu),
      ThuTu: x.ThuTu,
    }));

const normalizeTextAnswers = (answers: TextAnswerUpsertRequest[] | null) =>
  (answers ?? [])
    .filter((x) => !isNullOrWhiteSpace(x.DapAnChuan))
    .map((x) => ({
      DapAnChuan: x.DapAnChuan.trim(),
      DapAnThayThe: normalizeOptional(x.DapAnThayThe),
      PhanBietHoaThuong: x.PhanBietHoaThuong,
    }));

function buildDapAn(questionTypeCode: string, request: QuestionBankUpsertRequest): unknown {
  const choice = normalizeChoiceAnswers(request.ChoiceAnswers);
  const text = normalizeTextAnswers(request.TextAnswers);
  if (isChoiceBasedQuestionTypeCode(questionTypeCode) || (choice.length > 0 && text.length === 0)) {
    return choice.map((a, i) => ({
      id: a.TenDapAn ? a.TenDapAn : String.fromCharCode(65 + i),
      noi_dung: a.NoiDungDapAn,
      la_dung: a.LaDapAnDung,
      gia_tri_doi_chieu: a.GiaTriDoiChieu,
    }));
  }
  if (isTextBasedQuestionTypeCode(questionTypeCode) || (text.length > 0 && choice.length === 0)) {
    return text.map((a) => ({
      dap_an_chuan: a.DapAnChuan,
      dap_an_thay_the: a.DapAnThayThe,
      phan_biet_hoa_thuong: a.PhanBietHoaThuong,
    }));
  }
  return {};
}

function buildNoiDung(questionTypeCode: string, request: QuestionBankUpsertRequest): NoiDung {
  const nd = newNoiDung();
  nd.DeBai = hasJsonValue(request.DeBai) ? structuredClone(request.DeBai) : { html: request.NoiDungCauHoi };
  nd.DapAn = hasJsonValue(request.DapAn) ? structuredClone(request.DapAn) : buildDapAn(questionTypeCode, request);
  nd.GiaiThich = normalizeOptional(request.GiaiThich) ?? normalizeOptional(request.GiaiThichDapAn);
  nd.Tags = request.Tags && request.Tags.length > 0 ? request.Tags : null;
  nd.Loai = questionTypeCode;
  nd.LaTuLuan = isEssayTypeCode(questionTypeCode);
  return nd;
}

async function validateQuestionBankRequest(db: Db, questionId: string | null, request: QuestionBankUpsertRequest): Promise<ActionError | null> {
  const usesStructuredContent = hasJsonValue(request.DeBai);
  if (!usesStructuredContent && isNullOrWhiteSpace(request.NoiDungCauHoi)) {
    return err(400, 'Noi dung cau hoi khong duoc de trong.', 'ADMIN_QUESTION_CONTENT_REQUIRED');
  }
  if (isNullOrWhiteSpace(request.LoaiCauHoiCode)) return err(400, 'Can chon loai cau hoi.', 'ADMIN_QUESTION_TYPE_REQUIRED');
  if (isNullOrWhiteSpace(request.MucDoCode)) return err(400, 'Can chon muc do cau hoi.', 'ADMIN_QUESTION_DIFFICULTY_REQUIRED');

  const courseExists = await db.khoahoc.count({ where: { AND: [{ MaKhoaHoc: request.MaKhoaHoc }, active] } });
  if (!courseExists) return err(404, 'Khong tim thay khoa hoc de gan cau hoi.', 'ADMIN_QUESTION_COURSE_NOT_FOUND');

  if (request.MaCauHoiCha !== null) {
    if (questionId && request.MaCauHoiCha === questionId) {
      return err(400, 'Cau hoi cha khong duoc trung voi cau hoi hien tai.', 'ADMIN_QUESTION_PARENT_INVALID');
    }
    const parentExists = await db.nganhangcauhoi.count({
      where: { AND: [{ MaCauHoi: request.MaCauHoiCha, MaKhoaHoc: request.MaKhoaHoc }, active] },
    });
    if (!parentExists) {
      return err(400, 'Cau hoi cha khong ton tai hoac khong thuoc khoa hoc da chon.', 'ADMIN_QUESTION_PARENT_NOT_FOUND');
    }
  }

  const questionTypeCode = request.LoaiCauHoiCode.trim();
  // Duong ghi moi: de bai/dap an la JSON tu do theo tung dang - chi kiem tra co dap an.
  if (usesStructuredContent) {
    if (!isEssayTypeCode(questionTypeCode) && !hasJsonValue(request.DapAn)) {
      return err(400, 'Dang cau hoi nay can co dap an chuan de cham tu dong.', 'ADMIN_QUESTION_ANSWER_REQUIRED');
    }
    return null;
  }

  const choice = normalizeChoiceAnswers(request.ChoiceAnswers);
  const text = normalizeTextAnswers(request.TextAnswers);
  if (isChoiceBasedQuestionTypeCode(questionTypeCode)) {
    if (choice.length === 0) return err(400, 'Loai cau hoi nay can it nhat mot dap an lua chon.', 'ADMIN_QUESTION_ANSWER_REQUIRED');
    if (isMultipleChoiceQuestionTypeCode(questionTypeCode)) {
      if (choice.length < 2) return err(400, 'Cau hoi trac nghiem can toi thieu 2 dap an.', 'ADMIN_QUESTION_MCQ_MIN_OPTIONS');
      if (!choice.some((x) => x.LaDapAnDung)) {
        return err(400, 'Can chon it nhat mot dap an dung cho cau hoi trac nghiem.', 'ADMIN_QUESTION_MCQ_CORRECT_REQUIRED');
      }
    }
    if (isMatchingQuestionTypeCode(questionTypeCode) && choice.some((x) => isNullOrWhiteSpace(x.GiaTriDoiChieu))) {
      return err(400, 'Cau hoi noi/ghep can nhap gia tri doi chieu cho tung dap an.', 'ADMIN_QUESTION_MATCHING_VALUE_REQUIRED');
    }
  }
  if (isTextBasedQuestionTypeCode(questionTypeCode) && text.length === 0) {
    return err(400, 'Loai cau hoi nay can it nhat mot dap an nhap lieu.', 'ADMIN_QUESTION_TEXT_ANSWER_REQUIRED');
  }
  return null;
}

/** BuildQuestionBankDetailAsync -> AdminAssignmentQuestionBankDetailDto */
async function buildQuestionBankDetail(db: Db, questionId: string) {
  const q = await db.nganhangcauhoi.findFirst({
    where: { AND: [{ MaCauHoi: questionId }, active] },
    include: {
      khoahoc: { select: { TenKhoaHoc: true } },
      dapandiendkhuyet: { orderBy: { MaDapAnDien: 'asc' } },
    },
  });
  if (!q) return null;
  const cats = await loadCategories(db, [q.LoaiCauHoi, q.MucDo, q.TrinhDo, q.KyNang]);
  const loai = q.LoaiCauHoi != null ? cats.get(q.LoaiCauHoi) : undefined;
  const mucDo = q.MucDo != null ? cats.get(q.MucDo) : undefined;
  const trinhDo = q.TrinhDo != null ? cats.get(q.TrinhDo) : undefined;
  const kyNang = q.KyNang != null ? cats.get(q.KyNang) : undefined;

  // NoiDungCauHoiCha = chuoi json nguyen van cua cau cha (EF doc cot json thanh string).
  let noiDungCha: string | null = null;
  if (q.MaCauHoiCha) {
    const rows = await db.$queryRaw<{ t: string | null }[]>`SELECT CAST(NoiDungChiTiet AS CHAR) AS t FROM nganhangcauhoi WHERE MaCauHoi = ${q.MaCauHoiCha}`;
    noiDungCha = rows[0]?.t ?? null;
  }

  const parsed = parseQuestionBankContent(q.NoiDungChiTiet);
  const dapAnValue = parsed.DapAn === UNDEFINED_ELEMENT ? undefined : parsed.DapAn;
  const choiceAnswers = parseChoiceAnswers(dapAnValue);
  let textAnswers = parseTextAnswers(dapAnValue);
  if (textAnswers.length === 0) {
    textAnswers = stableSortBy(
      q.dapandiendkhuyet.filter((x) => x.DaXoa !== true && x.TrangThai !== false),
      (a, b) => (a.ThoiGianTao?.getTime() ?? -8.64e15) - (b.ThoiGianTao?.getTime() ?? -8.64e15),
    ).map((x) => ({
      maDapAnDien: x.MaDapAnDien.toLowerCase(),
      dapAnChuan: x.DapAnChuan,
      dapAnThayThe: x.DapAnThayThe,
      phanBietHoaThuong: x.PhanBietHoaThuong === true,
    }));
  }
  const content = extractQuestionContent(parsed.DeBai === UNDEFINED_ELEMENT ? undefined : parsed.DeBai);

  // Lop con (DetailDto) truoc, lop cha (ItemDto) sau - dung thu tu System.Text.Json.
  return {
    noiDungCauHoiCha: noiDungCha,
    choiceAnswers,
    textAnswers,
    maCauHoi: q.MaCauHoi.toLowerCase(),
    maKhoaHoc: q.MaKhoaHoc.toLowerCase(),
    tenKhoaHoc: q.khoahoc.TenKhoaHoc,
    loaiCauHoiCode: loai?.MaCode ?? '',
    loaiCauHoiLabel: loai?.TenChiTiet ?? '',
    mucDoCode: mucDo?.MaCode ?? '',
    mucDoLabel: mucDo?.TenChiTiet ?? '',
    trinhDoCode: trinhDo ? trinhDo.MaCode : null,
    kyNangCode: kyNang ? kyNang.MaCode : null,
    deBai: element(parsed.DeBai),
    dapAn: element(parsed.DapAn),
    tags: parsed.Tags,
    noiDungCauHoi: content,
    giaiThichDapAn: parsed.GiaiThich,
    amThanhLink: q.AmThanhLink,
    hinhAnhLink: q.HinhAnhLink,
    maCauHoiCha: q.MaCauHoiCha?.toLowerCase() ?? null,
    thuTu: q.ThuTu,
    laCauHoiTuLuan: isEssayTypeCode(loai?.MaCode),
    soDapAnLuaChon: choiceAnswers.length,
    soDapAnNhapLieu: textAnswers.length,
    thoiGianTao: q.ThoiGianTao,
  };
}

/** UpsertQuestionBankItemAsync (chi duoc goi voi questionId = null tu import). */
async function upsertQuestionBankItem(db: Db, userId: string, questionId: string | null, request: QuestionBankUpsertRequest) {
  const validationError = await validateQuestionBankRequest(db, questionId, request);
  if (validationError) return { error: validationError };

  const questionTypeCode = request.LoaiCauHoiCode.trim();
  const difficultyCode = request.MucDoCode.trim();
  const questionTypeId = await resolveCategoryId(db, 'LOAI_CAU_HOI', questionTypeCode);
  const difficultyId = await resolveCategoryId(db, 'MUC_DO', difficultyCode);
  if (questionTypeId === null || difficultyId === null) {
    return { error: err(400, 'Loai cau hoi hoac muc do cau hoi khong hop le.', 'ADMIN_QUESTION_CATEGORY_INVALID') };
  }

  const existing = questionId
    ? await db.nganhangcauhoi.findFirst({ where: { AND: [{ MaCauHoi: questionId }, active] }, select: { MaCauHoi: true } })
    : null;
  if (questionId && !existing) return { error: err(404, 'Khong tim thay cau hoi trong ngan hang.', 'ADMIN_QUESTION_NOT_FOUND') };

  const now = new Date();
  const id = existing?.MaCauHoi ?? randomUUID();
  const data: Record<string, unknown> = {
    MaKhoaHoc: request.MaKhoaHoc,
    LoaiCauHoi: questionTypeId,
    MucDo: difficultyId,
    NoiDungChiTiet: toJsonValue(serializeNoiDung(buildNoiDung(questionTypeCode, request))),
    AmThanhLink: normalizeOptional(request.AmThanhLink),
    HinhAnhLink: normalizeOptional(request.HinhAnhLink),
    MaCauHoiCha: request.MaCauHoiCha,
    ThuTu: request.ThuTu ?? 0,
    NguoiSua: userId,
    ThoiGianSua: now,
    TrangThai: true,
    DaXoa: false,
  };
  if (!isNullOrWhiteSpace(request.TrinhDoCode)) data.TrinhDo = await resolveCategoryId(db, 'TRINH_DO', request.TrinhDoCode!.trim());
  if (!isNullOrWhiteSpace(request.KyNangCode)) data.KyNang = await resolveCategoryId(db, 'KY_NANG', request.KyNangCode!.trim());

  if (existing) {
    await db.nganhangcauhoi.update({ where: { MaCauHoi: id }, data });
    // SyncQuestionBankAnswers: go mem dap an dien khuyet cu (dap an moi nam trong NoiDungChiTiet).
    await db.dapandiendkhuyet.updateMany({
      where: { MaCauHoi: id },
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    });
  } else {
    await db.nganhangcauhoi.create({
      data: { MaCauHoi: id, NguoiTao: userId, ThoiGianTao: now, ...data } as never,
    });
  }

  return { detail: await buildQuestionBankDetail(db, id) };
}

class ImportRollback extends Error {}

export async function importQuestionBank(userId: string, request: QuestionBankImportRequest): Promise<ActionError | { body: unknown }> {
  if (request.Questions.length === 0) return err(400, 'Danh sach cau hoi import dang rong.', 'ADMIN_QUESTION_IMPORT_EMPTY');
  try {
    const imported = await prisma.$transaction(
      async (tx) => {
        const list = [];
        for (let index = 0; index < request.Questions.length; index++) {
          const result = await upsertQuestionBankItem(tx, userId, null, request.Questions[index]!);
          if ('error' in result) throw new ImportRollback(String(index + 1));
          list.push(result.detail);
        }
        return list;
      },
      { maxWait: 10000, timeout: 120000 },
    );
    return {
      body: ok({ importedCount: imported.length, importedQuestions: imported }, 'Import ngan hang cau hoi thanh cong.'),
    };
  } catch (e) {
    if (e instanceof ImportRollback) {
      return err(400, `Import that bai o dong ${e.message}. Hay kiem tra lai du lieu cau hoi.`, 'ADMIN_QUESTION_IMPORT_FAILED');
    }
    throw e;
  }
}

