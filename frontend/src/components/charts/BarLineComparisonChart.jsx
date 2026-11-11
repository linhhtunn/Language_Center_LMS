import React from "react";
import { Chart as ReactChart } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

// Biểu đồ cột (đơn hoặc "thả nổi" [min,max]) + đường so sánh nối MỀM (tension).
// Dùng chung cho: kết quả các lớp giáo viên đã dạy, và điểm học sinh so với
// điểm trung bình lớp (tất cả các lớp / tất cả bài kiểm tra trong 1 lớp) —
// tránh viết lại cùng 1 kiểu biểu đồ + plugin nhãn số ở nhiều nơi.
const buildValueLabelPlugin = (barLabelValues) => ({
  id: "barTopValueLabel",
  afterDatasetsDraw(chart) {
    const { ctx, data, scales } = chart;
    const barMeta = chart.getDatasetMeta(0);
    const yScale = scales.y;
    ctx.save();
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.fillStyle = "#212529";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    barMeta.data.forEach((bar, index) => {
      const raw = data.datasets[0].data[index];
      if (raw == null) return;
      const topValue = Array.isArray(raw) ? raw[1] : raw;
      const label = barLabelValues ? barLabelValues[index] : topValue;
      if (label == null) return;
      const topPixel = yScale.getPixelForValue(topValue);
      ctx.fillText(String(label), bar.x, topPixel - 8);
    });
    ctx.restore();
  },
});

const BarLineComparisonChart = ({
  labels,
  barData,
  barLabel,
  barColor = "#fa7268",
  lineData,
  lineLabel,
  lineColor = "#ffc94d",
  yLeftLabel = "",
  yRightLabel = "",
  height = 320,
  barTooltipFormat,
  lineTooltipFormat,
  showBarLabels = true,
  barLabelValues,
  emptyMessage = "Chưa có dữ liệu để hiển thị.",
}) => {
  const hasData = labels && labels.length > 0;

  if (!hasData) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center text-muted py-5"
        style={{ height }}
      >
        <i className="bi bi-bar-chart fs-1 mb-2 opacity-50"></i>
        {emptyMessage}
      </div>
    );
  }

  const data = {
    labels,
    datasets: [
      {
        type: "bar",
        label: barLabel,
        data: barData,
        backgroundColor: barColor,
        borderWidth: 0,
        borderRadius: 10,
        barThickness: 42,
        order: 2,
        yAxisID: "y",
      },
      {
        type: "line",
        label: lineLabel,
        data: lineData,
        borderColor: lineColor,
        backgroundColor: lineColor,
        pointBackgroundColor: lineColor,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 7,
        borderWidth: 3,
        tension: 0.4, // bo cong mềm giữa các điểm thay vì nối thẳng góc cạnh
        fill: false,
        showLine: true,
        order: 1,
        yAxisID: "y1",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: { top: 24 },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, boxWidth: 8, padding: 20 },
      },
      tooltip: {
        callbacks: {
          label(context) {
            if (context.dataset.type === "line") {
              return lineTooltipFormat
                ? lineTooltipFormat(context.parsed.y)
                : `${lineLabel}: ${context.parsed.y}`;
            }
            return barTooltipFormat
              ? barTooltipFormat(context.raw)
              : `${barLabel}: ${context.raw}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        max: 10,
        title: { display: !!yLeftLabel, text: yLeftLabel },
      },
      y1: {
        beginAtZero: true,
        max: 10,
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: !!yRightLabel, text: yRightLabel },
      },
    },
  };

  return (
    <div style={{ height }}>
      <ReactChart
        type="bar"
        data={data}
        options={options}
        plugins={showBarLabels ? [buildValueLabelPlugin(barLabelValues)] : []}
      />
    </div>
  );
};

export default BarLineComparisonChart;
