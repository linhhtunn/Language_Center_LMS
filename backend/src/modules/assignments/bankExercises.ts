import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import {
  active,
  categoryIdsByCode,
  element,
  err,
  hasJsonValue,
  isEssayTypeCode,
  isNullOrWhiteSpace,
  loadCategories,
  newEnvelope,
  normalizeOptional,
  notDeleted,
  parseMetadata,
  parseQuestionBankContent,
  prisma,
  resolveCategoryId,
  serializeMetadata,
  serializeNoiDung,
  newNoiDung,
  type ActionError,
} from './common.js';
import { dec, stableSortBy, toJsonValue } from './dotnetTypes.js';
import type { BankExerciseUpsertRequest, StatusRequest } from './dtos.js';

// NGAN HANG DE: 1 bai tap = 1 dong baitap (LaMauNganHang), N cau con = baitapcauhoi.

const BAI_TAP_DUYET_TRANG_THAI = ['DRAFT', 'PENDING', 'APPROVED', 'RETIRED'];
const INT_MAX = 2147483647;

/** BuildBankExerciseAsync cho nhieu bai cung luc (giu dung thu tu `ids`). */
async function buildBankExercises(ids: string[]) {
  if (ids.length === 0) return [];
  const exercises = await prisma.baitap.findMany({
    where: { AND: [{ MaBaiTap: { in: ids }, LaMauNganHang: true }, active] },
    include: { khoahoc: { select: { TenKhoaHoc: true } } },
  });
  const children = await prisma.baitapcauhoi.findMany({
    where: { MaBaiTap: { in: exercises.map((x) => x.MaBaiTap) } },
    select: { MaBaiTap: true, MaCauHoiDe: true, SoCau: true, ThuTu: true, DiemCuaCau: true, NoiDung: true },
  });
  const cats = await loadCategories(
    prisma,
    exercises.flatMap((x) => [x.LoaiCauHoi, x.MucDo, x.TrinhDo, x.KyNang]),
  );
  const byId = new Map(exercises.map((x) => [x.MaBaiTap.toLowerCase(), x]));
  const out = [];
  for (const id of ids) {
    const exercise = byId.get(id.toLowerCase());
    if (!exercise) continue;
    const metadata = parseMetadata(exercise.MoTa);
    const own = stableSortBy(
      children.filter((c) => c.MaBaiTap.toLowerCase() === exercise.MaBaiTap.toLowerCase()),
      (a, b) => (a.ThuTu ?? INT_MAX) - (b.ThuTu ?? INT_MAX),
    );
    const loai = exercise.LoaiCauHoi != null ? cats.get(exercise.LoaiCauHoi) : undefined;
    const mucDo = exercise.MucDo != null ? cats.get(exercise.MucDo) : undefined;
    const trinhDo = exercise.TrinhDo != null ? cats.get(exercise.TrinhDo) : undefined;
    const kyNang = exercise.KyNang != null ? cats.get(exercise.KyNang) : undefined;
    out.push({
      maBaiTap: exercise.MaBaiTap.toLowerCase(),
      maNganHang: exercise.MaNganHang?.toLowerCase() ?? null,
      // Du lieu cu (seed, bai import truoc khi co truong nay) coi nhu da duyet.
      trangThaiDuyet: normalizeOptional(metadata.Status) ?? 'APPROVED',
      code: metadata.Code ?? '',
      tenBaiTap: exercise.TenBaiTap,
      maKhoaHoc: exercise.MaKhoaHoc.toLowerCase(),
      tenKhoaHoc: exercise.khoahoc.TenKhoaHoc,
      huongDanChung: exercise.HuongDanChung,
      noiDungNguCanhChung: exercise.NoiDungNguCanhChung,
      loaiCauHoiCode: loai?.MaCode ?? '',
      loaiCauHoiLabel: loai?.TenChiTiet ?? '',
      mucDoCode: mucDo?.MaCode ?? '',
      mucDoLabel: mucDo?.TenChiTiet ?? '',
      trinhDoCode: trinhDo ? trinhDo.MaCode : null,
      kyNangCode: kyNang ? kyNang.MaCode : null,
      ghiChu: metadata.Description,
      danhSachTu: metadata.DanhSachTu,
      amThanhLink: metadata.AmThanhLink,
      hinhAnhLink: metadata.HinhAnhLink,
      thoiGianTao: exercise.ThoiGianTao,
      thoiGianSua: exercise.ThoiGianSua,
      cauHoiCon: own.map((x) => {
        const noiDung = parseQuestionBankContent(x.NoiDung);
        return {
          maCauHoiDe: x.MaCauHoiDe.toLowerCase(),
          soCau: x.SoCau,
          thuTu: x.ThuTu,
          diemCuaCau: x.DiemCuaCau ?? dec(1),
          deBai: element(noiDung.DeBai),
          dapAn: element(noiDung.DapAn),
          giaiThich: noiDung.GiaiThich,
        };
      }),
    });
  }
  return out;
}

