import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { p0Api } from "../../api/p0Api";

const getRoleId = (role) => role.id ?? role.maVaiTro;
const getRoleName = (role) => role.name ?? role.tenVaiTro ?? role.roleName;
const accountTypeByRole = { Admin: 1, Giao_Vien: 2, Hoc_Sinh: 3, Phu_Huynh: 4 };

const AdminCreateUser = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    roleId: "",
    password: "",
    confirmPassword: "",
    active: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    p0Api.roles.list().then(setRoles).catch((err) => setError(err.message || "Khong tai duoc vai tro."));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setToast("");

    if (!form.fullName.trim() || !form.username.trim() || !form.password || !form.roleId) {
      setError("Vui long nhap ho ten, username, mat khau va vai tro.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Mat khau xac nhan khong khop.");
      return;
    }

    const role = roles.find((item) => String(getRoleId(item)) === String(form.roleId));
    const roleName = getRoleName(role || {});

    setSaving(true);
    try {
      await p0Api.users.create({
        username: form.username.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        email: form.email.trim() || null,
        accountType: accountTypeByRole[roleName] || 3,
        roleIds: [Number(form.roleId)],
      });
      setToast("Da tao nguoi dung.");
      setTimeout(() => navigate("/admin/users"), 500);
    } catch (err) {
      setError(err.message || "Tao nguoi dung that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      <button className="btn btn-link mb-3" onClick={() => navigate("/admin/users")}>
        <i className="bi bi-arrow-left"></i> Quay lai
      </button>

      <h4 className="fw-bold text-primary mb-4">
        <i className="bi bi-person-plus me-2"></i>
        Them nguoi dung moi
      </h4>

      {toast && <div className="alert alert-success">{toast}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        <div className="col-md-7">
          <div className="card shadow-sm">
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <h6 className="text-primary mb-3">Thong tin ca nhan</h6>

                <div className="mb-3">
                  <label className="form-label">Ho ten *</label>
                  <input className="form-control" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Username *</label>
                  <input className="form-control" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </div>

                <div className="mb-4">
                  <label className="form-label">Dia chi Email</label>
                  <input className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>

                <h6 className="text-primary mb-3">Thong tin tai khoan</h6>

                <div className="mb-3">
                  <label className="form-label">Vai tro *</label>
                  <select className="form-select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                    <option value="">Chon vai tro</option>
                    {roles.map((role) => <option key={getRoleId(role)} value={getRoleId(role)}>{getRoleName(role)}</option>)}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Mat khau *</label>
                  <input type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Xac nhan mat khau *</label>
                  <input type="password" className="form-control" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} />
                </div>

                <div className="form-check mb-4">
                  <input type="checkbox" className="form-check-input" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  <label className="form-check-label">Kich hoat tai khoan</label>
                </div>

                <div className="d-flex justify-content-end gap-2">
                  <button type="button" className="btn btn-light" onClick={() => navigate("/admin/users")}>Huy</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <i className="bi bi-person-plus me-2"></i>
                    {saving ? "Dang tao..." : "Tao nguoi dung"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-5">
          <div className="card shadow-sm h-100">
            <div className="card-body d-flex flex-column justify-content-center align-items-center text-center">
              <i className="bi bi-mortarboard-fill text-primary" style={{ fontSize: "60px" }}></i>
              <h5 className="mt-3">Tao tai khoan moi</h5>
              <p className="text-muted">Them nguoi dung vao he thong de quan ly va phan quyen.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCreateUser;
