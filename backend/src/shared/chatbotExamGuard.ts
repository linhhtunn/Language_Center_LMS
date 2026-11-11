import { prisma } from '../db.js';

// Chuyen tu Services/Chatbot/ChatbotExamGuard.cs:
// khi hoc sinh dang lam bai kiem tra thi khoa chatbot AI cho toi khi nop bai hoac het gio.

export async function isChatbotBlocked(userId: string): Promise<boolean> {
  const count = await prisma.chatbot_exam_sessions.count({
    where: { UserId: userId, ExpiresAtUtc: { gt: new Date() } },
  });
  return count > 0;
}

export async function startExamSession(userId: string, assignmentId: string, minutes?: number | null): Promise<void> {
  const key = { UserId_AssignmentId: { UserId: userId, AssignmentId: assignmentId } };
  const session = await prisma.chatbot_exam_sessions.findUnique({ where: key });
  if (session && session.ExpiresAtUtc > new Date()) return; // tai lai trang khong duoc keo dai thoi gian khoa
  const clamped = Math.min(Math.max(minutes ?? 60, 1), 1440);
  const expires = new Date(Date.now() + clamped * 60_000);
  await prisma.chatbot_exam_sessions.upsert({
    where: key,
    create: { UserId: userId, AssignmentId: assignmentId, ExpiresAtUtc: expires },
    update: { ExpiresAtUtc: expires },
  });
}

export async function completeExamSession(userId: string, assignmentId: string): Promise<void> {
  await prisma.chatbot_exam_sessions.deleteMany({ where: { UserId: userId, AssignmentId: assignmentId } });
}
