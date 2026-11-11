import React, { useState, useEffect, useCallback } from "react";
import BaseApi from "../../api/BaseApi";

/**
 * Chức năng: Hiển thị và quản lý tình trạng điểm danh các lớp học cho admin
 * Createdby: Trương Quốc Lộc - 08/06/2026
 * Updatedby: Trương Quốc Lộc - 08/06/2026
 */

const AdminAttendance = () => {
    // ── State ────────────────────────────────────────────────────────────
    const [attendances, setAttendances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("Tất cả trạng thái");

    // ── Fetch API ────────────────────────────────────────────────────────
    // BaseApi dùng fetch native → phải tự build query string, KHÔNG dùng { params }
    const fetchAttendances = useCallback(async () => {
        setLoading(true);
        try {
            // Build query string thủ công
            const queryParams = new URLSearchParams();
            if (filterStatus !== "Tất cả trạng thái") {
                queryParams.append("status", filterStatus);
            }
            const queryString = queryParams.toString();
            const endpoint = queryString
                ? `admin/attendance?${queryString}`
                : "admin/attendance";

            // BaseApi.get() trả thẳng payload (không có .data wrapper)
            const resData = await BaseApi.get(endpoint);

            const isArray = Array.isArray(resData);
            const isSuccess = resData?.success || isArray;
            const dataList = isArray ? resData : (resData?.data || []);

            if (isSuccess) {
                const normalized = dataList.map(item => ({
                    id: item.id || item.Id,
                    classCode: item.classCode || item.ClassCode || "",
                    courseName: item.courseName || item.CourseName || "",
                    teacher: item.teacher || item.Teacher || "Chưa phân công",
                    date: item.date || item.Date || "",
                    time: item.time || item.Time || "",
                    present: item.present ?? item.Present ?? 0,
                    total: item.total ?? item.Total ?? 0,
                    status: item.status || item.Status || "Chưa điểm danh",
                }));
                setAttendances(normalized);
            } else {
                alert("Lỗi từ server: " + (resData?.message || "Không lấy được dữ liệu"));
            }
        } catch (error) {
            if (error.response) {
                alert(`Lỗi API: Mã ${error.response.status} - ${error.response.statusText}`);
            } else {
                alert("Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.");
            }
        } finally {
            setLoading(false);
        }
    }, [filterStatus]);

    useEffect(() => {
        fetchAttendances();
    }, [fetchAttendances]);

    // ── Helpers ──────────────────────────────────────────────────────────
    const statusBadgeClass = (status) => {
        if (status === "Đã điểm danh") return "bg-success";
        if (status === "Chưa điểm danh") return "bg-warning text-dark";
        return "bg-secondary";
    };

    // Search client-side (teacher & courseName không query được trên API)
    const filteredAttendances = attendances.filter((item) => {
        if (!searchTerm.trim()) return true;
        const q = searchTerm.toLowerCase();
        return (
            item.classCode.toLowerCase().includes(q) ||
            item.courseName.toLowerCase().includes(q) ||
            item.teacher.toLowerCase().includes(q)
        );
    });

    // ── Render ───────────────────────────────────────────────────────────
    return (
        <div className="p-4 animate__animated animate__fadeIn">

            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h3 className="fw-bold text-dark">
                    <i className="bi bi-calendar-check me-2"></i>
                    Quản lý điểm danh
                </h3>
                <button className="btn btn-outline-primary fw-bold shadow-sm">
                    <i className="bi bi-download me-2"></i> Xuất báo cáo
                </button>
            </div>

            {/* Filter */}
            <div className="card mb-3 shadow-sm border-0 rounded-4">
                <div className="card-body">
                    <div className="row g-2">
                        <div className="col-md-8">
                            <input
                                className="form-control bg-light border-0 py-2 shadow-none"
                                placeholder="Tìm kiếm theo mã lớp, tên khóa học, giáo viên..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="col-md-4">
                            <select
                                className="form-select bg-light border-0 py-2 shadow-none"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option>Tất cả trạng thái</option>
                                <option>Đã điểm danh</option>
                                <option>Chưa điểm danh</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card shadow-sm border-0 rounded-4">
                <div className="card-body p-0">
                    <table className="table align-middle table-hover mb-0">
                        <thead className="table-light text-muted small">
                            <tr>
                                <th className="ps-4 border-0">#</th>
                                <th className="border-0">Lớp học / Khóa học</th>
                                <th className="border-0">Giáo viên</th>
                                <th className="border-0">Thời gian học</th>
                                <th className="border-0">Tình trạng (Hiện diện)</th>
                                <th className="border-0">Trạng thái</th>
                                <th className="pe-4 border-0 text-end">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Loading skeleton */}
                            {loading && Array.from({ length: 4 }).map((_, i) => (
                                <tr key={`sk-${i}`}>
                                    {Array.from({ length: 7 }).map((_, j) => (
                                        <td key={j} className={j === 0 ? "ps-4" : j === 6 ? "pe-4" : ""}>
                                            <div className="placeholder-glow">
                                                <span
                                                    className="placeholder col-12 rounded"
                                                    style={{ height: j === 1 ? 40 : 20 }}
                                                />
                                            </div>
                                        </td>
                                    ))}
                                </tr>
                            ))}

                            {/* Empty */}
                            {!loading && filteredAttendances.length === 0 && (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-muted">
                                        <i className="bi bi-search fs-1 d-block mb-2"></i>
                                        Không tìm thấy dữ liệu điểm danh nào.
                                    </td>
                                </tr>
                            )}

                            {/* Data rows */}
                            {!loading && filteredAttendances.map((item, index) => {
                                const ratio = item.total > 0 ? item.present / item.total : 0;
                                return (
                                    <tr key={item.id}>
                                        <td className="ps-4 text-muted">{index + 1}</td>
                                        <td className="py-3">
                                            <div className="fw-bold text-primary">{item.classCode}</div>
                                            <small className="text-muted fw-medium">{item.courseName}</small>
                                        </td>
                                        <td>
                                            <span className="fw-bold text-secondary">
                                                <i className="bi bi-person-fill text-muted me-1"></i>
                                                {item.teacher}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="small fw-bold text-dark">
                                                <i className="bi bi-calendar-event me-1"></i>
                                                {item.date}
                                            </div>
                                            <small className="text-muted">
                                                <i className="bi bi-clock me-1"></i> {item.time}
                                            </small>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <span className={`fw-bold fs-6 me-1 ${ratio < 0.5 ? "text-danger" : "text-success"}`}>
                                                    {item.present}
                                                </span>
                                                <span className="text-muted fw-medium"> / {item.total}</span>
                                            </div>
                                            <div className="progress mt-1" style={{ height: "5px", width: "80%" }}>
                                                <div
                                                    className={`progress-bar ${ratio < 0.5 ? "bg-danger" : "bg-success"}`}
                                                    role="progressbar"
                                                    style={{ width: `${ratio * 100}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td>
                                            <span className={`badge ${statusBadgeClass(item.status)} rounded-pill px-3 py-2 fw-medium shadow-sm`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="pe-4 text-end">
                                            <button
                                                className="btn btn-light border btn-sm rounded-circle shadow-sm"
                                                title="Xem chi tiết"
                                            >
                                                <i className="bi bi-eye-fill text-primary"></i>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Footer count */}
                {!loading && filteredAttendances.length > 0 && (
                    <div className="card-footer bg-transparent border-0 text-muted small px-4 py-2">
                        Hiển thị <strong>{filteredAttendances.length}</strong> / <strong>{attendances.length}</strong> buổi học
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminAttendance;