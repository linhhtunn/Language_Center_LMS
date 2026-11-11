import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fail, ok, type ApiResponse } from '../../utils/apiResponse.js';
import { saveUpload } from '../../utils/upload.js';
import * as repo from './chat.repository.js';
import type { ChatConversationDto, ChatMessageDto, ChatUserDto } from './chat.repository.js';
import { notifyConversationUpdated, notifyNewMessage } from './chat.realtime.js';
import * as push from './pushService.js';

// Chuyen tu Services/ChatService.cs.

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

export async function getConversations(currentUserId: string): Promise<ApiResponse<ChatConversationDto[]>> {
  return ok(await repo.getConversations(currentUserId), 'Lấy danh sách hội thoại thành công.');
}

export async function getChatUsers(currentUserId: string): Promise<ApiResponse<ChatUserDto[]>> {
  return ok(await repo.getChatUsers(currentUserId), 'Lấy danh sách người dùng nhắn tin thành công.');
}

export async function getConversation(currentUserId: string, conversationId: string): Promise<ApiResponse<ChatConversationDto>> {
  if (!(await repo.isUserInConversation(conversationId, currentUserId))) {
    return fail('Bạn không thuộc hội thoại này.', 'CHAT_FORBIDDEN');
  }
  const conversation = await repo.getConversationById(conversationId, currentUserId);
  if (!conversation) return fail('Không tìm thấy hội thoại.', 'CHAT_NOT_FOUND');
  return ok(conversation, 'Lấy hội thoại thành công.');
}

export async function getMessages(currentUserId: string, conversationId: string, take = 50): Promise<ApiResponse<ChatMessageDto[]>> {
  if (!(await repo.isUserInConversation(conversationId, currentUserId))) {
    return fail('Bạn không thuộc hội thoại này.', 'CHAT_FORBIDDEN');
  }
  const clamped = Math.min(Math.max(take, 1), 200);
  return ok(await repo.getMessages(conversationId, clamped), 'Lấy tin nhắn thành công.');
}

export async function createDirectConversation(
  currentUserId: string,
  req: { recipientUserId: string; initialMessage: string | null },
): Promise<ApiResponse<ChatConversationDto>> {
  const recipient = req.recipientUserId.toLowerCase();
  if (recipient === EMPTY_GUID) return fail('Thiếu người nhận tin nhắn.', 'CHAT_RECIPIENT_REQUIRED');
  if (recipient === currentUserId.toLowerCase()) {
    return fail('Không thể tạo hội thoại với chính mình.', 'CHAT_INVALID_RECIPIENT');
  }
  if (!(await repo.userExists(recipient))) return fail('Người nhận không tồn tại.', 'CHAT_RECIPIENT_NOT_FOUND');

  const conversationId =
    (await repo.findDirectConversationId(currentUserId, recipient)) ??
    (await repo.createConversation(null, currentUserId, [recipient]));

  if (req.initialMessage && req.initialMessage.trim()) {
    const messageResult = await sendMessage(currentUserId, conversationId, { content: req.initialMessage, attachmentUrls: null });
    if (!messageResult.success) return fail(messageResult.message, messageResult.code);
  }

  const conversation = await repo.getConversationById(conversationId, currentUserId);
  if (!conversation) return fail('Không tạo được hội thoại.', 'CHAT_CREATE_FAILED');

  notifyConversationUpdated(conversationId, conversation.members.map((m) => m.userId));
  return ok(conversation, 'Tạo hội thoại trực tiếp thành công.');
}

