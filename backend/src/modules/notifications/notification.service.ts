import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { prisma } from '../../db.js';
import { fail, ok, type ApiResponse } from '../../utils/apiResponse.js';
import { deleteUpload, saveUpload, uploadUrlToDiskPath } from '../../utils/upload.js';
import * as repo from './notification.repository.js';
import { notDeleted } from './notification.repository.js';
import { emitToUsers } from '../../realtime/socket.js';

// Chuyen tu Services/NotificationService.cs.

const MAX_ATTACHMENT_FILE_SIZE = 20 * 1024 * 1024; // 20MB moi file
const MAX_ATTACHMENT_COUNT = 10;
const ALLOWED_ATTACHMENT_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.pdf'];

export interface NotificationAttachmentDto {
  id: string;
  fileName: string;
}

/** NotificationDto / UserNotificationDto (cung thu tu thuoc tinh). */
export interface NotificationDto {
  id: string;
  title: string;
  content: string;
  doiTuong: string;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
  attachments: NotificationAttachmentDto[];
}

export interface UploadedFile {
  buffer: Buffer;
  originalname: string;
  size: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** [JsonConverter(typeof(UtcDateTimeJsonConverter))]: luon ghi "yyyy-MM-ddTHH:mm:ssZ" (khong phan le giay). */
export function utcDateTime(d: Date): string;
export function utcDateTime(d: Date | null | undefined): string | null;
export function utcDateTime(d: Date | null | undefined): string | null {
  if (!d) return null;
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
}

type AttachmentRow = { MaTaiNguyen: string; DaXoa: boolean | null; tainguyenluutru: { TenTaiNguyen: string } | null };

function mapAttachments(rows: AttachmentRow[]): NotificationAttachmentDto[] {
  return rows
    .filter((a) => a.DaXoa !== true && a.tainguyenluutru)
    .map((a) => ({ id: a.MaTaiNguyen, fileName: a.tainguyenluutru!.TenTaiNguyen }));
}

/** Tim danh sach user theo DoiTuong (Hoc_Sinh / Giao_Vien / Phu_Huynh / Admin; con lai = tat ca). */
async function getUserIdsByTarget(doiTuong: string | null): Promise<string[]> {
  const roleFilter =
    doiTuong === 'Hoc_Sinh' || doiTuong === 'Giao_Vien' || doiTuong === 'Phu_Huynh' || doiTuong === 'Admin'
      ? { nguoidungvaitro: { some: { vaitro: { TenVaiTro: doiTuong } } } }
      : {};
  const users = await prisma.nguoidung.findMany({ where: { ...notDeleted, ...roleFilter }, select: { MaNguoiDung: true } });
  return users.map((u) => u.MaNguoiDung);
}

export async function getAll(): Promise<ApiResponse<NotificationDto[]>> {
  const rows = await repo.getAllActive();
  const result = rows.map((t) => ({
    id: t.MaThongBao,
    title: t.TieuDe,
    content: t.NoiDung,
    doiTuong: t.DoiTuong ?? 'Tat_Ca',
    createdAt: utcDateTime(t.ThoiGianTao ?? new Date()),
    isRead: false,
    readAt: null,
    attachments: mapAttachments(t.dinhkemthongbao),
  }));
  return ok(result, 'Lấy danh sách thông báo thành công');
}

type UserRow = Awaited<ReturnType<typeof repo.getNotificationsByUserId>>[number];

function mapUserNotifications(rows: UserRow[]): NotificationDto[] {
  return rows
    .filter((n) => n.thongbao)
    .map((n) => ({
      id: n.MaThongBao,
      title: n.thongbao.TieuDe,
      content: n.thongbao.NoiDung,
      doiTuong: n.thongbao.DoiTuong ?? 'Tat_Ca',
      createdAt: utcDateTime(n.thongbao.ThoiGianTao ?? new Date()),
      isRead: n.DaDoc ?? false,
      readAt: utcDateTime(n.NgayDoc),
      attachments: mapAttachments(n.thongbao.dinhkemthongbao),
    }));
}

export async function getUserNotifications(userId: string) {
  return ok(mapUserNotifications(await repo.getNotificationsByUserId(userId)), 'Lấy thông báo của người dùng thành công');
}

export async function getUnreadNotifications(userId: string) {
  return ok(mapUserNotifications(await repo.getUnreadNotificationsByUserId(userId)), 'Lấy thông báo chưa đọc thành công');
}

export async function getUnreadCount(userId: string): Promise<ApiResponse<number>> {
  return ok(await repo.getUnreadCount(userId), 'Lấy số lượng thông báo chưa đọc thành công');
}

export async function markAsRead(userId: string, notificationId: string): Promise<ApiResponse<null>> {
  await repo.markAsRead(userId, notificationId);
  return ok(null, 'Đánh dấu thông báo là đã đọc thành công');
}

export async function markAllAsRead(userId: string): Promise<ApiResponse<null>> {
  await repo.markAllAsRead(userId);
  return ok(null, 'Đánh dấu tất cả thông báo là đã đọc thành công');
}

function validateAttachments(files: UploadedFile[]): string | null {
  if (files.length === 0) return null;
  if (files.length > MAX_ATTACHMENT_COUNT) {
    return `Chỉ được đính kèm tối đa ${MAX_ATTACHMENT_COUNT} file cho mỗi thông báo.`;
  }
  for (const file of files) {
    if (file.size === 0) return `File '${file.originalname}' đang rỗng.`;
    if (file.size > MAX_ATTACHMENT_FILE_SIZE) return `File '${file.originalname}' vượt quá dung lượng cho phép (20MB).`;
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_ATTACHMENT_EXTENSIONS.includes(ext)) {
      return `File '${file.originalname}' không đúng định dạng cho phép (Word, Excel, PowerPoint, PDF).`;
    }
  }
  return null;
}

