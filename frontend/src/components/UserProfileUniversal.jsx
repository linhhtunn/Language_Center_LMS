import React, { useState } from 'react';
import { User, Mail, Phone, MapPin, Save, CheckCircle, ArrowLeft, Camera } from 'lucide-react';

const UserProfileUniversal = ({ userData, userRole, onBack, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [formData, setFormData] = useState(userData);

  const handleSave = () => {
    setIsSaved(true);
    onSave(formData);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Màu sắc chủ đạo theo vai trò
  const themeColor = {
    'Admin': 'text-danger border-danger',
    'Giảng viên': 'text-primary border-primary',
    'Học sinh': 'text-success border-success',
    'Phụ huynh': 'text-warning border-warning'
  }[userRole] || 'text-primary border-primary';

  return (
    <div className="container-fluid p-4 bg-white rounded shadow-sm min-vh-100">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <button className="btn btn-outline-secondary btn-sm me-3 border-0 shadow-none" onClick={onBack}>
            <ArrowLeft size={20} /> Quay lại
          </button>
          <h4 className="fw-bold mb-0">Hồ sơ {userRole}</h4>
        </div>
        
        <button 
          className={`btn ${isSaved ? 'btn-success' : 'btn-primary'} px-4 d-flex align-items-center transition-all shadow-sm`}
          onClick={handleSave}
          disabled={isSaved}
        >
          {isSaved ? <><CheckCircle size={18} className="me-2"/> Đã cập nhật</> : <><Save size={18} className="me-2"/> Lưu thay đổi</>}
        </button>
      </div>

      <div className="row g-4">
        {/* Avatar Section */}
        <div className="col-md-4 text-center border-end">
          <div className="position-relative d-inline-block mt-3 mb-3">
            <div className={`rounded-circle border border-4 d-flex align-items-center justify-content-center bg-light ${themeColor}`} style={{ width: '160px', height: '160px' }}>
              <User size={80} />
            </div>
            <button className="btn btn-dark btn-sm rounded-circle position-absolute bottom-0 end-0 p-2 border-2 border-white">
              <Camera size={16} />
            </button>
          </div>
          <h5 className="fw-bold">{formData.HoTen}</h5>
          <p className="badge bg-light text-dark border px-3 py-2">{userRole}</p>
          

        </div>

        {/* Info Section */}
        <div className="col-md-8">
          <div className="p-2">
            <h6 className="text-muted text-uppercase mb-4 small fw-bold">Thông tin liên lạc</h6>
            <div className="row g-3">
              <div className="col-md-12">
                <label className="form-label small text-muted">Họ và tên</label>
                <input type="text" className="form-control bg-light border-0 py-2 shadow-none" value={formData.HoTen} onChange={e => setFormData({...formData, HoTen: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Email</label>
                <input type="email" className="form-control bg-light border-0 py-2 shadow-none" value={formData.Email} onChange={e => setFormData({...formData, Email: e.target.value})} />
              </div>
              <div className="col-md-6">
                <label className="form-label small text-muted">Số điện thoại</label>
                <input type="text" className="form-control bg-light border-0 py-2 shadow-none" value={formData.SoDienThoai} onChange={e => setFormData({...formData, SoDienThoai: e.target.value})} />
              </div>
              <div className="col-md-12">
                <label className="form-label small text-muted">Địa chỉ</label>
                <textarea className="form-control bg-light border-0 py-2 shadow-none" rows="2" value={formData.DiaChi} onChange={e => setFormData({...formData, DiaChi: e.target.value})} />
              </div>

              {/* Tùy biến thêm trường dựa theo Role (Chỉ giảng viên mới thấy mục này) */}
              {userRole === 'Giảng viên' && (
                <div className="col-md-12 mt-4">
                   <h6 className="text-muted text-uppercase mb-3 small fw-bold">Thông tin chuyên môn</h6>
                   <input type="text" className="form-control bg-light border-0 py-2 shadow-none" placeholder="Ví dụ: IELTS, TOEIC..." value={formData.ChuyenMon || ''} onChange={e => setFormData({...formData, ChuyenMon: e.target.value})} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileUniversal;