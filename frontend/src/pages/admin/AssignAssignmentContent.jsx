import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronRight, Save, ArrowLeft, Search, Trash2, 
  Info, CheckCircle, BarChart, Filter, Loader2, AlertCircle 
} from 'lucide-react';
import AssignAssignmentContentModern from './AssignAssignmentContentModern';

const AssignAssignmentContent = ({ maBaiTap = "EX-01", tenBaiTap = "Đề thi TOEIC R&L", onBack }) => {
  return <AssignAssignmentContentModern maBaiTap={maBaiTap} tenBaiTap={tenBaiTap} onBack={onBack} />;

  // --- STATE ---
  const [bankQuestions, setBankQuestions] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const TOTAL_SCORE = 10;

  // --- MOCK DATA CÓ CHIỀU SÂU NCKH ---
  useEffect(() => {
    const mockBank = [
      { MaCauHoi: 'QS001', NoiDung: 'Chọn từ có phần gạch chân phát âm khác: Finished, Stopped, Worked, Waited', Loai: 'Trắc nghiệm', MucDo: 'Dễ' },
      { MaCauHoi: 'QS002', NoiDung: 'Viết lại câu sau: "I started learning English 5 years ago"', Loai: 'Tự luận', MucDo: 'Trung bình' },
      { MaCauHoi: 'QS003', NoiDung: 'Điền giới từ thích hợp: "She is interested ____ listening to music."', Loai: 'Điền khuyết', MucDo: 'Dễ' },
      { MaCauHoi: 'QS004', NoiDung: 'Đọc đoạn văn sau và suy luận ý chính của tác giả về Environment...', Loai: 'Đọc hiểu', MucDo: 'Khó' },
      { MaCauHoi: 'QS005', NoiDung: 'Sắp xếp từ thành câu: "yesterday / went / to / They / cinema / the"', Loai: 'Tự luận', MucDo: 'Dễ' },
      { MaCauHoi: 'QS006', NoiDung: 'Tìm lỗi sai ngữ pháp logic: "She don\'t like drinking coffee in the morning."', Loai: 'Trắc nghiệm', MucDo: 'Trung bình' },
      { MaCauHoi: 'QS007', NoiDung: 'Phân tích điểm khác biệt giữa cấu trúc thì Quá khứ đơn và Hiện tại hoàn thành', Loai: 'Tự luận', MucDo: 'Khó' },
    ];
    setBankQuestions(mockBank);
  }, []);

  // --- THUẬT TOÁN CHIA ĐIỂM CHUẨN XÁC 10.00 (ĐIỂM NHẤN NCKH) ---
  const autoCalculateScores = (list) => {
    if (list.length === 0) return [];
    
    // Bước 1: Tính điểm sàn làm tròn 2 chữ số thập phân
    const baseScore = Math.floor((TOTAL_SCORE / list.length) * 100) / 100;
    
    // Bước 2: Tìm phần dư để bù đắp sai số (VD: 10 - (3.33 * 3) = 0.01)
    const remainder = Number((TOTAL_SCORE - (baseScore * list.length)).toFixed(2));

    // Bước 3: Phân bổ lại điểm
    return list.map((q, index) => {
      // Cộng dồn phần dư vào câu đầu tiên để đảm bảo tổng đúng 10.00
      const finalScore = index === 0 ? baseScore + remainder : baseScore;
      return { 
        ...q, 
        DiemCuaCau: Number(finalScore.toFixed(2)), 
        ThuTu: index + 1 
      };
    });
  };

  // --- ACTIONS ---
  const addToAssignment = (q) => {
    const newSelected = [...selectedQuestions, q];
    setSelectedQuestions(autoCalculateScores(newSelected));
    setBankQuestions(bankQuestions.filter(item => item.MaCauHoi !== q.MaCauHoi));
  };

  const removeFromAssignment = (q) => {
    const newSelected = selectedQuestions.filter(item => item.MaCauHoi !== q.MaCauHoi);
    setSelectedQuestions(autoCalculateScores(newSelected));
    setBankQuestions([...bankQuestions, q]);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Giả lập API Call thực tế mất 1.5s
    setTimeout(() => {
      console.log("Payload NCKH gửi lên Server:", { maBaiTap, matrix: examMatrix, questions: selectedQuestions });
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }, 1500);
  };

  // --- TÍNH TOÁN MA TRẬN ĐỀ THI (THỐNG KÊ REAL-TIME) ---
  const examMatrix = useMemo(() => {
    const matrix = { De: 0, TrungBinh: 0, Kho: 0 };
    selectedQuestions.forEach(q => {
      if (q.MucDo === 'Dễ') matrix.De++;
      else if (q.MucDo === 'Trung bình') matrix.TrungBinh++;
      else if (q.MucDo === 'Khó') matrix.Kho++;
    });
    return matrix;
  }, [selectedQuestions]);

  // --- RENDER HELPERS ---
  const getDifficultyBadge = (level) => {
    switch(level) {
      case 'Dễ': return <span className="badge bg-success-subtle text-success border border-success-subtle px-2">Dễ</span>;
      case 'Trung bình': return <span className="badge bg-warning-subtle text-warning border border-warning-subtle px-2">Tr.Bình</span>;
      case 'Khó': return <span className="badge bg-danger-subtle text-danger border border-danger-subtle px-2">Khó</span>;
      default: return null;
    }
  };

  return (
    <div className="container-fluid bg-light p-4 rounded min-vh-100">
      
      {/* HEADER & ACTION BAR */}
      <div className="d-flex justify-content-between align-items-center mb-4 bg-white p-3 rounded-4 shadow-sm border">
        <button className="btn btn-light border-0 d-flex align-items-center fw-medium" onClick={onBack}>
          <ArrowLeft size={18} className="me-2"/> Quay lại
        </button>
        <div className="text-center">
          <h5 className="mb-1 fw-bold text-dark">THIẾT LẬP MA TRẬN ĐỀ THI</h5>
          <span className="badge bg-light text-dark border">{tenBaiTap} ({maBaiTap})</span>
        </div>

        <button 
          className={`btn ${saveSuccess ? 'btn-success' : 'btn-primary'} px-4 py-2 d-flex align-items-center fw-bold transition-all shadow-sm`} 
          onClick={handleSave}
          disabled={isSaving || selectedQuestions.length === 0}
        >
          {isSaving ? <><Loader2 size={18} className="me-2 animate-spin"/> Đang đồng bộ...</> : 
           saveSuccess ? <><CheckCircle size={18} className="me-2"/> Đã lưu hệ thống</> : 
           <><Save size={18} className="me-2"/> Lưu Đề Thi</>}
        </button>
      </div>

      <div className="row g-4">
        {/* CỘT TRÁI: NGÂN HÀNG CÂU HỎI */}
        <div className="col-md-5">
          <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden">
            <div className="card-header bg-white py-3 border-bottom-0">
              <h6 className="fw-bold mb-3 d-flex align-items-center text-dark">
                <Search size={18} className="me-2 text-primary"/> KHO TÀI NGUYÊN ({bankQuestions.length})
              </h6>
              <div className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control bg-light border-0 shadow-none" 
                  placeholder="Tìm nội dung..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                  className="form-select bg-light border-0 shadow-none" 
                  style={{width: '130px'}}
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                >
                  <option value="ALL">Mọi mức độ</option>
                  <option value="Dễ">Mức: Dễ</option>
                  <option value="Trung bình">Mức: TB</option>
                  <option value="Khó">Mức: Khó</option>
                </select>
              </div>
            </div>
            
            <div className="list-group list-group-flush overflow-auto bg-light p-2" style={{maxHeight: '650px'}}>
              {bankQuestions
                .filter(q => q.NoiDung.toLowerCase().includes(searchTerm.toLowerCase()))
                .filter(q => difficultyFilter === 'ALL' || q.MucDo === difficultyFilter)
                .map(q => (
                <div key={q.MaCauHoi} className="list-group-item d-flex justify-content-between align-items-center p-3 border-0 mb-2 bg-white rounded-3 shadow-sm" style={{transition: 'all 0.2s'}}>
                  <div className="pe-3">
                    <div className="d-flex gap-2 mb-2">
                      <span className="badge bg-secondary-subtle text-secondary px-2">{q.Loai}</span>
                      {getDifficultyBadge(q.MucDo)}
                    </div>
                    <p className="mb-0 text-dark fw-medium" style={{fontSize: '14px'}}>{q.NoiDung}</p>
                  </div>
                  <button className="btn btn-sm btn-outline-primary rounded-circle p-2 flex-shrink-0" onClick={() => addToAssignment(q)} title="Thêm vào đề">
                    <ChevronRight size={18}/>
                  </button>
                </div>
              ))}
              {bankQuestions.length === 0 && <div className="text-center py-5 text-muted small">Đã chọn hết câu hỏi trong kho</div>}
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: KIỂM SOÁT MA TRẬN & CẤU TRÚC ĐỀ */}
        <div className="col-md-7">
          <div className="card border-0 shadow-sm h-100 rounded-4 overflow-hidden d-flex flex-column">
            
            {/* Vùng Thống kê NCKH */}
            <div className="bg-primary-subtle p-3 border-bottom d-flex justify-content-between align-items-center">
              <div>
                <h6 className="mb-1 fw-bold text-primary d-flex align-items-center">
                  <BarChart size={18} className="me-2"/> PHÂN TÍCH MA TRẬN ĐỀ THI
                </h6>
                <div className="small text-muted">Hệ thống tự động phân bổ tỷ trọng điểm 10.0</div>
              </div>
              <div className="d-flex gap-3 text-center bg-white p-2 rounded-3 shadow-sm">
                <div><div className="small text-success fw-bold">DỄ</div><div className="fw-bold">{examMatrix.De}</div></div>
                <div className="border-end"></div>
                <div><div className="small text-warning fw-bold">TB</div><div className="fw-bold">{examMatrix.TrungBinh}</div></div>
                <div className="border-end"></div>
                <div><div className="small text-danger fw-bold">KHÓ</div><div className="fw-bold">{examMatrix.Kho}</div></div>
              </div>
            </div>

            {/* Bảng nội dung */}
            <div className="table-responsive flex-grow-1 bg-white">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-muted fw-bold text-uppercase">
                    <th className="text-center py-3" style={{width: '60px'}}>STT</th>
                    <th>Nội dung câu hỏi được chọn</th>
                    <th className="text-center" style={{width: '100px'}}>Mức độ</th>
                    <th className="text-center" style={{width: '100px'}}>Điểm</th>
                    <th style={{width: '60px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedQuestions.map((q, index) => (
                    <tr key={q.MaCauHoi}>
                      <td className="text-center fw-bold text-secondary">{q.ThuTu}</td>
                      <td>
                        <div className="text-dark fw-medium" style={{fontSize: '14px'}}>{q.NoiDung}</div>
                        <div className="small text-muted mt-1">{q.MaCauHoi} • {q.Loai}</div>
                      </td>
                      <td className="text-center">{getDifficultyBadge(q.MucDo)}</td>
                      <td className="text-center">
                        {/* Highlight NCKH: Số điểm được tính toán chuẩn xác */}
                        <span className="badge bg-danger-subtle text-danger px-2 py-1 fs-6">
                          {q.DiemCuaCau.toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center">
                        <button className="btn btn-light text-danger p-2 rounded-circle" onClick={() => removeFromAssignment(q)} title="Gỡ khỏi đề">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  
                  {/* Trạng thái trống */}
                  {selectedQuestions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="text-center py-5">
                        <div className="d-flex flex-column align-items-center text-muted opacity-50">
                          <AlertCircle size={48} className="mb-3"/>
                          <h5>Đề thi đang trống</h5>
                          <p className="small">Vui lòng chọn câu hỏi từ kho tài nguyên bên trái.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Footer Tính Tổng */}
            {selectedQuestions.length > 0 && (
              <div className="bg-light p-3 border-top d-flex justify-content-between align-items-center">
                <div className="small text-muted d-flex align-items-center">
                  <Info size={16} className="me-2"/> Tổng điểm được hệ thống nội suy tự động.
                </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-muted fw-medium text-uppercase">Tổng cộng:</span>
                  <span className="text-danger fw-bold fs-3" style={{letterSpacing: '-1px'}}>
                    {selectedQuestions.reduce((sum, q) => sum + q.DiemCuaCau, 0).toFixed(2)} / 10
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAssignmentContent;