export async function create(
  currentUserId: string,
  dto: { title: string; content: string; doiTuong: string; files: UploadedFile[] },
): Promise<ApiResponse<NotificationDto>> {
  if (!dto.title?.trim() || !dto.content?.trim()) {
    return fail('Tiêu đề và nội dung không được để trống', 'INVALID_INPUT');
  }

  // Ban .NET luu thong bao + nguoi nhan TRUOC roi moi kiem tra file -> file sai van de lai thong bao
  // (khong co file) du tra 400. O day kiem tra file truoc, khong ghi gi neu file khong hop le.
  const attachmentError = validateAttachments(dto.files);
  if (attachmentError) return fail(attachmentError, 'ATTACHMENT_INVALID');

  const receiverIds = await getUserIdsByTarget(dto.doiTuong);
  const now = new Date();
  const maThongBao = randomUUID();
  const doiTuong = dto.doiTuong ?? 'Tat_Ca';
  const userN = currentUserId.replaceAll('-', '');

  // Ghi file truoc (ten: notif_<userId:N>_<guid:N><ext>), loi DB thi xoa lai.
  const saved: { maTaiNguyen: string; fileName: string; url: string }[] = [];
  try {
    for (const file of dto.files) {
      const ext = path.extname(file.originalname).toLowerCase();
      const storedFileName = `notif_${userN}_${randomUUID().replaceAll('-', '')}${ext}`;
      const r = await saveUpload(file, 'notifications', storedFileName);
      saved.push({ maTaiNguyen: randomUUID(), fileName: file.originalname, url: r.url });
    }

    await prisma.$transaction([
      prisma.thongbao.create({
        data: {
          MaThongBao: maThongBao,
          TieuDe: dto.title,
          NoiDung: dto.content,
          DoiTuong: doiTuong,
          NguoiTao: currentUserId,
          ThoiGianTao: now,
          DaXoa: false,
          TrangThai: true,
        },
      }),
      prisma.nguoinhanthongbao.createMany({
        data: receiverIds.map((userId) => ({
          MaThongBao: maThongBao,
          MaNguoiDung: userId,
          DaDoc: false,
          ThoiGianTao: now,
          NguoiTao: currentUserId,
          DaXoa: false,
          TrangThai: true,
        })),
      }),
      prisma.tainguyenluutru.createMany({
        data: saved.map((s) => ({
          MaTaiNguyen: s.maTaiNguyen,
          MaNguoiDung: currentUserId,
          TenTaiNguyen: s.fileName,
          Link: s.url,
          NguoiTao: currentUserId,
          ThoiGianTao: now,
          TrangThai: true,
          DaXoa: false,
        })),
      }),
      prisma.dinhkemthongbao.createMany({
        data: saved.map((s) => ({
          MaThongBao: maThongBao,
          MaTaiNguyen: s.maTaiNguyen,
          NguoiTao: currentUserId,
          ThoiGianTao: now,
          TrangThai: true,
          DaXoa: false,
        })),
      }),
    ]);
  } catch (err) {
    await Promise.all(saved.map((s) => deleteUpload(s.url).catch(() => undefined)));
    throw err;
  }

  const notification: NotificationDto = {
    id: maThongBao,
    title: dto.title,
    content: dto.content,
    doiTuong,
    createdAt: utcDateTime(now),
    isRead: false,
    readAt: null,
    attachments: saved.map((s) => ({ id: s.maTaiNguyen, fileName: s.fileName })),
  };
  // Ban .NET KHONG bao gio day realtime khi tao thong bao (NotificationEventService khong duoc goi) ->
  // nguoi nhan phai tai lai trang. Ban Node day "NewNotification" toi dung nhung nguoi nhan vua ghi.
  emitToUsers('/notification', receiverIds, 'NewNotification', notification);
  return ok(notification, 'Tạo thông báo thành công');
}

