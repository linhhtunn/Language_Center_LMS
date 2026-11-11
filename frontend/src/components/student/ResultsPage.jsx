import React, { useEffect, useRef, useState } from 'react';
import { getStudentAssignmentAiFeedback } from '../../api/studentAssignmentService';

/**
 * Kết quả sau khi nộp bài.
 *
 * Toàn bộ số liệu ở đây do backend chấm và trả về (endpoint
 * StudentAssignment/{id}/submit). Trước đây màn này là mockup tĩnh với
 * 78/100 điểm, 62 câu đúng, 18 câu sai — gán cứng, bài nào cũng như nhau.
 */
const KET_QUA_META = {
  CORRECT: { label: 'Đúng', bg: '#D1FAE5', fg: '#065F46' },
  PARTIAL: { label: 'Đúng một phần', bg: '#FEF3C7', fg: '#92400E' },
  WRONG: { label: 'Sai', bg: '#FFE4E6', fg: '#DC2626' },
  BLANK: { label: 'Chưa làm', bg: '#F3F4F6', fg: '#4B5563' },
  PENDING: { label: 'Chờ chấm', bg: '#EDE9FE', fg: '#5B21B6' },
};

/**
 * Đáp án có thể là chuỗi (trắc nghiệm, điền từ), mảng (sắp xếp câu) hoặc
 * object (nối ghép), tuỳ dạng câu hỏi — xem AutoGrader ở backend.
 */
const moTaDapAn = (giaTri) => {
  if (giaTri === null || giaTri === undefined || giaTri === '') return null;
  if (Array.isArray(giaTri)) {
    return giaTri.map((x) => String(x).toUpperCase()).join(' → ');
  }
  if (typeof giaTri === 'object') {
    return Object.entries(giaTri)
      .map(([trai, phai]) => `${trai} → ${String(phai).toUpperCase()}`)
      .join(' · ');
  }
  return String(giaTri);
};

const formatTime = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
};

// AI chạy nền, chữa chi tiết từng câu nên đề dài có thể mất vài phút; nhóm nào
// xong sẽ hiện trước. Poll nhẹ (4s/lần) tới khi xong hoặc hết 10 phút thì
// dừng, tránh gọi mãi nếu job lỗi/kẹt.
const AI_POLL_INTERVAL_MS = 4000;
const AI_POLL_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Chữa chi tiết 1 câu do AI1 viết (backend: Ai1ChiTietCau, tên trường
 * snake_case). Bố cục cố định cho mọi dạng bài: kết quả + đáp án, phân tích
 * từng phương án/ý, giải thích, lý do chọn sai, mẹo ghi nhớ.
 */
