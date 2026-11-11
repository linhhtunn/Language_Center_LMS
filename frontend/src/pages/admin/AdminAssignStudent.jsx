import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { p0Api } from "../../api/p0Api";

const AdminAssignStudent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(searchParams.get("classId") || "");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const selectedClass = classes.find((cls) => cls.id === selectedClassId);
  const assignedIds = new Set(classStudents.map((item) => item.studentId));
  const isFull = selectedClass?.capacity && selectedClass.currentSize >= selectedClass.capacity;

  useEffect(() => {
    Promise.all([p0Api.classes.list(), p0Api.users.list()])
      .then(([classRows, userRows]) => {
        setClasses(classRows || []);
        setStudents((userRows || []).filter((item) => (item.accountType === 3 || (item.roles || []).some((role) => role.name === "Hoc_Sinh")) && item.profileId));
      })
      .catch((err) => setError(err.message || "Khong tai duoc du lieu."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setClassStudents([]);
      return;
    }
    setLoading(true);
    p0Api.classes.students(selectedClassId)
      .then(setClassStudents)
      .catch((err) => setError(err.message || "Khong tai duoc hoc sinh trong lop."))
      .finally(() => setLoading(false));
  }, [selectedClassId]);

  const availableStudents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return students.filter((student) => !assignedIds.has(student.profileId) && (!keyword || [student.fullName, student.email, student.username].filter(Boolean).join(" ").toLowerCase().includes(keyword)));
  }, [students, assignedIds, search]);

  const toggleStudent = (id) => {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const refreshClass = async () => {
    const [classRows, classStudentRows] = await Promise.all([p0Api.classes.list(), p0Api.classes.students(selectedClassId)]);
    setClasses(classRows || []);
    setClassStudents(classStudentRows || []);
  };

  const addSelected = async () => {
    if (!selectedClassId || selected.length === 0) return;
    setSaving(true);
    setError("");
    try {
      for (const studentId of selected) {
        await p0Api.classes.addStudent(selectedClassId, studentId);
      }
      setSelected([]);
      setToast("Da them hoc sinh vao lop.");
      await refreshClass();
    } catch (err) {
      setError(err.message || "Them hoc sinh vao lop that bai.");
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (student) => {
    if (!window.confirm(`Go ${student.fullName} khoi lop?`)) return;
    setSaving(true);
    try {
      await p0Api.classes.removeStudent(selectedClassId, student.studentId);
      setToast("Da go hoc sinh khoi lop.");
      await refreshClass();
    } catch (err) {
      setError(err.message || "Go hoc sinh that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <button className="btn btn-link mb-3" onClick={() => navigate(-1)}>Quay lai</button>
      <h3 className="fw-bold mb-4">Gan hoc vien cho lop hoc</h3>
      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="card mb-3">
        <div className="card-body">
          <label className="form-label">Chon lop</label>
          <select className="form-select" value={selectedClassId} onChange={(e) => { setSelectedClassId(e.target.value); setSelected([]); }}>
            <option value="">Chon lop hoc</option>
            {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.name} ({cls.currentSize}/{cls.capacity || "khong gioi han"})</option>)}
          </select>
          {isFull && <div className="alert alert-warning mt-3 mb-0">Lop da day, khong the them hoc sinh moi.</div>}
        </div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between mb-3">
                <h5>Danh sach hoc vien co san</h5>
                <div>
                  <button className="btn btn-outline-primary btn-sm me-2" disabled={!selectedClassId || isFull} onClick={() => setSelected(availableStudents.map((s) => s.profileId))}>Chon tat ca</button>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelected([])}>Bo chon</button>
                </div>
              </div>

              <input className="form-control mb-3" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tim kiem hoc vien..." />

              {loading ? (
                <div className="text-center py-4">Dang tai...</div>
              ) : !selectedClassId ? (
                <div className="text-center text-muted py-4">Chon lop truoc khi gan hoc vien.</div>
              ) : availableStudents.length === 0 ? (
                <div className="text-center text-muted py-4">Khong con hoc vien kha dung.</div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Hoc sinh</th>
                      <th>Email</th>
                      <th>Trang thai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {availableStudents.map((student) => (
                      <tr key={student.profileId}>
                        <td><input type="checkbox" checked={selected.includes(student.profileId)} disabled={isFull} onChange={() => toggleStudent(student.profileId)} /></td>
                        <td>{student.fullName}</td>
                        <td>{student.email || "-"}</td>
                        <td><span className={`badge ${student.active ? "bg-success" : "bg-secondary"}`}>{student.active ? "Hoat dong" : "Tam khoa"}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card mb-3">
            <div className="card-body text-center">
              <h5 className="mb-3">Tong quan hoc vien</h5>
              <p className="text-muted">{selectedClass ? `${selectedClass.currentSize}/${selectedClass.capacity || "khong gioi han"} hoc vien trong lop` : "Chua chon lop"}</p>
              <p className="text-muted">{selected.length === 0 ? "Chua co hoc vien nao duoc chon" : `${selected.length} hoc vien duoc chon`}</p>
              <button className="btn btn-primary w-100" disabled={saving || !selectedClassId || selected.length === 0 || isFull} onClick={addSelected}>{saving ? "Dang cap nhat..." : "Cap nhat danh sach hoc vien"}</button>
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h6>Hoc vien trong lop</h6>
              {classStudents.length === 0 ? (
                <div className="text-muted small">Chua co hoc vien trong lop.</div>
              ) : (
                <div className="list-group list-group-flush">
                  {classStudents.map((student) => (
                    <div key={student.studentId} className="list-group-item d-flex justify-content-between align-items-center px-0">
                      <span>{student.fullName}</span>
                      <button className="btn btn-outline-danger btn-sm" disabled={saving} onClick={() => removeStudent(student)}>Go</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAssignStudent;
