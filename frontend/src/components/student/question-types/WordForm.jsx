
import React from 'react';

const WordForm = ({ question, currentQuestion, answer, onAnswerChange }) => {
  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#EDE9FE",
          color: "#5B21B6",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Word form
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Cho dạng đúng của từ trong ngoặc.
      </h3>

      <p style={{
        fontSize: "20px",
        color: "#111827",
        lineHeight: "1.6",
        marginBottom: "24px"
      }}>
        {question.question.split("______").map((part, idx, arr) => (
          <React.Fragment key={idx}>
            {part}
            {idx < arr.length - 1 && (
              <input
                type="text"
                value={answer || ""}
                onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
                style={{
                  width: "180px",
                  padding: "8px 16px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "16px",
                  margin: "0 8px",
                  backgroundColor: "#F9FAFB"
                }}
              />
            )}
          </React.Fragment>
        ))}
      </p>

      <div style={{ marginBottom: "24px" }}>
        <span style={{
          backgroundColor: "#EDE9FE",
          color: "#5B21B6",
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "14px",
          fontWeight: 600
        }}>
          {question.word}
        </span>
      </div>

      <p style={{
        fontSize: "14px",
        color: "#6B7280",
        lineHeight: "1.6"
      }}>
        Thao tác: học viên nhìn từ gốc được nổi bật, sau đó nhập dạng đúng vào trả lời. Hệ thống lưu sau khi nhập.
      </p>
    </div>
  );
};

export default WordForm;
