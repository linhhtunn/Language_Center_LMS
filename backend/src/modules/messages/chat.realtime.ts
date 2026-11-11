import { conversationGroup, emitToGroup, userGroup } from '../../realtime/socket.js';
import type { ChatMessageDto } from './chat.repository.js';

// Thay cho Services/ChatRealtimeNotifier.cs (IHubContext<ChatHub>).
// Ban .NET gui rieng toi group hoi thoai va tung group user -> 1 ket noi o ca 2 group nhan 2 lan.
// Socket.IO gui 1 lan toi hop cac phong (khong trung lap); frontend van loc trung theo messageId.

export function notifyConversationUpdated(conversationId: string, memberUserIds: Iterable<string>) {
  const rooms = [conversationGroup(conversationId), ...[...new Set(memberUserIds)].map(userGroup)];
  emitToGroup('/chat', rooms, 'conversation-updated', { conversationId });
}

export function notifyNewMessage(message: ChatMessageDto, memberUserIds: Iterable<string>) {
  const rooms = [conversationGroup(message.conversationId), ...[...new Set(memberUserIds)].map(userGroup)];
  emitToGroup('/chat', rooms, 'message-created', message);
}
