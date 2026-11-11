

import React from 'react';

const SubmissionConfirm = ({ 
  show, 
  onClose, 
  onConfirm, 
  totalQuestions, 
  answers, 
  markedForReview 
}) => {
  if (!show) return null;

  const answeredCount = Object.values(answers).filter(v => v !== undefined && v !== null && v !== "").length;
  const unansweredCount = totalQuestions - answeredCount;

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000 }}>
      <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", width: "500px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)" }}>
        <h2 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", marginBottom: "16px" }}>
          Xác nhận nộp bài
        </h2>
        <p style={{ color: "#6B7280", marginBottom: "24px" }}>
          Bạn có chắc chắn muốn nộp bài? Sau khi nộp, bạn có thể không chỉnh sửa được bài làm.
        </p>
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "#4B5563" }}>Tổng số câu:</span>
            <span style={{ fontSize: "14px", fontWeight: "600" }}>{totalQuestions}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "#4B5563" }}>Đã làm:</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#10B981" }}>{answeredCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
            <span style={{ fontSize: "14px", color: "#4B5563" }}>Chưa làm:</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#DC2626" }}>{unansweredCount}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14px", color: "#4B5563" }}>Đánh dấu xem lại:</span>
            <span style={{ fontSize: "14px", fontWeight: "600", color: "#F59E0B" }}>{Object.values(markedForReview).filter(v => v).length}</span>
          </div>
        </div>
        {unansweredCount > 0 && (
          <p style={{ color: "#DC2626", fontSize: "14px", marginBottom: "24px" }}>
            Bạn còn {unansweredCount} câu chưa làm. Bạn có chắc muốn nộp bài?
          </p>
        )}
        <div style={{ display: "flex", gap: "16px", justifyContent: "flex-end" }}>
          <button 
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "1px solid #E5E7EB",
              backgroundColor: "white",
              color: "#4B5563",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Quay lại làm bài
          </button>
          <button 
            onClick={onConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#2563EB",
              color: "white",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            Nộp bài
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubmissionConfirm;

