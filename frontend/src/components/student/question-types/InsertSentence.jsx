
import React from 'react';

const InsertSentence = ({ question, currentQuestion, answer, onAnswerChange }) => {
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
          Chèn câu
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "8px"
      }}>
        Câu {currentQuestion + 1}. Chọn vị trí phù hợp để chèn câu vào đoạn văn.
      </h3>
      <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "24px" }}>
        Đọc câu cần chèn, sau đó chọn vị trí [A], [B], [C] hoặc [D] trong đoạn văn.
      </p>

      <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
        <div style={{ flex: 1.5 }}>
          <div style={{
            backgroundColor: "#F9FAFB",
            borderRadius: "12px",
            padding: "20px",
            marginBottom: "16px"
          }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>
              1. Câu cần chèn
            </p>
            <p style={{ fontSize: "14px", color: "#111827", lineHeight: "1.6" }}>
              {question.sentenceToInsert}
            </p>
          </div>

          <div style={{
            backgroundColor: "#FFFFFF",
            borderRadius: "12px",
            padding: "20px",
            border: "1px solid #E5E7EB"
          }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>
              2. Đoạn văn có các vị trí còn trống
            </p>
            {question.passageParts?.map((part, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "14px", color: "#111827", lineHeight: "1.6", margin: 0, flex: 1 }}>
                  {part.text}
                </p>
                {part.marker && (
                  <span style={{
                    backgroundColor: answer === part.marker ? "#EFF6FF" : "#FFFFFF",
                    border: `2px solid ${answer === part.marker ? "#2563EB" : "#D1D5DB"}`,
                    color: answer === part.marker ? "#2563EB" : "#6B7280",
                    padding: "4px 8px",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: 600
                  }}>
                    [{part.marker}]
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{
            backgroundColor: "#EFF6FF",
            borderRadius: "12px",
            padding: "16px"
          }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#1D4ED8", marginBottom: "8px" }}>
              Cách làm
            </p>
            <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: "1.6" }}>
              Bấm trực tiếp vào vị trí trong đoạn văn hoặc chọn đáp án A/B/C/D bên dưới.
            </p>
          </div>

          <div style={{ marginTop: "24px" }}>
            <p style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "12px" }}>
              3. Chọn đáp án
            </p>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {["A", "B", "C", "D"].map((option) => (
                <div
                  key={option}
                  onClick={() => onAnswerChange(currentQuestion, option)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "10px 20px",
                    border: answer === option ? "2px solid #2563EB" : "2px solid #E5E7EB",
                    borderRadius: "10px",
                    backgroundColor: answer === option ? "#EFF6FF" : "#FFFFFF",
                    cursor: "pointer"
                  }}
                >
                  <div style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `2px solid ${answer === option ? "#2563EB" : "#D1D5DB"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: answer === option ? "#2563EB" : "#FFFFFF"
                  }}>
                    {answer === option && (
                      <div style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        backgroundColor: "#FFFFFF"
                      }}></div>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", fontWeight: 500, color: "#111827" }}>
                    {option}. Chèn vào vị trí [{option}]
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsertSentence;
