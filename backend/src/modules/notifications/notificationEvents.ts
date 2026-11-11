import { emitToAll } from '../../realtime/socket.js';
import { create } from './notification.service.js';

// Chuyen tu Services/NotificationEventService.cs: cac ham tien ich tao thong bao theo nhom nguoi nhan.
// create() trong notification.service.ts da tu day "NewNotification" toi tung nguoi nhan, nen cac ham
// duoi day KHONG day lai (tranh nhan 2 lan) - chi rieng notifyScheduleChange day them "ScheduleChanged".

async function createAndEmit(
  creatorId: string,
  dto: { title: string; content: string; doiTuong: string },
  emit?: (data: unknown) => void,
) {
  const result = await create(creatorId, { ...dto, files: [] });
  if (result.success) emit?.(result.data);
  return result;
}

/** Bai tap moi -> moi hoc sinh. */
export function notifyNewAssignment(creatorId: string, assignmentTitle: string, description: string) {
  return createAndEmit(creatorId, { title: `Bài tập mới: ${assignmentTitle}`, content: description, doiTuong: 'Hoc_Sinh' });
}

export function notifyTeachers(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Giao_Vien' });
}

export function notifyParents(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Phu_Huynh' });
}

export function notifyAll(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Tat_Ca' });
}

/** Giong ban .NET: DoiTuong = "Tat_Ca" (moi nguoi deu duoc ghi la nguoi nhan) nhung chi day realtime toi 1 user. */
export function notifyUser(creatorId: string, targetUserId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Tat_Ca' });
}

export function notifyScheduleChange(creatorId: string, className: string, details: string) {
  return createAndEmit(creatorId, { title: `Thay đổi lịch học - ${className}`, content: details, doiTuong: 'Tat_Ca' }, (d) =>
    emitToAll('/notification', 'ScheduleChanged', d),
  );
}

export function notifyAssignmentSubmitted(creatorId: string, studentName: string, assignmentTitle: string) {
  return createAndEmit(
    creatorId,
    { title: `Nộp bài mới: ${assignmentTitle}`, content: `${studentName} đã nộp bài cho ${assignmentTitle}`, doiTuong: 'Giao_Vien' });
}

export function notifyGrade(creatorId: string, studentId: string, assignmentTitle: string, grade: string) {
  return createAndEmit(
    creatorId,
    {
      title: `Điểm số: ${assignmentTitle}`,
      content: `Bạn đã nhận được điểm số cho ${assignmentTitle}: ${grade}`,
      doiTuong: 'Hoc_Sinh',
    });
}
