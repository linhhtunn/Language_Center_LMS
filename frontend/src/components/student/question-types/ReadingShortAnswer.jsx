
import React from 'react';

const ReadingShortAnswer = ({ question, currentQuestion, answer, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#D1FAE5",
          color: "#047857",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Trả lời ngắn
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Trả lời ngắn theo thông tin trong bài đọc.
      </h3>

      <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: "#F9FAFB",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #E5E7EB"
          }}>
            <p style={{ fontSize: "15px", color: "#111827", lineHeight: "1.8", margin: 0 }}>
              {question.passage}
            </p>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #E5E7EB"
          }}>
            <p style={{ fontSize: "16px", fontWeight: 600, color: "#111827", marginBottom: "16px", lineHeight: "1.6" }}>
              {question.question}
            </p>
            <input
              type="text"
              placeholder="Nhập câu trả lời của bạn..."
              value={answer || ''}
              onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "1px solid #D1D5DB",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "12px"
              }}
            />
            {question.limit && (
              <p style={{
                fontSize: "13px",
                color: "#F59E0B",
                margin: 0,
                fontWeight: 600,
                backgroundColor: "#FFFBEB",
                padding: "4px 8px",
                borderRadius: "4px",
                display: "inline-block"
              }}>
                {question.limit}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReadingShortAnswer;
