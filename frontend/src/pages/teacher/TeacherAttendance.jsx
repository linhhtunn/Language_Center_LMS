import { useEffect, useMemo, useState } from "react";
import { p0Api } from "../../api/p0Api";
import AttendanceModal from "./AttendanceModal";
import { formatPeriodLabel } from "../../constants/scheduleTime";

const slotTime = (start, end) => formatPeriodLabel(start, end);

function TeacherAttendance() {
  const [activeTab, setActiveTab] = useState("can_diem_danh");
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const loadBoard = async () => {
    setLoading(true);
    setError("");
    try {
      const board = await p0Api.schedule.teacherBoard();
      const scheduleRows = board?.schedules || [];
      const items = await Promise.all(scheduleRows.map(async (row) => {
        let attendance = [];
        try {
          attendance = await p0Api.attendance.get(row.maLopHoc, row.maBuoiHoc);
        } catch {
          attendance = [];
        }
        const hasSaved = attendance.some((item) => item.status);
        return {
          id: row.maBuoiHoc,
          classId: row.maLopHoc,
          sessionId: row.maBuoiHoc,
          className: row.className || row.classCode,
          subject: row.subject,
          time: `${row.ngayHoc} - ${slotTime(row.slotId, row.slotEndId)}`,
          room: row.room || "Chua gan phong",
          status: hasSaved ? "done" : "chua",
          students: attendance.map((item) => ({
            id: item.studentId,
            name: item.studentName,
            status: item.status || null,
            note: item.note || "",
          })),
        };
      }));
      setClasses(items);
    } catch (err) {
      setError(err.message || "Khong tai duoc lich diem danh.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoard();
  }, []);

  const totalClasses = classes.length;
  const doneClasses = classes.filter((c) => c.status === "done").length;
  const pendingClasses = totalClasses - doneClasses;

  const filteredClasses = useMemo(() => classes.filter((item) => {
    if (activeTab === "can_diem_danh") return item.status === "chua" || item.status === "dang";
    if (activeTab === "da_diem_danh") return item.status === "done";
    return true;
  }), [classes, activeTab]);

  const handleOpen = async (item) => {
    setError("");
    try {
      const attendance = await p0Api.attendance.get(item.classId, item.sessionId);
      setSelectedClass({
        ...item,
        students: attendance.map((row) => ({
          id: row.studentId,
          name: row.studentName,
          status: row.status || null,
          note: row.note || "",
        })),
      });
    } catch (err) {
      setError(err.message || "Khong tai duoc chi tiet diem danh.");
    }
  };

  const handleSave = async (updatedClass) => {
    setSaving(true);
    setError("");
    try {
      await p0Api.attendance.save(updatedClass.classId, updatedClass.sessionId, updatedClass.students.map((student) => ({
        studentId: student.id,
        status: student.status || "absent",
        note: student.note || null,
      })));
      setClasses((current) => current.map((item) => item.id === updatedClass.id ? { ...updatedClass, status: "done" } : item));
      setSelectedClass(null);
      setToast("Da luu diem danh.");
    } catch (err) {
      setError(err.message || "Luu diem danh that bai.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid p-4 bg-light min-vh-100">
      <h2 className="fw-bold mb-4">Diem danh</h2>
      {toast && <div className="alert alert-success py-2">{toast}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <div className="row mb-4 text-center">
        <div className="col-md-4 mb-3"><div className="card p-3 shadow-sm border-0 rounded-4"><h6 className="text-muted small uppercase">Tong so lop hom nay</h6><h3 className="fw-bold mb-0">{totalClasses}</h3></div></div>
        <div className="col-md-4 mb-3"><div className="card p-3 shadow-sm border-0 rounded-4"><h6 className="text-muted small">Da diem danh</h6><h3 className="fw-bold mb-0 text-success">{doneClasses}</h3></div></div>
        <div className="col-md-4 mb-3"><div className="card p-3 shadow-sm border-0 rounded-4"><h6 className="text-muted small">Chua diem danh</h6><h3 className="fw-bold mb-0 text-danger">{pendingClasses}</h3></div></div>
      </div>

      <div className="card shadow-sm border-0 rounded-4 overflow-hidden">
        <div className="d-flex border-bottom bg-white text-center">
          {["can_diem_danh", "da_diem_danh", "tat_ca"].map((tab) => (
            <button key={tab} className={`flex-fill p-3 border-0 bg-white fw-semibold ${activeTab === tab ? "text-primary border-bottom border-primary border-3" : "text-muted"}`} onClick={() => setActiveTab(tab)}>
              {tab === "can_diem_danh" ? "Can diem danh" : tab === "da_diem_danh" ? "Da diem danh" : "Tat ca lop"}
            </button>
          ))}
        </div>

        <div className="table-responsive p-3 bg-white">
          {loading ? (
            <div className="text-center py-4">Dang tai lich diem danh...</div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center text-muted py-4">Khong co buoi hoc phu hop.</div>
          ) : (
            <table className="table align-middle">
              <thead className="table-light">
                <tr>
                  <th>Ten lop hoc</th>
                  <th>Thoi gian</th>
                  <th>Phong</th>
                  <th>Trang thai</th>
                  <th>Thao tac</th>
                </tr>
              </thead>
              <tbody>
                {filteredClasses.map((item) => (
                  <tr key={item.id}>
                    <td className="fw-bold">{item.className}</td>
                    <td>{item.time}</td>
                    <td><span className="badge bg-light text-dark border">{item.room}</span></td>
                    <td><span className={`badge ${item.status === "done" ? "bg-success" : item.status === "dang" ? "bg-primary" : "bg-warning text-dark"}`}>{item.status === "done" ? "Hoan thanh" : item.status === "dang" ? "Dang diem danh" : "Chua diem danh"}</span></td>
                    <td><button className={`btn btn-sm px-3 rounded-pill ${item.status === "done" ? "btn-outline-secondary" : "btn-dark"}`} onClick={() => handleOpen(item)}>{item.status === "done" ? "Xem chi tiet" : "Diem danh"}</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedClass && (
        <AttendanceModal classData={selectedClass} onClose={() => setSelectedClass(null)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}

export default TeacherAttendance;
