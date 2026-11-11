import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { bindBody, notTrue, sendProblem, type DtoSpec } from '../classes/dtoBinding.js';
import {
  avatarMultipart,
  currentUserId,
  handleDeleteAvatar,
  handleUploadAvatar,
  normalizeOptional,
  normalizeRequired,
} from './profileCommon.js';

// Chuyen tu Controllers/GiangVienController.cs: [Route("api/[controller]")] => /api/GiangVien, [Authorize] ca controller.
const router = Router();

interface UpdateProfileGiangVien {
  HoTen: string | null;
  SoDienThoai: string | null;
  QueQuan: string | null;
  TrinhDoChuyenMon: string | null;
  HocVi: string | null;
  KinhNghiemGiangDay: string | null;
  AnhDaiDien: string | null;
}

// DTOs/UpdateProfileGiangVienDTO.cs: HoTen va TrinhDoChuyenMon la string khong nullable (= null!) => bat buoc.
const UpdateProfileGiangVienSpec: DtoSpec = {
  clrName: 'backend.DTOs.UpdateProfileGiangVienDTO',
  fields: [
    { name: 'HoTen', type: 'string' },
    { name: 'SoDienThoai', type: 'string?' },
    { name: 'QueQuan', type: 'string?' },
    { name: 'TrinhDoChuyenMon', type: 'string' },
    { name: 'HocVi', type: 'string?' },
    { name: 'KinhNghiemGiangDay', type: 'string?' },
    { name: 'AnhDaiDien', type: 'string?' },
  ],
};

interface AssignCoursesRequest {
  MaGiangVien: string;
  CourseIds: string[];
}

const AssignCoursesRequestSpec: DtoSpec = {
  clrName: 'backend.DTOs.AssignCoursesRequestDto',
  fields: [
    { name: 'MaGiangVien', type: 'guid', default: () => '00000000-0000-0000-0000-000000000000' },
    { name: 'CourseIds', type: { list: 'guid' }, default: () => [] },
  ],
};

type GiangvienRow = { SoDienThoai: string | null; QueQuan: string | null; TrinhDoChuyenMon: string; HocVi: string | null; KinhNghiemGiangDay: string | null };

/** BuildProfileDto -> ProfileGiangVienDTO */
function buildProfileDto(user: { HoTen: string | null; Email: string | null; AnhDaiDien: string | null }, t: GiangvienRow | null) {
  return {
    hoTen: user.HoTen ?? '',
    email: user.Email ?? '',
    anhDaiDien: user.AnhDaiDien ?? '',
    soDienThoai: t?.SoDienThoai ?? '',
    queQuan: t?.QueQuan ?? '',
    trinhDoChuyenMon: t?.TrinhDoChuyenMon ?? '',
    hocVi: t?.HocVi ?? '',
    kinhNghiemGiangDay: t?.KinhNghiemGiangDay ?? '',
  };
}

// Lay ho so cua chinh giang vien dang dang nhap.
router.get('/api/GiangVien/my-profile', requireAuth, async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { giangvien: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy thông tin giảng viên.', 'TEACHER_PROFILE_NOT_FOUND'));
  const profile = buildProfileDto(user, user.giangvien && user.giangvien.DaXoa !== true ? user.giangvien : null);
  return res.json(ok(profile, 'Lấy thông tin cá nhân thành công.'));
});

