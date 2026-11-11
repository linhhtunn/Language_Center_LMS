// Logic tải + tổng hợp điểm học sinh theo từng lớp — dùng chung giữa Dashboard.jsx
// (bản rút gọn trên Trang chủ) và StudentReports.jsx (trang Báo cáo thống kê đầy đủ),
// tránh lặp lại cùng 1 đoạn Promise.all + tính trung bình ở 2 nơi.
import apiClient from '../api/BaseApi';
import { p0Api } from '../api/p0Api';

export const fetchStudentClasses = async () => {
  const res = await apiClient.get('Schedule/student-classes');
  return res.data?.classes || res.classes || [];
};

export const summarizeStudentClassScores = async (studentClasses) => {
  if (!studentClasses || studentClasses.length === 0) return [];

  const results = await Promise.all(
    studentClasses.map((cls) => p0Api.reports.studentDashboard(cls.id))
  );

  return results.map((res, idx) => {
    const classObj = studentClasses[idx];
    const gradedScores = (res.tests || [])
      .filter((t) => t.score !== null && t.score !== undefined)
      .map((t) => t.score);
    const averageScore = gradedScores.length > 0
      ? Math.round((gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) * 100) / 100
      : null;

    // Điểm TB của cả lớp — trung bình các classAverage theo từng bài kiểm tra.
    const gradedClassAverages = (res.tests || [])
      .filter((t) => t.classAverage !== null && t.classAverage !== undefined)
      .map((t) => t.classAverage);
    const classAverageScore = gradedClassAverages.length > 0
      ? Math.round((gradedClassAverages.reduce((a, b) => a + b, 0) / gradedClassAverages.length) * 100) / 100
      : null;

    return {
      classId: classObj.id,
      classCode: classObj.classCode || '',
      className: classObj.className || classObj.classCode || 'Lớp học',
      teacher: classObj.teacher || 'Chưa phân công',
      averageScore,
      classAverageScore,
      tests: res.tests || [],
      attendanceRate: res.attendanceRate,
    };
  });
};