export async function buildBankExercise(id: string) {
  const [x] = await buildBankExercises([id]);
  return x ?? null;
}

export async function getQuestionBank(filters: {
  courseId: string | null;
  bankId: string | null;
  search: string | null;
  questionType: string | null;
  difficulty: string | null;
}) {
  const and: object[] = [{ LaMauNganHang: true }, active];
  if (filters.courseId) and.push({ MaKhoaHoc: filters.courseId });
  if (filters.bankId) and.push({ MaNganHang: filters.bankId });
  if (!isNullOrWhiteSpace(filters.questionType)) {
    and.push({ LoaiCauHoi: { in: await categoryIdsByCode(prisma, filters.questionType!) } });
  }
  if (!isNullOrWhiteSpace(filters.difficulty)) {
    and.push({ MucDo: { in: await categoryIdsByCode(prisma, filters.difficulty!) } });
  }
  if (!isNullOrWhiteSpace(filters.search)) {
    const keyword = filters.search!.trim();
    and.push({ OR: [{ TenBaiTap: { contains: keyword } }, { NoiDungNguCanhChung: { contains: keyword } }] });
  }
  const rows = await prisma.baitap.findMany({
    where: { AND: and },
    orderBy: [{ khoahoc: { TenKhoaHoc: 'asc' } }, { TenBaiTap: 'asc' }],
    select: { MaBaiTap: true },
  });
  const items = await buildBankExercises(rows.map((x) => x.MaBaiTap));
  return ok(items, 'Lay ngan hang de thanh cong.');
}

export async function getQuestionBankDetail(exerciseId: string): Promise<ActionError | { body: unknown }> {
  const detail = await buildBankExercise(exerciseId);
  if (!detail) return err(404, 'Khong tim thay bai tap trong ngan hang.', 'ADMIN_BANK_EXERCISE_NOT_FOUND');
  return { body: ok(detail, 'Lay chi tiet bai tap thanh cong.') };
}

export async function updateQuestionBankItemStatus(
  userId: string,
  exerciseId: string,
  request: StatusRequest,
): Promise<ActionError | { body: unknown }> {
  const status = (request.TrangThai ?? '').trim().toUpperCase();
  if (!BAI_TAP_DUYET_TRANG_THAI.includes(status)) {
    return err(400, 'Trang thai khong hop le. Chi nhan DRAFT, PENDING, APPROVED hoac RETIRED.', 'ADMIN_BANK_EXERCISE_STATUS_INVALID');
  }
  const exercise = await prisma.baitap.findFirst({
    where: { MaBaiTap: exerciseId, LaMauNganHang: true, ...notDeleted },
    select: { MaBaiTap: true, MoTa: true },
  });
  if (!exercise) return err(404, 'Khong tim thay bai tap trong ngan hang.', 'ADMIN_BANK_EXERCISE_NOT_FOUND');

  // Chi ghi de rieng truong Status, giu nguyen code / ghi chu / word bank.
  const metadata = parseMetadata(exercise.MoTa);
  metadata.Status = status;
  await prisma.baitap.update({
    where: { MaBaiTap: exercise.MaBaiTap },
    data: { MoTa: toJsonValue(serializeMetadata(metadata)), NguoiSua: userId, ThoiGianSua: new Date() },
  });
  return { body: ok({ exerciseId, trangThai: status }, 'Cap nhat trang thai thanh cong.') };
}

