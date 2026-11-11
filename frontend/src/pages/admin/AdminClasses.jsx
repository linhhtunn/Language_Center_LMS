import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import apiClient from "../../api/BaseApi";
import { p0Api } from "../../api/p0Api";

const AdminClasses = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [classes, setClasses] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(null);
  const [showRooms, setShowRooms] = useState(false);
  const [showTeachers, setShowTeachers] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    setError("");
    try {
      setClasses(await p0Api.classes.list());
    } catch (err) {
      setError(err.message || "Khong tai duoc lop hoc.");
    } finally {
      setLoading(false);
    }
  };

  const loadRooms = async () => {
    setRoomsLoading(true);
    setError("");
    try {
      const result = await apiClient.get("Schedule/rooms");
      const payload = result?.data ?? result ?? [];
      if (!Array.isArray(payload)) {
        throw new Error(result?.message || "Khong tai duoc danh sach phong.");
      }
      setRooms(payload);
    } catch (err) {
      setError(err.message || "Khong tai duoc danh sach phong.");
    } finally {
      setRoomsLoading(false);
    }
  };

  const loadTeachers = async () => {
    setTeachersLoading(true);
    setError("");
    try {
      setTeachers(await p0Api.classes.teachersOverview());
    } catch (err) {
      setError(err.message || "Khong tai duoc danh sach giao vien.");
    } finally {
      setTeachersLoading(false);
    }
  };

  const formatServerDate = (val) => {
    if (!val) return null;
    try {
      if (typeof val === 'string') {
        // try ISO or yyyy-MM-dd
        const parsed = new Date(val);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString().slice(0, 10);
        }
        // fallback: return raw
        return val;
      }
      if (typeof val === 'object') {
        // DateOnly-like shapes: { Year, Month, Day } or { year, month, day }
        const y = val.Year ?? val.year ?? val.Year;
        const m = val.Month ?? val.month ?? val.Month;
        const d = val.Day ?? val.day ?? val.Day;
        if (y && m && d) {
          const mm = String(m).padStart(2, '0');
          const dd = String(d).padStart(2, '0');
          return `${y}-${mm}-${dd}`;
        }
        // fallback: if object has ToString-able fields
        if (val.toString) return String(val);
      }
      return null;
    } catch (e) {
      return null;
    }
  };

  useEffect(() => {
    loadClasses();
    loadRooms();
    loadTeachers();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("showRooms") === "1") {
      setShowRooms(true);
    }
  }, [location.search]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return classes.filter((cls) => !keyword || [
      cls.name,
      ...(cls.teachers || []).map((teacher) => teacher.name),
      ...(cls.courses || []).map((course) => course.name),
    ].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  }, [classes, search]);

  const saveEdit = async () => {
    if (!editing.name?.trim()) {
      setError("Ten lop hoc la bat buoc.");
      return;
    }
    setSaving(true);
    try {
      await p0Api.classes.update(editing.id, {
        name: editing.name.trim(),
        startDate: editing.startDate || null,
        endDate: editing.endDate || null,
        capacity: editing.capacity === "" ? null : Number(editing.capacity),
        active: Boolean(editing.active),
        courseIds: (editing.courses || []).map((course) => course.id),
        teacherIds: (editing.teachers || []).map((teacher) => teacher.id),
      });
      setToast("Da cap nhat lop hoc.");
      setEditing(null);
      await loadClasses();
    } catch (err) {
      setError(err.message || "Cap nhat lop hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  const removeClass = async (cls) => {
    if (!window.confirm(`Xoa mem lop ${cls.name}?`)) return;
    setSaving(true);
    try {
      await p0Api.classes.remove(cls.id);
      setClasses((current) => current.filter((item) => item.id !== cls.id));
      setToast("Đã xoá lớp học thành công");
    } catch (err) {
      setError(err.message || "Xoa lop hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h4 className="fw-bold">
          <i className="bi bi-mortarboard-fill me-2"></i>
          Quan ly lop hoc
        </h4>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate("/admin/rooms/create")}>Tạo phòng học</button>
          <button className="btn btn-outline-info" onClick={() => setShowRooms(s => !s)}>Danh sách phòng</button>
          <button className="btn btn-outline-info" onClick={() => setShowTeachers(s => !s)}>Danh sách giảng viên</button>
          <button className="btn btn-primary" onClick={() => navigate("/admin/classes/create")}>Thêm lớp học</button>
        </div>
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
              <button className="btn btn-primary px-4" onClick={() => setToast("")}>OK</button>
            </div>
          </div>
        </div>
      )}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <h6 className="fw-bold mb-3">Tim kiem va loc</h6>
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-search"></i></span>
                <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tim theo ten lop, giao vien, khoa hoc..." />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showRooms && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-3">Danh sach phong hoc hien co</h6>
            {roomsLoading ? (
              <div className="text-center py-4">Dang tai danh sach phong...</div>
            ) : rooms.length === 0 ? (
              <div className="text-center text-muted py-4">Chua co phong hoc nao.</div>
            ) : (
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ten phong</th>
                    <th>Trang thai</th>
                    <th>Thao tac</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room, index) => (
                    <tr key={room.id || room.maPhongHoc || index}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold"><i className="bi bi-door-open text-primary me-2"></i>{room.tenPhong ?? room.TenPhong ?? room.name}</td>
                      <td>
                        <span className={`badge ${room.active || room.TrangThai ? "bg-success" : "bg-secondary"}`}>
                          {(room.active || room.TrangThai) ? "Hoat dong" : "Khong hoat dong"}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-light border" onClick={() => navigate(`/admin/rooms/${room.id || room.maPhongHoc}/edit`)} title="Sua phong"><i className="bi bi-pencil"></i></button>
                          <button className="btn btn-light border" disabled={roomsLoading} onClick={async () => {
                            if (!window.confirm(`Xoa phong ${room.tenPhong || room.TenPhong || room.name}?`)) return;
                            try {
                              setRoomsLoading(true);
                              const id = room.id || room.maPhongHoc;
                              const res = await apiClient.delete(`Schedule/rooms/${id}`);
                              if (res && res.success === false) throw new Error(res.message || 'Xoa phong that bai');
                              await loadRooms();
                              setToast("Đã xoá phòng học thành công");
                            } catch (err) {
                              setError(err?.message || 'Xoa phong that bai.');
                            } finally {
                              setRoomsLoading(false);
                            }
                          }} title="Xoa phong"><i className="bi bi-trash"></i></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <small className="text-muted">Tong so {rooms.length} phong hoc</small>
          </div>
        </div>
      )}

      {showTeachers && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <h6 className="fw-bold mb-3">Danh sach giang vien va lop dang day</h6>
            {teachersLoading ? (
              <div className="text-center py-4">Dang tai danh sach giao vien...</div>
            ) : teachers.length === 0 ? (
              <div className="text-center text-muted py-4">Chua co giao vien nao.</div>
            ) : (
              <table className="table align-middle">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Giao vien</th>
                    <th>Lop hoc dang day</th>
                    <th>Khoa hoc</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map((teacher, index) => (
                    <tr key={teacher.id}>
                      <td>{index + 1}</td>
                      <td className="fw-semibold">
                        <i className="bi bi-person-badge text-primary me-2"></i>
                        {teacher.name}
                        {teacher.email && <div className="text-muted small">{teacher.email}</div>}
                      </td>
                      <td>
                        {teacher.classes.length === 0
                          ? <span className="text-muted">Chua co lop</span>
                          : teacher.classes.map((cls) => (
                              <span key={cls.classId} className="badge bg-secondary me-1 mb-1">{cls.className}</span>
                            ))}
                      </td>
                      <td>
                        {teacher.classes.length === 0
                          ? <span className="text-muted">-</span>
                          : Array.from(new Map(
                              teacher.classes.flatMap((cls) => cls.courses).map((course) => [course.id, course])
                            ).values()).map((course) => (
                              <span key={course.id} className="badge bg-info me-1 mb-1">{course.name}</span>
                            ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <small className="text-muted">Tong so {teachers.length} giao vien</small>
          </div>
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body">
          <h6 className="fw-bold mb-3">Danh sach lop hoc</h6>
          {loading ? (
            <div className="text-center py-4">Dang tai lop hoc...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-muted py-4">Chua co lop hoc phu hop.</div>
          ) : (
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ten lop hoc</th>
                  <th>Khoa hoc</th>
                  <th>Thoi gian hoc</th>
                  <th>Giao vien</th>
                  <th>Si so</th>
                  <th>Trang thai</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls, index) => (
                  <tr key={cls.id}>
                    <td>{index + 1}</td>
                    <td className="fw-semibold"><i className="bi bi-mortarboard text-primary me-2"></i>{cls.name}</td>
                    <td>{(cls.courses || []).map((course) => <span key={course.id} className="badge bg-info me-1">{course.name}</span>)}</td>
                    <td>{formatServerDate(cls.startDate) || "-"} {formatServerDate(cls.endDate) ? `- ${formatServerDate(cls.endDate)}` : ""}</td>
                    <td>{(cls.teachers || []).map((teacher) => <span key={teacher.id} className="badge bg-secondary me-1">{teacher.name}</span>)}</td>
                    <td><span className="badge bg-info">{cls.currentSize}/{cls.capacity || "Khong gioi han"}</span></td>
                    <td><span className={`badge ${cls.active ? "bg-success" : "bg-warning text-dark"}`}>{cls.active ? "Dang hoat dong" : "Tam dung"}</span></td>
                    <td>
                      <div className="btn-group">
                        <button className="btn btn-light border" onClick={() => navigate(`/admin/classes/assign-students?classId=${cls.id}`)} title="Gan hoc vien"><i className="bi bi-person-plus"></i></button>
                        <button className="btn btn-light border" disabled={saving} onClick={() => setEditing(cls)} title="Sua"><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-light border" disabled={saving} onClick={() => removeClass(cls)} title="Xoa"><i className="bi bi-eye-slash"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <small className="text-muted">Tong so {filtered.length} lop hoc</small>
        </div>
      </div>

      {editing && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sua lop hoc</h5>
                <button className="btn-close" onClick={() => setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Ten lop *</label>
                <input className="form-control mb-3" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <label className="form-label">Suc chua</label>
                <input type="number" className="form-control mb-3" value={editing.capacity ?? ""} onChange={(e) => setEditing({ ...editing, capacity: e.target.value })} />
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Ngay bat dau</label>
                    <input type="date" className="form-control" value={editing.startDate || ""} onChange={(e) => setEditing({ ...editing, startDate: e.target.value })} />
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Ngay ket thuc</label>
                    <input type="date" className="form-control" value={editing.endDate || ""} onChange={(e) => setEditing({ ...editing, endDate: e.target.value })} />
                  </div>
                </div>
                <select className="form-select" value={String(editing.active)} onChange={(e) => setEditing({ ...editing, active: e.target.value === "true" })}>
                  <option value="true">Dang hoat dong</option>
                  <option value="false">Tam dung</option>
                </select>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setEditing(null)}>Huy</button>
                <button className="btn btn-primary" disabled={saving} onClick={saveEdit}>{saving ? "Dang luu..." : "Luu"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClasses;
