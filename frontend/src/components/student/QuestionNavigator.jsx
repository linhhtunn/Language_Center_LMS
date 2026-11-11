
import React from 'react';

const QuestionNavigator = ({ 
  totalQuestions, 
  currentQuestion, 
  onQuestionClick, 
  getQuestionStatus, 
  markedForReview, 
  onToggleMarkForReview 
}) => {
  return (
    <div style={{ 
      width: "280px", 
      backgroundColor: "white", 
      padding: "20px", 
      borderLeft: "1px solid #E5E7EB", 
      height: "calc(100vh - 80px)", 
      overflowY: "auto", 
      flexShrink: 0 
    }}>
      <h3 style={{ 
        fontSize: "16px", 
        fontWeight: 700, 
        color: "#111827", 
        marginBottom: "8px" 
      }}>
        Điều hướng câu hỏi
      </h3>
      <p style={{ 
        fontSize: "12px", 
        color: "#6B7280", 
        marginBottom: "16px" 
      }}>
        Bấm số câu để di chuyển nhanh
      </p>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(5, 1fr)", 
        gap: "8px", 
        marginBottom: "24px" 
      }}>
        {Array.from({ length: totalQuestions }, (_, i) => i).map((qIndex) => {
          const status = getQuestionStatus(qIndex);
          let bgColor = "#FFFFFF";
          let borderColor = "#D1D5DB";
          let textColor = "#111827";

          if (qIndex === currentQuestion) {
            bgColor = "#EFF6FF";
            borderColor = "#3B82F6";
          } else if (markedForReview[qIndex]) {
            bgColor = "#FEF3C7";
            borderColor = "#F59E0B";
          } else if (status === "answered") {
            bgColor = "#D1FAE5";
            borderColor = "#34D399";
          }

          return (
            <button
              key={qIndex}
              onClick={() => onQuestionClick(qIndex)}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "8px",
                border: `2px solid ${borderColor}`,
                backgroundColor: bgColor,
                color: textColor,
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {qIndex + 1}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#D1FAE5", 
            borderRadius: "4px",
            border: "1px solid #34D399"
          }}></div>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Đã làm</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#FEF3C7", 
            borderRadius: "4px",
            border: "1px solid #F59E0B"
          }}></div>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Xem lại</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{ 
            width: "16px", 
            height: "16px", 
            backgroundColor: "#FFFFFF", 
            borderRadius: "4px",
            border: "1px solid #D1D5DB"
          }}></div>
          <span style={{ fontSize: "12px", color: "#6B7280" }}>Chưa làm</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigator;
