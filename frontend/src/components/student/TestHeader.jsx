
import React from 'react';

const TestHeader = ({ title, timeLeft, onSubmitClick }) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div style={{ 
      backgroundColor: "#FFFFFF", 
      padding: "16px 24px", 
      borderBottom: "1px solid #E5E7EB", 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center" 
    }}>
      <div>
        <h2 style={{ 
          fontSize: "18px", 
          fontWeight: 700, 
          color: "#111827", 
          margin: 0, 
          marginBottom: "4px" 
        }}>
          {title}
        </h2>
        <p style={{ 
          fontSize: "12px", 
          color: "#6B7280", 
          margin: 0 
        }}>
          Đã lưu tự động lúc {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
      <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px", 
          backgroundColor: "#FFF0F0", 
          padding: "8px 16px", 
          borderRadius: "8px" 
        }}>
          <i className="bi bi-stopwatch" style={{ color: "#DC2626" }}></i>
          <span style={{ 
            fontSize: "14px", 
            fontWeight: 600, 
            color: "#DC2626" 
          }}>
            {formatTime(timeLeft)}
          </span>
        </div>
        <button 
          onClick={onSubmitClick}
          style={{
            backgroundColor: "#2563EB",
            color: "white",
            border: "none",
            padding: "10px 32px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          Nộp bài
        </button>
      </div>
    </div>
  );
};

export default TestHeader;
