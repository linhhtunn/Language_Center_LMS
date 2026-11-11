import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { p0Api } from "../../api/p0Api";

const pageSize = 5;

const AdminCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState(null);

  const loadCourses = async () => {
    setLoading(true);
    setError("");
    try {
      setCourses(await p0Api.courses.list());
    } catch (err) {
      setError(err.message || "Khong tai duoc khoa hoc.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return courses.filter((course) => !keyword || [course.name, course.description].filter(Boolean).join(" ").toLowerCase().includes(keyword));
  }, [courses, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const saveEdit = async () => {
    if (!editing.name?.trim()) {
      setError("Ten khoa hoc la bat buoc.");
      return;
    }
    setSaving(true);
    try {
      await p0Api.courses.update(editing.id, {
        name: editing.name.trim(),
        description: editing.description || null,
        basePrice: editing.basePrice === "" ? null : Number(editing.basePrice),
        active: Boolean(editing.active),
      });
      setToast("Da cap nhat khoa hoc.");
      setEditing(null);
      await loadCourses();
    } catch (err) {
      setError(err.message || "Cap nhat khoa hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  const removeCourse = async (course) => {
    if (!window.confirm(`Xoa mem khoa hoc ${course.name}?`)) return;
    setSaving(true);
    try {
      await p0Api.courses.remove(course.id);
      setCourses((current) => current.filter((item) => item.id !== course.id));
      setToast("Da xoa mem khoa hoc.");
    } catch (err) {
      setError(err.message || "Xoa khoa hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="fw-bold mb-4">Quan ly khoa hoc</h2>
      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card shadow-sm rounded-4">
        <div className="card-body">
          <div className="d-flex justify-content-between mb-3">
            <h5>Danh sach khoa hoc</h5>
            <button className="btn btn-primary" onClick={() => navigate("/admin/courses/create")}>Them khoa hoc</button>
          </div>

          <input className="form-control mb-3" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Tim khoa hoc..." />

          {loading ? (
            <div className="text-center py-4">Dang tai khoa hoc...</div>
          ) : paged.length === 0 ? (
            <div className="text-center text-muted py-4">Chua co khoa hoc phu hop.</div>
          ) : (
            <>
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Ten khoa hoc</th>
                    <th>Mo ta</th>
                    <th>Hoc phi</th>
                    <th>Trang thai</th>
                    <th>Hanh dong</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((course, index) => (
                    <tr key={course.id}>
                      <td>{(page - 1) * pageSize + index + 1}</td>
                      <td>{course.name}</td>
                      <td>{course.description || "-"}</td>
                      <td>{course.basePrice?.toLocaleString?.("vi-VN") || "-"}</td>
                      <td><span className={`badge ${course.active ? "bg-success" : "bg-secondary"}`}>{course.active ? "Hoat dong" : "Tam dung"}</span></td>
                      <td>
                        <button className="btn btn-warning btn-sm me-2" disabled={saving} onClick={() => setEditing(course)}>Sua</button>
                        <button className="btn btn-danger btn-sm" disabled={saving} onClick={() => removeCourse(course)}>Xoa</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">Trang {page}/{pageCount} - tong {filtered.length} khoa hoc</small>
                <div className="btn-group">
                  <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Truoc</button>
                  <button className="btn btn-outline-secondary btn-sm" disabled={page >= pageCount} onClick={() => setPage(page + 1)}>Sau</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {editing && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sua khoa hoc</h5>
                <button className="btn-close" onClick={() => setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <label className="form-label">Ten khoa hoc *</label>
                <input className="form-control mb-3" value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                <label className="form-label">Hoc phi</label>
                <input type="number" className="form-control mb-3" value={editing.basePrice ?? ""} onChange={(e) => setEditing({ ...editing, basePrice: e.target.value })} />
                <label className="form-label">Mo ta</label>
                <textarea className="form-control mb-3" rows="3" value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
                <select className="form-select" value={String(editing.active)} onChange={(e) => setEditing({ ...editing, active: e.target.value === "true" })}>
                  <option value="true">Hoat dong</option>
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

export default AdminCourses;
