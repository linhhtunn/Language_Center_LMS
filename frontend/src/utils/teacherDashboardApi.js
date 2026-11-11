// Nạp dữ liệu THẬT cho Teacher Dashboard từ Backend — thay thế phần sinh dữ liệu
// mock trước đây. Hình dạng dữ liệu trả về giữ nguyên như bản mock để các component
// biểu đồ (ClassStatsTab, ExamStatsTab, ExamDetailPanel, CompletedClassesResultChart...)
// không cần sửa gì.
import { p0Api } from "../api/p0Api";
import { getClassStatus } from "./statsUtils";

export const loadTeacherClasses = async () => {
  const classes = await p0Api.classes.assignedToMe();
  return (classes || []).map((cls) => ({
    id: cls.id,
    name: cls.name,
    courseName: cls.courses?.[0]?.name || "Chưa gán khóa học",
    status: getClassStatus(cls.startDate, cls.endDate).key, // 'ongoing' | 'upcoming' | 'ended' | 'unscheduled'
    studentCount: cls.currentSize || 0,
  }));
};

// Chỉ tải bài kiểm tra cho lớp đang/đã dạy — lớp "upcoming"/"unscheduled" chưa có bài nào.
export const loadTeacherExams = async (classes) => {
  const targetClasses = (classes || []).filter(
    (cls) => cls.status === "ongoing" || cls.status === "ended",
  );
  if (targetClasses.length === 0) {
    return [];
  }

  const dashboards = await Promise.all(
    targetClasses.map((cls) => p0Api.reports.classDashboard(cls.id)),
  );

  return targetClasses.flatMap((cls, index) => {
    const dashboard = dashboards[index];
    return (dashboard?.tests || []).map((test) => ({
      id: test.testId,
      name: test.testName,
      classId: cls.id,
      className: cls.name,
      registeredCount: test.registeredCount,
      notYetCount: test.notSubmittedCount,
      totalAttempts: test.totalAttempts,
      scores: test.scores || [],
    }));
  });
};