const ChiTietCauAi = ({ cau }) => {
  const meta = KET_QUA_META[cau.ket_qua] || KET_QUA_META.BLANK;
  const phanTich = Array.isArray(cau.phan_tich) ? cau.phan_tich : [];

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 18px', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '15px', fontWeight: 700, color: '#111827' }}>{cau.so_cau}</span>
        <span style={{ ...chipKetQua, backgroundColor: meta.bg, color: meta.fg }}>
          {meta.label}
          {cau.diem_tu_luan != null ? ` · AI chấm ${cau.diem_tu_luan}/100` : ''}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        <span style={{ ...chipDapAn, backgroundColor: '#F3F4F6', color: '#374151' }}>
          Bạn trả lời: {cau.dap_an_hoc_sinh || 'bỏ trống'}
        </span>
        {cau.dap_an_dung ? (
          <span style={{ ...chipDapAn, backgroundColor: '#D1FAE5', color: '#065F46' }}>
            Đáp án đúng: {cau.dap_an_dung}
          </span>
        ) : null}
      </div>

      {phanTich.length ? (
        <div style={{ marginBottom: '14px' }}>
          <div style={nhanMuc}>Phân tích</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {phanTich.map((muc, idx) => {
              const nen = muc.la_dap_an_dung ? '#ECFDF5' : muc.hoc_sinh_chon ? '#FFF1F2' : '#F9FAFB';
              const vien = muc.la_dap_an_dung ? '#A7F3D0' : muc.hoc_sinh_chon ? '#FECDD3' : '#F3F4F6';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px 16px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: nen,
                    border: `1px solid ${vien}`,
                  }}
                >
                  <div style={{ flex: '0 0 190px', maxWidth: '100%', fontSize: '13px', fontWeight: 600, color: '#111827' }}>
                    {muc.muc}
                    {muc.la_dap_an_dung ? <span style={{ ...tagMuc, color: '#065F46' }}>✓ Đáp án</span> : null}
                    {muc.hoc_sinh_chon && !muc.la_dap_an_dung ? (
                      <span style={{ ...tagMuc, color: '#BE123C' }}>Bạn chọn</span>
                    ) : null}
                  </div>
                  <div style={{ flex: '1 1 260px', fontSize: '13px', color: '#374151', lineHeight: 1.6 }}>{muc.chi_tiet}</div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {cau.giai_thich ? (
        <div style={{ marginBottom: '12px' }}>
          <div style={nhanMuc}>Giải thích</div>
          <p style={doanVan}>{cau.giai_thich}</p>
        </div>
      ) : null}

      {cau.ly_do_sai ? (
        <div style={{ ...hopGhiChu, backgroundColor: '#FFF1F2', borderColor: '#E11D48' }}>
          <div style={{ ...nhanMuc, color: '#BE123C' }}>Lý do bạn chọn sai</div>
          <p style={{ ...doanVan, color: '#881337' }}>{cau.ly_do_sai}</p>
        </div>
      ) : null}

      {cau.meo_ghi_nho ? (
        <div style={{ ...hopGhiChu, backgroundColor: '#FFFBEB', borderColor: '#F59E0B' }}>
          <div style={{ ...nhanMuc, color: '#B45309' }}>Mẹo ghi nhớ</div>
          <p style={{ ...doanVan, color: '#78350F' }}>{cau.meo_ghi_nho}</p>
        </div>
      ) : null}

      {cau.ghi_chu_de ? (
        <p style={{ fontSize: '12px', color: '#6B7280', margin: '10px 0 0', fontStyle: 'italic' }}>
          Lưu ý về đề: {cau.ghi_chu_de}
        </p>
      ) : null}
    </div>
  );
};

/** Nhận xét AI1 của 1 nhóm bài/dạng: nhận xét chung + (bấm mở) chữa từng câu. */
const NhomNhanXetAi = ({ nx, choXemChiTiet }) => {
  const dsCau = Array.isArray(nx.chiTietCauHoi) ? nx.chiTietCauHoi : [];
  const coCauChuaDat = dsCau.some((c) => c.ket_qua !== 'CORRECT');
  // Nhóm có câu sai thì mở sẵn phần chữa chi tiết, nhóm đúng hết thì thu gọn.
  // null = học sinh chưa bấm: tính lại theo dữ liệu mới, vì nhóm thường hiện
  // lúc còn "Đang phân tích" (chưa có câu nào) rồi mới có kết quả qua poll.
  const [chonMoRong, setChonMoRong] = useState(null);
  const moRong = chonMoRong ?? coCauChuaDat;

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '14px', fontWeight: 700 }}>{nx.tenBaiTapGoc || 'Bài làm'}</span>
        {nx.soCauTong != null ? (
          <span style={{ fontSize: '12px', color: '#6B7280' }}>{nx.soCauDung ?? 0}/{nx.soCauTong} câu đúng</span>
        ) : null}
      </div>

      {nx.trangThai === 'DONE' ? (
        <>
          <p style={{ ...doanVan, color: '#374151' }}>{nx.noiDungNhanXet}</p>

          {dsCau.length ? (
            <>
              <button type="button" onClick={() => setChonMoRong(!moRong)} style={nutMoRong}>
                {moRong ? 'Thu gọn phần chữa chi tiết' : `Xem chữa chi tiết từng câu (${dsCau.length} câu)`}
              </button>
              {moRong ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}>
                  {dsCau.map((cau) => (
                    <ChiTietCauAi key={cau.stt} cau={cau} />
                  ))}
                </div>
              ) : null}
            </>
          ) : nx.coChiTietCauHoi && !choXemChiTiet ? (
            <p style={{ fontSize: '12px', color: '#6B7280', margin: '12px 0 0' }}>
              Phần chữa chi tiết từng câu (có đáp án) sẽ hiện khi giáo viên cho phép xem đáp án.
            </p>
          ) : null}
        </>
      ) : nx.trangThai === 'FAILED' ? (
        <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>AI chưa tạo được nhận xét cho phần này.</p>
      ) : (
        <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Đang phân tích...</p>
      )}
    </div>
  );
};

