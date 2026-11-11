import { emitToAll, emitToGroup, PARENT_GROUP, STUDENT_GROUP, TEACHER_GROUP, userGroup } from '../../realtime/socket.js';
import { create } from './notification.service.js';

// Chuyen tu Services/NotificationEventService.cs: tao thong bao (luu DB) roi day realtime qua namespace /notification.
// Ban .NET dang ky service nay nhung KHONG noi nao goi toi; giu lai de module khac dung khi can.
// Su kien: "NewNotification" (payload = NotificationDto) va "ScheduleChanged".

async function createAndEmit(
  creatorId: string,
  dto: { title: string; content: string; doiTuong: string },
  emit: (data: unknown) => void,
) {
  const result = await create(creatorId, { ...dto, files: [] });
  if (result.success) emit(result.data);
  return result;
}

/** Bai tap moi -> moi hoc sinh. */
export function notifyNewAssignment(creatorId: string, assignmentTitle: string, description: string) {
  return createAndEmit(creatorId, { title: `Bài tập mới: ${assignmentTitle}`, content: description, doiTuong: 'Hoc_Sinh' }, (d) =>
    emitToGroup('/notification', STUDENT_GROUP, 'NewNotification', d),
  );
}

export function notifyTeachers(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Giao_Vien' }, (d) =>
    emitToGroup('/notification', TEACHER_GROUP, 'NewNotification', d),
  );
}

export function notifyParents(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Phu_Huynh' }, (d) =>
    emitToGroup('/notification', PARENT_GROUP, 'NewNotification', d),
  );
}

export function notifyAll(creatorId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Tat_Ca' }, (d) => emitToAll('/notification', 'NewNotification', d));
}

/** Giong ban .NET: DoiTuong = "Tat_Ca" (moi nguoi deu duoc ghi la nguoi nhan) nhung chi day realtime toi 1 user. */
export function notifyUser(creatorId: string, targetUserId: string, title: string, content: string) {
  return createAndEmit(creatorId, { title, content, doiTuong: 'Tat_Ca' }, (d) =>
    emitToGroup('/notification', userGroup(targetUserId), 'NewNotification', d),
  );
}

export function notifyScheduleChange(creatorId: string, className: string, details: string) {
  return createAndEmit(creatorId, { title: `Thay đổi lịch học - ${className}`, content: details, doiTuong: 'Tat_Ca' }, (d) =>
    emitToAll('/notification', 'ScheduleChanged', d),
  );
}

export function notifyAssignmentSubmitted(creatorId: string, studentName: string, assignmentTitle: string) {
  return createAndEmit(
    creatorId,
    { title: `Nộp bài mới: ${assignmentTitle}`, content: `${studentName} đã nộp bài cho ${assignmentTitle}`, doiTuong: 'Giao_Vien' },
    (d) => emitToGroup('/notification', TEACHER_GROUP, 'NewNotification', d),
  );
}

export function notifyGrade(creatorId: string, studentId: string, assignmentTitle: string, grade: string) {
  return createAndEmit(
    creatorId,
    {
      title: `Điểm số: ${assignmentTitle}`,
      content: `Bạn đã nhận được điểm số cho ${assignmentTitle}: ${grade}`,
      doiTuong: 'Hoc_Sinh',
    },
    (d) => emitToGroup('/notification', userGroup(studentId), 'NewNotification', d),
  );
}
