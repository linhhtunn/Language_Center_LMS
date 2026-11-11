import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { p0Api } from "../../api/p0Api";

export default function AdminCreateCourse() {
  const navigate = useNavigate();
  const [course, setCourse] = useState({ name: "", price: "", description: "", active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!course.name.trim()) {
      setError("Ten khoa hoc la bat buoc.");
      return;
    }
    setSaving(true);
    try {
      await p0Api.courses.create({
        name: course.name.trim(),
        description: course.description || null,
        basePrice: course.price === "" ? null : Number(course.price),
        active: course.active,
      });
      setToast("Da tao khoa hoc.");
      setTimeout(() => navigate("/admin/courses"), 500);
    } catch (err) {
      setError(err.message || "Tao khoa hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>Quay lai</button>
      <h3 className="mb-4">Tao khoa hoc moi</h3>
      {toast && <div className="alert alert-success">{toast}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        <div className="col-md-6">
          <div className="card p-4">
            <h5 className="mb-3">Thong tin khoa hoc</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label">Ten khoa hoc *</label>
                <input className="form-control" value={course.name} onChange={(e) => setCourse({ ...course, name: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Hoc phi</label>
                <input type="number" className="form-control" value={course.price} onChange={(e) => setCourse({ ...course, price: e.target.value })} />
              </div>
              <div className="mb-3">
                <label className="form-label">Trang thai</label>
                <select className="form-select" value={String(course.active)} onChange={(e) => setCourse({ ...course, active: e.target.value === "true" })}>
                  <option value="true">Hoat dong</option>
                  <option value="false">Tam dung</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Mo ta</label>
                <textarea className="form-control" rows="3" value={course.description} onChange={(e) => setCourse({ ...course, description: e.target.value })} />
              </div>
              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Huy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Dang tao..." : "Tao khoa hoc"}</button>
              </div>
            </form>
          </div>
        </div>
        <div className="col-md-6 d-flex align-items-center justify-content-center">
          <div className="text-center">
            <div style={{ fontSize: "70px" }}><i className="bi bi-book"></i></div>
            <h5 className="mt-3">Tao khoa hoc moi</h5>
            <p className="text-muted">Them khoa hoc de quan ly chuong trinh dao tao va lop hoc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
