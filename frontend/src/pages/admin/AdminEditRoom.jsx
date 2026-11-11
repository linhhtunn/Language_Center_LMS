import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../api/BaseApi";

const ensureApiSuccess = (result, fallbackMessage) => {
  if (!result) throw new Error(fallbackMessage);
  if (result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

const AdminEditRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [tenPhong, setTenPhong] = useState("");
  const [capacity, setCapacity] = useState("");
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get(`Schedule/rooms/${id}`);
        if (res && res.success === false) throw new Error(res.message || 'Không tải được phòng.');
        const payload = res ?? {};
        setRoom(payload);
        setTenPhong(payload.tenPhong ?? payload.TenPhong ?? payload.name ?? "");
        setCapacity(String(payload.sucChua ?? payload.SucChua ?? ""));
        setActive((payload.active ?? payload.TrangThai) !== false);
      } catch (err) {
        setError(err?.message || 'Không tải được phòng.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!tenPhong.trim()) {
      setError('Tên phòng không được để trống.');
      return;
    }
    if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
      setError('Sức chứa phòng phải là số nguyên lớn hơn 0.');
      return;
    }
    setSaving(true);
    try {
      const body = { tenPhong: tenPhong.trim(), sucChua: Number(capacity), trangThai: Boolean(active) };
      const res = await apiClient.put(`Schedule/rooms/${id}`, body);
      ensureApiSuccess(res, 'Cập nhật phòng thất bại');
      navigate('/admin/classes');
    } catch (err) {
      setError(err?.message || 'Cập nhật phòng thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold"><i className="bi bi-door-open-fill me-2"></i> Chỉnh sửa phòng học</h4>
          <p className="text-muted mb-0">Sửa thông tin phòng sau đó Lưu để cập nhật hệ thống.</p>
        </div>
        <button className="btn btn-light" onClick={() => navigate(-1)}><i className="bi bi-arrow-left me-1" /> Quay lại</button>
      </div>

      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">Đang tải phòng...</div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Tên phòng *</label>
                <input className="form-control" value={tenPhong} onChange={(e) => setTenPhong(e.target.value)} />
              </div>

              <div className="mb-3">
                <label className="form-label">Sức chứa *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  className="form-control"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                />
              </div>


              <div className="mb-3">
                <label className="form-label">Trạng thái</label>
                <select className="form-select" value={String(active)} onChange={(e) => setActive(e.target.value === 'true')}>
                  <option value="true">Hoạt động</option>
                  <option value="false">Không hoạt động</option>
                </select>
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={saving}>Hủy</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEditRoom;
