
import React, { useState, useEffect } from 'react';

const EssayWriting = ({ question, currentQuestion, answer, onAnswerChange }) => {
  const [wordCount, setWordCount] = useState(0);

  useEffect(() => {
    if (answer) {
      const count = answer.trim().split(/\s+/).filter(word => word.length > 0).length;
      setWordCount(count);
    } else {
      setWordCount(0);
    }
  }, [answer]);

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
          Tự luận
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "16px"
      }}>
        Câu {currentQuestion + 1}. Viết câu trả lời tự luận.
      </h3>

      <p style={{
        fontSize: "15px",
        color: "#111827",
        lineHeight: "1.6",
        marginBottom: "24px"
      }}>
        {question.prompt}
      </p>

      <div style={{ marginBottom: "24px" }}>
        <textarea
          placeholder="Nhập bài viết tại đây..."
          value={answer || ""}
          onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
          style={{
            width: "100%",
            minHeight: "200px",
            padding: "16px 20px",
            border: "1px solid #D1D5DB",
            borderRadius: "10px",
            fontSize: "14px",
            lineHeight: "1.8",
            resize: "vertical"
          }}
        ></textarea>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#059669" }}>
          Số từ: {wordCount}
        </span>
        <span style={{ fontSize: "14px", color: "#059669" }}>•</span>
        <span style={{ fontSize: "14px", color: "#059669" }}>Đã lưu tự động</span>
      </div>

      <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: "1.6" }}>
        Màn này chỉ dành cho Tự luận dài. Cần có đếm số từ, tự lưu nhập và trạng thái chờ giáo viên chấm sau khi nộp.
      </p>
    </div>
  );
};

export default EssayWriting;