export async function update(
  currentUserId: string,
  dto: { id: string; title: string; content: string; doiTuong: string },
): Promise<ApiResponse<NotificationDto>> {
  const thongBao = await repo.getById(dto.id);
  if (!thongBao) return fail('Không tìm thấy thông báo', 'NOT_FOUND');

  const now = new Date();
  const doiTuong = dto.doiTuong ?? 'Tat_Ca';
  const newReceiverIds = [...new Set(await getUserIdsByTarget(dto.doiTuong))];
  const existing = new Set(thongBao.nguoinhanthongbao.map((n) => n.MaNguoiDung));
  const toRestore = newReceiverIds.filter((id) => existing.has(id));
  const toAdd = newReceiverIds.filter((id) => !existing.has(id));

  await prisma.$transaction([
    prisma.thongbao.update({
      where: { MaThongBao: thongBao.MaThongBao },
      data: { TieuDe: dto.title, NoiDung: dto.content, DoiTuong: doiTuong, NguoiSua: currentUserId, ThoiGianSua: now },
    }),
    // 1. Xoa mem toan bo nguoi nhan cu, 2. khoi phuc nguoi van con trong danh sach moi, 3. them nguoi moi.
    prisma.nguoinhanthongbao.updateMany({
      where: { MaThongBao: thongBao.MaThongBao },
      data: { DaXoa: true, NguoiSua: currentUserId, ThoiGianSua: now },
    }),
    prisma.nguoinhanthongbao.updateMany({
      where: { MaThongBao: thongBao.MaThongBao, MaNguoiDung: { in: toRestore } },
      data: { DaXoa: false, NguoiSua: currentUserId, ThoiGianSua: now },
    }),
    prisma.nguoinhanthongbao.createMany({
      data: toAdd.map((userId) => ({
        MaThongBao: thongBao.MaThongBao,
        MaNguoiDung: userId,
        DaDoc: false,
        ThoiGianTao: now,
        NguoiTao: currentUserId,
        DaXoa: false,
        TrangThai: true,
      })),
    }),
  ]);

  return ok(
    {
      id: thongBao.MaThongBao,
      title: dto.title,
      content: dto.content,
      doiTuong,
      createdAt: utcDateTime(thongBao.ThoiGianTao ?? now),
      isRead: false,
      readAt: null,
      attachments: [],
    },
    'Cập nhật thành công',
  );
}

export async function remove(id: string, currentUserId: string): Promise<ApiResponse<null>> {
  const thongBao = await repo.getById(id);
  if (!thongBao) return fail('Không tìm thấy thông báo', 'NOT_FOUND');
  await repo.deleteSoft(id, currentUserId);
  return ok(null, 'Xóa thông báo thành công');
}

/** Tra ve duong dan file de tai, hoac loi (ATTACHMENT_FORBIDDEN -> 403, con lai -> 404). */
export async function getAttachmentForDownload(
  userId: string,
  isAdmin: boolean,
  resourceId: string,
): Promise<{ physicalPath: string; fileName: string; error: null } | { physicalPath: null; fileName: null; error: ApiResponse<null> }> {
  const resource = await prisma.tainguyenluutru.findFirst({
    where: { MaTaiNguyen: resourceId, ...notDeleted },
    include: { dinhkemthongbao: { where: notDeleted, orderBy: { MaThongBao: 'asc' } } },
  });
  const link = resource?.dinhkemthongbao[0];
  if (!resource || !link) {
    return { physicalPath: null, fileName: null, error: fail('Không tìm thấy file đính kèm.', 'ATTACHMENT_NOT_FOUND') };
  }

  if (!isAdmin) {
    const isRecipient = await prisma.nguoinhanthongbao.count({
      where: { MaThongBao: link.MaThongBao, MaNguoiDung: userId, ...notDeleted },
    });
    if (!isRecipient) {
      return { physicalPath: null, fileName: null, error: fail('Bạn không có quyền tải file này.', 'ATTACHMENT_FORBIDDEN') };
    }
  }

  const physicalPath = uploadUrlToDiskPath(resource.Link);
  const exists = physicalPath
    ? await fs
        .stat(physicalPath)
        .then((s) => s.isFile())
        .catch(() => false)
    : false;
  if (!physicalPath || !exists) {
    return { physicalPath: null, fileName: null, error: fail('Không tìm thấy file trên máy chủ.', 'ATTACHMENT_FILE_NOT_FOUND') };
  }
  return { physicalPath, fileName: resource.TenTaiNguyen, error: null };
}
