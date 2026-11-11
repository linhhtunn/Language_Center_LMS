import React from 'react';
import { moTaThoiGianConLai } from '../../utils/thoiHan';

/**
 * Màn hình chi tiết một bài tập trước khi vào làm.
 *
 * Trước đây phần lớn màn này gán cứng: đoạn mô tả nói "Thời gian làm bài là
 * 60 phút" trong khi bài chỉ có 45, hạn nộp luôn hiện "23:59 - 15/12/2024",
 * số lần làm luôn "2 lần", loại bài luôn "Bài tập giữa kỳ". Giờ mọi ô đều lấy
 * từ dữ liệu backend trả về.
 */
const AssignmentDetails = ({ assignment, onBack, onStartTest, onViewResult }) => {
  const coTheLam = assignment?.canStart !== false;
  const daNop = Boolean(assignment?.daNop);

  const lyDoKhongLam = {
    'Đã hết hạn': 'Bài này đã quá hạn nộp.',
    'Đã nộp': 'Bạn đã dùng hết số lần nộp cho bài này.',
    'Chưa tới giờ': 'Bài này chưa tới giờ làm.',
  }[assignment?.status];

  const dong = (nhan, giaTri, ghiChu, mauGhiChu) => (
    <div className="mb-3">
      <p className="text-muted mb-1" style={{ fontSize: '14px' }}>{nhan}</p>
      <p className="fw-semibold mb-0" style={{ fontSize: '14px', color: '#111827' }}>{giaTri}</p>
      {ghiChu ? (
        <p className="mb-0 mt-1" style={{ fontSize: '12px', color: mauGhiChu || '#6B7280' }}>
          {ghiChu}
        </p>
      ) : null}
    </div>
  );

  // Mốc thời gian tuyệt đối bắt học sinh tự nhẩm mới biết còn kịp hay không.
  const conLai = moTaThoiGianConLai(assignment?.rawDeadline);
  const sapHet = conLai === 'Đã quá hạn' || conLai === 'Sắp hết hạn' || /^Còn \d+ (phút|giờ)/.test(conLai || '');

  return (
    <div style={{ backgroundColor: "#F3F4F6", minHeight: "100vh", fontFamily: "'Montserrat', sans-serif", padding: "24px" }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <button className="btn btn-light fw-semibold d-flex gap-2 align-items-center" onClick={onBack}>
          <i className="bi bi-arrow-left"></i>
          Quay lại
        </button>
        <div className="d-flex gap-3 align-items-center">
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", backgroundColor: "#E5E7EB", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-bell" style={{ fontSize: "20px", color: "#4B5563" }}></i>
          </div>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column - Assignment Details */}
        <div className="col-md-8">
          <div className="bg-white rounded-4 p-5 shadow-sm mb-4">
            <div className="d-flex gap-3 align-items-center mb-4">
              <div style={{ backgroundColor: "#EFF6FF", padding: "12px 16px", borderRadius: "12px" }}>
                <i className="bi bi-file-earmark-text" style={{ fontSize: "24px", color: "#2563EB" }}></i>
              </div>
              <div>
                <h1 className="fw-bold mb-1" style={{ fontSize: "24px", color: "#111827" }}>
                  {assignment.title}
                </h1>
                <p className="text-muted mb-0" style={{ fontSize: "14px" }}>
                  {assignment.classInfo}
                </p>
              </div>
            </div>

            <h2 className="fw-bold mb-3" style={{ fontSize: "18px", color: "#111827" }}>Nội dung bài làm</h2>
            {assignment.description ? (
              <p style={{ fontSize: "14px", color: "#4B5563", lineHeight: "1.6" }}>
                {assignment.description}
              </p>
            ) : (
              <p style={{ fontSize: "14px", color: "#9CA3AF", lineHeight: "1.6" }}>
                Bài này không có mô tả thêm.
              </p>
            )}

            <ul style={{ fontSize: "14px", color: "#4B5563", paddingLeft: "20px", lineHeight: "2" }}>
              <li>Số câu hỏi: {assignment.questions} câu</li>
              <li>Thời gian làm bài: {assignment.duration}</li>
              {assignment.loaiBaiTap ? <li>Loại bài: {assignment.loaiBaiTap}</li> : null}
              {assignment.maxScore ? <li>Điểm tối đa: {assignment.maxScore}</li> : null}
              {[assignment.trinhDo, assignment.kyNang, assignment.mucDo].filter(Boolean).length ? (
                <li>
                  {[assignment.trinhDo, assignment.kyNang, assignment.mucDo].filter(Boolean).join(' · ')}
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="col-md-4">
          <div className="bg-white rounded-4 p-4 shadow-sm mb-4">
            <h3 className="fw-bold mb-4" style={{ fontSize: "18px", color: "#111827" }}>Tóm tắt</h3>
            <div className="mb-3">
              <p className="text-muted mb-1" style={{ fontSize: "14px" }}>Trạng thái</p>
              <span className="px-3 py-1 rounded-2 fw-semibold" style={{ backgroundColor: assignment.statusColor, color: assignment.statusTextColor, fontSize: "12px" }}>
                {assignment.status}
              </span>
            </div>

            {dong(
              'Hạn nộp',
              assignment.deadline || 'Không giới hạn',
              conLai,
              sapHet ? '#DC2626' : '#6B7280'
            )}
            {dong(
              'Số lần được nộp',
              `${assignment.soLanDaNop || 0}/${assignment.soLanLamToiDa || 1} lần`
            )}
            {dong('Thời gian làm bài', assignment.duration)}

            {daNop ? dong(
              'Điểm gần nhất',
              assignment.dangChoCham ? 'Chờ giáo viên chấm' : `${assignment.diemGanNhat ?? 0} điểm`
            ) : null}

            <button
              className="btn btn-primary w-100 fw-bold py-3"
              style={{ borderRadius: "8px" }}
              onClick={onStartTest}
              disabled={!coTheLam}
            >
              {daNop && coTheLam ? 'Làm lại' : 'Bắt đầu làm'}
            </button>

            {/* Nộp xong rời màn là mất đường quay lại kết quả, kéo theo đáp án
                và giải thích giáo viên đã cho phép xem cũng không xem được. */}
            {daNop && onViewResult ? (
              <button
                className="btn btn-outline-primary w-100 fw-bold py-3 mt-2"
                style={{ borderRadius: "8px" }}
                onClick={onViewResult}
              >
                Xem kết quả &amp; đáp án
              </button>
            ) : null}

            {!coTheLam && lyDoKhongLam ? (
              <p className="text-muted mb-0 mt-2 text-center" style={{ fontSize: "12px" }}>
                {lyDoKhongLam}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetails;
