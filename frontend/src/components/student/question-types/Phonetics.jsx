
import React from 'react';

const Phonetics = ({ question, currentQuestion, answer, onAnswerChange }) => {
  const isStressType = question.phoneticType === 'stress';
  
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <span style={{
          backgroundColor: isStressType ? "#EDE9FE" : "#FEF3C7",
          color: isStressType ? "#5B21B6" : "#92400E",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          {isStressType ? "Trọng âm" : "Phát âm"}
        </span>
        <span style={{
          backgroundColor: "#DBEAFE",
          color: "#1D4ED8",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Trắc nghiệm A/B/C/D
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "8px"
      }}>
        Câu {currentQuestion + 1}. {question.title}
      </h3>
      <p style={{
        fontSize: "14px",
        color: "#6B7280",
        marginBottom: "24px"
      }}>
        {question.instruction}
      </p>

      <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
        <div style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #E5E7EB"
        }}>
          <p style={{
            fontSize: "14px",
            fontWeight: 600,
            color: "#374151",
            marginBottom: "8px"
          }}>
            {isStressType ? "Các từ cần xét trọng âm" : "Phần cần so sánh"}
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {question.words?.map((word, idx) => (
              <span key={idx} style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "#111827"
              }}>
                {word}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
            lineHeight: "1.6"
          }}>
            {question.hint}
          </p>
        </div>
      </div>

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

export default Phonetics;
