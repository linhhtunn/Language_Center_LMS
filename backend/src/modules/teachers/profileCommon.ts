import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { prisma } from '../../db.js';
import { fail, ok } from '../../utils/apiResponse.js';
import { isGuid, validationProblem } from '../../utils/dotnetCompat.js';
import { deleteUpload, saveUpload, upload } from '../../utils/upload.js';
import { notTrue, sendProblem } from '../classes/dtoBinding.js';

// Phan dung chung cua GiangVienController / HocSinhController / ParentController ban .NET:
// 3 controller co code upload/xoa avatar giong het nhau (copy-paste), gom lai o day.

const MAX_AVATAR_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_AVATAR_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

export const normalizeRequired = (v: string | null | undefined): string => v?.trim() ?? '';
export const normalizeOptional = (v: string | null | undefined): string | null => (v == null || !v.trim() ? null : v.trim());

/** User.GetUserId() - null thi .NET tra 401 AUTH_INVALID_TOKEN. */
export function currentUserId(req: Request, res: Response): string | null {
  const id = req.user?.userId;
  if (!isGuid(id)) {
    res.status(401).json(fail('Bạn chưa đăng nhập.', 'AUTH_INVALID_TOKEN'));
    return null;
  }
  return id.toLowerCase();
}

export const findActiveUser = (userId: string) =>
  prisma.nguoidung.findFirst({ where: { MaNguoiDung: userId, ...notTrue('DaXoa') } as Prisma.nguoidungWhereInput });

const isStoredUploadPath = (p: string) => {
  const l = p.toLowerCase();
  return l.startsWith('/uploads/') || l.startsWith('uploads/');
};

/**
 * CleanupCurrentAvatarAsync: xoa file avatar cu (neu nam trong /uploads) va tra ve cac thao tac
 * danh dau xoa mem tainguyenluutru tuong ung (chay cung giao dich voi SaveChanges).
 */
async function cleanupCurrentAvatar(user: { AnhDaiDien: string | null }, userId: string, now: Date) {
  if (!user.AnhDaiDien || !user.AnhDaiDien.trim()) return [];
  const currentAvatarPath = user.AnhDaiDien.trim();
  if (isStoredUploadPath(currentAvatarPath)) {
    await deleteUpload(currentAvatarPath.startsWith('/') ? currentAvatarPath : `/${currentAvatarPath}`);
  }
  return [
    prisma.tainguyenluutru.updateMany({
      where: { MaNguoiDung: userId, Link: currentAvatarPath, ...notTrue('DaXoa') } as Prisma.tainguyenluutruWhereInput,
      data: { DaXoa: true, TrangThai: false, NguoiSua: userId, ThoiGianSua: now },
    }),
  ];
}

/** Multer nhan moi field; [FromForm] IFormFile file khop ten field "file" khong phan biet hoa thuong. */
export const avatarMultipart = upload.any();

/** POST .../upload-avatar */
export async function handleUploadAvatar(req: Request, res: Response) {
  const files = (Array.isArray(req.files) ? req.files : []) as Express.Multer.File[];
  const file = files.find((f) => f.fieldname.toLowerCase() === 'file');
  if (!file) return sendProblem(res, 400, validationProblem({ file: ['The file field is required.'] }));

  const userId = currentUserId(req, res);
  if (!userId) return;

  if (file.size === 0) return res.status(400).json(fail('Chưa chọn file ảnh.', 'AVATAR_FILE_REQUIRED'));
  if (file.size > MAX_AVATAR_FILE_SIZE) {
    return res.status(400).json(fail('Dung lượng ảnh không vượt quá 5MB.', 'AVATAR_FILE_TOO_LARGE'));
  }
  const fileExtension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_AVATAR_EXTENSIONS.includes(fileExtension)) {
    return res.status(400).json(fail('Chỉ chấp nhận file ảnh jpg, jpeg, png, gif hoặc webp.', 'AVATAR_INVALID_EXTENSION'));
  }

  const user = await findActiveUser(userId);
  if (!user) return res.status(404).json(fail('Không tìm thấy người dùng.', 'USER_NOT_FOUND'));

  const now = new Date();
  const cleanupOps = await cleanupCurrentAvatar(user, userId, now);

  const fileName = `avatar_${userId.replaceAll('-', '')}_${randomUUID().replaceAll('-', '')}${fileExtension}`;
  const { url: relativePath } = await saveUpload(file, 'avatars', fileName);

  await prisma.$transaction([
    ...cleanupOps,
    prisma.nguoidung.update({
      where: { MaNguoiDung: user.MaNguoiDung },
      data: { AnhDaiDien: relativePath, NguoiSua: userId, ThoiGianSua: now },
    }),
    prisma.tainguyenluutru.create({
      data: {
        MaTaiNguyen: randomUUID(),
        MaNguoiDung: userId,
        TenTaiNguyen: fileName,
        Link: relativePath,
        NguoiTao: userId,
        ThoiGianTao: now,
        TrangThai: true,
        DaXoa: false,
      },
    }),
  ]);

  return res.json(ok({ avatarUrl: relativePath }, 'Upload ảnh đại diện thành công.'));
}

/** DELETE .../delete-avatar */
export async function handleDeleteAvatar(req: Request, res: Response) {
  const userId = currentUserId(req, res);
  if (!userId) return;

  const user = await findActiveUser(userId);
  if (!user) return res.status(404).json(fail('Không tìm thấy người dùng.', 'USER_NOT_FOUND'));

  const now = new Date();
  const cleanupOps = await cleanupCurrentAvatar(user, userId, now);
  await prisma.$transaction([
    ...cleanupOps,
    prisma.nguoidung.update({
      where: { MaNguoiDung: user.MaNguoiDung },
      data: { AnhDaiDien: null, NguoiSua: userId, ThoiGianSua: now },
    }),
  ]);

  return res.json(ok({ avatarUrl: '' }, 'Xóa ảnh đại diện thành công.'));
}
