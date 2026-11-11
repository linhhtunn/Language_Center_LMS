import { prisma } from '../../db.js';

// Chuyen tu Repositories/NotificationRepository.cs.
// EF: `DaXoa == null || DaXoa == false` / `DaXoa != true` -> OR voi null.

export const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };
const unread = { OR: [{ DaDoc: null }, { DaDoc: false }] };

/** Include(Dinhkemthongbaos.Where(a => a.DaXoa != true)).ThenInclude(MaTaiNguyenNavigation) - EF sap theo khoa. */
export const attachmentsInclude = {
  dinhkemthongbao: {
    where: notDeleted,
    orderBy: { MaTaiNguyen: 'asc' as const },
    include: { tainguyenluutru: true },
  },
};

export async function getAllActive() {
  return prisma.thongbao.findMany({
    where: notDeleted,
    include: attachmentsInclude,
    orderBy: [{ ThoiGianTao: 'desc' }, { MaThongBao: 'asc' }],
  });
}

export async function getById(id: string) {
  return prisma.thongbao.findFirst({
    where: { MaThongBao: id, ...notDeleted },
    include: { nguoinhanthongbao: true },
  });
}

function userNotificationsQuery(userId: string, onlyUnread: boolean) {
  return prisma.nguoinhanthongbao.findMany({
    where: {
      MaNguoiDung: userId,
      AND: [notDeleted, ...(onlyUnread ? [unread] : [])],
      thongbao: notDeleted,
    },
    include: { thongbao: { include: attachmentsInclude } },
    orderBy: [{ thongbao: { ThoiGianTao: 'desc' } }, { MaThongBao: 'asc' }],
  });
}

export async function getNotificationsByUserId(userId: string) {
  return userNotificationsQuery(userId, false);
}

export async function getUnreadNotificationsByUserId(userId: string) {
  return userNotificationsQuery(userId, true);
}

/** Ban .NET dem ca thong bao da bi xoa mem (chi loc NguoiNhanThongBao) - giu nguyen. */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.nguoinhanthongbao.count({ where: { MaNguoiDung: userId, AND: [unread, notDeleted] } });
}

export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const now = new Date();
  await prisma.nguoinhanthongbao.updateMany({
    where: { MaNguoiDung: userId, MaThongBao: notificationId },
    data: { DaDoc: true, NgayDoc: now, NguoiSua: userId, ThoiGianSua: now },
  });
}

export async function markAllAsRead(userId: string): Promise<void> {
  const now = new Date();
  await prisma.nguoinhanthongbao.updateMany({
    where: { MaNguoiDung: userId, ...unread },
    data: { DaDoc: true, NgayDoc: now, NguoiSua: userId, ThoiGianSua: now },
  });
}

export async function deleteSoft(id: string, currentUserId: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.thongbao.updateMany({
      where: { MaThongBao: id },
      data: { DaXoa: true, NguoiSua: currentUserId, ThoiGianSua: now },
    }),
    prisma.nguoinhanthongbao.updateMany({
      where: { MaThongBao: id },
      data: { DaXoa: true, NguoiSua: currentUserId, ThoiGianSua: now },
    }),
  ]);
}