const ResultsPage = ({ assignment, result, onBackToList }) => {
  const [aiFeedback, setAiFeedback] = useState(null);
  const [aiLoiTai, setAiLoiTai] = useState(false);
  const pollStartRef = useRef(null);

  useEffect(() => {
    if (!assignment?.id || !result) {
      return undefined;
    }

    let huy = false;
    pollStartRef.current = Date.now();

    const taiNhanXetAi = async () => {
      try {
        const res = await getStudentAssignmentAiFeedback(assignment.id);
        if (huy) return;
        if (res.success) {
          setAiFeedback(res.data);
          setAiLoiTai(false);
          if (!res.data.dangXuLy) {
            return;
          }
        } else {
          setAiLoiTai(true);
        }
      } catch (error) {
        if (!huy) setAiLoiTai(true);
      }

      if (!huy && Date.now() - pollStartRef.current < AI_POLL_TIMEOUT_MS) {
        setTimeout(taiNhanXetAi, AI_POLL_INTERVAL_MS);
      }
    };

    taiNhanXetAi();

    return () => {
      huy = true;
    };
  }, [assignment?.id, result]);

  if (!result) {
    return (
      <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', padding: '48px', fontFamily: "'Montserrat', sans-serif" }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'white', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: '#6B7280' }}>Chưa có kết quả để hiển thị.</p>
          {onBackToList ? (
            <button onClick={onBackToList} style={primaryButton}>Về danh sách bài tập</button>
          ) : null}
        </div>
      </div>
    );
  }

  const tile = (value, label, bg, fg) => (
    <div style={{ backgroundColor: bg, borderRadius: '12px', padding: '24px' }}>
      <div style={{ fontSize: '28px', fontWeight: 700, color: fg, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: fg }}>{label}</div>
    </div>
  );

  const saiVaChuaLam = (result.chiTiet || []).filter(
    (item) => item.ketQua === 'WRONG' || item.ketQua === 'PARTIAL' || item.ketQua === 'BLANK'
  );

  return (
    <div style={{ backgroundColor: '#F3F4F6', minHeight: '100vh', fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ backgroundColor: 'white', padding: '24px 48px', borderBottom: '1px solid #E5E7EB' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>Kết quả bài làm</h2>
        <p style={{ color: '#6B7280', fontSize: '14px', margin: 0 }}>
          {assignment?.title || 'Bài tập'} · Lần nộp {result.lanNop}
          {result.soLanConLai > 0 ? ` · Còn ${result.soLanConLai} lần nộp` : ' · Đã hết lượt nộp'}
        </p>
      </div>

      <div style={{ padding: '32px 48px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px' }}>
            <div style={card}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>Tổng quan</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                {tile(`${result.diemSo}/${result.diemToiDa}`, result.dangChoCham ? 'Điểm tạm tính' : 'Điểm', '#EFF6FF', '#2563EB')}
                {tile(result.soCauDung, 'Câu đúng', '#D1FAE5', '#065F46')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {tile(result.soCauSai, 'Câu sai', '#FFE4E6', '#DC2626')}
                {tile(formatTime(result.thoiGianThucTeGiay), 'Thời gian làm', '#FFF7ED', '#EA580C')}
              </div>

              {result.soCauChuaLam > 0 ? (
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '16px', marginBottom: 0 }}>
                  Bạn bỏ trống {result.soCauChuaLam} câu.
                </p>
              ) : null}

              {result.dangChoCham ? (
                <div style={{ ...notice, backgroundColor: '#EDE9FE', borderColor: '#C4B5FD' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#5B21B6', marginBottom: '6px' }}>
                    Chờ giáo viên chấm
                  </div>
                  <p style={{ fontSize: '13px', color: '#5B21B6', margin: 0 }}>
                    Có {result.soCauChoCham} câu tự luận cần giáo viên chấm tay. Điểm cuối cùng
                    sẽ thay đổi sau khi chấm xong.
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div style={{ flex: '1 1 320px' }}>
            <div style={card}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Câu cần xem lại</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '20px' }}>
                {saiVaChuaLam.length ? `${saiVaChuaLam.length} câu chưa đạt điểm tối đa.` : 'Bạn làm đúng tất cả các câu.'}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
                {saiVaChuaLam.map((item) => {
                  const meta = KET_QUA_META[item.ketQua] || KET_QUA_META.BLANK;
                  return (
                    <div
                      key={item.maCauHoiDe}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>{item.soCau || `Câu ${item.thuTu}`}</span>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6B7280' }}>
                          {item.diemDatDuoc}/{item.diemToiDa}
                        </span>
                        <span
                          style={{
                            backgroundColor: meta.bg,
                            color: meta.fg,
                            padding: '4px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!result.choXemDapAn ? (
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '20px', marginBottom: 0 }}>
                  Giáo viên chưa cho phép xem đáp án của bài này.
                </p>
              ) : null}

              {onBackToList ? (
                <button onClick={onBackToList} style={primaryButton}>Về danh sách bài tập</button>
              ) : null}
            </div>
          </div>
        </div>

        {(aiFeedback && (aiFeedback.dangXuLy || aiFeedback.nhanXetTungBai?.length || aiFeedback.nhanXetTongThe)) ? (
          <div style={{ maxWidth: '1000px', margin: '32px auto 0' }}>
            <div style={card}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Nhận xét của AI</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
                AI chữa chi tiết từng câu, nhận xét từng dạng bài và cả bài làm. Phần nào xong sẽ hiện trước, cả bài có thể mất vài phút.
              </p>

              {aiFeedback.dangXuLy ? (
                <div style={{ ...notice, backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', marginTop: 0 }}>
                  <p style={{ fontSize: '13px', color: '#1D4ED8', margin: 0 }}>
                    Đang phân tích bài làm... Trang sẽ tự cập nhật khi có kết quả.
                  </p>
                </div>
              ) : null}

              {aiFeedback.nhanXetTongThe?.trangThai === 'DONE' ? (
                <div style={{ ...notice, backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', marginTop: aiFeedback.dangXuLy ? '16px' : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#065F46' }}>Nhận xét chung cả bài</span>
                    {aiFeedback.nhanXetTongThe.xepLoai ? (
                      <span style={{ backgroundColor: '#D1FAE5', color: '#065F46', padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                        Xếp loại: {aiFeedback.nhanXetTongThe.xepLoai}
                      </span>
                    ) : null}
                  </div>
                  <p style={{ fontSize: '13px', color: '#065F46', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {aiFeedback.nhanXetTongThe.noiDungNhanXet}
                  </p>
                </div>
              ) : null}

              {aiFeedback.nhanXetTungBai?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px' }}>
                  {aiFeedback.nhanXetTungBai.map((nx, idx) => (
                    <NhomNhanXetAi key={nx.maBaiTapGoc || idx} nx={nx} choXemChiTiet={aiFeedback.choXemChiTiet} />
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : aiLoiTai ? (
          <div style={{ maxWidth: '1000px', margin: '32px auto 0' }}>
            <div style={{ ...notice, backgroundColor: '#FFF7ED', borderColor: '#FED7AA', marginTop: 0 }}>
              <p style={{ fontSize: '13px', color: '#9A3412', margin: 0 }}>
                Không tải được nhận xét AI lúc này.
              </p>
            </div>
          </div>
        ) : null}

        {/* Backend đã trả đáp án đúng và giải thích khi giáo viên bật cho xem,
            nhưng trước đây màn này không hiển thị gì cả — bật hay tắt đều như
            nhau, chỉ khác dòng chữ báo "chưa cho phép". */}
        {result.choXemDapAn ? (
          <div style={{ maxWidth: '1000px', margin: '32px auto 0' }}>
            <div style={card}>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Đáp án và giải thích</h3>
              <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '24px' }}>
                Giáo viên cho phép xem đáp án của bài này.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(result.chiTiet || []).map((item) => {
                  const meta = KET_QUA_META[item.ketQua] || KET_QUA_META.BLANK;
                  const dapAnDung = moTaDapAn(item.dapAnDung);
                  const baiLam = moTaDapAn(item.dapAnHocVien);

                  return (
                    <div
                      key={item.maCauHoiDe}
                      style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px 20px' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        <span style={{ fontSize: '15px', fontWeight: 700 }}>
                          {item.soCau || `Câu ${item.thuTu}`}
                        </span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ fontSize: '12px', color: '#6B7280' }}>
                            {item.diemDatDuoc}/{item.diemToiDa} điểm
                          </span>
                          <span
                            style={{
                              backgroundColor: meta.bg,
                              color: meta.fg,
                              padding: '4px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: 600,
                            }}
                          >
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: dapAnDung ? '12px' : 0 }}>
                        <span style={{ ...chipDapAn, backgroundColor: '#F3F4F6', color: '#374151' }}>
                          Bạn chọn: {baiLam || 'không làm'}
                        </span>
                        {dapAnDung ? (
                          <span style={{ ...chipDapAn, backgroundColor: '#D1FAE5', color: '#065F46' }}>
                            Đáp án đúng: {dapAnDung}
                          </span>
                        ) : null}
                      </div>

                      {item.giaiThich ? (
                        <div style={{ borderLeft: '3px solid #2563EB', paddingLeft: '14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2563EB', marginBottom: '4px' }}>
                            Giải thích
                          </div>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#4B5563',
                              whiteSpace: 'pre-wrap',
                              lineHeight: 1.7,
                            }}
                          >
                            {item.giaiThich}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const chipDapAn = {
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 600,
};

const chipKetQua = {
  padding: '4px 12px',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};

const nhanMuc = {
  fontSize: '12px',
  fontWeight: 700,
  color: '#2563EB',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  marginBottom: '6px',
};

const tagMuc = {
  display: 'inline-block',
  marginLeft: '8px',
  fontSize: '11px',
  fontWeight: 700,
};

const doanVan = {
  fontSize: '13px',
  color: '#4B5563',
  margin: 0,
  whiteSpace: 'pre-wrap',
  lineHeight: 1.7,
};

const hopGhiChu = {
  borderLeft: '3px solid',
  borderRadius: '8px',
  padding: '10px 14px',
  marginBottom: '10px',
};

const nutMoRong = {
  marginTop: '14px',
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid #BFDBFE',
  backgroundColor: '#EFF6FF',
  color: '#1D4ED8',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

const card = {
  backgroundColor: 'white',
  borderRadius: '24px',
  padding: '32px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
};

const notice = {
  border: '1px solid',
  borderRadius: '12px',
  padding: '16px',
  marginTop: '24px',
};

const primaryButton = {
  width: '100%',
  padding: '12px 24px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: '#2563EB',
  color: 'white',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '14px',
  marginTop: '24px',
};

export default ResultsPage;
