
import React from 'react';

const OpenCloze = ({ question, currentQuestion, currentSubIndex, answers, onAnswerChange }) => {
  const textParts = question.passage.split(/(\(\d+\))/);

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#FFF7ED",
          color: "#C2410C",
          padding: "6px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Open cloze
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Đọc đoạn văn và điền một từ thích hợp vào mỗi chỗ trống.
      </h3>

      <div style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "24px",
        marginBottom: "24px",
        border: "1px solid #E5E7EB"
      }}>
        <p style={{ fontSize: "16px", color: "#111827", lineHeight: "1.8", margin: 0 }}>
          {textParts.map((part, idx) => {
            if (part.match(/\(\d+\)/)) {
              const num = part.replace(/[()]/g, '');
              const answerKey = `cloze-${currentQuestion}-${num}`;
              return (
                <input
                  key={idx}
                  type="text"
                  placeholder={`(${num})`}
                  value={answers[answerKey] || ''}
                  onChange={(e) => onAnswerChange(answerKey, e.target.value)}
                  style={{
                    width: "80px",
                    padding: "4px 8px",
                    margin: "0 4px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "6px",
                    textAlign: "center",
                    fontSize: "14px"
                  }}
                />
              );
            }
            return part;
          })}
        </p>
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        padding: "16px",
        backgroundColor: "#FFFFFF",
        border: "1px solid #E5E7EB",
        borderRadius: "12px"
      }}>
        {question.blanks?.map((blank) => {
          const answerKey = `cloze-${currentQuestion}-${blank.num}`;
          return (
            <div key={blank.num} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#111827" }}>
                Câu {blank.num}:
              </span>
              <input
                type="text"
                value={answers[answerKey] || ''}
                onChange={(e) => onAnswerChange(answerKey, e.target.value)}
                style={{
                  padding: "6px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "8px",
                  fontSize: "14px",
                  minWidth: "120px"
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OpenCloze;
