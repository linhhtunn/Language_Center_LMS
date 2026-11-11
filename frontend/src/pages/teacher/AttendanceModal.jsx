import { useEffect, useState } from "react";

function AttendanceModal({ classData, onClose, onSave, saving = false }) {
  const [students, setStudents] = useState(classData.students || []);

  useEffect(() => {
    setStudents(classData.students || []);
  }, [classData]);

  const handleStatus = (id, status) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const handleSave = () => {
    onSave({
      ...classData,
      students,
      status: students.every((s) => s.status) ? "done" : "dang",
    });
  };

  const stats = {
    present: students.filter((s) => s.status === "present").length,
    absent: students.filter((s) => s.status === "absent").length,
    late: students.filter((s) => s.status === "late").length,
    excused: students.filter((s) => s.status === "excused").length,
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content border-0 rounded-4 shadow">
          <div className="modal-header border-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold">Diem danh: {classData.className}</h5>
              <p className="text-muted small mb-0">{classData.time} - Phong {classData.room}</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            <div className="d-flex gap-4 p-3 bg-light rounded-3 mb-3 text-center">
              <div className="flex-fill"><small className="d-block text-muted">Tong so</small><span className="fw-bold">{students.length}</span></div>
              <div className="flex-fill text-success"><small className="d-block text-muted">Co mat</small><span className="fw-bold">{stats.present}</span></div>
              <div className="flex-fill text-danger"><small className="d-block text-muted">Vang</small><span className="fw-bold">{stats.absent}</span></div>
              <div className="flex-fill text-warning"><small className="d-block text-muted">Muon</small><span className="fw-bold">{stats.late}</span></div>
              <div className="flex-fill text-primary"><small className="d-block text-muted">Co phep</small><span className="fw-bold">{stats.excused}</span></div>
            </div>

            <button className="btn btn-outline-primary btn-sm mb-3" onClick={() => setStudents(students.map((s) => ({ ...s, status: "present" })))}>
              Chon tat ca co mat
            </button>

            <div className="list-group list-group-flush">
              {students.length === 0 ? (
                <div className="text-center text-muted py-4">Chua co hoc sinh trong lop.</div>
              ) : students.map((s, index) => (
                <div key={s.id} className="list-group-item d-flex align-items-center py-3 px-0 border-bottom">
                  <span className="text-muted me-3" style={{ width: "25px" }}>{index + 1}</span>
                  <div className="flex-grow-1">
                    <div className="fw-semibold">{s.name}</div>
                  </div>

                  <div className="btn-group me-3">
                    <button className={`btn btn-sm ${s.status === "present" ? "btn-success" : "btn-outline-success"}`} onClick={() => handleStatus(s.id, "present")}>Co</button>
                    <button className={`btn btn-sm ${s.status === "absent" ? "btn-danger" : "btn-outline-danger"}`} onClick={() => handleStatus(s.id, "absent")}>Vang</button>
                    <button className={`btn btn-sm ${s.status === "late" ? "btn-warning text-white" : "btn-outline-warning"}`} onClick={() => handleStatus(s.id, "late")}>Muon</button>
                    <button className={`btn btn-sm ${s.status === "excused" ? "btn-primary" : "btn-outline-primary"}`} onClick={() => handleStatus(s.id, "excused")}>Phep</button>
                  </div>

                  <input
                    type="text"
                    className="form-control form-control-sm w-25"
                    placeholder="Ghi chu..."
                    value={s.note || ""}
                    onChange={(e) => setStudents(students.map((st) => (st.id === s.id ? { ...st, note: e.target.value } : st)))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer border-0">
            <button className="btn btn-light px-4" onClick={onClose}>Huy</button>
            <button className="btn btn-dark px-4" disabled={saving} onClick={handleSave}>{saving ? "Dang luu..." : "Luu diem danh"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendanceModal;
