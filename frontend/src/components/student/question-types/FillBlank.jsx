
import React from 'react';

const FillBlank = ({ question, currentQuestion, answer, onAnswerChange }) => {
  const debai = question.debai || {};
  const danhSach = debai.danhSach || [];
  let questionText = question.question;
  if (debai.doanVanTruoc !== undefined || debai.doanVanSau !== undefined) {
    questionText = `${debai.doanVanTruoc || ""} ______ ${debai.doanVanSau || ""}`;
  }
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
          Điền khuyết
        </span>
      </div>

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px"
      }}>
        Câu {currentQuestion + 1}. Điền một từ thích hợp vào chỗ trống.
      </h3>

      <p style={{
        fontSize: "20px",
        color: "#111827",
        lineHeight: "1.6",
        marginBottom: "24px"
      }}>
        {questionText && questionText.split("______").map((part, idx, arr) => (
          <React.Fragment key={idx}>
            <span dangerouslySetInnerHTML={{ __html: part }} />
            {idx < arr.length - 1 && (
              danhSach.length === 0 ? (
                <input
                  type="text"
                  value={answer || ""}
                  onChange={(e) => onAnswerChange(currentQuestion, e.target.value)}
                  style={{
                    width: "120px",
                    padding: "6px 12px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "16px",
                    margin: "0 8px",
                    backgroundColor: "#F9FAFB"
                  }}
                />
              ) : (
                <span style={{ 
                  display: "inline-block", 
                  minWidth: "60px", 
                  borderBottom: "2px solid #D1D5DB", 
                  margin: "0 8px", 
                  textAlign: "center",
                  color: "#2563EB",
                  fontWeight: 600,
                  textTransform: "uppercase"
                }}>
                  {answer ? danhSach.find(item => item.id === answer)?.id || "..." : "..."}
                </span>
              )
            )}
          </React.Fragment>
        ))}
      </p>

      {danhSach.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
          {danhSach.map((option, idx) => {
            const isSelected = answer === option.id;
            return (
              <div
                key={`opt-${idx}`}
                onClick={() => onAnswerChange(currentQuestion, option.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "12px 16px",
                  border: isSelected ? "2px solid #2563EB" : "2px solid #E5E7EB",
                  borderRadius: "12px",
                  backgroundColor: isSelected ? "#EFF6FF" : "#FFFFFF",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  border: `2px solid ${isSelected ? "#2563EB" : "#D1D5DB"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isSelected ? "#2563EB" : "#FFFFFF"
                }}>
                  {isSelected && (
                    <div style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      backgroundColor: "#FFFFFF"
                    }}></div>
                  )}
                </div>
                <span style={{
                  fontSize: "16px",
                  color: "#111827",
                  fontWeight: isSelected ? 600 : 400
                }}>
                  <strong style={{ marginRight: '8px', textTransform: 'uppercase' }}>{option.id}.</strong>
                  <span dangerouslySetInnerHTML={{ __html: option.text }} />
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginBottom: "24px" }}>
        {danhSach.length === 0 ? (
          <span style={{
            backgroundColor: "#FEE2E2",
            color: "#991B1B",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600
          }}>
            Giới hạn: 1 từ
          </span>
        ) : (
          <span style={{
            backgroundColor: "#E0E7FF",
            color: "#3730A3",
            padding: "4px 12px",
            borderRadius: "6px",
            fontSize: "12px",
            fontWeight: 600
          }}>
            Chọn 1 đáp án
          </span>
        )}
      </div>

      <p style={{
        fontSize: "14px",
        color: "#6B7280",
        lineHeight: "1.6"
      }}>
        {danhSach.length === 0 
          ? "Thao tác: học viên click vào ô trống và nhập đáp án. Nếu nhập quá số từ quy định, hệ thống hiện thị cảnh báo nhưng không xóa nội dung."
          : "Thao tác: Chọn một trong các đáp án bên trên để điền vào chỗ trống."
        }
      </p>
    </div>
  );
};

export default FillBlank;
