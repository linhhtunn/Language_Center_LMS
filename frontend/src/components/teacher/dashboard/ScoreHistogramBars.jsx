import React, { useMemo } from "react";

// Danh sách thanh ngang tỷ lệ điểm (kiểu "Thống kê" tham khảo hình 1): mỗi dòng là
// 1 mốc điểm, thanh dài theo tỷ lệ so với mốc có số lượng cao nhất, kèm số đếm bên phải.
// Component thuần hiển thị — không biết gì về "bài kiểm tra", nhận sẵn `bins` đã tính.
const ScoreHistogramBars = ({ bins, average, modeLabel, title = "Thống kê" }) => {
  const maxCount = useMemo(
    () => Math.max(1, ...bins.map((bin) => bin.count)),
    [bins],
  );

  return (
    <div className="card border-0 shadow-sm rounded-5 p-4 bg-white h-100">
      <h6 className="fw-bold mb-3 text-dark d-flex align-items-center gap-2">
        <i className="bi bi-list-ul text-primary"></i> {title}
      </h6>
      <div className="d-flex flex-column gap-2">
        {bins.map((bin) => (
          <div className="d-flex align-items-center gap-2" key={bin.label}>
            <div
              className="text-muted small text-end flex-shrink-0"
              style={{ width: 32 }}
            >
              {bin.label}
            </div>
            <div className="flex-grow-1 bg-light rounded-pill" style={{ height: 10 }}>
              <div
                className="bg-primary rounded-pill"
                style={{
                  height: 10,
                  width: `${Math.max(3, (bin.count / maxCount) * 100)}%`,
                  transition: "width 0.3s ease",
                }}
              />
            </div>
            <div
              className="fw-bold text-dark small text-end flex-shrink-0"
              style={{ width: 28 }}
            >
              {bin.count}
            </div>
          </div>
        ))}
      </div>
      <div className="row text-center mt-4 pt-3 border-top">
        <div className="col-6">
          <div className="fw-bold fs-4 text-dark">{average}</div>
          <div className="small text-muted">Điểm trung bình</div>
        </div>
        <div className="col-6">
          <div className="fw-bold fs-4 text-dark">{modeLabel}</div>
          <div className="small text-muted">
            Mốc điểm có nhiều học sinh đạt được nhất
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScoreHistogramBars;
