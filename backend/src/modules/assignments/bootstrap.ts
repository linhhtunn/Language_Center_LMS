import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ok } from '../../utils/apiResponse.js';
import { saveUpload } from '../../utils/upload.js';
import { active, err, prisma, type ActionError } from './common.js';
import { stableSortBy, todayDateOnly } from './dotnetTypes.js';

// GET bootstrap + POST question-bank/assets

const MAX_EXAM_ASSET_SIZE = 20 * 1024 * 1024;
const ALLOWED_EXAM_ASSET_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.png', '.jpg', '.jpeg', '.webp', '.gif'];

export async function uploadQuestionBankAsset(
  userId: string,
  file: { buffer: Buffer; originalname: string; size: number } | undefined,
): Promise<ActionError | { body: unknown }> {
  if (!file || file.size === 0) return err(400, 'File dang rong.', 'ADMIN_ASSET_FILE_EMPTY');
  if (file.size > MAX_EXAM_ASSET_SIZE) return err(400, 'Dung luong file khong duoc vuot qua 20MB.', 'ADMIN_ASSET_FILE_TOO_LARGE');
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXAM_ASSET_EXTENSIONS.includes(extension)) {
    return err(400, 'Dinh dang file chua duoc ho tro.', 'ADMIN_ASSET_EXTENSION_INVALID');
  }
  const n = (g: string) => g.replaceAll('-', '');
  const storedFileName = `asset_${n(userId)}_${n(randomUUID())}${extension}`;
  await saveUpload(file, "exam-assets", storedFileName);
  const relativePath = `/uploads/exam-assets/${storedFileName}`;
  await prisma.tainguyenluutru.create({
    data: {
      MaTaiNguyen: randomUUID(),
      MaNguoiDung: userId,
      TenTaiNguyen: storedFileName,
      Link: relativePath,
      NguoiTao: userId,
      ThoiGianTao: new Date(),
      TrangThai: true,
      DaXoa: false,
    },
  });
  return { body: ok({ url: relativePath }, 'Upload file thanh cong.') };
}

const OPTION_GROUPS = ['LOAI_BAI_TAP', 'TRANG_THAI_SU_KIEN', 'LOAI_CAU_HOI', 'MUC_DO', 'TRINH_DO', 'KY_NANG'];

export async function getBootstrap() {
  const today = todayDateOnly();

  const courseRows = await prisma.khoahoc.findMany({
    where: active,
    orderBy: { TenKhoaHoc: 'asc' },
    select: {
      MaKhoaHoc: true,
      TenKhoaHoc: true,
      _count: {
        select: {
          chitietkhoahoc_lophoc: { where: active },
          baitap: { where: active },
          nganhangcauhoi: { where: active },
        },
      },
    },
  });
  const courses = courseRows.map((x) => ({
    maKhoaHoc: x.MaKhoaHoc.toLowerCase(),
    tenKhoaHoc: x.TenKhoaHoc,
    soLopHoc: x._count.chitietkhoahoc_lophoc,
    soBaiTap: x._count.baitap,
    soCauHoi: x._count.nganhangcauhoi,
  }));

  const classRows = await prisma.chitietkhoahoc_lophoc.findMany({
    where: active,
    orderBy: { lophoc: { TenLop: 'asc' } },
    select: {
      MaLopHoc: true,
      MaKhoaHoc: true,
      lophoc: {
        select: {
          TenLop: true,
          giangvienlophoc: {
            where: active,
            orderBy: { LoaiVaiTro: 'asc' },
            take: 1,
            select: { giangvien: { select: { nguoidung: { select: { HoTen: true } } } } },
          },
          _count: {
            select: {
              hocsinhlophoc: {
                where: {
                  AND: [
                    active,
                    { OR: [{ NgayThamGia: null }, { NgayThamGia: { lte: today } }] },
                    { OR: [{ NgayRoiLop: null }, { NgayRoiLop: { gte: today } }] },
                  ],
                },
              },
            },
          },
        },
      },
    },
  });
  const classes = classRows.map((x) => ({
    maLopHoc: x.MaLopHoc.toLowerCase(),
    maKhoaHoc: x.MaKhoaHoc.toLowerCase(),
    tenLop: x.lophoc.TenLop,
    tenGiangVien: x.lophoc.giangvienlophoc[0]?.giangvien.nguoidung.HoTen ?? null,
    soHocVien: x.lophoc._count.hocsinhlophoc,
  }));

  const optionRows = await prisma.chitietdanhmuc.findMany({
    where: { AND: [active, { nhomdanhmuc: { AND: [active, { MaCode: { in: OPTION_GROUPS } }] } }] },
    orderBy: { MaChiTiet: 'asc' },
    select: { MaCode: true, TenChiTiet: true, ThuTu: true, nhomdanhmuc: { select: { MaCode: true } } },
  });
  const opts = optionRows.map((x) => ({ groupCode: x.nhomdanhmuc.MaCode, code: x.MaCode ?? '', label: x.TenChiTiet, thuTu: x.ThuTu }));
  const group = (code: string) =>
    stableSortBy(
      opts.filter((x) => x.groupCode === code),
      (a, b) => (a.thuTu ?? 2147483647) - (b.thuTu ?? 2147483647),
    ).map((x) => ({ code: x.code, label: x.label, order: x.thuTu }));

  const data = {
    courses,
    classes,
    assignmentTypes: group('LOAI_BAI_TAP'),
    publishModes: group('TRANG_THAI_SU_KIEN'),
    questionTypes: group('LOAI_CAU_HOI'),
    difficultyLevels: group('MUC_DO'),
    levels: group('TRINH_DO'),
    skills: group('KY_NANG'),
  };
  return ok(data, 'Lay bootstrap bai tap admin thanh cong.');
}
