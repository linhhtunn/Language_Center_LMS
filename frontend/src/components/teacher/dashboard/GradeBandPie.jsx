import React, { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import { summarizeScoreBuckets } from "../../../utils/statsUtils";

ChartJS.register(...registerables);

// Biểu đồ tròn tỷ lệ % theo 4 mức điểm (Không đạt/Trung bình/Khá/Giỏi).
// Màu + nhãn lấy thẳng từ SCORE_BUCKETS (qua summarizeScoreBuckets) — không định
// nghĩa lại màu ở đây để tránh lệch với các nơi khác dùng cùng thang điểm.
const GradeBandPie = ({ scores, title = "Tỷ lệ theo mức điểm" }) => {
  const buckets = useMemo(
    () => summarizeScoreBuckets((scores || []).map((score) => ({ score })), "score"),
    [scores],
  );

  const data = {
    labels: buckets.map((bucket) => bucket.rangeLabel),
    datasets: [
      {
        data: buckets.map((bucket) => bucket.count),
        backgroundColor: buckets.map((bucket) => bucket.color),
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label(context) {
            const bucket = buckets[context.dataIndex];
            return `${bucket.label}: ${bucket.count} (${bucket.percent}%)`;
          },
        },
      },
    },
  };

  const hasData = (scores || []).length > 0;

  return (
    <div className="card border-0 shadow-sm rounded-5 p-4 bg-white h-100">
      <h6 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
        <i className="bi bi-pie-chart-fill text-primary"></i> {title}
      </h6>
      {hasData ? (
        <div style={{ height: 260 }}>
          <Doughnut data={data} options={options} />
        </div>
      ) : (
        <div className="text-center text-muted py-5">
          <i className="bi bi-inbox fs-1 mb-2 opacity-50 d-block"></i>
          Chưa có dữ liệu điểm.
        </div>
      )}
    </div>
  );
};

export default GradeBandPie;
