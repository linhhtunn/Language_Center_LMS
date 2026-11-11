import React from 'react';
import QuestionContext from './QuestionContext';

/**
 * Nối ghép các phần tương ứng (CQ_NOI_GHEP).
 *
 * Khác với các dạng khác, MỘT câu hỏi chứa toàn bộ các cặp cần nối:
 *   debai.danhSachTrai - vế trái, mỗi phần tử { id, text }
 *   debai.danhSachPhai - vế phải, mỗi phần tử { id, text }
 * Đáp án gửi lên là object { idTrái: idPhải }, khớp với GradeMap ở backend
 * (chấm theo tỉ lệ số cặp đúng chứ không phải đúng/sai toàn bộ).
 */
const MatchingPairs = ({ question, currentQuestion, answer, onAnswerChange }) => {
  const debai = question.debai || {};
  const danhSachTrai = Array.isArray(debai.danhSachTrai) ? debai.danhSachTrai : [];
  const danhSachPhai = Array.isArray(debai.danhSachPhai) ? debai.danhSachPhai : [];

  // answer có thể là null khi học sinh chưa chọn gì.
  const daChon = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};

  const ghep = (idTrai, idPhai) => {
    const ketQua = { ...daChon };
    if (idPhai) {
      ketQua[idTrai] = idPhai;
    } else {
      delete ketQua[idTrai];
    }
    onAnswerChange(currentQuestion, Object.keys(ketQua).length ? ketQua : null);
  };

  const soCapDaGhep = danhSachTrai.filter((item) => daChon[item.id]).length;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <span style={badge('#E0F2FE', '#0369A1')}>Nối ghép</span>
        <span style={badge('#D1FAE5', '#047857')}>Tự động chấm</span>
      </div>

      <QuestionContext huongDan={debai.huongDan} doanVan={debai.doanVan} />

      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2563EB', marginBottom: '12px' }}>
        Câu {currentQuestion + 1}
      </h3>

      {debai.cauHoiGoc ? (
        <p
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#111827',
            marginBottom: '8px',
            lineHeight: 1.4,
          }}
        >
          {debai.cauHoiGoc}
        </p>
      ) : null}

      <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
        Đã ghép {soCapDaGhep}/{danhSachTrai.length} cặp. Mỗi cặp đúng được tính điểm riêng.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
        {danhSachTrai.map((trai) => {
          const giaTri = daChon[trai.id] || '';
          return (
            <div
              key={trai.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap',
                padding: '16px',
                border: giaTri ? '2px solid #2563EB' : '2px solid #E5E7EB',
                borderRadius: '12px',
                backgroundColor: giaTri ? '#EFF6FF' : '#FFFFFF',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#111827',
                  minWidth: '140px',
                  flex: '0 0 auto',
                }}
              >
                {trai.text}
              </span>
              <select
                value={giaTri}
                onChange={(e) => ghep(trai.id, e.target.value)}
                style={{
                  flex: '1 1 240px',
                  padding: '10px 14px',
                  border: '1px solid #D1D5DB',
                  borderRadius: '10px',
                  fontSize: '14px',
                  backgroundColor: '#FFFFFF',
                }}
              >
                <option value="">-- Chọn phương án --</option>
                {danhSachPhai.map((phai) => (
                  <option key={phai.id} value={phai.id}>
                    {phai.id.toUpperCase()}. {rutGon(phai.text)}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>

      <div
        style={{
          backgroundColor: '#F9FAFB',
          border: '1px solid #E5E7EB',
          borderRadius: '12px',
          padding: '20px 24px',
        }}
      >
        <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: '0 0 12px' }}>
          Các phương án
        </p>
        {danhSachPhai.map((phai) => (
          <p
            key={phai.id}
            style={{ fontSize: '14px', color: '#111827', margin: '0 0 10px', lineHeight: 1.6 }}
          >
            <strong style={{ marginRight: '8px' }}>{phai.id.toUpperCase()}.</strong>
            {phai.text}
          </p>
        ))}
      </div>
    </div>
  );
};

const rutGon = (text) => {
  const s = String(text || '');
  return s.length > 70 ? `${s.slice(0, 70)}…` : s;
};

const badge = (bg, fg) => ({
  backgroundColor: bg,
  color: fg,
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
});

export default MatchingPairs;