// Cap nhat ho so giang vien; chua co ban ghi giangvien thi tao moi.
router.put('/api/GiangVien/update-profile', requireAuth, async (req, res) => {
  const bound = bindBody<UpdateProfileGiangVien>(req, UpdateProfileGiangVienSpec, 'dto');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const dto = bound.value;

  const userId = currentUserId(req, res);
  if (!userId) return;

  if (!dto.HoTen || !dto.HoTen.trim()) {
    return res.status(400).json(fail('Họ và tên là bắt buộc.', 'TEACHER_PROFILE_NAME_REQUIRED'));
  }

  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { giangvien: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy người dùng.', 'USER_NOT_FOUND'));

  const now = new Date();
  const fields = {
    SoDienThoai: normalizeOptional(dto.SoDienThoai),
    QueQuan: normalizeOptional(dto.QueQuan),
    TrinhDoChuyenMon: normalizeRequired(dto.TrinhDoChuyenMon),
    HocVi: normalizeOptional(dto.HocVi),
    KinhNghiemGiangDay: normalizeOptional(dto.KinhNghiemGiangDay),
  };

  const [updatedUser, teacher] = await prisma.$transaction([
    prisma.nguoidung.update({
      where: { MaNguoiDung: user.MaNguoiDung },
      data: { HoTen: dto.HoTen.trim(), AnhDaiDien: normalizeOptional(dto.AnhDaiDien), NguoiSua: userId, ThoiGianSua: now },
    }),
    user.giangvien
      ? prisma.giangvien.update({
          where: { MaGiangVien: user.giangvien.MaGiangVien },
          data: { ...fields, TrangThai: true, DaXoa: false, NguoiSua: userId, ThoiGianSua: now },
        })
      : prisma.giangvien.create({
          data: {
            MaGiangVien: randomUUID(),
            MaNguoiDung: user.MaNguoiDung,
            ...fields,
            TrangThai: true,
            DaXoa: false,
            NguoiTao: userId,
            ThoiGianTao: now,
          },
        }),
  ]);

  return res.json(ok(buildProfileDto(updatedUser, teacher), 'Cập nhật thông tin thành công.'));
});

// Upload anh dai dien, luu duong dan vao NguoiDung.
router.post('/api/GiangVien/upload-avatar', requireAuth, avatarMultipart, handleUploadAvatar);

// Xoa avatar hien tai ca file lan du lieu lien ket.
router.delete('/api/GiangVien/delete-avatar', requireAuth, handleDeleteAvatar);

// Danh sach chuyen mon (cac mon duoc day) cua giao vien.
router.get('/api/GiangVien/specializations', requireAuth, async (_req, res) => {
  const teachers = await prisma.giangvien.findMany({
    where: notTrue('DaXoa') as Prisma.giangvienWhereInput,
    include: { nguoidung: { select: { HoTen: true } } },
    orderBy: { MaGiangVien: 'asc' },
  });
  // Bang giangvienkhoahoc khong khai bao quan he trong schema Prisma -> tu ghep.
  const links = teachers.length
    ? await prisma.giangvienkhoahoc.findMany({
        where: { MaGiangVien: { in: teachers.map((t) => t.MaGiangVien) } },
        orderBy: [{ MaGiangVien: 'asc' }, { MaKhoaHoc: 'asc' }],
      })
    : [];
  const courses = links.length
    ? await prisma.khoahoc.findMany({
        where: { MaKhoaHoc: { in: [...new Set(links.map((l) => l.MaKhoaHoc))] } },
        select: { MaKhoaHoc: true, TenKhoaHoc: true },
      })
    : [];
  const courseName = new Map(courses.map((c) => [c.MaKhoaHoc.toLowerCase(), c.TenKhoaHoc]));

  const data = teachers.map((t) => {
    const mine = links.filter((l) => l.MaGiangVien.toLowerCase() === t.MaGiangVien.toLowerCase());
    return {
      maGiangVien: t.MaGiangVien.toLowerCase(),
      tenGiangVien: t.nguoidung.HoTen,
      courseIds: mine.map((l) => l.MaKhoaHoc.toLowerCase()),
      // INNER JOIN khoahoc: lien ket toi khoa hoc khong ton tai bi bo khoi courseNames (nhung van co trong courseIds).
      courseNames: mine.map((l) => courseName.get(l.MaKhoaHoc.toLowerCase())).filter((n): n is string => n !== undefined),
    };
  });
  return res.json(ok(data, 'Lấy danh sách chuyên môn giảng viên thành công.'));
});

// Phan cong cac mon hoc (khoa hoc) cho giang vien (trang Quan ly nguoi dung cua admin).
// Ban .NET KHONG kiem tra quyen (ai dang nhap cung goi duoc) -> ban Node yeu cau USERS_EDIT.
router.post('/api/GiangVien/assign-courses', ...requirePermission('USERS_EDIT'), async (req, res) => {
  const bound = bindBody<AssignCoursesRequest>(req, AssignCoursesRequestSpec, 'request');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const request = bound.value;

  const teacher = await prisma.giangvien.findFirst({
    where: { MaGiangVien: request.MaGiangVien, ...notTrue('DaXoa') } as Prisma.giangvienWhereInput,
  });
  if (!teacher) return res.status(404).json(fail('Không tìm thấy thông tin giảng viên.', 'TEACHER_NOT_FOUND'));

  const userId = req.user?.userId?.toLowerCase() ?? null;
  const now = new Date();
  await prisma.$transaction([
    prisma.giangvienkhoahoc.deleteMany({ where: { MaGiangVien: request.MaGiangVien } }),
    prisma.giangvienkhoahoc.createMany({
      data: request.CourseIds.map((MaKhoaHoc) => ({ MaGiangVien: request.MaGiangVien, MaKhoaHoc, NguoiTao: userId, ThoiGianTao: now })),
    }),
  ]);

  return res.json(ok(null, 'Phân công môn dạy cho giảng viên thành công.'));
});

export default router;
