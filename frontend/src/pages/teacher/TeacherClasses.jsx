import React, { useEffect, useMemo, useState } from "react";
import { p0Api } from "../../api/p0Api";
import { formatPeriodLabel } from "../../constants/scheduleTime";

const getScheduleRows = (response) => {
  const payload = response?.data ?? response;
  return payload?.schedules ?? payload?.data?.schedules ?? [];
};

const normalizeSession = (row) => ({
  sessionId: row.maBuoiHoc || row.id || row.sessionId,
  classId: row.classId || row.maLopHoc,
  className: row.className || row.tenLop || row.classCode || "Lop hoc",
  room: row.room || row.tenPhong || "",
  date: row.ngayHoc || row.date,
  startSlot: row.slotId || row.maTietBatDau,
  endSlot: row.slotEndId || row.maTietKetThuc || row.slotId || row.maTietBatDau,
});

const TeacherClasses = () => {
  const [sessions, setSessions] = useState([]);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [studentCounts, setStudentCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await p0Api.schedule.teacherBoard();
        const rows = getScheduleRows(response).map(normalizeSession).filter((row) => row.classId && row.sessionId);
        setSessions(rows);

        if (rows.length === 0) {
          setAssignedClasses(await p0Api.classes.assignedToMe());
        } else {
          setAssignedClasses([]);
        }

        const firstByClass = Array.from(new Map(rows.map((row) => [row.classId, row])).values());
        const countPairs = await Promise.all(firstByClass.map(async (row) => {
          try {
            const attendance = await p0Api.attendance.get(row.classId, row.sessionId);
            return [row.classId, Array.isArray(attendance) ? attendance.length : 0];
          } catch {
            return [row.classId, null];
          }
        }));
        setStudentCounts(Object.fromEntries(countPairs));
      } catch (err) {
        try {
          setAssignedClasses(await p0Api.classes.assignedToMe());
          setSessions([]);
          setError("");
        } catch (fallbackErr) {
          setError(fallbackErr.message || err.message || "Khong tai duoc danh sach lop phu trach.");
          setSessions([]);
          setAssignedClasses([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const classes = useMemo(() => {
    const map = new Map();
    sessions.forEach((session) => {
      const item = map.get(session.classId) || {
        id: session.classId,
        name: session.className,
        sessions: [],
      };
      item.sessions.push(session);
      map.set(session.classId, item);
    });
    if (sessions.length === 0) {
      assignedClasses.forEach((item) => {
        map.set(item.id, {
          id: item.id,
          name: item.name,
          currentSize: item.currentSize,
          capacity: item.capacity,
          assignedOnly: true,
          sessions: [],
        });
      });
    }

    return Array.from(map.values()).map((item) => ({
      ...item,
      sessions: item.sessions.sort((a, b) => String(a.date).localeCompare(String(b.date))),
    }));
  }, [sessions, assignedClasses]);

  return (
    <div className="p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">
          <i className="bi bi-briefcase me-2"></i>
          Lop dang phu trach
        </h3>
        <span className="badge bg-primary">{classes.length} lop</span>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center py-5">Dang tai danh sach lop...</div>
        </div>
      ) : classes.length === 0 ? (
        <div className="card border-0 shadow-sm">
          <div className="card-body text-center text-muted py-5">
            Chua co lop nao duoc phan cong cho giao vien nay.
          </div>
        </div>
      ) : (
        <div className="row g-3">
          {classes.map((item) => {
            const nextSession = item.sessions[0];
            const count = studentCounts[item.id];
            return (
              <div className="col-lg-6" key={item.id}>
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start gap-3 mb-3">
                      <div>
                        <h5 className="fw-bold mb-1">{item.name}</h5>
                        <small className="text-muted">
                          {item.assignedOnly ? "Lop da duoc phan cong nhung chua co lich hoc" : `${item.sessions.length} buoi hoc tren lich`}
                        </small>
                      </div>
                      <span className={`badge ${item.assignedOnly ? "bg-warning text-dark" : "bg-success"}`}>
                        {item.assignedOnly ? "Chua co lich" : "Dang hoat dong"}
                      </span>
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">So hoc sinh</small>
                          <span className="fw-bold">{item.assignedOnly ? (item.currentSize ?? 0) : (count === null || count === undefined ? "Chua co du lieu" : count)}</span>
                        </div>
                      </div>
                      <div className="col-6">
                        <div className="border rounded p-3">
                          <small className="text-muted d-block">Buoi gan nhat</small>
                          <span className="fw-bold">{nextSession?.date || "-"}</span>
                        </div>
                      </div>
                    </div>

                    {item.assignedOnly ? (
                      <div className="alert alert-warning mb-0">
                        Lop da duoc phan cong nhung chua co lich hoc. Admin can tao BuoiHoc trong quan ly lich day.
                      </div>
                    ) : (
                    <div className="table-responsive">
                      <table className="table table-sm align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Ngay</th>
                            <th>Tiet</th>
                            <th>Phong</th>
                          </tr>
                        </thead>
                        <tbody>
                          {item.sessions.slice(0, 4).map((session) => (
                            <tr key={session.sessionId}>
                              <td>{session.date || "-"}</td>
                              <td>{session.startSlot ? formatPeriodLabel(session.startSlot, session.endSlot) : "-"}</td>
                              <td>{session.room || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherClasses;
