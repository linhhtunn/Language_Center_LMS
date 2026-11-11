import React, { useMemo } from 'react';
import QuestionContext from './QuestionContext';

/**
 * Điền từ vào chỗ trống từ danh sách cho sẵn (CQ_DIEN_TU_DANH_SACH).
 *
 * Backend tách MỖI CHỖ TRỐNG thành một câu hỏi riêng, nên component này chỉ
 * chịu trách nhiệm điền đúng một chỗ trống:
 *   debai.doanVan     - bài đọc chứa tất cả chỗ trống "(n) __________"
 *   debai.soChoTrong  - chỗ trống thuộc về câu hiện tại
 *   debai.danhSachTu  - word bank dùng chung của bài gốc
 * Đáp án gửi lên là chính từ được chọn (chuỗi), khớp với GradeScalar.
 *
 * Đề bài ghi "Each item is used only once", mà các chỗ trống lại nằm ở những
 * câu hỏi khác nhau, nên phải nhìn sang đáp án của cả nhóm: từ nào đã dùng ở
 * chỗ trống khác thì rút khỏi danh sách và hiện thẳng vào bài đọc.
 */
const WordBank = ({ question, assignment, currentQuestion, answer, answers, onAnswerChange }) => {
  const debai = question.debai || {};
  const doanVan = debai.doanVan || '';
  const danhSachTu = Array.isArray(debai.danhSachTu) ? debai.danhSachTu : [];
  const soChoTrong = Number(debai.soChoTrong);
  const hinhAnhLink = debai.hinhAnh || assignment?.hinhAnhLink;

  /**
   * Các câu liên tiếp dùng chung bài đọc này chính là các chỗ trống anh em.
   * Chỉ số câu trên màn hình trùng với chỉ số trong assignment.cauHoi.
   */
  const nhomChoTrong = useMemo(() => {
    const cauHoi = assignment?.cauHoi || [];
    if (!doanVan || !cauHoi.length) {
      return [];
    }

    const cungBaiDoc = (i) => cauHoi[i]?.noiDung?.debai?.doanVan === doanVan;
    const soCua = (i) => Number(cauHoi[i]?.noiDung?.debai?.soChoTrong);

    // Một đề có thể lấy cùng một bài gốc hai lần, khi đó hai nhóm chỗ trống
    // nằm liền nhau và dùng chung bài đọc. Số chỗ trống lặp lại là dấu hiệu
    // sang nhóm mới, nếu không sẽ gộp nhầm 12 chỗ trống thành một.
    const daGap = new Set([soChoTrong]);

    let dau = currentQuestion;
    while (dau - 1 >= 0 && cungBaiDoc(dau - 1) && !daGap.has(soCua(dau - 1))) {
      daGap.add(soCua(dau - 1));
      dau -= 1;
    }

    let cuoi = currentQuestion;
    while (cuoi + 1 < cauHoi.length && cungBaiDoc(cuoi + 1) && !daGap.has(soCua(cuoi + 1))) {
      daGap.add(soCua(cuoi + 1));
      cuoi += 1;
    }

    const ds = [];
    for (let i = dau; i <= cuoi; i += 1) {
      ds.push({
        chiSo: i,
        so: Number(cauHoi[i]?.noiDung?.debai?.soChoTrong),
        tu: answers?.[i] ?? null,
      });
    }
    return ds;
  }, [assignment, doanVan, currentQuestion, answers]);

  /** Từ đã điền ở từng chỗ trống, tra theo số thứ tự chỗ trống. */
  const tuTheoChoTrong = useMemo(() => {
    const map = new Map();
    nhomChoTrong.forEach((item) => {
      if (item.tu) map.set(item.so, item.tu);
    });
    // Chỗ trống hiện tại luôn lấy theo `answer` để không trễ một nhịp render.
    if (answer) map.set(soChoTrong, answer);
    else map.delete(soChoTrong);
    return map;
  }, [nhomChoTrong, answer, soChoTrong]);

  /** Từ còn được phép chọn: bỏ những từ đã dùng ở chỗ trống khác. */
  const tuConLai = useMemo(() => {
    const daDung = new Set();
    tuTheoChoTrong.forEach((tu, so) => {
      if (so !== soChoTrong) daDung.add(tu);
    });
    return danhSachTu.filter((tu) => !daDung.has(tu));
  }, [danhSachTu, tuTheoChoTrong, soChoTrong]);

  const chon = (tu) => {
    onAnswerChange(currentQuestion, answer === tu ? null : tu);
  };

  // Giữ lại dấu phân tách khi tách chuỗi để dựng lại bài đọc kèm ô trống.
  const doanVanParts = doanVan ? doanVan.split(/(\(\d+\)\s*_{3,})/g) : [];
  const soDaDien = tuTheoChoTrong.size;
  const tongChoTrong = nhomChoTrong.length || 1;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <span style={badge('#D1FAE5', '#047857')}>Điền từ trong danh sách</span>
        <span style={badge('#D1FAE5', '#047857')}>Tự động chấm</span>
      </div>

      <QuestionContext huongDan={debai.huongDan} />

      {hinhAnhLink && (
        <img
          src={hinhAnhLink}
          alt="Minh hoạ câu hỏi"
          style={{
            maxWidth: '100%',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            marginBottom: '20px'
          }}
        />
      )}

      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#2563EB', marginBottom: '12px' }}>
        Câu {currentQuestion + 1}
        {soChoTrong ? ` — chỗ trống (${soChoTrong})` : ''}
      </h3>

      {doanVan ? (
        <div
          style={{
            backgroundColor: '#F9FAFB',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '24px',
            maxHeight: '340px',
            overflowY: 'auto',
            fontSize: '15px',
            color: '#111827',
            lineHeight: 2,
            whiteSpace: 'pre-wrap',
          }}
        >
          {doanVanParts.map((part, idx) => {
            const match = /^\((\d+)\)\s*_{3,}$/.exec(part);
            if (!match) {
              return <React.Fragment key={idx}>{part}</React.Fragment>;
            }

            const so = Number(match[1]);
            const laChoDangLam = so === soChoTrong;
            const daDien = tuTheoChoTrong.get(so);

            return (
              <span
                key={idx}
                style={{
                  display: 'inline-block',
                  minWidth: '120px',
                  textAlign: 'center',
                  padding: '2px 10px',
                  margin: '0 4px',
                  borderRadius: '8px',
                  border: laChoDangLam
                    ? '2px solid #2563EB'
                    : daDien
                      ? '1px solid #A7F3D0'
                      : '1px dashed #D1D5DB',
                  backgroundColor: laChoDangLam ? '#EFF6FF' : daDien ? '#ECFDF5' : '#FFFFFF',
                  color: daDien ? (laChoDangLam ? '#1D4ED8' : '#047857') : '#9CA3AF',
                  fontWeight: daDien ? 700 : 400,
                }}
              >
                ({so}) {daDien || '______'}
              </span>
            );
          })}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#374151', margin: 0 }}>
          Chọn một từ để điền vào chỗ trống ({soChoTrong})
        </p>
        <span style={{ fontSize: '13px', color: '#6B7280' }}>
          Đã điền {soDaDien}/{tongChoTrong} · mỗi từ chỉ dùng một lần
        </span>
      </div>

      {!danhSachTu.length ? (
        <p style={{ fontSize: '14px', color: '#DC2626', margin: 0 }}>
          Câu này chưa có danh sách từ cho sẵn. Báo lại giáo viên để bổ sung.
        </p>
      ) : tuConLai.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {tuConLai.map((tu, idx) => {
            const daChon = answer === tu;
            return (
              <button
                key={`${tu}-${idx}`}
                type="button"
                onClick={() => chon(tu)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: daChon ? '2px solid #2563EB' : '2px solid #E5E7EB',
                  backgroundColor: daChon ? '#EFF6FF' : '#FFFFFF',
                  color: daChon ? '#1D4ED8' : '#111827',
                  fontSize: '15px',
                  fontWeight: daChon ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {tu}
              </button>
            );
          })}
        </div>
      ) : (
        <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
          Các từ đã được dùng hết cho những chỗ trống khác. Quay lại chỗ trống nào đó và
          bấm “Bỏ chọn” để lấy lại từ.
        </p>
      )}

      {answer ? (
        <button
          type="button"
          onClick={() => onAnswerChange(currentQuestion, null)}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #D1D5DB',
            backgroundColor: '#FFFFFF',
            color: '#6B7280',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Bỏ chọn
        </button>
      ) : null}
    </div>
  );
};

const badge = (bg, fg) => ({
  backgroundColor: bg,
  color: fg,
  padding: '4px 12px',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: 600,
});

export default WordBank;
