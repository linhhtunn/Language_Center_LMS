import React, { useMemo, useState, useEffect } from "react";
import GradeBandGroupedBar from "./GradeBandGroupedBar";
import ExamDetailPanel from "./ExamDetailPanel";
import { buildGradeBandSeries } from "../../../utils/teacherDashboardStats";

// Tab "Thống kê theo bài kiểm tra": chọn 1 bài kiểm tra (theo tên, có thể được giao
// cho nhiều lớp) → so sánh nhiều lớp bằng biểu đồ nhóm cột (tham khảo hình 2) →
// bấm vào 1 lớp để xem bảng chi tiết đầy đủ (tham khảo hình 2 + hình 3 kết hợp).
const ExamStatsTab = ({ exams, onViewClassExams }) => {
  const examGroups = useMemo(() => {
    const groups = {};
    exams.forEach((exam) => {
      if (!groups[exam.name]) groups[exam.name] = [];
      groups[exam.name].push(exam);
    });
    return groups;
  }, [exams]);

  const examNames = Object.keys(examGroups);
  const [selectedExamName, setSelectedExamName] = useState(examNames[0]);
  const [selectedClassId, setSelectedClassId] = useState(null);

  useEffect(() => {
    setSelectedClassId(null);
  }, [selectedExamName]);

  // Mọi hook phải chạy trước early-return bên dưới để không lệch thứ tự hook
  // giữa các lần render (kể cả khi examNames chuyển từ rỗng sang có dữ liệu).
  const group = examGroups[selectedExamName] || [];
  const multiClassSeries = useMemo(
    () =>
      buildGradeBandSeries(
        group,
        (exam) => exam.scores,
        (exam) => exam.className,
      ),
    [group],
  );

  if (examNames.length === 0) {
    return (
      <div className="card border-0 shadow-sm rounded-5 p-5 bg-white text-center text-muted">
        <i className="bi bi-inbox fs-1 mb-2 opacity-50"></i>
        Chưa có bài kiểm tra nào được ghi nhận.
      </div>
    );
  }

  const selectedExam = group.find((exam) => exam.classId === selectedClassId);

  return (
    <div className="animate__animated animate__fadeIn">
      {/* Chọn bài kiểm tra */}
      <div className="d-flex flex-wrap gap-2 mb-3">
        {examNames.map((name) => (
          <button
            key={name}
            type="button"
            className={`btn btn-sm rounded-pill px-3 fw-semibold ${
              selectedExamName === name ? "btn-primary" : "btn-outline-secondary"
            }`}
            onClick={() => setSelectedExamName(name)}
          >
            {name}
          </button>
        ))}
      </div>

      <GradeBandGroupedBar
        series={multiClassSeries}
        title={`So sánh giữa các lớp — "${selectedExamName}"`}
      />

      {/* Chọn 1 lớp để xem chi tiết */}
      <div className="mt-4">
        <div className="small fw-bold text-muted text-uppercase mb-2">
          Xem chi tiết theo lớp
        </div>
        <div className="d-flex flex-wrap gap-2 mb-3">
          {group.map((exam) => (
            <button
              key={exam.classId}
              type="button"
              className={`btn btn-sm rounded-pill px-3 ${
                selectedClassId === exam.classId
                  ? "btn-dark"
                  : "btn-outline-dark"
              }`}
              onClick={() => setSelectedClassId(exam.classId)}
            >
              {exam.className}
            </button>
          ))}
        </div>

        {selectedExam && (
          <div className="card border-0 shadow-sm rounded-5 p-4 bg-white">
            <ExamDetailPanel exam={selectedExam} />
            <button
              type="button"
              className="btn btn-link btn-sm text-decoration-none mt-3 align-self-start ps-0"
              onClick={() => onViewClassExams?.(selectedExam.classId)}
            >
              <i className="bi bi-arrow-right-circle me-1"></i>
              Xem tất cả bài kiểm tra của lớp {selectedExam.className}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamStatsTab;
