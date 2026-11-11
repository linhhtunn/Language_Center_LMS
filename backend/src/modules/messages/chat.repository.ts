import { randomUUID } from 'node:crypto';
import { prisma } from '../../db.js';

// Chuyen tu Repositories/ChatRepository.cs.
// Luu y ve EF: `x.DaXoa != true` gom ca NULL, `x.TrangThai != false` gom ca NULL -> dung OR voi null.

export const notDeleted = { OR: [{ DaXoa: null }, { DaXoa: false }] };
export const isActive = { OR: [{ TrangThai: null }, { TrangThai: true }] };
const alive = { AND: [notDeleted, isActive] };

export interface ChatUserDto {
  userId: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
}

export interface ChatMessageDto {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  senderAvatarUrl: string | null;
  content: string;
  attachmentUrls: string[] | null;
  isRead: boolean;
  /** Date (doc tu DB, ghi khong "Z") hoac chuoi "...Z" (DateTime.UtcNow vua tao ben .NET). */
  createdAt: Date | string;
}

export interface ChatConversationDto {
  conversationId: string;
  isGroup: boolean;
  displayName: string;
  title: string | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: Date | null;
  unreadCount: number;
  members: ChatUserDto[];
}

/** Quan he vai tro -> ten vai tro giong LEFT JOIN ben .NET: dong dau tien; vai tro bi tat/xoa -> "User". */
const roleLinksSelect = {
  where: alive,
  orderBy: { MaVaiTro: 'asc' as const },
  select: { vaitro: { select: { TenVaiTro: true, DaXoa: true, TrangThai: true } } },
};

function roleOf(links: { vaitro: { TenVaiTro: string; DaXoa: boolean | null; TrangThai: boolean | null } }[]): string {
  const first = links[0];
  if (!first) return 'User';
  const r = first.vaitro;
  return r.DaXoa !== true && r.TrangThai !== false ? r.TenVaiTro : 'User';
}

const collator = new Intl.Collator('en');

export async function userExists(userId: string): Promise<boolean> {
  const count = await prisma.nguoidung.count({ where: { MaNguoiDung: userId, ...alive } });
  return count > 0;
}

export async function getChatUsers(currentUserId: string): Promise<ChatUserDto[]> {
  const users = await prisma.nguoidung.findMany({
    where: { MaNguoiDung: { not: currentUserId }, ...alive },
    select: { MaNguoiDung: true, HoTen: true, AnhDaiDien: true, nguoidungvaitro: roleLinksSelect },
    orderBy: { MaNguoiDung: 'asc' },
  });
  return users
    .map((u) => ({ userId: u.MaNguoiDung, fullName: u.HoTen, role: roleOf(u.nguoidungvaitro), avatarUrl: u.AnhDaiDien }))
    .sort((a, b) => collator.compare(a.fullName, b.fullName));
}

export async function getUserProfiles(userIds: Iterable<string>): Promise<ChatUserDto[]> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return [];
  const users = await prisma.nguoidung.findMany({
    where: { MaNguoiDung: { in: ids }, ...alive },
    select: { MaNguoiDung: true, HoTen: true, AnhDaiDien: true, nguoidungvaitro: roleLinksSelect },
    orderBy: { MaNguoiDung: 'asc' },
  });
  return users.map((u) => ({
    userId: u.MaNguoiDung,
    fullName: u.HoTen,
    role: roleOf(u.nguoidungvaitro),
    avatarUrl: u.AnhDaiDien,
  }));
}

export async function getUserProfile(userId: string): Promise<ChatUserDto | null> {
  return (await getUserProfiles([userId]))[0] ?? null;
}

export async function findDirectConversationId(userA: string, userB: string): Promise<string | null> {
  const a = await prisma.thanhvienhoithoai.findMany({ where: { MaNguoiDung: userA, ...alive }, select: { MaHoiThoai: true } });
  if (a.length === 0) return null;
  const b = await prisma.thanhvienhoithoai.findMany({ where: { MaNguoiDung: userB, ...alive }, select: { MaHoiThoai: true } });
  const bSet = new Set(b.map((x) => x.MaHoiThoai));
  const common = [...new Set(a.map((x) => x.MaHoiThoai))].filter((id) => bSet.has(id));
  if (common.length === 0) return null;

  const candidates = await prisma.hoithoai.findMany({
    where: { MaHoiThoai: { in: common }, ...alive, OR: [{ TieuDe: null }, { TieuDe: '' }] },
    select: { MaHoiThoai: true },
    orderBy: { MaHoiThoai: 'asc' },
  });
  for (const c of candidates) {
    const members = await prisma.thanhvienhoithoai.count({ where: { MaHoiThoai: c.MaHoiThoai, ...alive } });
    if (members === 2) return c.MaHoiThoai;
  }
  return null;
}

