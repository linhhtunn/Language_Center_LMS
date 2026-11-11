import React, { useMemo } from "react";
import toast from "react-hot-toast";
import { StatCard } from "../../SharedComponents";
import { EXAM_KPI_TILES } from "../../../constants/teacherDashboardTheme";
import {
  summarizeExamKpis,
  buildScoreHistogram,
  getHistogramFooterStats,
} from "../../../utils/teacherDashboardStats";
import GradeBandPie from "./GradeBandPie";
import ScoreHistogramBars from "./ScoreHistogramBars";

// Bảng chi tiết 1 bài kiểm tra (drill-down cuối cùng): KPI hàng đầu (tham khảo hình 3)
// + nút Xuất Excel (mock) + biểu đồ tròn theo mức điểm + phổ điểm (tham khảo hình 1).
const ExamDetailPanel = ({ exam }) => {
  const kpis = useMemo(() => summarizeExamKpis(exam), [exam]);
  const histogramBins = useMemo(
    () => buildScoreHistogram(exam?.scores || []),
    [exam],
  );
  const footerStats = useMemo(
    () => getHistogramFooterStats(exam?.scores || []),
    [exam],
  );

  const handleExport = () => {
    toast("Xuất Excel sẽ khả dụng khi có dữ liệu thật (chưa nối Backend).", {
      icon: "📄",
    });
  };

  if (!exam) {
    return null;
  }

  return (
    <div className="animate__animated animate__fadeIn">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <div>
          <h6 className="fw-bold text-dark mb-0">{exam.name}</h6>
          <div className="small text-muted">Lớp: {exam.className}</div>
        </div>
        <button
          type="button"
          className="btn btn-success rounded-pill btn-sm px-3 fw-bold shadow-sm"
          onClick={handleExport}
        >
          <i className="bi bi-file-earmark-excel me-1"></i> Xuất tập tin Excel
        </button>
      </div>

      <div className="row g-3 mb-4">
        {EXAM_KPI_TILES.map((tile) => (
          <div className="col-md-4 col-6" key={tile.key}>
            <StatCard
              title={tile.label}
              value={kpis[tile.key]}
              icon={tile.icon}
              color={tile.color}
            />
          </div>
        ))}
      </div>

      <div className="row g-4">
        <div className="col-lg-5">
          <GradeBandPie scores={exam.scores} title="Tỷ lệ theo mức điểm" />
        </div>
        <div className="col-lg-7">
          <ScoreHistogramBars
            bins={histogramBins}
            average={footerStats.average}
            modeLabel={footerStats.modeLabel}
            title="Phổ điểm"
          />
        </div>
      </div>
    </div>
  );
};

export default ExamDetailPanel;
