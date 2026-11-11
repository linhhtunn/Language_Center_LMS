import type { ChatMessageDto } from './chat.repository.js';

// Thay cho Services/FirebasePushService.cs.
// Ban .NET chi gui push khi Firebase:Enabled=true va co Firebase:ServerKey (API FCM legacy) - cau hinh
// that dang TAT, nen o day chi giu phan dang ky device token (luu trong bo nho nhu ban cu) va
// sendNewMessagePush la no-op. Muon bat lai: goi FCM HTTP v1 trong sendNewMessagePush.

const deviceTokens = new Map<string, Set<string>>();

export async function registerDeviceToken(userId: string, token: string): Promise<void> {
  if (!token || !token.trim()) return;
  let set = deviceTokens.get(userId);
  if (!set) deviceTokens.set(userId, (set = new Set()));
  set.add(token.trim());
}

export async function sendNewMessagePush(_message: ChatMessageDto, _receiverUserIds: string[]): Promise<void> {
  // Firebase dang tat (Firebase:Enabled=false ben .NET) -> khong lam gi.
}
