
import React from 'react';

const SentenceRewrite = ({ question, currentQuestion, answer, onAnswerChange }) => {
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
          Viết lại câu
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Viết lại câu sao cho nghĩa không đổi.
      </h3>

      <div style={{ marginBottom: "20px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
          Câu gốc:
        </p>
        <p style={{ fontSize: "16px", color: "#111827", margin: 0 }}>
          {question.originalSentence}
        </p>
      </div>

      {question.requiredWord && (
        <div style={{ marginBottom: "20px" }}>
          <span style={{
            backgroundColor: "#EDE9FE",
            color: "#5B21B6",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600
          }}>
            Từ bắt buộc: {question.requiredWord}
          </span>
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        <textarea
          placeholder={question.placeholder || "Nhập câu trả lời của bạn..."}
          value={answer || ""}
          onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
          style={{
            width: "100%",
            minHeight: "100px",
            padding: "14px 18px",
            border: "1px solid #D1D5DB",
            borderRadius: "10px",
            fontSize: "14px",
            lineHeight: "1.6",
            resize: "vertical"
          }}
        ></textarea>
      </div>

      <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: "1.6" }}>
        Thao tác: học viên nhập câu trả lời vào ô lớn. Nếu có từ bắt buộc mà học viên chưa dùng, hệ thống hiện thị cảnh báo.
      </p>
    </div>
  );
};

export default SentenceRewrite;
