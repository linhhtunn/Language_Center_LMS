
import React from 'react';

const IdiomExplanation = ({ question, currentQuestion, answer, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#FEF3C7",
          color: "#92400E",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Idiom
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Giải thích nghĩa của thành ngữ/cụm từ.
      </h3>

      <div style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "20px",
        marginBottom: "24px",
        border: "1px solid #E5E7EB"
      }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
          Idiom
        </p>
        <p style={{ fontSize: "18px", fontWeight: 600, color: "#2563EB", margin: 0 }}>
          {question.idiom}
        </p>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>
          Câu trả lời:
        </p>
        <textarea
          placeholder="Nhập nghĩa hoặc giải thích ngắn..."
          value={answer || ''}
          onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "14px 18px",
            border: "1px solid #D1D5DB",
            borderRadius: "8px",
            fontSize: "14px",
            lineHeight: "1.6",
            resize: "vertical"
          }}
        ></textarea>
      </div>

      <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: "1.6", margin: 0 }}>
        Có thể yêu cầu trả lời bằng tiếng Việt hoặc tiếng Anh tùy cài đặt của giáo viên. Dạng này thường cần giáo viên chấm.
      </p>
    </div>
  );
};

export default IdiomExplanation;
