
import React from 'react';
import QuestionContext from './QuestionContext';

const MultipleChoice = ({ question, assignment, currentQuestion, answer, onAnswerChange }) => {
  const debai = question.debai || {};
  const cauHoiGoc = debai.cauHoiGoc || question.question;
  const luaChon = debai.luaChon || (question.options ? question.options.map((opt, idx) => ({ id: String.fromCharCode(65 + idx), text: opt })) : []);
  const hinhAnhLink = debai.hinhAnh || assignment?.hinhAnhLink;
  // Bài đọc dùng chung cho cả nhóm câu hỏi (vd nhiều câu MCQ cùng 1 đoạn văn)
  // nằm ở assignment.noiDungNguCanhChung nếu câu này không có đoạn văn riêng.
  const doanVan = debai.doanVan || assignment?.noiDungNguCanhChung;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <span style={{
          backgroundColor: "#DBEAFE",
          color: "#1D4ED8",
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Trắc nghiệm
        </span>
        <span style={{
          backgroundColor: "#D1FAE5",
          color: "#047857",
          padding: "4px 12px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: 600
        }}>
          Tự động chấm
        </span>
      </div>

      <QuestionContext huongDan={debai.huongDan} doanVan={doanVan} />

      {hinhAnhLink && (
        <img
          src={hinhAnhLink}
          alt="Minh hoạ câu hỏi"
          style={{
            maxWidth: "100%",
            borderRadius: "12px",
            border: "1px solid #E5E7EB",
            marginBottom: "24px"
          }}
        />
      )}

      <h3 style={{
        fontSize: "16px",
        fontWeight: 600,
        color: "#2563EB",
        marginBottom: "12px"
      }}>
        Câu {currentQuestion + 1}
      </h3>

      <p style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "24px",
        lineHeight: "1.4"
      }}>
        <span dangerouslySetInnerHTML={{ __html: cauHoiGoc }} />
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {luaChon.map((option, idx) => {
          const isSelected = answer === option.id;
          return (
            <div
              key={`option-${currentQuestion}-${idx}`}
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
                <strong style={{ marginRight: '8px' }}>{option.id}.</strong>
                <span dangerouslySetInnerHTML={{ __html: option.text || option }} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MultipleChoice;
