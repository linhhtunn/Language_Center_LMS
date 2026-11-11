import React from "react";
import BarLineComparisonChart from "../../charts/BarLineComparisonChart";

// Biểu đồ kết quả các lớp ĐÃ dạy: mỗi lớp 1 cột "thả nổi" [min, max] bo tròn,
// cộng thêm 1 đường điểm trung bình nối MỀM giữa các lớp.
const CompletedClassesResultChart = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="card border-0 shadow-sm rounded-5 p-4 bg-white mb-4 text-center text-muted py-5">
        <i className="bi bi-bar-chart fs-1 mb-2 opacity-50"></i>
        <div className="fw-semibold">Chưa có lớp nào đã dạy xong</div>
        <div className="small">
          Kết quả điểm (min - max) của các lớp đã kết thúc sẽ hiển thị tại đây.
        </div>
      </div>
    );
  }

  return (
    <div className="card border-0 shadow-sm rounded-5 p-4 bg-white mb-4">
      <h5 className="fw-bold mb-3 text-dark">
        Kết quả các lớp đã dạy ({results.length} lớp)
      </h5>
      <BarLineComparisonChart
        height={340}
        labels={results.map((r) => r.className)}
        barData={results.map((r) => [r.min, r.max])}
        barLabel="Khoảng điểm (Min - Max)"
        barLabelValues={results.map((r) => r.avg)}
        lineData={results.map((r) => r.avg)}
        lineLabel="Điểm trung bình"
        yLeftLabel="Điểm TB lớp"
        yRightLabel="Điểm trung bình"
        barTooltipFormat={(raw) => `Khoảng điểm: ${raw[0]} - ${raw[1]}`}
        lineTooltipFormat={(value) => `Điểm trung bình: ${value}`}
      />
    </div>
  );
};

export default CompletedClassesResultChart;
