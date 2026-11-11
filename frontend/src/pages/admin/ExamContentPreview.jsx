import React, { useEffect, useId, useMemo, useState } from 'react';
import adminAssignmentService from '../../api/adminAssignmentService';

/**
 * Nội dung chi tiết của một đề: từng câu hỏi kèm đáp án đúng và giải thích.
 *
 * Preview ở bước 3 trước đây chỉ liệt kê cấu trúc đề (phần nào lấy từ ngân hàng
 * nào, bao nhiêu câu con) nên không xem được đề thực sự chứa gì. Câu hỏi của đề
 * sinh tự động là bản chụp nằm trong baitapcauhoi, lấy qua endpoint chi tiết
 * bài tập của admin.
 *
 * Nhiều câu dùng chung một bài đọc (đề ghép nhiều bài gốc), nên các câu liên
 * tiếp có cùng doanVan được gom thành một nhóm và chỉ in bài đọc một lần.
 */
const ExamContentPreview = ({ assignmentId }) => {
  const [state, setState] = useState({ loading: true, error: '', questions: [] });
  const [hienDapAn, setHienDapAn] = useState(true);

  // Component nay duoc dung o hai modal khac nhau, id cua o tick phai duy nhat
  // de nhan <label> khong tro nham sang o cua modal kia.
  const switchId = useId();

  useEffect(() => {
    let huy = false;

    const tai = async () => {
      setState({ loading: true, error: '', questions: [] });
      try {
        const detail = await adminAssignmentService.getAssignmentDetail(assignmentId);
        if (huy) return;
        const questions = [...(detail?.selectedQuestions || [])].sort(
          (a, b) => (a.thuTu ?? 0) - (b.thuTu ?? 0)
        );
        setState({ loading: false, error: '', questions });
      } catch (error) {
        if (huy) return;
        setState({
          loading: false,
          error: error?.message || 'Không tải được nội dung đề.',
          questions: [],
        });
      }
    };

    if (assignmentId) {
      tai();
    }
    return () => {
      huy = true;
    };
  }, [assignmentId]);

  // Gom các câu liên tiếp dùng chung một bài đọc / hướng dẫn.
  const nhomCauHoi = useMemo(() => {
    const nhom = [];
    state.questions.forEach((cau) => {
      const debai = cau.deBai || {};
      const khoa = `${debai.huongDan || ''}||${debai.doanVan || ''}`;
      const cuoi = nhom[nhom.length - 1];
      if (cuoi && cuoi.khoa === khoa) {
        cuoi.cauHoi.push(cau);
      } else {
        nhom.push({
          khoa,
          huongDan: debai.huongDan || '',
          doanVan: debai.doanVan || '',
          cauHoi: [cau],
        });
      }
    });
    return nhom;
  }, [state.questions]);

  if (state.loading) {
    return (
      <div className="text-center text-muted py-4">
        <div className="spinner-border spinner-border-sm me-2" role="status" />
        Đang tải nội dung đề...
      </div>
    );
  }

  if (state.error) {
    return <div className="alert alert-danger mb-0">{state.error}</div>;
  }

  if (!state.questions.length) {
    return <div className="alert alert-warning mb-0">Đề này chưa có câu hỏi nào.</div>;
  }

  const tongDiem = state.questions.reduce((sum, cau) => sum + Number(cau.diemCuaCau || 0), 0);

  return (
    <div>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <div className="small text-muted">
          {state.questions.length} câu · tổng {tongDiem.toFixed(2)} điểm
        </div>
        <div className="form-check form-switch mb-0">
          <input
            className="form-check-input"
            type="checkbox"
            id={switchId}
            checked={hienDapAn}
            onChange={(e) => setHienDapAn(e.target.checked)}
          />
          <label className="form-check-label small" htmlFor={switchId}>
            Hiện đáp án và giải thích
          </label>
        </div>
      </div>

      <div className="d-flex flex-column gap-4">
        {nhomCauHoi.map((nhom, nhomIdx) => (
          <div key={`nhom-${nhomIdx}`} className="admin-eem-generated-section">
            {nhom.huongDan ? (
              <div className="alert alert-warning py-2 px-3 mb-3">
                <div className="fw-semibold small mb-1">Hướng dẫn</div>
                <div className="small">{nhom.huongDan}</div>
              </div>
            ) : null}

            {nhom.doanVan ? (
              <div className="border rounded-3 bg-light p-3 mb-3">
                <div className="fw-semibold small text-muted mb-2">Bài đọc</div>
                <div
                  className="small"
                  style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, maxHeight: '260px', overflowY: 'auto' }}
                >
                  {nhom.doanVan}
                </div>
              </div>
            ) : null}

            <div className="d-flex flex-column gap-3">
              {nhom.cauHoi.map((cau) => (
                <QuestionCard key={cau.maCauHoiDe} cau={cau} hienDapAn={hienDapAn} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuestionCard = ({ cau, hienDapAn }) => {
  const debai = cau.deBai || {};

  return (
    <div className="border rounded-3 p-3">
      <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-2">
        <div className="fw-semibold">
          {cau.soCau || `Câu ${cau.thuTu ?? ''}`}
          {debai.cauHoiGoc && debai.cauHoiGoc !== cau.soCau ? (
            <span className="fw-normal"> — {debai.cauHoiGoc}</span>
          ) : null}
        </div>
        <div className="d-flex flex-wrap gap-2">
          {cau.loaiCauHoiLabel || cau.loaiCauHoiCode ? (
            <span className="badge text-bg-light border">
              {cau.loaiCauHoiLabel || cau.loaiCauHoiCode}
            </span>
          ) : null}
          <span className="badge text-bg-light border">{Number(cau.diemCuaCau || 0).toFixed(2)} điểm</span>
          {cau.laCauHoiTuLuan ? <span className="badge text-bg-warning">Chấm tay</span> : null}
        </div>
      </div>

      <QuestionBody debai={debai} dapAn={cau.dapAn} hienDapAn={hienDapAn} />

      {hienDapAn && cau.giaiThich ? (
        <div className="mt-3 border-start border-3 border-primary ps-3">
          <div className="fw-semibold small text-primary mb-1">Giải thích</div>
          <div className="small text-muted" style={{ whiteSpace: 'pre-wrap' }}>
            {cau.giaiThich}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/**
 * Mỗi dạng câu hỏi có hình dạng đề bài riêng, nhận diện theo trường có mặt
 * trong debai chứ không theo mã loại — như vậy dạng mới thêm vào danh mục mà
 * dùng lại một trong các hình dạng này thì vẫn hiển thị được ngay.
 */
const QuestionBody = ({ debai, dapAn, hienDapAn }) => {
  // Trắc nghiệm: đáp án là id của lựa chọn.
  if (Array.isArray(debai.luaChon) && debai.luaChon.length) {
    return (
      <div className="d-flex flex-column gap-1">
        {debai.luaChon.map((chon) => {
          const dung = hienDapAn && String(dapAn) === String(chon.id);
          return (
            <div
              key={chon.id}
              className={`small px-2 py-1 rounded ${dung ? 'bg-success-subtle fw-semibold' : ''}`}
            >
              <strong className="me-2">{chon.id}.</strong>
              {chon.text}
              {dung ? <span className="badge text-bg-success ms-2">Đáp án đúng</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  // Điền từ từ danh sách cho sẵn: đáp án là chính từ đó.
  if (Array.isArray(debai.danhSachTu) && debai.danhSachTu.length) {
    return (
      <div>
        <div className="small text-muted mb-1">
          Chỗ trống ({debai.soChoTrong}) · chọn từ danh sách:
        </div>
        <div className="d-flex flex-wrap gap-2">
          {debai.danhSachTu.map((tu, idx) => {
            const dung = hienDapAn && String(dapAn) === String(tu);
            return (
              <span
                key={`${tu}-${idx}`}
                className={`badge ${dung ? 'text-bg-success' : 'text-bg-light border'}`}
              >
                {tu}
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  // Nối ghép: đáp án là map { idTrái: idPhải }.
  if (Array.isArray(debai.danhSachTrai) && Array.isArray(debai.danhSachPhai)) {
    const map = dapAn && typeof dapAn === 'object' && !Array.isArray(dapAn) ? dapAn : {};
    const phaiTheoId = new Map(debai.danhSachPhai.map((x) => [String(x.id), x.text]));
    return (
      <div>
        <div className="table-responsive">
          <table className="table table-sm align-middle mb-2">
            <tbody>
              {debai.danhSachTrai.map((trai) => {
                const idPhai = map[trai.id];
                return (
                  <tr key={trai.id}>
                    <td className="fw-semibold" style={{ width: '160px' }}>{trai.text}</td>
                    <td className="small">
                      {hienDapAn && idPhai ? (
                        <>
                          <span className="badge text-bg-success me-2">{String(idPhai).toUpperCase()}</span>
                          {phaiTheoId.get(String(idPhai)) || ''}
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="small text-muted">
          {debai.danhSachPhai.map((phai) => (
            <div key={phai.id}>
              <strong className="me-1">{String(phai.id).toUpperCase()}.</strong>
              {phai.text}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Sắp xếp câu: đáp án là mảng id theo đúng thứ tự.
  if (Array.isArray(debai.danhSach) && debai.danhSach.length) {
    const thuTuDung = Array.isArray(dapAn) ? dapAn : [];
    const theoId = new Map(debai.danhSach.map((x) => [String(x.id), x.text]));
    return (
      <div>
        <div className="small text-muted mb-1">Các câu cần sắp xếp:</div>
        <div className="small mb-2">
          {debai.danhSach.map((item) => (
            <div key={item.id}>
              <strong className="me-1">{String(item.id).toUpperCase()}.</strong>
              {item.text}
            </div>
          ))}
        </div>
        {hienDapAn && thuTuDung.length ? (
          <div className="small">
            <span className="text-muted me-2">Thứ tự đúng:</span>
            {thuTuDung.map((id, idx) => (
              <span key={`${id}-${idx}`} className="badge text-bg-success me-1">
                {idx + 1}. {String(id).toUpperCase()}
              </span>
            ))}
            <div className="mt-2 text-muted" style={{ lineHeight: 1.7 }}>
              {thuTuDung.map((id) => theoId.get(String(id)) || '').join(' ')}
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Tự luận và các dạng chưa có hình dạng riêng.
  return (
    <div>
      {debai.tieuChi ? (
        <div className="small text-muted mb-2" style={{ whiteSpace: 'pre-wrap' }}>
          Tiêu chí: {debai.tieuChi}
        </div>
      ) : null}
      {hienDapAn && dapAn !== null && dapAn !== undefined ? (
        <div className="small">
          <span className="text-muted me-2">Đáp án:</span>
          <span className="badge text-bg-success">
            {typeof dapAn === 'object' ? JSON.stringify(dapAn) : String(dapAn)}
          </span>
        </div>
      ) : (
        <div className="small text-muted">Câu này không có đáp án cố định.</div>
      )}
    </div>
  );
};

export default ExamContentPreview;
