
import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';

// Sắp hết hạn = còn dưới 3 ngày.
const SAP_HET_HAN_MS = 3 * 24 * 60 * 60 * 1000;

const AssignmentList = ({ assignments, onStartTest, onViewDetails }) => {
  const { user } = useAuth();

  // Ba ô này trước đây gán cứng 01 / 01 / 08 kèm "+2 so với tuần trước".
  // Giờ đếm từ chính danh sách bài mà backend trả về.
  const stats = useMemo(() => {
    const now = Date.now();
    const list = assignments || [];

    return {
      dangMo: list.filter((item) => item.status === 'Đang mở').length,
      sapHetHan: list.filter((item) => {
        if (item.status !== 'Đang mở' || !item.rawDeadline) {
          return false;
        }
        const remain = new Date(item.rawDeadline).getTime() - now;
        return remain > 0 && remain <= SAP_HET_HAN_MS;
      }).length,
      // Đếm theo lịch sử nộp thật (bảng nopbai), không theo trạng thái hiển thị:
      // bài nộp 1 lần trong 2 lần cho phép vẫn là "Đang mở" nhưng đã nộp rồi.
      daNop: list.filter((item) => item.daNop).length,
    };
  }, [assignments]);

  const format = (value) => String(value).padStart(2, '0');

  return (
    <div style={{ backgroundColor: "#F3F4F6", minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", padding: "24px" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="fw-bold mb-0" style={{ fontSize: "24px", color: "#111827" }}>
            Xin chào, {user?.hoTen || 'bạn'}! 👋
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: "14px" }}>Lịch làm bài tập của bạn tuần này</p>
        </div>
        <div className="d-flex gap-3 align-items-center">
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-bell" style={{ fontSize: "20px", color: "#4B5563" }}></i>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div className="bg-white rounded-4 p-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted" style={{ fontSize: "12px" }}>Đang mở</span>
              <div style={{ backgroundColor: "#DBEAFE", padding: "6px", borderRadius: "8px" }}>
                <i className="bi bi-file-earmark-text" style={{ color: "#2563EB" }}></i>
              </div>
            </div>
            <h3 className="fw-bold mb-0" style={{ fontSize: "32px", color: "#111827" }}>{format(stats.dangMo)}</h3>
            <p className="text-muted mb-0" style={{ fontSize: "12px" }}>Bài bạn đang được giao</p>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="bg-white rounded-4 p-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted" style={{ fontSize: "12px" }}>Sắp hết hạn</span>
              <div style={{ backgroundColor: "#FFF7ED", padding: "6px", borderRadius: "8px" }}>
                <i className="bi bi-clock-history" style={{ color: "#EA580C" }}></i>
              </div>
            </div>
            <h3 className="fw-bold mb-0" style={{ fontSize: "32px", color: "#111827" }}>{format(stats.sapHetHan)}</h3>
            <p className="text-muted mb-0" style={{ fontSize: "12px" }}>Còn dưới 3 ngày</p>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div className="bg-white rounded-4 p-4 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-muted" style={{ fontSize: "12px" }}>Đã nộp</span>
              <div style={{ backgroundColor: "#D1FAE5", padding: "6px", borderRadius: "8px" }}>
                <i className="bi bi-check2-circle" style={{ color: "#059669" }}></i>
              </div>
            </div>
            <h3 className="fw-bold mb-0" style={{ fontSize: "32px", color: "#111827" }}>{format(stats.daNop)}</h3>
            <p className="text-muted mb-0" style={{ fontSize: "12px" }}>Bài bạn đã làm xong</p>
          </div>
        </div>
      </div>

      {/* All Assignments */}
      <div className="bg-white rounded-4 p-4 shadow-sm mb-4">
        <h2 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>Tất cả bài tập</h2>
        {!assignments?.length ? (
          <div className="text-center text-muted py-5">
            <i className="bi bi-inbox" style={{ fontSize: "32px" }}></i>
            <p className="mb-0 mt-3" style={{ fontSize: "14px" }}>
              Bạn chưa được giao bài tập nào.
            </p>
          </div>
        ) : null}
        {(assignments || []).map((assignment) => (
          <div key={assignment.id} className="d-flex justify-content-between align-items-center mb-3 p-3 border rounded-3" style={{ borderColor: "#E5E7EB" }}>
            <div className="d-flex gap-3 align-items-center">
              <div style={{ backgroundColor: "#EFF6FF", padding: "10px 14px", borderRadius: "8px" }}>
                <i className="bi bi-file-earmark-text" style={{ fontSize: "20px", color: "#2563EB" }}></i>
              </div>
              <div>
                <h4 className="fw-bold mb-1" style={{ fontSize: "16px", color: "#111827" }}>{assignment.title}</h4>
                <p className="text-muted mb-0" style={{ fontSize: "12px" }}>{assignment.classInfo}</p>
              </div>
            </div>
            <div className="d-flex gap-3 align-items-center">
              <span className="px-3 py-1 rounded-2 fw-semibold" style={{ backgroundColor: assignment.statusColor, color: assignment.statusTextColor, fontSize: "12px" }}>
                {assignment.status}
              </span>
              <div className="d-flex gap-3 align-items-center">
                <div className="d-flex gap-2 align-items-center text-muted" style={{ fontSize: "12px" }}>
                  <i className="bi bi-file-text"></i>
                  <span>{assignment.questions} câu</span>
                </div>
                <div className="d-flex gap-2 align-items-center text-muted" style={{ fontSize: "12px" }}>
                  <i className="bi bi-clock"></i>
                  <span>{assignment.duration}</span>
                </div>
              </div>
              <button className="btn btn-light fw-semibold" style={{ fontSize: "12px" }} onClick={() => onViewDetails(assignment)}>
                Xem chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssignmentList;

