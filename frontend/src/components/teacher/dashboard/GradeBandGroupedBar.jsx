import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";
import { SCORE_BUCKETS } from "../../../constants/statsConstants";
import { wrapChartAxisLabel } from "../../../utils/statsSeeder";
import { getSeriesColor } from "../../../constants/teacherDashboardTheme";

ChartJS.register(...registerables);

// Biểu đồ nhóm cột kiểu hình 2: trục X = 4 mức điểm (SCORE_BUCKETS), mỗi "series"
// (1 bài kiểm tra hoặc 1 lớp, tuỳ nơi gọi) là 1 màu riêng theo teacherDashboardTheme.
// Component thuần — chỉ nhận `series: [{label, counts:[4 số theo đúng thứ tự SCORE_BUCKETS]}]`.
const GradeBandGroupedBar = ({ series, title }) => {
  const data = {
    labels: SCORE_BUCKETS.map((bucket) => bucket.label),
    datasets: series.map((item, index) => ({
      label: item.label,
      data: item.counts,
      backgroundColor: getSeriesColor(index),
      borderRadius: 4,
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label(context) {
            return `${context.dataset.label}: ${context.parsed.y} học sinh`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          callback(value) {
            return wrapChartAxisLabel(this.getLabelForValue(value));
          },
        },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: "Số học sinh" },
        ticks: { precision: 0 },
      },
    },
  };

  const hasData = series.length > 0 && series.some((item) => item.counts.some((c) => c > 0));

  return (
    <div className="card border-0 shadow-sm rounded-5 p-4 bg-white h-100">
      {title && <h6 className="fw-bold mb-3 text-dark">{title}</h6>}
      {hasData ? (
        <div style={{ height: 320 }}>
          <Bar data={data} options={options} />
        </div>
      ) : (
        <div className="text-center text-muted py-5">
          <i className="bi bi-bar-chart fs-1 mb-2 opacity-50 d-block"></i>
          Chưa có dữ liệu để so sánh.
        </div>
      )}
    </div>
  );
};

export default GradeBandGroupedBar;
