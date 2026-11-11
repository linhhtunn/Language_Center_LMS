
import React from 'react';

const Trios = ({ question, currentQuestion, answer, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#E0F2FE",
          color: "#0369A1",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Trios
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Tìm một từ phù hợp với cả ba câu.
      </h3>

      <div style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid #E5E7EB"
      }}>
        {question.sentences?.map((sentence, idx) => (
          <p key={idx} style={{
            fontSize: "16px",
            color: "#111827",
            marginBottom: idx < question.sentences.length - 1 ? "8px" : "0",
            lineHeight: "1.6"
          }}>
            {idx + 1}. {sentence}
          </p>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#374151",
          margin: 0
        }}>
          Đáp án chung:
        </p>
        <input
          key={`trios-${currentQuestion}`}
          type="text"
          value={answer || ""}
          onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
          style={{
            flex: "1",
            maxWidth: "300px",
            padding: "10px 16px",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            fontSize: "14px"
          }}
        />
        {question.hint && (
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
            margin: 0,
            flex: 1
          }}>
            {question.hint}
          </p>
        )}
      </div>
    </div>
  );
};

export default Trios;
