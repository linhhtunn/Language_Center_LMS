export const SCORE_BUCKETS = [
  {
    key: "fail",
    label: "Không đạt",
    rangeLabel: "Không đạt (<5)",
    color: "#e03131",
    min: 0,
    max: 5,
    includeMax: false,
  },
  {
    key: "average",
    label: "Trung bình",
    rangeLabel: "Trung bình (5-<6.5)",
    color: "#f08c00",
    min: 5,
    max: 6.5,
    includeMax: false,
  },
  {
    key: "good",
    label: "Khá",
    rangeLabel: "Khá (6.5-<8)",
    color: "#1971c2",
    min: 6.5,
    max: 8,
    includeMax: false,
  },
  {
    key: "excellent",
    label: "Giỏi",
    rangeLabel: "Giỏi (8-10)",
    color: "#2f9e44",
    min: 8,
    max: 10,
    includeMax: true,
  },
];

export const DATE_PRESETS = [
  { id: "today", label: "Hôm nay" },
  { id: "thisWeek", label: "Tuần này" },
  { id: "nextWeek", label: "Tuần sau" },
  { id: "thisMonth", label: "Tháng này" },
  { id: "nextMonth", label: "Tháng sau" },
  { id: "thisQuarter", label: "Quý này" },
  { id: "thisYear", label: "Năm nay" },
];