export async function createGroupConversation(
  currentUserId: string,
  req: { title: string; memberUserIds: string[]; initialMessage: string | null },
): Promise<ApiResponse<ChatConversationDto>> {
  if (!req.title || !req.title.trim()) return fail('Tên nhóm không được để trống.', 'CHAT_GROUP_TITLE_REQUIRED');

  const me = currentUserId.toLowerCase();
  const memberIds = [...new Set(req.memberUserIds.map((x) => x.toLowerCase()))].filter((x) => x !== EMPTY_GUID && x !== me);
  if (memberIds.length === 0) {
    return fail('Cần ít nhất một thành viên khác để tạo nhóm.', 'CHAT_GROUP_MEMBERS_REQUIRED');
  }

  const profiles = await repo.getUserProfiles(memberIds);
  if (profiles.length !== memberIds.length) {
    return fail('Danh sách thành viên có người dùng không hợp lệ.', 'CHAT_GROUP_INVALID_MEMBER');
  }

  const conversationId = await repo.createConversation(req.title.trim(), currentUserId, memberIds);

  if (req.initialMessage && req.initialMessage.trim()) {
    const messageResult = await sendMessage(currentUserId, conversationId, { content: req.initialMessage, attachmentUrls: null });
    if (!messageResult.success) return fail(messageResult.message, messageResult.code);
  }

  const conversation = await repo.getConversationById(conversationId, currentUserId);
  if (!conversation) return fail('Không tạo được nhóm chat.', 'CHAT_GROUP_CREATE_FAILED');

  notifyConversationUpdated(conversationId, conversation.members.map((m) => m.userId));
  return ok(conversation, 'Tạo nhóm chat thành công.');
}

export async function sendMessage(
  currentUserId: string,
  conversationId: string,
  req: { content: string | null; attachmentUrls: string[] | null },
): Promise<ApiResponse<ChatMessageDto>> {
  const hasAttachmentUrls = !!req.attachmentUrls && req.attachmentUrls.length > 0;
  if ((!req.content || !req.content.trim()) && !hasAttachmentUrls) {
    return fail('Nội dung tin nhắn không được để trống.', 'CHAT_MESSAGE_REQUIRED');
  }
  if (!(await repo.isUserInConversation(conversationId, currentUserId))) {
    return fail('Bạn không thuộc hội thoại này.', 'CHAT_FORBIDDEN');
  }

  const message = await repo.createMessage(conversationId, currentUserId, req.content ?? '', hasAttachmentUrls ? req.attachmentUrls : null);
  const conversation = await repo.getConversationById(conversationId, currentUserId);

  const memberIds = [...new Set(conversation?.members.map((m) => m.userId) ?? [])];
  const receiverIds = memberIds.filter((x) => x !== currentUserId);

  notifyNewMessage(message, memberIds);
  notifyConversationUpdated(conversationId, memberIds);
  await push.sendNewMessagePush(message, receiverIds);

  return ok(message, 'Gửi tin nhắn thành công.');
}

export async function markAsRead(
  currentUserId: string,
  conversationId: string,
): Promise<ApiResponse<{ conversationId: string; updatedCount: number }>> {
  if (!(await repo.isUserInConversation(conversationId, currentUserId))) {
    return fail('Bạn không thuộc hội thoại này.', 'CHAT_FORBIDDEN');
  }
  const updatedCount = await repo.markMessagesAsRead(conversationId, currentUserId);
  const conversation = await repo.getConversationById(conversationId, currentUserId);
  const memberIds = [...new Set(conversation?.members.map((m) => m.userId) ?? [])];
  notifyConversationUpdated(conversationId, memberIds);
  return ok({ conversationId, updatedCount }, 'Đánh dấu đã đọc thành công.');
}

export async function uploadMessageAttachments(
  _currentUserId: string,
  files: { buffer: Buffer; originalname: string; size: number }[],
): Promise<ApiResponse<string[]>> {
  if (!files || files.length === 0) {
    return fail('Không có tệp đính kèm nào được gửi.', 'CHAT_ATTACHMENTS_REQUIRED');
  }
  const urls: string[] = [];
  for (const file of files) {
    if (!file || file.size === 0) continue;
    // Path.GetExtension giu nguyen hoa thuong cua duoi file.
    const storedFileName = `attachment_${randomUUID()}${path.extname(file.originalname)}`;
    const saved = await saveUpload(file, 'message-attachments', storedFileName);
    urls.push(saved.url);
  }
  if (urls.length === 0) return fail('Không thể lưu tệp đính kèm.', 'CHAT_ATTACHMENTS_SAVE_FAILED');
  return ok(urls, 'Tải tệp đính kèm lên thành công.');
}

export async function registerDeviceToken(currentUserId: string, token: string | null) {
  if (!token || !token.trim()) return fail('Device token không hợp lệ.', 'CHAT_DEVICE_TOKEN_INVALID');
  await push.registerDeviceToken(currentUserId, token.trim());
  return ok({ userId: currentUserId, registered: true }, 'Đăng ký device token thành công.');
}
