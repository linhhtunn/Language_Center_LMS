import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { Router, type Response } from 'express';
import { prisma } from '../../db.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requirePermission } from '../../middlewares/permission.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { bindBody, guidParams, notTrue, sendProblem, tryParseGuid, type DtoSpec } from '../classes/dtoBinding.js';
import {
  avatarMultipart,
  currentUserId,
  handleDeleteAvatar,
  handleUploadAvatar,
  normalizeOptional,
  normalizeRequired,
} from '../teachers/profileCommon.js';

// Chuyen tu Controllers/ParentController.cs (/api/Parent, [Authorize])
// va Controllers/ParentChildrenController.cs ([Authorize], moi action tu khai bao route day du api/parents/...).
const router = Router();

/** ASP.NET tra chuoi thuan (BadRequest("...") / NotFound("...")) voi Content-Type text/plain. */
const sendText = (res: Response, status: number, text: string) =>
  res.status(status).type('text/plain; charset=utf-8').send(text);

// ===================== ParentController =====================

interface UpdateProfilePhuHuynh {
  HoTen: string | null;
  SoDienThoai: string | null;
  DiaChiLienHe: string | null;
  NgheNghiep: string | null;
  AnhDaiDien: string | null;
}

const UpdateProfilePhuHuynhSpec: DtoSpec = {
  clrName: 'backend.DTOs.UpdateProfilePhuHuynhDTO',
  fields: [
    { name: 'HoTen', type: 'string', default: () => '' },
    { name: 'SoDienThoai', type: 'string?' },
    { name: 'DiaChiLienHe', type: 'string?' },
    { name: 'NgheNghiep', type: 'string?' },
    { name: 'AnhDaiDien', type: 'string?' },
  ],
};

type PhuhuynhRow = { SoDienThoai: string; DiaChiLienHe: string | null; NgheNghiep: string | null };

function buildProfileDto(user: { HoTen: string | null; Email: string | null; AnhDaiDien: string | null }, p: PhuhuynhRow | null) {
  return {
    hoTen: user.HoTen ?? '',
    email: user.Email ?? '',
    anhDaiDien: user.AnhDaiDien ?? '',
    soDienThoai: p?.SoDienThoai ?? '',
    diaChiLienHe: p?.DiaChiLienHe ?? '',
    ngheNghiep: p?.NgheNghiep ?? '',
  };
}

