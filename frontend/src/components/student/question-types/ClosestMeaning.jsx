
import React from 'react';

const ClosestMeaning = ({ question, currentQuestion, answer, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#DBEAFE",
          color: "#1D4ED8",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Nghĩa gần nhất
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Chọn câu có nghĩa gần nhất với câu đã cho.
      </h3>

      <div style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid #E5E7EB"
      }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
          Câu gốc
        </p>
        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
          {question.originalSentence}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {question.options.map((option, idx) => {
          const isSelected = answer === idx;
          return (
            <div
              key={idx}
              onClick={() => onAnswerChange(currentQuestion, idx)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                border: `2px solid ${isSelected ? "#2563EB" : "#E5E7EB"}`,
                borderRadius: "12px",
                backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <div style={{
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                border: `2px solid ${isSelected ? "#2563EB" : "#D1D5DB"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: isSelected ? "#2563EB" : "transparent",
                marginTop: "2px"
              }}>
                {isSelected && (
                  <div style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#FFFFFF"
                  }}></div>
                )}
              </div>
              <span style={{ fontSize: "14px", color: "#111827", lineHeight: "1.6" }}>
                {String.fromCharCode(65 + idx)}. {option}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClosestMeaning;
