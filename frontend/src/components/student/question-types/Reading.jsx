import React from 'react';

const Reading = ({ question, assignment, currentQuestion, answers, onAnswerChange }) => {
  const debai = question.debai || {};
  const cauHoiGoc = debai.cauHoiGoc || question.question;
  const luaChon = debai.luaChon || (question.options ? question.options.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })) : []);
  const passage = assignment?.noiDungNguCanhChung || question.passage || "Không có nội dung đoạn văn.";
  const answer = answers[currentQuestion];

  return (
    <div style={{ display: "flex", gap: "24px", padding: "24px" }}>
      {/* Cột trái - Đoạn văn */}
      <div style={{ flex: 1 }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <h3 style={{
            fontSize: "20px",
            fontWeight: 700,
            color: "#111827",
            marginBottom: "12px"
          }}>
            Bài đọc hiểu
          </h3>
          <p style={{
            fontSize: "14px",
            color: "#6B7280",
            lineHeight: "1.8",
            whiteSpace: "pre-line"
          }} dangerouslySetInnerHTML={{ __html: passage }}>
          </p>
        </div>
      </div>

      {/* Cột phải - Câu hỏi */}
      <div style={{ flex: 1 }}>
        <div style={{
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
        }}>
          <div style={{ marginBottom: "16px" }}>
            <span style={{
              backgroundColor: "#D1FAE5",
              color: "#047857",
              padding: "4px 12px",
              borderRadius: "6px",
              fontSize: "12px",
              fontWeight: 600
            }}>
              Đọc hiểu
            </span>
          </div>

          <div>
            <h4 style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "#111827",
              marginBottom: "16px"
            }}>
              Câu {currentQuestion + 1}. <span dangerouslySetInnerHTML={{ __html: cauHoiGoc }} />
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {luaChon.map((option, optIdx) => {
                const isSelected = answer === option.id;
                return (
                  <div
                    key={optIdx}
                    onClick={() => onAnswerChange(currentQuestion, option.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 14px",
                      border: isSelected ? "2px solid #2563EB" : "1px solid #E5E7EB",
                      borderRadius: "10px",
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
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? "#2563EB" : "#FFFFFF",
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
                      fontWeight: isSelected ? 600 : 400
                    }}>
                      <strong style={{ marginRight: '8px' }}>{option.id}.</strong>
                      <span dangerouslySetInnerHTML={{ __html: option.text || option }} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reading;

