import React from 'react';

/**
 * Hướng dẫn làm bài + bài đọc đi kèm câu hỏi.
 *
 * Khi sinh đề, mỗi câu được chụp kèm `debai.huongDan` và `debai.doanVan` của
 * bài gốc, vì một đề có thể ghép nhiều bài gốc mà cột NoiDungNguCanhChung của
 * đề chỉ chứa được một bài đọc. Trước đây không renderer nào đọc hai trường
 * này nên học sinh nhìn thấy câu hỏi mà không có ngữ cảnh để trả lời.
 */
const QuestionContext = ({ huongDan, doanVan }) => {
  if (!huongDan && !doanVan) {
    return null;
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {huongDan ? (
        <div
          style={{
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: '12px',
            padding: '14px 18px',
            marginBottom: doanVan ? '16px' : 0,
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', margin: '0 0 6px' }}>
            Hướng dẫn
          </p>
          <p style={{ fontSize: '14px', color: '#78350F', margin: 0, lineHeight: 1.6 }}>
            {huongDan}
          </p>
        </div>
      ) : null}

      {doanVan ? (
        <div
          style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px 24px',
            maxHeight: '340px',
            overflowY: 'auto',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>
            Bài đọc
          </p>
          <div
            style={{
              fontSize: '15px',
              color: '#111827',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
            }}
          >
            {doanVan}
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default QuestionContext;
