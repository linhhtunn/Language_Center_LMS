import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { p0Api } from "../../api/p0Api";
import { CLASS_SHIFT_OPTIONS, SHIFT_TO_PERIODS, PERIODS, formatPeriodLabel, formatPeriodTimeRange } from "../../constants/scheduleTime";

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatPeriodSelection = (values) => {
  const periods = [...new Set(values.map(Number))].sort((a, b) => a - b);
  if (periods.length === 0) return "";

  const ranges = [];
  let start = periods[0];
  let end = periods[0];
  for (const period of periods.slice(1)) {
    if (period === end + 1) {
      end = period;
      continue;
    }
    ranges.push([start, end]);
    start = period;
    end = period;
  }
  ranges.push([start, end]);

  return ranges
    .map(([rangeStart, rangeEnd]) => `${formatPeriodLabel(rangeStart, rangeEnd)} (${formatPeriodTimeRange(rangeStart, rangeEnd)})`)
    .join(", ");
};

export default function AdminCreateClass() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    courseId: "",
    teacherId: "",
    status: "active",
    capacity: "",
    startDate: "",
    endDate: "",
    schedules: [],
    description: "",
    sotiet: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [openScheduleDropdown, setOpenScheduleDropdown] = useState(null);
  const [openPeriodDropdown, setOpenPeriodDropdown] = useState(null);

  useEffect(() => {
    Promise.all([p0Api.courses.list(), p0Api.users.list()])
      .then(([courseRows, userRows]) => {
        setCourses(courseRows || []);
        setTeachers((userRows || []).filter((item) => (item.roles || []).some((role) => role.name === "Giao_Vien") && item.profileId));
      })
      .catch((err) => setError(err.message || "Khong tai duoc du lieu tao lop."));
  }, []);

  const addSchedule = () => setForm({ ...form, schedules: [...form.schedules, { id: Date.now(), day: "", shift: "", startPeriod: null, endPeriod: null, selectedPeriods: [], allowAlternativePeriods: true }] });
  const deleteSchedule = (id) => setForm({ ...form, schedules: form.schedules.filter((s) => s.id !== id) });
  const updateSchedule = (id, field, value) => {
    setForm({ ...form, schedules: form.schedules.map((s) => (s.id === id ? { ...s, [field]: value } : s)) });
  };

  const toggleDaySelection = (scheduleId, day) => {
    const schedule = form.schedules.find((s) => s.id === scheduleId);
    const days = Array.isArray(schedule.day) ? [...schedule.day] : [];
    const idx = days.indexOf(day);
    if (idx >= 0) days.splice(idx, 1);
    else days.push(day);
    updateSchedule(scheduleId, "day", days);
  };

  const selectPeriodRange = (scheduleId, range) => {
    updateSchedule(scheduleId, "shift", range.id);
    updateSchedule(scheduleId, "startPeriod", range.start);
    updateSchedule(scheduleId, "endPeriod", range.end);
    setOpenPeriodDropdown(null);
  };

  const togglePeriodSelection = (scheduleId, periodId) => {
    const schedule = form.schedules.find((s) => s.id === scheduleId);
    const list = Array.isArray(schedule.selectedPeriods) ? [...schedule.selectedPeriods] : [];
    const idx = list.indexOf(periodId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(periodId);
    // keep sorted
    list.sort((a, b) => Number(a) - Number(b));
    updateSchedule(scheduleId, "selectedPeriods", list);
  };

  useEffect(() => {
    const handler = (e) => {
      if (openScheduleDropdown == null && openPeriodDropdown == null) return;
      if (openScheduleDropdown != null) {
        const selector = `[data-schedule-id="${openScheduleDropdown}"]`;
        if (!e.target.closest(selector)) setOpenScheduleDropdown(null);
      }
      if (openPeriodDropdown != null) {
        const selector2 = `[data-schedule-id="${openPeriodDropdown}"]`;
        if (!e.target.closest(selector2)) setOpenPeriodDropdown(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openScheduleDropdown, openPeriodDropdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.courseId || !form.teacherId) {
      setError("Vui long nhap ten lop, khoa hoc va giao vien.");
      return;
    }

    const scheduleRows = form.schedules.filter((item) =>
      (item.day && (Array.isArray(item.day) ? item.day.length > 0 : item.day)) ||
      item.shift ||
      item.startPeriod ||
      (Array.isArray(item.selectedPeriods) && item.selectedPeriods.length > 0)
    );

    if (scheduleRows.some((item) =>
      !(item.day && (Array.isArray(item.day) ? item.day.length > 0 : item.day)) ||
      !(
        item.shift ||
        item.startPeriod ||
        (Array.isArray(item.selectedPeriods) && item.selectedPeriods.length > 0)
      )
    )) {
      setError("Vui long chon day (it nhat 1) va chon tiet cho tung lich hoc.");
      return;
    }

    setSaving(true);
    try {
      // build schedule configs to send with class creation
      const scheduleConfigs = form.schedules.map((schedule) => {
        const days = Array.isArray(schedule.day) ? schedule.day.filter(Boolean) : (schedule.day ? [schedule.day] : []);
        let periods = [];
        if (Array.isArray(schedule.selectedPeriods) && schedule.selectedPeriods.length > 0) {
          periods = schedule.selectedPeriods.map(Number).sort((a,b)=>a-b);
        } else if (schedule.startPeriod) {
          const s = Number(schedule.startPeriod);
          const e = Number(schedule.endPeriod || schedule.startPeriod || s);
          for (let i = s; i <= e; i++) periods.push(i);
        } else if (schedule.shift) {
          const map = SHIFT_TO_PERIODS[schedule.shift] || {};
          const s = map.start || 1;
          const e = map.end || s;
          for (let i = s; i <= e; i++) periods.push(i);
        }

        if (days.length === 0 || periods.length === 0) {
          return null;
        }

        return {
          Days: days,
          Periods: periods,
          RoomId: null,
          AllowAlternativePeriods: schedule.allowAlternativePeriods !== false,
        };
      }).filter((config) => config !== null);

      const payload = {
        name: form.name.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        capacity: form.capacity === "" ? null : Number(form.capacity),
        active: form.status === "active",
        courseIds: [form.courseId],
        teacherIds: [form.teacherId],
        TotalPeriods: form.sotiet ? Number(form.sotiet) : null,
        ScheduleConfigs: scheduleConfigs,
      };
      console.debug('AdminCreateClass - create payload', payload);
      const createdClass = await p0Api.classes.create(payload);
      console.debug('AdminCreateClass - create response', createdClass);

      if (!createdClass || !createdClass.id) throw new Error("Tao lop hoc that bai.");

      // Backend returns unwrapped ClassDto directly (no .data wrapper)
      // ClassDto has: { id, name, startDate, endDate, ... }
      // endDate can be: string (ISO), or DateOnly-like object { Year, Month, Day }
      const serverEnd = createdClass.endDate || createdClass.EndDate;
      
      console.debug('AdminCreateClass - serverEnd raw:', serverEnd);

      if (serverEnd) {
        let formattedEnd = null;
        
        if (typeof serverEnd === 'string') {
          // ISO string or "yyyy-MM-dd" format
          if (serverEnd.length === 10 && serverEnd[4] === '-') {
            // Already in yyyy-MM-dd format
            formattedEnd = serverEnd;
          } else {
            const parsed = new Date(serverEnd);
            formattedEnd = !isNaN(parsed.getTime()) ? formatLocalDate(parsed) : serverEnd;
          }
        } else if (typeof serverEnd === 'object' && serverEnd !== null) {
          // DateOnly object: { Year, Month, Day }
          const y = serverEnd.year ?? serverEnd.Year;
          const m = serverEnd.month ?? serverEnd.Month;
          const d = serverEnd.day ?? serverEnd.Day;
          console.debug('AdminCreateClass - DateOnly parsed:', { y, m, d });
          if (y && m && d) {
            const mm = String(m).padStart(2, '0');
            const dd = String(d).padStart(2, '0');
            formattedEnd = `${y}-${mm}-${dd}`;
          }
        }

        const successMessage = formattedEnd
          ? `Đã tạo lớp. Ngày kết thúc: ${formattedEnd}`
          : (scheduleConfigs.length > 0 ? "Đã tạo lớp học và lịch học." : "Đã tạo lớp học.");

        if (formattedEnd) {
          console.debug('AdminCreateClass - formatted endDate:', formattedEnd);
          setForm((prev) => ({ ...prev, endDate: formattedEnd }));
        } else {
          console.warn('AdminCreateClass - Could not format endDate:', serverEnd);
        }

        setToast(successMessage);
        setTimeout(() => navigate("/admin/schedules", {
          replace: true,
          state: { toast: { show: true, msg: successMessage, type: "success" } },
        }), 900);
      } else {
        console.warn('AdminCreateClass - No endDate in response');
        const successMessage = scheduleConfigs.length > 0 ? "Đã tạo lớp học và lịch học." : "Đã tạo lớp học.";
        setToast(successMessage);
        setTimeout(() => navigate("/admin/schedules", {
          replace: true,
          state: { toast: { show: true, msg: successMessage, type: "success" } },
        }), 900);
      }
    } catch (err) {
      setError(err.message || "Tao lop hoc that bai.");
    } finally {
      setSaving(false);
    }
  };

  const daysOfWeek = ["Thu 2", "Thu 3", "Thu 4", "Thu 5", "Thu 6", "Thu 7", "Chu nhat"];
  const shifts = CLASS_SHIFT_OPTIONS.map((item) => item.label);

  return (
    <div className="container-fluid p-4">
      <div className="mb-3">
        <button className="btn btn-link text-decoration-none" onClick={() => navigate(-1)}>Quay lai</button>
      </div>
      <h3 className="mb-4">Tao lop hoc moi</h3>
      {toast && <div className="alert alert-success">{toast}</div>}
      {error && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 2000, backgroundColor: 'rgba(0, 0, 0, 0.35)' }}>
          <div className="bg-white shadow-lg rounded-4 p-4 text-center" style={{ minWidth: '320px', maxWidth: '90vw' }} role="alert" aria-live="assertive">
            <div className="d-flex align-items-center justify-content-center fw-bold text-danger mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </div>
            <button type="button" className="btn btn-danger px-4" onClick={() => setError("")}>
              Oke
            </button>
          </div>
        </div>
      )}

      <div className="row">
        <div className="col-md-6">
          <div className="card p-4 shadow-sm">
            <h5 className="mb-3">Thong tin lop hoc</h5>
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-bold">Ten lop hoc *</label>
                <input className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Khoa hoc *</label>
                  <select className="form-select" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                    <option value="">Chon khoa hoc</option>
                    {courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Trang thai *</label>
                  <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Dang hoat dong</option>
                    <option value="inactive">Tam dung</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label fw-bold">Giao vien *</label>
                <select className="form-select" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                  <option value="">Chon giao vien</option>
                  {teachers.map((teacher) => <option key={teacher.profileId} value={teacher.profileId}>{teacher.fullName}</option>)}
                </select>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Suc chua</label>
                  <input type="number" className="form-control" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Số tiết</label>
                  <input type="number" className="form-control" value={form.sotiet} onChange={(e) => setForm({ ...form, sotiet: e.target.value })} />
                  <div className="form-text">Số tiết là tổng số tiết của khóa học. Hệ thống sẽ tự động xếp lịch cho đến khi đủ số tiết.</div>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Ngay bat dau</label>
                  <input type="date" className="form-control" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label fw-bold">Ngay ket thuc</label>
                  <input type="date" readOnly className="form-control" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  <div className="form-text">Ngày kết thúc sẽ được tự động tính khi hệ thống xếp lịch.</div>
                  {form.endDate && <div className="form-text">Ngày kết thúc hiện: {form.endDate}</div>}
                </div>
              </div>

              <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <label className="form-label fw-bold mb-0">Lich hoc</label>
                  <button type="button" className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" onClick={addSchedule}><Plus size={16} /> Them lich</button>
                </div>
                {form.schedules.length > 0 ? (
                  <div className="d-flex flex-column gap-2">
                    {form.schedules.map((schedule) => (
                      <div key={schedule.id} data-schedule-id={schedule.id} className="d-flex flex-wrap align-items-center gap-2 p-2 border rounded bg-light" style={{ position: "relative" }}>
                        <div className="multi-day-dropdown" style={{ minWidth: 140 }}>
                          <div className="multi-day-display form-control form-select-sm d-flex justify-content-between align-items-center" onClick={() => setOpenScheduleDropdown(openScheduleDropdown === schedule.id ? null : schedule.id)}>
                            <div className="multi-day-text">
                              {Array.isArray(schedule.day) && schedule.day.length > 0 ? schedule.day.join(', ') : 'Chon thu'}
                            </div>
                            <div className="multi-day-caret">▾</div>
                          </div>
                          {openScheduleDropdown === schedule.id && (
                            <div className="multi-day-menu border bg-white p-2" style={{ position: 'absolute', zIndex: 3000, left: 0, top: 'calc(100% + 4px)' }}>
                              {daysOfWeek.map((day) => (
                                <label key={day} className="d-block" style={{ cursor: 'pointer' }}>
                                  <input type="checkbox" checked={Array.isArray(schedule.day) ? schedule.day.includes(day) : false} onChange={() => toggleDaySelection(schedule.id, day)} />
                                  <span className="ms-2">{day}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ minWidth: 220 }}>
                          <div className="multi-day-display form-control form-select-sm d-flex justify-content-between align-items-center" onClick={() => setOpenPeriodDropdown(openPeriodDropdown === schedule.id ? null : schedule.id)}>
                            <div className="multi-day-text">
                              {Array.isArray(schedule.selectedPeriods) && schedule.selectedPeriods.length > 0 ? (
                                formatPeriodSelection(schedule.selectedPeriods)
                              ) : (schedule.startPeriod ? `${formatPeriodLabel(schedule.startPeriod, schedule.endPeriod)} (${formatPeriodTimeRange(schedule.startPeriod, schedule.endPeriod)})` : 'Chon tiet')}
                            </div>
                            <div className="multi-day-caret">▾</div>
                          </div>
                            {openPeriodDropdown === schedule.id && (
                              <div className="multi-day-menu border bg-white p-2" style={{ position: 'absolute', zIndex: 3000, left: 0, top: 'calc(100% + 4px)' }}>
                                {PERIODS.map((p) => (
                                  <label key={p.id} className="d-block" style={{ cursor: 'pointer' }}>
                                    <input type="checkbox" checked={Array.isArray(schedule.selectedPeriods) ? schedule.selectedPeriods.includes(p.id) : false} onChange={() => togglePeriodSelection(schedule.id, p.id)} />
                                    <span className="ms-2">{`Tiết ${p.id} (${p.start} - ${p.end})`}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                        </div>
                        <label className="form-check d-flex align-items-center gap-1 mb-0 ms-1">
                          <input
                            className="form-check-input mt-0"
                            type="checkbox"
                            checked={schedule.allowAlternativePeriods !== false}
                            onChange={(event) => updateSchedule(schedule.id, "allowAlternativePeriods", event.target.checked)}
                          />
                          <span className="form-check-label small" title="Có thể chuyển sang khoảng tiết liên tục khác trong cùng thứ, giữ nguyên độ dài buổi học.">Thử tiết khác cùng thứ nếu bị trùng (giữ nguyên số tiết)</span>
                        </label>
                        <button type="button" className="btn btn-link text-danger p-1" onClick={() => deleteSchedule(schedule.id)}><Trash2 size={18} /></button>
                      </div>
                    ))}
                  </div>
                ) : <small className="text-muted d-block mt-1">Chua co lich hoc nao duoc them. Hay nhan "Them lich" de them hang lich hoc.</small>}
                <small className="text-muted">Hê thống sẽ tự động sinh lịch học dựa trên cấu hình trên khi bạn lưu.</small>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button type="button" className="btn btn-light" onClick={() => navigate(-1)}>Huy</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Dang tao..." : "Tao lop hoc"}</button>
              </div>
            </form>
          </div>
        </div>

        <div className="col-md-6 d-flex nalign-items-center justify-content-center">
          <div className="text-center">
            <div style={{ fontSize: "70px" }}><i className="bi bi-mortarboard"></i></div>
            <h5 className="mt-3">Tao lop hoc moi</h5>
            <p className="text-muted">Them lop hoc vao he thong de quan ly hoc vien va lich hoc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