router.get('/api/Parent/my-profile', requireAuth, async (req, res) => {
  const userId = currentUserId(req, res);
  if (!userId) return;
  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { phuhuynh: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy thông tin phụ huynh.', 'PARENT_PROFILE_NOT_FOUND'));
  const profile = buildProfileDto(user, user.phuhuynh && user.phuhuynh.DaXoa !== true ? user.phuhuynh : null);
  return res.json(ok(profile, 'Lấy thông tin cá nhân thành công.'));
});

router.put('/api/Parent/update-profile', requireAuth, async (req, res) => {
  const bound = bindBody<UpdateProfilePhuHuynh>(req, UpdateProfilePhuHuynhSpec, 'dto');
  if (!bound.ok) return sendProblem(res, bound.status, bound.body);
  const dto = bound.value;

  const userId = currentUserId(req, res);
  if (!userId) return;

  if (!dto.HoTen || !dto.HoTen.trim()) {
    return res.status(400).json(fail('Họ và tên là bắt buộc.', 'PARENT_PROFILE_NAME_REQUIRED'));
  }

  const user = await prisma.nguoidung.findFirst({
    where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput,
    include: { phuhuynh: true },
  });
  if (!user) return res.status(404).json(fail('Không tìm thấy người dùng.', 'USER_NOT_FOUND'));

  const now = new Date();
  const fields = {
    SoDienThoai: normalizeRequired(dto.SoDienThoai),
    DiaChiLienHe: normalizeOptional(dto.DiaChiLienHe),
    NgheNghiep: normalizeOptional(dto.NgheNghiep),
  };

  const [updatedUser, parent] = await prisma.$transaction([
    prisma.nguoidung.update({
      where: { MaNguoiDung: user.MaNguoiDung },
      data: { HoTen: dto.HoTen.trim(), AnhDaiDien: normalizeOptional(dto.AnhDaiDien), NguoiSua: userId, ThoiGianSua: now },
    }),
    user.phuhuynh
      ? prisma.phuhuynh.update({
          where: { MaPhuHuynh: user.phuhuynh.MaPhuHuynh },
          data: { ...fields, TrangThai: true, DaXoa: false, NguoiSua: userId, ThoiGianSua: now },
        })
      : prisma.phuhuynh.create({
          data: {
            MaPhuHuynh: randomUUID(),
            MaNguoiDung: user.MaNguoiDung,
            ...fields,
            TrangThai: true,
            DaXoa: false,
            NguoiTao: userId,
            ThoiGianTao: now,
          },
        }),
  ]);

  return res.json(ok(buildProfileDto(updatedUser, parent), 'Cập nhật thông tin thành công.'));
});

router.post('/api/Parent/upload-avatar', requireAuth, avatarMultipart, handleUploadAvatar);

router.delete('/api/Parent/delete-avatar', requireAuth, handleDeleteAvatar);

// Tom tat thong tin con (du lieu gia: lop/khoa hoc/nhan xet la hang so). Tra thang object, khong boc ApiResponse.
router.get('/api/Parent/child-summary/:userId', ...requirePermission('PAGE_PARENT_SCHEDULE_VIEW'), async (req, res) => {
  const parsedUserId = tryParseGuid(req.params.userId as string);
  if (!parsedUserId) return sendText(res, 400, 'userId không hợp lệ.');

  // hocsinh JOIN nguoidung, khong loc DaXoa (giong ban .NET).
  const hs = await prisma.hocsinh.findFirst({
    where: { MaNguoiDung: parsedUserId },
    include: { nguoidung: { select: { HoTen: true } } },
  });
  if (!hs) return sendText(res, 404, 'Không tìm thấy dữ liệu.');

  return res.json({
    maHocSinh: hs.MaHocSinh.toLowerCase(),
    tenCon: hs.nguoidung.HoTen,
    maLopHienThi: 'N/A',
    tenKhoaHoc: 'N/A',
    nhanXetMoiNhat: 'Chưa có dữ liệu',
  });
});

// ===================== ParentChildrenController =====================

interface AddParentChildRequest {
  StudentId: string;
}

const AddParentChildRequestSpec: DtoSpec = {
  clrName: 'backend.DTOs.AddParentChildRequestDto',
  fields: [{ name: 'StudentId', type: 'guid', default: () => '00000000-0000-0000-0000-000000000000' }],
};

const findParentByUser = (parentUserId: string) =>
  prisma.phuhuynh.findFirst({ where: { MaNguoiDung: parentUserId, ...notTrue('DaXoa') } as Prisma.phuhuynhWhereInput });

router.get('/api/parents/:parentUserId/children', guidParams('parentUserId'), requireAuth, async (req, res) => {
  const parentUserId = req.params.parentUserId as string;
  if (req.user!.role !== 'Admin' && req.user!.userId?.toLowerCase() !== parentUserId) return res.status(403).end();

  const parent = await findParentByUser(parentUserId);
  if (!parent) return res.status(404).json(fail('Khong tim thay phu huynh.', 'PARENT_NOT_FOUND'));

  const rows = await prisma.phuhuynhhocsinh.findMany({
    where: { MaPhuHuynh: parent.MaPhuHuynh, ...notTrue('DaXoa') } as Prisma.phuhuynhhocsinhWhereInput,
    include: { hocsinh: { include: { nguoidung: true } } },
    orderBy: { hocsinh: { nguoidung: { HoTen: 'asc' } } },
  });

  return res.json(
    ok(
      rows.map((row) => ({
        studentId: row.MaHocSinh.toLowerCase(),
        userId: row.hocsinh.MaNguoiDung.toLowerCase(),
        fullName: row.hocsinh.nguoidung.HoTen,
        email: row.hocsinh.nguoidung.Email,
        active: row.TrangThai !== false && row.DaXoa !== true,
      })),
    ),
  );
});

router.post(
  '/api/parents/:parentUserId/children',
  guidParams('parentUserId'),
  ...requirePermission('PARENT_CHILDREN_EDIT'),
  async (req, res) => {
    const parentUserId = req.params.parentUserId as string;
    const bound = bindBody<AddParentChildRequest>(req, AddParentChildRequestSpec, 'request');
    if (!bound.ok) return sendProblem(res, bound.status, bound.body);
    const studentId = bound.value.StudentId;

    const parent = await findParentByUser(parentUserId);
    if (!parent) return res.status(404).json(fail('Khong tim thay phu huynh.', 'PARENT_NOT_FOUND'));

    const studentExists = await prisma.hocsinh.count({ where: { MaHocSinh: studentId, ...notTrue('DaXoa') } as Prisma.hocsinhWhereInput });
    if (!studentExists) return res.status(404).json(fail('Khong tim thay hoc sinh.', 'STUDENT_NOT_FOUND'));

    const existing = await prisma.phuhuynhhocsinh.findFirst({ where: { MaPhuHuynh: parent.MaPhuHuynh, MaHocSinh: studentId } });
    const now = new Date();
    if (existing) {
      await prisma.phuhuynhhocsinh.update({
        where: { MaPhuHuynh_MaHocSinh: { MaPhuHuynh: existing.MaPhuHuynh, MaHocSinh: existing.MaHocSinh } },
        data: { DaXoa: false, TrangThai: true, ThoiGianSua: now },
      });
    } else {
      await prisma.phuhuynhhocsinh.create({
        data: { MaPhuHuynh: parent.MaPhuHuynh, MaHocSinh: studentId, TrangThai: true, DaXoa: false, ThoiGianTao: now },
      });
    }

    return res.json(ok({ parentUserId, studentId }, 'Da gan phu huynh voi hoc sinh.'));
  },
);

router.delete(
  '/api/parents/:parentUserId/children/:studentId',
  guidParams('parentUserId', 'studentId'),
  ...requirePermission('PARENT_CHILDREN_EDIT'),
  async (req, res) => {
    const parentUserId = req.params.parentUserId as string;
    const studentId = req.params.studentId as string;

    const parent = await findParentByUser(parentUserId);
    if (!parent) return res.status(404).json(fail('Khong tim thay phu huynh.', 'PARENT_NOT_FOUND'));

    const row = await prisma.phuhuynhhocsinh.findFirst({
      where: { MaPhuHuynh: parent.MaPhuHuynh, MaHocSinh: studentId, ...notTrue('DaXoa') } as Prisma.phuhuynhhocsinhWhereInput,
    });
    if (!row) {
      return res.status(404).json(fail('Khong tim thay lien ket phu huynh-hoc sinh.', 'PARENT_CHILD_NOT_FOUND'));
    }

    await prisma.phuhuynhhocsinh.update({
      where: { MaPhuHuynh_MaHocSinh: { MaPhuHuynh: row.MaPhuHuynh, MaHocSinh: row.MaHocSinh } },
      data: { DaXoa: true, TrangThai: false, ThoiGianSua: new Date() },
    });
    return res.json(ok({ parentUserId, studentId }, 'Da go hoc sinh khoi phu huynh.'));
  },
);

export default router;