export async function deleteQuestionBankItem(userId: string, exerciseId: string): Promise<ActionError | { body: unknown }> {
  const exercise = await prisma.baitap.findFirst({
    where: { MaBaiTap: exerciseId, LaMauNganHang: true, ...notDeleted },
    select: { MaBaiTap: true },
  });
  if (!exercise) return err(404, 'Khong tim thay bai tap trong ngan hang.', 'ADMIN_BANK_EXERCISE_NOT_FOUND');

  // Bai mau khong bao gio duoc giao truc tiep, nhung van chan cho chac.
  const daGiao = await prisma.sukienlophoc.count({ where: { MaBaiTap: exerciseId, ...notDeleted } });
  if (daGiao > 0) return err(400, 'Bai tap dang duoc giao cho lop, khong the xoa.', 'ADMIN_BANK_EXERCISE_IN_USE');

  await prisma.baitap.update({
    where: { MaBaiTap: exercise.MaBaiTap },
    data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: new Date() },
  });
  return { body: ok({ exerciseId }, 'Xoa bai tap thanh cong.') };
}

/** UpsertBankExerciseAsync - tra ve chi tiet (AdminBankExerciseDto) hoac loi. */
export async function upsertBankExercise(
  userId: string,
  exerciseId: string | null,
  request: BankExerciseUpsertRequest,
): Promise<ActionError | { detail: NonNullable<Awaited<ReturnType<typeof buildBankExercise>>> }> {
  if (isNullOrWhiteSpace(request.TenBaiTap)) return err(400, 'Ten bai tap khong duoc de trong.', 'ADMIN_BANK_TITLE_REQUIRED');
  if (request.CauHoiCon.length === 0) return err(400, 'Bai tap phai co it nhat mot cau hoi con.', 'ADMIN_BANK_QUESTION_REQUIRED');

  const courseExists = await prisma.khoahoc.count({ where: { AND: [{ MaKhoaHoc: request.MaKhoaHoc }, active] } });
  if (!courseExists) return err(404, 'Khong tim thay khoa hoc.', 'ADMIN_BANK_COURSE_NOT_FOUND');

  if (request.MaNganHang !== null) {
    const bankExists = await prisma.nganhangde.count({ where: { MaNganHang: request.MaNganHang, DaXoa: false } });
    if (!bankExists) return err(404, 'Khong tim thay ngan hang de.', 'ADMIN_BANK_GROUP_NOT_FOUND');
  }

  const questionTypeCode = request.LoaiCauHoiCode.trim();
  const loaiCauHoiId = await resolveCategoryId(prisma, 'LOAI_CAU_HOI', questionTypeCode);
  const mucDoId = await resolveCategoryId(prisma, 'MUC_DO', request.MucDoCode.trim());
  if (loaiCauHoiId === null || mucDoId === null) {
    return err(400, 'Loai cau hoi hoac muc do khong hop le.', 'ADMIN_BANK_CATEGORY_INVALID');
  }

  const existing = exerciseId
    ? await prisma.baitap.findFirst({
        where: { MaBaiTap: exerciseId, LaMauNganHang: true, ...notDeleted },
        select: { MaBaiTap: true, MaNganHang: true, MoTa: true },
      })
    : null;
  if (exerciseId && !existing) return err(404, 'Khong tim thay bai tap trong ngan hang.', 'ADMIN_BANK_EXERCISE_NOT_FOUND');

  const now = new Date();
  const id = existing?.MaBaiTap ?? randomUUID();

  const trinhDo = isNullOrWhiteSpace(request.TrinhDoCode) ? null : await resolveCategoryId(prisma, 'TRINH_DO', request.TrinhDoCode!.trim());
  const kyNang = isNullOrWhiteSpace(request.KyNangCode) ? null : await resolveCategoryId(prisma, 'KY_NANG', request.KyNangCode!.trim());

  // Ma bai tap va ghi chu dung chung envelope voi bai tap thuong.
  const moTa = serializeMetadata(
    newEnvelope({
      Code: normalizeOptional(request.Code) ?? '',
      Description: normalizeOptional(request.GhiChu),
      DanhSachTu: request.DanhSachTu && request.DanhSachTu.length > 0 ? request.DanhSachTu : null,
      // Request bo trong -> giu trang thai cu, khong am tham dua ve nhap.
      Status:
        normalizeOptional(request.TrangThaiDuyet)?.toUpperCase() ??
        normalizeOptional(parseMetadata(existing?.MoTa ?? null).Status) ??
        'APPROVED',
      AmThanhLink: normalizeOptional(request.AmThanhLink),
      HinhAnhLink: normalizeOptional(request.HinhAnhLink),
    }),
  );

  const fields = {
    LaMauNganHang: true,
    MaKhoaHoc: request.MaKhoaHoc,
    // Request khong gui ngan hang -> giu nguyen ngan hang cu khi sua.
    MaNganHang: request.MaNganHang ?? existing?.MaNganHang ?? null,
    TenBaiTap: request.TenBaiTap.trim(),
    HuongDanChung: normalizeOptional(request.HuongDanChung),
    NoiDungNguCanhChung: normalizeOptional(request.NoiDungNguCanhChung),
    LoaiCauHoi: loaiCauHoiId,
    MucDo: mucDoId,
    TrinhDo: trinhDo,
    KyNang: kyNang,
    NguoiSua: userId,
    ThoiGianSua: now,
    TrangThai: true,
    DaXoa: false,
    MoTa: toJsonValue(moTa),
  };

  // Cau con duoc ghi de hoan toan: form gui len danh sach day du moi lan luu.
  const children = request.CauHoiCon.map((child, i) => {
    const order = i + 1;
    const nd = newNoiDung();
    nd.DeBai = hasJsonValue(child.DeBai) ? structuredClone(child.DeBai) : {};
    nd.DapAn = hasJsonValue(child.DapAn) ? structuredClone(child.DapAn) : {};
    nd.GiaiThich = normalizeOptional(child.GiaiThich);
    nd.Loai = questionTypeCode;
    nd.LaTuLuan = isEssayTypeCode(questionTypeCode);
    return {
      MaCauHoiDe: randomUUID(),
      MaBaiTap: id,
      MaCauHoi: null,
      SoCau: normalizeOptional(child.SoCau) ?? `Câu ${order}`,
      ThuTu: child.ThuTu ?? order,
      DiemCuaCau: child.DiemCuaCau ?? dec(1),
      NoiDung: toJsonValue(serializeNoiDung(nd)),
      NguoiTao: userId,
      ThoiGianTao: now,
    };
  });

  // Mot SaveChanges = mot giao dich.
  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.baitap.update({ where: { MaBaiTap: id }, data: fields });
      await tx.baitapcauhoi.deleteMany({ where: { MaBaiTap: id } });
    } else {
      await tx.baitap.create({ data: { MaBaiTap: id, NguoiTao: userId, ThoiGianTao: now, ...fields } });
    }
    await tx.baitapcauhoi.createMany({ data: children });
  });

  const detail = await buildBankExercise(id);
  return { detail: detail! };
}
