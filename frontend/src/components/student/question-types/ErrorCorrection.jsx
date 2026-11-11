
import React, { useState } from 'react';

const ErrorCorrection = ({ question, currentQuestion, answers, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#FEE2E2",
          color: "#991B1B",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Sửa lỗi
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Tìm lỗi sai và sửa lại cho đúng.
      </h3>

      <p style={{
        fontSize: "16px",
        color: "#111827",
        lineHeight: "1.8",
        marginBottom: "24px"
      }}>
        {question.passage}
      </p>

      <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "20px" }}>
        Nhập lỗi sai và phần sửa đúng:
      </p>

      <div style={{ display: "flex", gap: "32px", alignItems: "flex-start" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
          {question.errors?.map((error, idx) => {
            const errorKey = `error-${currentQuestion}-${idx}`;
            const correctionKey = `correction-${currentQuestion}-${idx}`;
            return (
              <div key={idx} style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                <span style={{
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "#374151",
                  width: "60px"
                }}>
                  Lỗi {idx + 1}
                </span>
                <input
                  type="text"
                  placeholder="Từ/cụm sai"
                  value={answers[errorKey] || ""}
                  onChange={(e) => onAnswerChange(errorKey, e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "10px",
                    fontSize: "14px"
                  }}
                />
                <span style={{ fontSize: "18px", color: "#6B7280" }}>→</span>
                <input
                  type="text"
                  placeholder="Sửa thành"
                  value={answers[correctionKey] || ""}
                  onChange={(e) => onAnswerChange(correctionKey, e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "10px",
                    fontSize: "14px"
                  }}
                />
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
            lineHeight: "1.6"
          }}>
            Bàn đầu tiên dùng bảng nhập như trên. Sau này có thể nâng cấp cho học viên bôi chọn lỗi trực tiếp trong đoạn văn.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ErrorCorrection;
