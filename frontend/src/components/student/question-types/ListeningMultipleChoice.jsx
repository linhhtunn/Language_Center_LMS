
import React from 'react';

// Nghe trắc nghiệm
const ListeningMultipleChoice = ({ question, currentQuestion, answer, onAnswerChange }) => {
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
          Listening
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Nghe đoạn hội thoại và chọn đáp án đúng.
      </h3>

      <div style={{
        display: "flex",
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid #E5E7EB"
      }}>
        <div style={{
          width: "64px",
          height: "64px",
          backgroundColor: "#2563EB",
          borderRadius: "50%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginRight: "16px",
          flexShrink: 0
        }}>
          <i className="bi bi-play-fill" style={{ fontSize: "32px", color: "white" }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#111827",
            marginBottom: "8px"
          }}>
            {question.trackName}
          </p>
          <p style={{
            fontSize: "14px",
            color: "#6B7280"
          }}>
            {question.instruction}
          </p>
        </div>
      </div>

      <h4 style={{
        fontSize: "18px",
        fontWeight: 600,
        color: "#111827",
        marginBottom: "16px"
      }}>
        {question.questionText}
      </h4>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {question.options?.map((option, idx) => {
          const isSelected = answer === idx;
          return (
            <div
              key={idx}
              onClick={() => onAnswerChange(currentQuestion, idx)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "12px 16px",
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
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: isSelected ? "#2563EB" : "transparent",
                marginTop: "2px",
                flexShrink: 0
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
              <span style={{
                fontSize: "14px",
                color: "#111827",
                lineHeight: "1.6"
              }}>
                {String.fromCharCode(65 + idx)}. {option}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ListeningMultipleChoice;
