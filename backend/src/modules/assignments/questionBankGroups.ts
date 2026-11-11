import type { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import { err, normalizeOptional, isNullOrWhiteSpace, prisma, resolveCategoryId, type ActionError } from './common.js';
import { formatNow } from './dotnetTypes.js';
import type { QuestionBankGroupUpsertRequest, StatusRequest } from './dtos.js';

// NGAN HANG DE (bang nganhangde). Moi ngan hang gom nhieu bai tap mau (baitap.LaMauNganHang = 1).

const NGAN_HANG_TRANG_THAI = ['DRAFT', 'ACTIVE', 'RETIRED'];
const RETIRED = 'RETIRED';

const groupSelect = {
  MaNganHang: true,
  MaCode: true,
  TenNganHang: true,
  MaKhoaHoc: true,
  Unit: true,
  MoTa: true,
  TrangThai: true,
  ThoiGianTao: true,
  ThoiGianSua: true,
  khoahoc: { select: { TenKhoaHoc: true } },
  chitietdanhmuc_nganhangde_TrinhDoTochitietdanhmuc: { select: { MaCode: true } },
  chitietdanhmuc_nganhangde_MucDoTochitietdanhmuc: { select: { MaCode: true } },
  chitietdanhmuc_nganhangde_KyNangTochitietdanhmuc: { select: { MaCode: true } },
  _count: { select: { baitap: { where: { LaMauNganHang: true, OR: [{ DaXoa: null }, { DaXoa: false }] } } } },
} satisfies Prisma.nganhangdeSelect;

type GroupRow = {
  MaNganHang: string;
  MaCode: string;
  TenNganHang: string;
  MaKhoaHoc: string | null;
  Unit: string | null;
  MoTa: string | null;
  TrangThai: string;
  ThoiGianTao: Date | null;
  ThoiGianSua: Date | null;
  khoahoc: { TenKhoaHoc: string } | null;
  chitietdanhmuc_nganhangde_TrinhDoTochitietdanhmuc: { MaCode: string | null } | null;
  chitietdanhmuc_nganhangde_MucDoTochitietdanhmuc: { MaCode: string | null } | null;
  chitietdanhmuc_nganhangde_KyNangTochitietdanhmuc: { MaCode: string | null } | null;
  _count: { baitap: number };
};

/** AdminQuestionBankGroupDto */
function mapGroup(x: GroupRow) {
  return {
    maNganHang: x.MaNganHang.toLowerCase(),
    maCode: x.MaCode,
    tenNganHang: x.TenNganHang,
    maKhoaHoc: x.MaKhoaHoc?.toLowerCase() ?? null,
    tenKhoaHoc: x.khoahoc ? x.khoahoc.TenKhoaHoc : null,
    trinhDoCode: x.chitietdanhmuc_nganhangde_TrinhDoTochitietdanhmuc?.MaCode ?? null,
    mucDoCode: x.chitietdanhmuc_nganhangde_MucDoTochitietdanhmuc?.MaCode ?? null,
    kyNangCode: x.chitietdanhmuc_nganhangde_KyNangTochitietdanhmuc?.MaCode ?? null,
    unit: x.Unit,
    moTa: x.MoTa,
    trangThai: x.TrangThai,
    soBaiTap: x._count.baitap,
    thoiGianTao: x.ThoiGianTao,
    thoiGianSua: x.ThoiGianSua,
  };
}

export async function getQuestionBankGroups(includeRetired: boolean) {
  const items = await prisma.nganhangde.findMany({
    where: { DaXoa: false, ...(includeRetired ? {} : { NOT: { TrangThai: RETIRED } }) },
    orderBy: { TenNganHang: 'asc' },
    select: groupSelect,
  });
  return ok(items.map(mapGroup), 'Lay danh sach ngan hang de thanh cong.');
}

async function buildQuestionBankGroup(bankId: string) {
  const x = await prisma.nganhangde.findFirst({ where: { MaNganHang: bankId, DaXoa: false }, select: groupSelect });
  return x ? mapGroup(x) : null;
}

export async function updateQuestionBankGroupStatus(userId: string, bankId: string, request: StatusRequest): Promise<ActionError | { body: unknown }> {
  const status = (request.TrangThai ?? '').trim().toUpperCase();
  if (!NGAN_HANG_TRANG_THAI.includes(status)) {
    return err(400, 'Trang thai khong hop le. Chi nhan DRAFT, ACTIVE hoac RETIRED.', 'ADMIN_BANK_GROUP_STATUS_INVALID');
  }
  const bank = await prisma.nganhangde.findFirst({ where: { MaNganHang: bankId, DaXoa: false }, select: { MaNganHang: true } });
  if (!bank) return err(404, 'Khong tim thay ngan hang de.', 'ADMIN_BANK_GROUP_NOT_FOUND');
  await prisma.nganhangde.update({
    where: { MaNganHang: bank.MaNganHang },
    data: { TrangThai: status, NguoiSua: userId, ThoiGianSua: new Date() },
  });
  return { body: ok({ bankId, trangThai: status }, 'Cap nhat trang thai thanh cong.') };
}

export async function deleteQuestionBankGroup(userId: string, bankId: string): Promise<ActionError | { body: unknown }> {
  const bank = await prisma.nganhangde.findFirst({ where: { MaNganHang: bankId, DaXoa: false }, select: { MaNganHang: true } });
  if (!bank) return err(404, 'Khong tim thay ngan hang de.', 'ADMIN_BANK_GROUP_NOT_FOUND');

  // Chan xoa ngan hang con bai tap: xoa mem o day se de lai bai tap mo coi.
  const soBaiTap = await prisma.baitap.count({
    where: { MaNganHang: bankId, LaMauNganHang: true, OR: [{ DaXoa: null }, { DaXoa: false }] },
  });
  if (soBaiTap > 0) {
    return err(400, `Ngan hang dang chua ${soBaiTap} bai tap. Hay xoa hoac chuyen cac bai tap truoc.`, 'ADMIN_BANK_GROUP_NOT_EMPTY');
  }
  await prisma.nganhangde.update({
    where: { MaNganHang: bank.MaNganHang },
    data: { DaXoa: true, TrangThai: RETIRED, NguoiSua: userId, ThoiGianSua: new Date() },
  });
  return { body: ok({ bankId }, 'Xoa ngan hang de thanh cong.') };
}

export async function upsertQuestionBankGroup(
  userId: string,
  bankId: string | null,
  request: QuestionBankGroupUpsertRequest,
): Promise<ActionError | { body: unknown }> {
  const ten = (request.TenNganHang ?? '').trim();
  if (ten.length === 0) return err(400, 'Ten ngan hang de khong duoc de trong.', 'ADMIN_BANK_GROUP_NAME_REQUIRED');

  let status = (request.TrangThai ?? '').trim().toUpperCase();
  if (status.length === 0) status = 'DRAFT';
  else if (!NGAN_HANG_TRANG_THAI.includes(status)) {
    return err(400, 'Trang thai khong hop le. Chi nhan DRAFT, ACTIVE hoac RETIRED.', 'ADMIN_BANK_GROUP_STATUS_INVALID');
  }

  if (request.MaKhoaHoc !== null) {
    const courseExists = await prisma.khoahoc.count({
      where: { MaKhoaHoc: request.MaKhoaHoc, OR: [{ DaXoa: null }, { DaXoa: false }] },
    });
    if (!courseExists) return err(404, 'Khong tim thay khoa hoc.', 'ADMIN_BANK_GROUP_COURSE_NOT_FOUND');
  }

  const bank = bankId ? await prisma.nganhangde.findFirst({ where: { MaNganHang: bankId, DaXoa: false } }) : null;
  if (bankId && !bank) return err(404, 'Khong tim thay ngan hang de.', 'ADMIN_BANK_GROUP_NOT_FOUND');

  // Ma ngan hang do nguoi soan tu dat; bo trong thi sinh tam mot ma theo thoi gian.
  let maCode = (request.MaCode ?? '').trim();
  if (maCode.length === 0) maCode = bank?.MaCode ?? `NHD-${formatNow('yyMMddHHmmss')}`;

  const trung = await prisma.nganhangde.count({
    where: { MaCode: maCode, DaXoa: false, ...(bankId ? { NOT: { MaNganHang: bankId } } : {}) },
  });
  if (trung > 0) return err(400, `Ma ngan hang '${maCode}' da ton tai.`, 'ADMIN_BANK_GROUP_CODE_DUPLICATED');

  const now = new Date();
  const isNew = bank === null;
  const data = {
    MaCode: maCode,
    TenNganHang: ten,
    MaKhoaHoc: request.MaKhoaHoc,
    TrinhDo: isNullOrWhiteSpace(request.TrinhDoCode) ? null : await resolveCategoryId(prisma, 'TRINH_DO', request.TrinhDoCode!.trim()),
    MucDo: isNullOrWhiteSpace(request.MucDoCode) ? null : await resolveCategoryId(prisma, 'MUC_DO', request.MucDoCode!.trim()),
    KyNang: isNullOrWhiteSpace(request.KyNangCode) ? null : await resolveCategoryId(prisma, 'KY_NANG', request.KyNangCode!.trim()),
    Unit: normalizeOptional(request.Unit),
    MoTa: normalizeOptional(request.MoTa),
    TrangThai: status,
    NguoiSua: userId,
    ThoiGianSua: now,
    DaXoa: false,
  };
  let id: string;
  if (isNew) {
    id = randomUUID();
    await prisma.nganhangde.create({ data: { MaNganHang: id, NguoiTao: userId, ThoiGianTao: now, ...data } });
  } else {
    id = bank.MaNganHang;
    await prisma.nganhangde.update({ where: { MaNganHang: id }, data });
  }

  const detail = await buildQuestionBankGroup(id);
  return { body: ok(detail, isNew ? 'Tao ngan hang de thanh cong.' : 'Cap nhat ngan hang de thanh cong.') };
}
