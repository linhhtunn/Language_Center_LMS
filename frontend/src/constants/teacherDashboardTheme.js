// Trung tâm màu sắc riêng cho Teacher Dashboard (mock/UI-only).
// Không định nghĩa lại màu phổ điểm ở đây — dùng SCORE_BUCKETS trong statsConstants.js
// làm nguồn duy nhất cho màu/label các mức điểm (Không đạt/Trung bình/Khá/Giỏi).

export const CLASS_STATUS_STYLE = {
  ongoing: {
    key: "ongoing",
    label: "Đang dạy",
    color: "linear-gradient(135deg, #005197 0%, #0081f1 100%)",
    badgeClass: "bg-primary-subtle text-primary border border-primary-subtle",
    icon: "bi-play-circle",
  },
  upcoming: {
    key: "upcoming",
    label: "Chưa dạy (sắp khai giảng)",
    color: "linear-gradient(135deg, #f39c12 0%, #fbc531 100%)",
    badgeClass:
      "bg-warning-subtle text-warning-emphasis border border-warning-subtle",
    icon: "bi-hourglass-split",
  },
  ended: {
    key: "ended",
    label: "Đã dạy",
    color: "linear-gradient(135deg, #198754 0%, #20c997 100%)",
    badgeClass: "bg-success-subtle text-success border border-success-subtle",
    icon: "bi-check-circle",
  },
};

export const TOTAL_STAT_STYLE = {
  color: "linear-gradient(135deg, #6f42c1 0%, #a970ff 100%)",
  icon: "bi-diagram-3",
};

// Palette cố định cho các series trong biểu đồ nhóm cột (nhiều bài kiểm tra / nhiều lớp).
export const SERIES_PALETTE = [
  "#0d6efd",
  "#f08c00",
  "#2f9e44",
  "#d6336c",
  "#7048e8",
  "#12b886",
  "#e8590c",
  "#1971c2",
];

export const getSeriesColor = (index) =>
  SERIES_PALETTE[index % SERIES_PALETTE.length];

// 5 thẻ KPI trong bảng chi tiết 1 bài kiểm tra (tham khảo hình 3).
export const EXAM_KPI_TILES = [
  { key: "registeredCount", label: "Số người đăng ký thi", icon: "bi-person-lines-fill", color: "#0d6efd" },
  { key: "totalAttempts", label: "Tổng lượt làm", icon: "bi-check2-circle", color: "#2f9e44" },
  { key: "notYetCount", label: "Chưa thi / đang thi", icon: "bi-hourglass-split", color: "#f08c00" },
  { key: "under1Count", label: "Thí sinh đạt điểm < 1", icon: "bi-exclamation-octagon", color: "#e03131" },
  { key: "atLeast5Count", label: "Thí sinh đạt điểm ≥ 5", icon: "bi-graph-up-arrow", color: "#1971c2" },
];
