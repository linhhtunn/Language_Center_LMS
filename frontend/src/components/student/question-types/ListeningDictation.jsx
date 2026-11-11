
import React from 'react';
import QuestionContext from './QuestionContext';

/**
 * Nghe audio rồi điền từ còn thiếu vào đoạn văn (CQ_HOAN_THIEN_CAU).
 *
 * Audio dùng chung cho cả bài (assignment.amThanhLink) hoặc riêng cho câu này
 * (debai.amThanh) nếu có. Nội dung câu hỏi đọc từ debai.* như mọi component
 * khác — trước đây component này đọc các field phẳng (trackName, passage...)
 * mà không có luồng nhập liệu nào ghi ra, nên với dữ liệu thật sẽ luôn rỗng.
 */
const ListeningDictation = ({ question, assignment, currentQuestion, answers, onAnswerChange }) => {
  const debai = question.debai || {};
  const audioUrl = debai.amThanh || assignment?.amThanhLink;
  const doanVan = debai.doanVan || debai.cauHoiGoc || '';
  const quyDinh = Array.isArray(debai.quyDinh) ? debai.quyDinh : null;

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
          Listening điền khuyết
        </span>
      </div>

      <QuestionContext huongDan={debai.huongDan} />

      <h3 style={{
        fontSize: "20px",
        fontWeight: 700,
        color: "#111827",
        marginBottom: "8px"
      }}>
        Nghe audio và điền từ còn thiếu vào đoạn văn.
      </h3>
      <p style={{
        fontSize: "14px",
        color: "#6B7280",
        marginBottom: "24px"
      }}>
        Nghe đoạn thoại, sau đó điền đúng từ/cụm từ còn thiếu vào các ô trống trong đoạn văn.
      </p>

      <div style={{ display: "flex", gap: "24px", marginBottom: "24px" }}>
        <div style={{
          flex: 1,
          backgroundColor: "#F9FAFB",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #E5E7EB"
        }}>
          {audioUrl ? (
            <audio
              controls
              src={audioUrl}
              style={{ width: "100%" }}
            >
              Trình duyệt của bạn không hỗ trợ phát audio.
            </audio>
          ) : (
            <p style={{ fontSize: "14px", color: "#DC2626", margin: 0 }}>
              Câu này chưa có file audio. Báo lại giáo viên để bổ sung.
            </p>
          )}
        </div>
        {quyDinh && (
          <div style={{
            backgroundColor: "#FEF3C7",
            borderRadius: "12px",
            padding: "16px",
            width: "250px",
            flexShrink: 0
          }}>
            <p style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#92400E",
              marginBottom: "8px"
            }}>
              Quy định
            </p>
            <ul style={{
              fontSize: "14px",
              color: "#6B7280",
              paddingLeft: "16px",
              margin: 0
            }}>
              {quyDinh.map((rule, idx) => (
                <li key={idx} style={{ marginBottom: "4px" }}>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{
        backgroundColor: "#F9FAFB",
        borderRadius: "12px",
        padding: "24px",
        border: "1px solid #E5E7EB"
      }}>
        <p style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "12px"
        }}>
          Đoạn văn cần hoàn thành
        </p>
        <p style={{
          fontSize: "16px",
          color: "#111827",
          lineHeight: "2"
        }}>
          {doanVan.split("______").map((part, idx, arr) => (
            <React.Fragment key={idx}>
              {part}
              {idx < arr.length - 1 && (
                <input
                  key={`dictation-${currentQuestion}-${idx}`}
                  type="text"
                  value={answers[`${currentQuestion}-${idx}`] || ""}
                  onChange={(e) => onAnswerChange(`${currentQuestion}-${idx}`, e.target.value)}
                  style={{
                    width: "120px",
                    padding: "6px 12px",
                    border: "1px solid #D1D5DB",
                    borderRadius: "8px",
                    fontSize: "14px",
                    margin: "0 6px"
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </p>
      </div>
    </div>
  );
};

export default ListeningDictation;
