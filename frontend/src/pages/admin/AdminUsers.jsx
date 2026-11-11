import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { p0Api } from "../../api/p0Api";
import { useAuth } from "../../context/AuthContext";

const getRoleId = (role) => role.id ?? role.maVaiTro;
const getRoleName = (role) => role.name ?? role.tenVaiTro ?? role.roleName;
const accountTypeByRole = { Admin: 1, Giao_Vien: 2, Hoc_Sinh: 3, Phu_Huynh: 4 };

const AdminUsers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const permissionCodes = Array.isArray(user?.permissionCodes) ? user.permissionCodes : [];
  const canCreateUser = permissionCodes.includes("USERS_CREATE") || user?.role === "Admin";
  const canEditUser = permissionCodes.includes("USERS_EDIT") || user?.role === "Admin";
  const canDeleteUser = permissionCodes.includes("USERS_DELETE") || user?.role === "Admin";

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
  const [linkingParent, setLinkingParent] = useState(null);
  const [parentChildren, setParentChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [relationLoading, setRelationLoading] = useState(false);

  // States for Teacher Course Assignment
  const [assigningTeacher, setAssigningTeacher] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [teacherSpecsList, setTeacherSpecsList] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [userRows, roleRows, specRows] = await Promise.all([
        p0Api.users.list(),
        p0Api.roles.list(),
        p0Api.teacherSpecializations.list()
      ]);
      setUsers(userRows || []);
      setRoles(roleRows || []);
      setTeacherSpecsList(specRows || []);
    } catch (err) {
      setError(err.message || "Khong tai duoc danh sach nguoi dung.");
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return users.filter((item) => {
      const roleNames = (item.roles || []).map((role) => role.name).join(" ");
      const matchesKeyword = !keyword || [item.fullName, item.username, item.email, roleNames]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(keyword);
      const matchesRole = !roleFilter || (item.roles || []).some((role) => role.name === roleFilter);
      const matchesActive = activeFilter === "" || String(item.active) === activeFilter;
      return matchesKeyword && matchesRole && matchesActive;
    });
  }, [users, search, roleFilter, activeFilter]);

  const openEdit = (item) => {
    setEditing({
      ...item,
      roleIds: (item.roles || []).map((role) => role.id),
    });
  };

  const updateEditingRole = (roleId, checked) => {
    const roleIds = checked
      ? [...editing.roleIds, roleId]
      : editing.roleIds.filter((id) => id !== roleId);
    const firstRoleName = getRoleName(roles.find((role) => getRoleId(role) === roleIds[0]) || {});
    setEditing({
      ...editing,
      roleIds,
      accountType: accountTypeByRole[firstRoleName] || editing.accountType || 3,
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await p0Api.users.update(editing.id, {
        username: editing.username,
        fullName: editing.fullName,
        email: editing.email,
        accountType: Number(editing.accountType || 3),
        active: Boolean(editing.active),
      });
      await p0Api.users.updateRoles(editing.id, editing.roleIds);
      setToast("Da cap nhat nguoi dung.");
      setEditing(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Cap nhat nguoi dung that bai.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Xoa mem nguoi dung ${item.fullName || item.username}?`)) return;
    setSaving(true);
    setError("");
    try {
      await p0Api.users.remove(item.id);
      setUsers((current) => current.filter((row) => row.id !== item.id));
      setToast("Da xoa mem nguoi dung.");
    } catch (err) {
      setError(err.message || "Xoa nguoi dung that bai.");
    } finally {
      setSaving(false);
    }
  };

  const hasRole = (item, roleName) => (item.roles || []).some((role) => role.name === roleName);

  const openParentChildren = async (item) => {
    setLinkingParent(item);
    setParentChildren([]);
    setSelectedChildId("");
    setRelationLoading(true);
    setError("");
    try {
      setParentChildren(await p0Api.parents.children(item.id));
    } catch (err) {
      setError(err.message || "Khong tai duoc danh sach con cua phu huynh.");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!linkingParent || !selectedChildId) return;
    setRelationLoading(true);
    setError("");
    try {
      await p0Api.parents.addChild(linkingParent.id, selectedChildId);
      setParentChildren(await p0Api.parents.children(linkingParent.id));
      setSelectedChildId("");
      setToast("Da gan hoc sinh cho phu huynh.");
    } catch (err) {
      setError(err.message || "Gan phu huynh voi hoc sinh that bai.");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleRemoveChild = async (studentId) => {
    if (!linkingParent) return;
    setRelationLoading(true);
    setError("");
    try {
      await p0Api.parents.removeChild(linkingParent.id, studentId);
      setParentChildren((current) => current.filter((row) => row.studentId !== studentId));
      setToast("Da go hoc sinh khoi phu huynh.");
    } catch (err) {
      setError(err.message || "Go lien ket phu huynh-hoc sinh that bai.");
    } finally {
      setRelationLoading(false);
    }
  };

  const openTeacherCourses = async (item) => {
    setAssigningTeacher(item);
    setTeacherCourses([]);
    setRelationLoading(true);
    setError("");
    try {
      if (coursesList.length === 0) {
        const list = await p0Api.courses.list();
        setCoursesList(list);
      }
      const teacherSpecs = teacherSpecsList.find(
        (s) => String(s.maGiangVien) === String(item.profileId)
      );
      setTeacherCourses(teacherSpecs ? teacherSpecs.courseIds : []);
    } catch (err) {
      setError(err.message || "Không thể tải danh sách môn học của giáo viên.");
    } finally {
      setRelationLoading(false);
    }
  };

  const handleSaveTeacherCourses = async () => {
    if (!assigningTeacher) return;
    setRelationLoading(true);
    setError("");
    try {
      await p0Api.teacherSpecializations.assign({
        MaGiangVien: assigningTeacher.profileId,
        CourseIds: teacherCourses
      });
      setToast("Đã phân công môn dạy cho giảng viên.");
      setAssigningTeacher(null);
      await loadData();
    } catch (err) {
      setError(err.message || "Phân công môn dạy thất bại.");
    } finally {
      setRelationLoading(false);
    }
  };

  const roleColor = (role) => {
    if (role === "Admin") return "bg-danger";
    if (role === "Giao_Vien") return "bg-success";
    if (role === "Phu_Huynh") return "bg-warning text-dark";
    return "bg-info";
  };

  const availableStudents = users.filter((item) =>
    hasRole(item, "Hoc_Sinh") &&
    item.profileId &&
    !parentChildren.some((child) => child.studentId === item.profileId)
  );

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold">
          <i className="bi bi-people me-2"></i>
          Quan ly nguoi dung
        </h3>
        {canCreateUser && (
          <button className="btn btn-primary" onClick={() => navigate("/admin/users/create")}>
            <i className="bi bi-person-plus me-2"></i>
            Them nguoi dung
          </button>
        )}
      </div>

      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-6">
              <input className="form-control" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tim theo ten, username, email..." />
            </div>
            <div className="col-md-3">
              <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">Tat ca vai tro</option>
                {roles.map((role) => <option key={getRoleId(role)} value={getRoleName(role)}>{getRoleName(role)}</option>)}
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select" value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
                <option value="">Tat ca trang thai</option>
                <option value="true">Hoat dong</option>
                <option value="false">Tam khoa</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">Dang tai danh sach...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center text-muted py-4">Chua co nguoi dung phu hop.</div>
          ) : (
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Ho ten</th>
                  <th>Email</th>
                  <th>Vai tro</th>
                  <th>Trang thai</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((item, index) => (
                  <tr key={item.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <i className="bi bi-person-circle me-2 fs-4"></i>
                        <div>
                          <div>{item.fullName || item.username}</div>
                          <div className="d-flex flex-column">
                            <small className="text-muted">{item.username}</small>
                            {hasRole(item, "Giao_Vien") && item.profileId && (
                              <small className="text-info fw-semibold mt-1">
                                <i className="bi bi-book-half me-1"></i>
                                Chuyên môn: {
                                  teacherSpecsList.find(s => String(s.maGiangVien) === String(item.profileId))?.courseNames.join(", ") || "Chưa phân công"
                                }
                              </small>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>{item.email || "-"}</td>
                    <td>
                      {(item.roles || []).map((role) => (
                        <span key={role.id} className={`badge me-1 ${roleColor(role.name)}`}>{role.name}</span>
                      ))}
                    </td>
                    <td><span className={`badge ${item.active ? "bg-success" : "bg-secondary"}`}>{item.active ? "Hoat dong" : "Tam khoa"}</span></td>
                    <td>
                      {canEditUser && hasRole(item, "Phu_Huynh") && (
                        <button className="btn btn-outline-success btn-sm me-2" disabled={saving} onClick={() => openParentChildren(item)} title="Gan hoc sinh cho phu huynh">
                          <i className="bi bi-diagram-3"></i>
                        </button>
                      )}
                      {canEditUser && hasRole(item, "Giao_Vien") && item.profileId && (
                        <button className="btn btn-outline-info btn-sm me-2" disabled={saving || relationLoading} onClick={() => openTeacherCourses(item)} title="Phân công môn dạy">
                          <i className="bi bi-book"></i>
                        </button>
                      )}
                      {canEditUser && <button className="btn btn-outline-primary btn-sm me-2" disabled={saving} onClick={() => openEdit(item)}><i className="bi bi-pencil"></i></button>}

                      {canDeleteUser && <button className="btn btn-outline-danger btn-sm" disabled={saving} onClick={() => handleDelete(item)}><i className="bi bi-trash"></i></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Sua nguoi dung</h5>
                <button className="btn-close" onClick={() => setEditing(null)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Username *</label>
                    <input className="form-control" value={editing.username || ""} onChange={(e) => setEditing({ ...editing, username: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Ho ten *</label>
                    <input className="form-control" value={editing.fullName || ""} onChange={(e) => setEditing({ ...editing, fullName: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input className="form-control" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Trang thai</label>
                    <select className="form-select" value={String(editing.active)} onChange={(e) => setEditing({ ...editing, active: e.target.value === "true" })}>
                      <option value="true">Hoat dong</option>
                      <option value="false">Tam khoa</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Vai tro</label>
                    <div className="d-flex flex-wrap gap-3">
                      {roles.map((role) => {
                        const roleId = getRoleId(role);
                        return (
                          <label key={roleId} className="form-check">
                            <input className="form-check-input" type="checkbox" checked={editing.roleIds.includes(roleId)} onChange={(e) => updateEditingRole(roleId, e.target.checked)} />
                            <span className="form-check-label">{getRoleName(role)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setEditing(null)}>Huy</button>
                <button className="btn btn-primary" disabled={saving} onClick={handleSave}>{saving ? "Dang luu..." : "Luu"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {linkingParent && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Gan hoc sinh cho phu huynh</h5>
                <button className="btn-close" onClick={() => setLinkingParent(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="fw-semibold">{linkingParent.fullName || linkingParent.username}</div>
                  <small className="text-muted">{linkingParent.email || linkingParent.username}</small>
                </div>

                <div className="row g-2 mb-3">
                  <div className="col-md-9">
                    <select className="form-select" value={selectedChildId} onChange={(e) => setSelectedChildId(e.target.value)} disabled={relationLoading}>
                      <option value="">Chon hoc sinh</option>
                      {availableStudents.map((student) => (
                        <option key={student.profileId} value={student.profileId}>
                          {student.fullName || student.username} - {student.email || student.username}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <button className="btn btn-success w-100" disabled={!selectedChildId || relationLoading} onClick={handleAddChild}>
                      {relationLoading ? "Dang luu..." : "Gan"}
                    </button>
                  </div>
                </div>

                {relationLoading && parentChildren.length === 0 ? (
                  <div className="text-center py-4">Dang tai danh sach...</div>
                ) : parentChildren.length === 0 ? (
                  <div className="text-center text-muted py-4 border rounded">Phu huynh nay chua duoc gan hoc sinh.</div>
                ) : (
                  <table className="table align-middle">
                    <thead>
                      <tr>
                        <th>Hoc sinh</th>
                        <th>Email</th>
                        <th>Trang thai</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {parentChildren.map((child) => (
                        <tr key={child.studentId}>
                          <td>{child.fullName}</td>
                          <td>{child.email || "-"}</td>
                          <td><span className={`badge ${child.active ? "bg-success" : "bg-secondary"}`}>{child.active ? "Dang lien ket" : "Tam khoa"}</span></td>
                          <td className="text-end">
                            <button className="btn btn-outline-danger btn-sm" disabled={relationLoading} onClick={() => handleRemoveChild(child.studentId)}>
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setLinkingParent(null)}>Dong</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {assigningTeacher && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,.45)" }}>
          <div className="modal-dialog modal-md modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Phân công môn dạy cho giảng viên</h5>
                <button className="btn-close" onClick={() => setAssigningTeacher(null)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="fw-semibold text-primary fs-5">{assigningTeacher.fullName || assigningTeacher.username}</div>
                  <small className="text-muted">Username: {assigningTeacher.username}</small>
                </div>
                
                <label className="form-label fw-bold">Danh sách môn học (Khóa học):</label>
                {relationLoading ? (
                  <div className="text-center py-3">Đang tải danh sách...</div>
                ) : coursesList.length === 0 ? (
                  <div className="text-muted py-2">Không có môn học nào khả dụng.</div>
                ) : (
                  <div className="d-flex flex-column gap-2" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {coursesList.map((course) => {
                      const isChecked = teacherCourses.includes(course.id);
                      return (
                        <label key={course.id} className="form-check d-flex align-items-center">
                          <input 
                            className="form-check-input me-2" 
                            type="checkbox" 
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTeacherCourses([...teacherCourses, course.id]);
                              } else {
                                setTeacherCourses(teacherCourses.filter(id => id !== course.id));
                              }
                            }}
                          />
                          <span className="form-check-label">{course.name}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-light" onClick={() => setAssigningTeacher(null)}>Hủy</button>
                <button 
                  className="btn btn-primary" 
                  disabled={relationLoading} 
                  onClick={handleSaveTeacherCourses}
                >
                  {relationLoading ? "Đang lưu..." : "Lưu phân công"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
