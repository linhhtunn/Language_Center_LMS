// Hàm tổng hợp/định dạng thuần (pure) cho Teacher Dashboard — dùng chung cho cả dữ
// liệu thật (teacherDashboardApi.js) lẫn UI, không quan tâm nguồn dữ liệu tới từ đâu.
import { summarizeScoreBuckets, buildContinuousBins } from "./statsSeeder";

export const summarizeCompletedClassResults = (classes, exams) =>
  classes
    .filter((cls) => cls.status === "ended")
    .map((cls) => {
      const classScores = exams
        .filter((exam) => exam.classId === cls.id)
        .flatMap((exam) => exam.scores);
      if (classScores.length === 0) {
        return { classId: cls.id, className: cls.name, min: 0, max: 0, avg: 0 };
      }
      const min = Math.min(...classScores);
      const max = Math.max(...classScores);
      const avg = classScores.reduce((sum, s) => sum + s, 0) / classScores.length;
      return {
        classId: cls.id,
        className: cls.name,
        min: Number(min.toFixed(1)),
        max: Number(max.toFixed(1)),
        avg: Number(avg.toFixed(1)),
      };
    });

// Bảng KPI kiểu "Số người đăng ký thi / Tổng lượt làm / Chưa thi.../ <1 điểm / >=5 điểm".
export const summarizeExamKpis = (exam) => {
  const scores = exam?.scores || [];
  const under1Count = scores.filter((s) => s < 1).length;
  const atLeast5Count = scores.filter((s) => s >= 5).length;
  return {
    registeredCount: exam?.registeredCount ?? scores.length,
    totalAttempts: exam?.totalAttempts ?? scores.length,
    notYetCount: exam?.notYetCount ?? 0,
    under1Count,
    atLeast5Count,
  };
};

// Danh sách bin dạng "< 1, < 2, ..., ≤ 10" kèm % — khớp giao diện tham khảo (hình 1).
export const buildScoreHistogram = (scores) => {
  const bins = buildContinuousBins(scores || [], 10, 0, 10);
  return bins.map((bin, index) => ({
    ...bin,
    label: index === bins.length - 1 ? "≤ 10" : `< ${index + 1}`,
  }));
};

export const getHistogramFooterStats = (scores) => {
  const safeScores = (scores || []).filter((s) => Number.isFinite(s));
  if (safeScores.length === 0) {
    return { average: 0, modeLabel: "--" };
  }
  const average =
    safeScores.reduce((sum, s) => sum + s, 0) / safeScores.length;
  const bins = buildScoreHistogram(safeScores);
  const topBin = bins.reduce(
    (best, bin) => (bin.count > best.count ? bin : best),
    bins[0],
  );
  return { average: Number(average.toFixed(2)), modeLabel: topBin.label };
};

// Phân bổ điểm theo 4 mức (SCORE_BUCKETS) cho 1 bài kiểm tra — dùng cho biểu đồ tròn.
export const summarizeExamGradeBands = (scores) =>
  summarizeScoreBuckets((scores || []).map((score) => ({ score })), "score");

// Gom counts theo 4 mức SCORE_BUCKETS cho nhiều "series" (nhiều bài kiểm tra hoặc
// nhiều lớp) — dùng cho biểu đồ nhóm cột kiểu hình 2.
export const buildGradeBandSeries = (items, getScores, getLabel) =>
  items.map((item) => {
    const buckets = summarizeExamGradeBands(getScores(item));
    return {
      label: getLabel(item),
      counts: buckets.map((bucket) => bucket.count),
    };
  });
