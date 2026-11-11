import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middlewares/auth.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { toDateOnly } from '../../utils/dotnetCompat.js';
import { bindBody, notTrue, sendProblem, type DtoSpec } from '../classes/dtoBinding.js';
import {
  avatarMultipart,
  currentUserId,
  handleDeleteAvatar,
  handleUploadAvatar,
  normalizeOptional,
} from '../teachers/profileCommon.js';

// Chuyen tu Controllers/HocSinhController.cs: /api/HocSinh, [Authorize] ca controller.
const router = Router();

interface UpdateProfileHocSinh {
  HoTen: string | null;
  NgaySinh: string | null;
  QueQuan: string | null;
  TruongDangTheoHoc: string | null;
  SoDienThoaiNguoiThan: string | null;
  AnhDaiDien: string | null;
}

// DTOs/UpdateProfileHocSinhDTO.cs: HoTen = string.Empty (thieu thi la "", null thi loi required).
const UpdateProfileHocSinhSpec: DtoSpec = {
  clrName: 'backend.DTOs.UpdateProfileHocSinhDTO',
  fields: [
    { name: 'HoTen', type: 'string', default: () => '' },
    { name: 'NgaySinh', type: 'string?' },
    { name: 'QueQuan', type: 'string?' },
    { name: 'TruongDangTheoHoc', type: 'string?' },
    { name: 'SoDienThoaiNguoiThan', type: 'string?' },
    { name: 'AnhDaiDien', type: 'string?' },
  ],
};

type HocsinhRow = { NgaySinh: Date | null; QueQuan: string | null; TruongDangTheoHoc: string | null; SoDienThoaiNguoiThan: string | null };

function buildProfileDto(user: { HoTen: string | null; Email: string | null; AnhDaiDien: string | null }, s: HocsinhRow | null) {
  return {
    hoTen: user.HoTen ?? '',
    email: user.Email ?? '',
    anhDaiDien: user.AnhDaiDien ?? '',
    ngaySinh: toDateOnly(s?.NgaySinh) ?? '',
    queQuan: s?.QueQuan ?? '',
    truongDangTheoHoc: s?.TruongDangTheoHoc ?? '',
    soDienThoaiNguoiThan: s?.SoDienThoaiNguoiThan ?? '',
  };
}

/** TryParseNgaySinh: rong -> null (hop le); khac "yyyy-MM-dd" -> khong hop le. */
function tryParseNgaySinh(value: string | null): { ok: boolean; value: Date | null } {
  if (value == null || !value.trim()) return { ok: true, value: null };
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return { ok: false, value: null };
  const [y, mo, d] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (y < 1 || dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { ok: false, value: null };
  return { ok: true, value: dt };
}

router.get('/api/HocSinh/my-profile', requireAuth, async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { hocsinh: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy thông tin học sinh.', 'STUDENT_PROFILE_NOT_FOUND'));
  const profile = buildProfileDto(user, user.hocsinh && user.hocsinh.DaXoa !== true ? user.hocsinh : null);
  return res.json(ok(profile, 'Lấy thông tin cá nhân thành công.'));
});

router.put('/api/HocSinh/update-profile', requireAuth, async (req, res) => {
  const bound = bindBody<UpdateProfileHocSinh>(req, UpdateProfileHocSinhSpec, 'dto');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const dto = bound.value;

  const userId = currentUserId(req, res);
  if (!userId) return;

  if (!dto.HoTen || !dto.HoTen.trim()) {
    return res.status(400).json(fail('Họ và tên là bắt buộc.', 'STUDENT_PROFILE_NAME_REQUIRED'));
  }

  const ngaySinh = tryParseNgaySinh(dto.NgaySinh);
  if (!ngaySinh.ok) {
    return res
      .status(400)
      .json(fail('Ngày sinh không hợp lệ. Định dạng đúng là yyyy-MM-dd.', 'STUDENT_PROFILE_BIRTHDATE_INVALID'));
  }

  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { hocsinh: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy người dùng.', 'USER_NOT_FOUND'));

  const now = new Date();
  const fields = {
    NgaySinh: ngaySinh.value,
    QueQuan: normalizeOptional(dto.QueQuan),
    TruongDangTheoHoc: normalizeOptional(dto.TruongDangTheoHoc),
    SoDienThoaiNguoiThan: normalizeOptional(dto.SoDienThoaiNguoiThan),
  };

  const [updatedUser, student] = await prisma.$transaction([
    prisma.nguoidung.update({
      where: { MaNguoiDung: user.MaNguoiDung },
      data: { HoTen: dto.HoTen.trim(), AnhDaiDien: normalizeOptional(dto.AnhDaiDien), NguoiSua: userId, ThoiGianSua: now },
    }),
    user.hocsinh
      ? prisma.hocsinh.update({
          where: { MaHocSinh: user.hocsinh.MaHocSinh },
          data: { ...fields, TrangThai: true, DaXoa: false, NguoiSua: userId, ThoiGianSua: now },
        })
      : prisma.hocsinh.create({
          data: {
            MaHocSinh: randomUUID(),
            MaNguoiDung: user.MaNguoiDung,
            ...fields,
            TrangThai: true,
            DaXoa: false,
            NguoiTao: userId,
            ThoiGianTao: now,
          },
        }),
  ]);

  return res.json(ok(buildProfileDto(updatedUser, student), 'Cập nhật thông tin thành công.'));
});

router.post('/api/HocSinh/upload-avatar', requireAuth, avatarMultipart, handleUploadAvatar);

router.delete('/api/HocSinh/delete-avatar', requireAuth, handleDeleteAvatar);

export default router;