export async function createConversation(title: string | null, creatorId: string, memberIds: Iterable<string>): Promise<string> {
  const now = new Date();
  const conversationId = randomUUID();
  const allMembers = [...new Set([...memberIds, creatorId])];
  await prisma.$transaction([
    prisma.hoithoai.create({
      data: {
        MaHoiThoai: conversationId,
        TieuDe: title && title.trim() ? title.trim() : null,
        NguoiTao: creatorId,
        ThoiGianTao: now,
        NguoiSua: creatorId,
        ThoiGianSua: now,
        TrangThai: true,
        DaXoa: false,
      },
    }),
    prisma.thanhvienhoithoai.createMany({
      data: allMembers.map((memberId) => ({
        MaHoiThoai: conversationId,
        MaNguoiDung: memberId,
        NguoiTao: creatorId,
        ThoiGianTao: now,
        NguoiSua: creatorId,
        ThoiGianSua: now,
        TrangThai: true,
        DaXoa: false,
      })),
    }),
  ]);
  return conversationId;
}

export async function isUserInConversation(conversationId: string, userId: string): Promise<boolean> {
  const count = await prisma.thanhvienhoithoai.count({
    where: { MaHoiThoai: conversationId, MaNguoiDung: userId, ...alive },
  });
  return count > 0;
}

export async function getConversationById(conversationId: string, currentUserId: string) {
  return (await buildConversationDtos([conversationId], currentUserId))[0] ?? null;
}

export async function getConversations(currentUserId: string): Promise<ChatConversationDto[]> {
  const rows = await prisma.thanhvienhoithoai.findMany({
    where: { MaNguoiDung: currentUserId, ...alive },
    select: { MaHoiThoai: true },
  });
  return buildConversationDtos(rows.map((r) => r.MaHoiThoai), currentUserId);
}

// ---------- Noi dung tin nhan co file dinh kem duoc luu dang JSON dac biet ----------

export function formatMessageContent(content: string | null | undefined, attachmentUrls: string[] | null | undefined): string {
  const trimmed = (content ?? '').trim();
  if (!attachmentUrls || attachmentUrls.length === 0) return trimmed;
  // JsonSerializer.Serialize mac dinh (khong camelCase) ben .NET.
  return JSON.stringify({ __chatMessageFormat: 1, Text: trimmed, AttachmentUrls: attachmentUrls });
}

export function parseMessageContent(raw: string | null | undefined): { text: string; attachmentUrls: string[] } {
  if (!raw || !raw.trim()) return { text: '', attachmentUrls: [] };
  try {
    const doc = JSON.parse(raw) as unknown;
    if (doc && typeof doc === 'object' && !Array.isArray(doc) && '__chatMessageFormat' in doc) {
      const d = doc as Record<string, unknown>;
      if (d.__chatMessageFormat === 1) {
        const text = typeof d.Text === 'string' ? d.Text : '';
        const attachments = Array.isArray(d.AttachmentUrls)
          ? d.AttachmentUrls.filter((x): x is string => typeof x === 'string')
          : [];
        return { text, attachmentUrls: attachments };
      }
    }
  } catch {
    // Khong phai payload JSON dac biet, dung nguyen van.
  }
  return { text: raw, attachmentUrls: [] };
}

/** "2026-11-11T13:41:30.123Z" - DateTime.UtcNow (Kind=Utc) ben .NET duoc ghi kem "Z". */
function utcNowString(d: Date): string {
  return d.toISOString().replace(/\.000Z$/, 'Z').replace(/(\.\d*?)0+Z$/, '$1Z');
}

export async function createMessage(
  conversationId: string,
  senderId: string,
  content: string,
  attachmentUrls: string[] | null,
): Promise<ChatMessageDto> {
  const now = new Date();
  const storedText = formatMessageContent(content, attachmentUrls);
  const messageId = randomUUID();
  await prisma.tinnhan.create({
    data: {
      MaTinNhan: messageId,
      MaHoiThoai: conversationId,
      MaNguoiDungGui: senderId,
      NoiDung: storedText,
      DaDoc: false,
      NguoiTao: senderId,
      ThoiGianTao: now,
      NguoiSua: senderId,
      ThoiGianSua: now,
      TrangThai: true,
      DaXoa: false,
    },
  });

  const sender = await getUserProfile(senderId);
  const parsed = parseMessageContent(storedText);
  return {
    messageId,
    conversationId,
    senderId,
    senderName: sender?.fullName ?? 'Người dùng',
    senderRole: sender?.role ?? 'User',
    senderAvatarUrl: sender?.avatarUrl ?? null,
    content: parsed.text,
    attachmentUrls: parsed.attachmentUrls,
    isRead: false,
    createdAt: utcNowString(now),
  };
}

