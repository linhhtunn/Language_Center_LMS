import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../api/BaseApi";

const ensureApiSuccess = (result, fallbackMessage) => {
  if (!result) throw new Error(fallbackMessage);
  if (result.success === false) {
    throw new Error(result.message || fallbackMessage);
  }
  return result;
};

const AdminCreateRoom = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setError("");
    setToast("");

    if (!roomName.trim()) {
      setError("Tên phòng học không được để trống.");
      return;
    }
    if (!Number.isInteger(Number(capacity)) || Number(capacity) <= 0) {
      setError("Sức chứa phòng phải là số nguyên lớn hơn 0.");
      return;
    }

    setSaving(true);
    try {
      const result = await apiClient.post("Schedule/rooms/create", {
        tenPhong: roomName.trim(),
        sucChua: Number(capacity),
      });
      ensureApiSuccess(result, "Không thể tạo phòng học.");
      setRoomName("");
      setCapacity("");
      setToast("Đã tạo phòng học thành công");
    } catch (err) {
      setError(err?.message || "Không thể tạo phòng học.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="fw-bold">
            <i className="bi bi-door-open-fill me-2"></i>
            Tạo phòng học
          </h4>
          <p className="text-muted mb-0">Nhập tên và sức chứa phòng học rồi nhấn Lưu.</p>
        </div>
        <button className="btn btn-light" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-1" /> Quay lại
        </button>
      </div>

      {toast && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ backgroundColor: "rgba(0,0,0,.45)", zIndex: 1080 }}
        >
          <div className="card shadow-lg border-0" style={{ minWidth: 320, maxWidth: 420 }}>
            <div className="card-body text-center p-4">
              <div className="mb-3 text-success">
                <i className="bi bi-check-circle-fill" style={{ fontSize: 48 }}></i>
              </div>
              <div className="fw-semibold mb-4">{toast}</div>
              <button className="btn btn-primary px-4" onClick={() => {
                setToast("");
                navigate("/admin/classes?showRooms=1");
              }}>OK</button>
            </div>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body">
          <form onSubmit={handleCreateRoom}>
            <div className="mb-3">
              <label className="form-label">Tên phòng học *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: A101"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Sức chứa *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                className="form-control"
                placeholder="Số học viên tối đa"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>

            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu phòng học"}
              </button>
              <button type="button" className="btn btn-outline-secondary" onClick={() => navigate(-1)} disabled={saving}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateRoom;