export async function getMessages(conversationId: string, take: number): Promise<ChatMessageDto[]> {
  const rows = await prisma.tinnhan.findMany({
    where: { MaHoiThoai: conversationId, ...alive },
    orderBy: { ThoiGianTao: 'desc' },
    take,
    select: {
      MaTinNhan: true,
      MaHoiThoai: true,
      MaNguoiDungGui: true,
      NoiDung: true,
      DaDoc: true,
      ThoiGianTao: true,
      nguoidung: { select: { HoTen: true, AnhDaiDien: true, nguoidungvaitro: roleLinksSelect } },
    },
  });

  return rows
    .map((row) => {
      const parsed = parseMessageContent(row.NoiDung ?? '');
      return {
        messageId: row.MaTinNhan,
        conversationId: row.MaHoiThoai,
        senderId: row.MaNguoiDungGui,
        senderName: row.nguoidung.HoTen,
        senderRole: roleOf(row.nguoidung.nguoidungvaitro),
        senderAvatarUrl: row.nguoidung.AnhDaiDien,
        content: parsed.text,
        attachmentUrls: parsed.attachmentUrls,
        isRead: row.DaDoc === true,
        createdAt: row.ThoiGianTao ?? new Date(),
      };
    })
    .reverse();
}

export async function markMessagesAsRead(conversationId: string, currentUserId: string): Promise<number> {
  const now = new Date();
  const result = await prisma.tinnhan.updateMany({
    where: {
      MaHoiThoai: conversationId,
      MaNguoiDungGui: { not: currentUserId },
      AND: [notDeleted, isActive, { OR: [{ DaDoc: null }, { DaDoc: false }] }],
    },
    data: { DaDoc: true, NguoiSua: currentUserId, ThoiGianSua: now },
  });
  return result.count;
}

async function buildConversationDtos(conversationIds: Iterable<string>, currentUserId: string): Promise<ChatConversationDto[]> {
  const ids = [...new Set(conversationIds)];
  if (ids.length === 0) return [];

  const [conversations, memberships, unreadGroups, latestList] = await Promise.all([
    prisma.hoithoai.findMany({
      where: { MaHoiThoai: { in: ids }, ...alive },
      orderBy: { MaHoiThoai: 'asc' },
    }),
    prisma.thanhvienhoithoai.findMany({
      where: { MaHoiThoai: { in: ids }, ...alive },
      select: { MaHoiThoai: true, MaNguoiDung: true },
      orderBy: [{ MaHoiThoai: 'asc' }, { MaNguoiDung: 'asc' }],
    }),
    prisma.tinnhan.groupBy({
      by: ['MaHoiThoai'],
      where: {
        MaHoiThoai: { in: ids },
        MaNguoiDungGui: { not: currentUserId },
        AND: [notDeleted, isActive, { OR: [{ DaDoc: null }, { DaDoc: false }] }],
      },
      _count: { _all: true },
    }),
    // Tin nhan moi nhat cua tung hoi thoai (ban .NET tai het tin nhan roi lay dong dau moi nhom).
    Promise.all(
      ids.map((id) =>
        prisma.tinnhan.findFirst({
          where: { MaHoiThoai: id, ...alive },
          orderBy: { ThoiGianTao: 'desc' },
          select: { MaHoiThoai: true, NoiDung: true, ThoiGianTao: true, MaNguoiDungGui: true, nguoidung: { select: { HoTen: true } } },
        }),
      ),
    ),
  ]);

  const profiles = await getUserProfiles(memberships.map((m) => m.MaNguoiDung));
  const profileMap = new Map(profiles.map((p) => [p.userId, p]));
  const unreadMap = new Map(unreadGroups.map((g) => [g.MaHoiThoai, g._count._all]));
  const latestMap = new Map(latestList.filter((x) => x !== null).map((x) => [x!.MaHoiThoai, x!]));

  const result: ChatConversationDto[] = conversations.map((conversation) => {
    const members = memberships
      .filter((m) => m.MaHoiThoai === conversation.MaHoiThoai)
      .map((m) => profileMap.get(m.MaNguoiDung))
      .filter((m): m is ChatUserDto => !!m);

    const isGroup = members.length > 2 || !!conversation.TieuDe?.trim();
    const otherMember = members.find((m) => m.userId !== currentUserId);

    const latest = latestMap.get(conversation.MaHoiThoai);
    let latestText = latest ? parseMessageContent(latest.NoiDung ?? '').text : '';
    if (latest && latest.MaNguoiDungGui !== currentUserId && isGroup) {
      latestText = `${latest.nguoidung.HoTen}: ${latestText}`;
    }

    return {
      conversationId: conversation.MaHoiThoai,
      isGroup,
      displayName: isGroup
        ? (conversation.TieuDe ?? `Nhóm (${members.length} thành viên)`)
        : (otherMember?.fullName ?? 'Cuộc trò chuyện'),
      title: conversation.TieuDe,
      avatarUrl: isGroup ? null : (otherMember?.avatarUrl ?? null),
      lastMessage: latestText,
      lastMessageAt: latest?.ThoiGianTao ?? null,
      unreadCount: unreadMap.get(conversation.MaHoiThoai) ?? 0,
      members,
    };
  });

  // OrderByDescending(LastMessageAt ?? DateTime.MinValue) - sort on dinh nhu LINQ.
  return result.sort((a, b) => (b.lastMessageAt?.getTime() ?? -Infinity) - (a.lastMessageAt?.getTime() ?? -Infinity) || 0);
}
