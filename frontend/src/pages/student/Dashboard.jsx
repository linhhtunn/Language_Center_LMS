import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudentClass } from '../../context/StudentClassContext';
import NotificationPanel from '../../components/NotificationPanel';
import BaseApi from '../../api/BaseApi';
import { p0Api } from '../../api/p0Api';
import '../../styles/notification-badge.css';
import bannerMot from "../../assets/a1.jpeg";
import bannerHai from "../../assets/a2.jpeg";
import bannerBa from "../../assets/a3.jpeg";
import BarLineComparisonChart from '../../components/charts/BarLineComparisonChart';
import { fetchStudentClasses, summarizeStudentClassScores } from '../../utils/studentScoreSummary';
import { onNewNotification } from '../../components/RealtimeNotifications';
const Dashboard = () => {
    const { user } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [attendanceRows, setAttendanceRows] = useState([]);
    const [attendanceLoading, setAttendanceLoading] = useState(true);
    const [todayClasses, setTodayClasses] = useState([]);
    const [todayLoading, setTodayLoading] = useState(true);
    const [todayError, setTodayError] = useState('');
    const [weeklySessionCount, setWeeklySessionCount] = useState(0);
    const [reportSummary, setReportSummary] = useState([]);
    const [reportLoading, setReportLoading] = useState(true);
    const [selectedReportClassId, setSelectedReportClassId] = useState(null);
    const { classes, currentClass, selectClass, loading, error } = useStudentClass();
    const navigate = useNavigate();

    useEffect(() => {
        fetchUnreadCount();
        fetchAttendanceRows();
        fetchTodayClasses();
        fetchWeeklySessionCount();
        fetchReportSummary();
    }, [user]);

    const fetchReportSummary = async () => {
        setReportLoading(true);
        try {
            const studentClasses = await fetchStudentClasses();
            setReportSummary(await summarizeStudentClassScores(studentClasses));
        } catch (err) {
            console.error('Error fetching report summary:', err);
            setReportSummary([]);
        } finally {
            setReportLoading(false);
        }
    };

    // Thong bao moi (realtime) -> cap nhat so chua doc tren chuong ngay, khong can tai lai trang.

    useEffect(() => onNewNotification(() => fetchUnreadCount()), []);


    const fetchUnreadCount = async () => {
        try {
            const res = await BaseApi.get('Notification/unread-count');
            
            // Handle multiple response formats
            let count = 0;
            if (typeof res === 'number') {
                count = res;
            } else if (res && typeof res === 'object') {
                // Check if it's ApiResponse format with Data property (capital D)
                if ('Data' in res && typeof res.Data === 'number') {
                    count = res.Data;
                } else if ('data' in res && typeof res.data === 'number') {
                    count = res.data;
                } else if ('value' in res && typeof res.value === 'number') {
                    count = res.value;
                }
            }
            setUnreadCount(count);
        } catch (err) {
            console.error('Error fetching unread count:', err);
            setUnreadCount(0);
        }
    };

    const handleNotificationPanelOpen = (isOpen) => {
        setShowNotifications(isOpen);
        if (isOpen) {
            // Refresh count when panel opens (after marking as read via NotificationPanel)
            setTimeout(() => fetchUnreadCount(), 500);
        }
    };
    const handleSelectClass = (classId) => {
        selectClass(classId);
    };

    const handleViewSchedule = () => {
        navigate('/student/schedule');
    };

    const formatDateForApi = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00:00`;
    };

    const isToday = (dateValue) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return false;
        const today = new Date();
        return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
    };

    const formatDateLabel = (dateValue) => {
        const date = new Date(dateValue);
        if (Number.isNaN(date.getTime())) return '';
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    };

    const fetchTodayClasses = async () => {
        setTodayLoading(true);
        setTodayError('');
        try {
            const today = new Date();
            const weekStart = formatDateForApi(today);
            const response = await BaseApi.get(`Schedule/student-board?weekStart=${weekStart}`);
            const data = response?.data || response;
            const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
            const todayItems = schedules
                .filter((item) => isToday(item.ngayHoc))
                .map((item) => ({
                    ...item,
                    subject: item.subject || item.className || item.classCode,
                    period: `Tiết ${item.slotId}${item.slotEndId && item.slotEndId !== item.slotId ? `-${item.slotEndId}` : ''}`,
                    timeRange: `${item.slotId && item.slotEndId ? `Tiết ${item.slotId}-${item.slotEndId}` : `Tiết ${item.slotId}`}`,
                    dateLabel: formatDateLabel(item.ngayHoc),
                }));

            setTodayClasses(todayItems);
        } catch (err) {
            console.error('Error fetching today classes:', err);
            setTodayError('Không thể tải lớp học hôm nay. Vui lòng thử lại.');
            setTodayClasses([]);
        } finally {
            setTodayLoading(false);
        }
    };

    const getWeekStart = (date) => {
        const current = new Date(date);
        const dayOfWeek = current.getDay();
        const diff = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(current.setDate(diff));
        weekStart.setHours(0, 0, 0, 0);
        return weekStart;
    };

    const fetchWeeklySessionCount = async () => {
        try {
            const weekStart = getWeekStart(new Date());
            const studentId = user?.profileId || user?.id;
            const url = `Schedule/student-board?weekStart=${formatDateForApi(weekStart)}${studentId ? `&studentId=${studentId}` : ''}`;
            const response = await BaseApi.get(url);
            const data = response?.data || response;
            const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
            setWeeklySessionCount(schedules.length);
        } catch (err) {
            console.error('Error fetching weekly session count:', err);
            setWeeklySessionCount(0);
        }
    };

    const fetchAttendanceRows = async () => {
        setAttendanceLoading(true);
        try {
            setAttendanceRows(await p0Api.students.attendance());
        } catch (err) {
            console.error('Error fetching student attendance:', err);
            setAttendanceRows([]);
        } finally {
            setAttendanceLoading(false);
        }
    };

    const renderAttendanceBadge = (status, label) => {
        const className = {
            present: 'bg-success',
            absent: 'bg-danger',
            late: 'bg-warning text-dark',
            excused: 'bg-primary',
        }[status] || 'bg-secondary';
        return <span className={`badge ${className}`}>{label || 'Chua diem danh'}</span>;
    };

    return (
        <div className="p-0 animate__animated animate__fadeIn" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            
            {/* TOPBAR */}
            <div className="d-flex justify-content-between align-items-center mb-5">
                <div>
<h2 className="fw-bold mb-1" style={{ color: '#005197', letterSpacing: '-0.5px' }}>
                        Xin chào, {user?.fullName || user?.username || 'Học viên'}
                    </h2>
                    <p className="text-muted fw-500 mb-0">Hãy bắt đầu học!</p>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                    <div 
                        className={`position-relative hover-up rounded-circle d-flex align-items-center justify-content-center ${unreadCount > 0 ? 'notification-bell-active shadow-sm' : 'bg-white border border-secondary-subtle shadow-sm'}`} 
                        style={{ width: '48px', height: '48px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onClick={() => handleNotificationPanelOpen(!showNotifications)}
                        title="Thông báo"
                    >
                        <i className={`bi bi-bell-fill ${unreadCount > 0 ? 'text-danger' : 'text-secondary'} fs-5`}></i>
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light notification-badge-animated" style={{ fontSize: '10px', fontWeight: 700, minWidth: '22px', height: '22px', padding: '0 6px', lineHeight: '20px' }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <NotificationPanel isOpen={showNotifications} onClose={() => handleNotificationPanelOpen(false)} onMarkAsRead={fetchUnreadCount} />
                </div>
            </div>
        {/* KHU VUC BANNER SLIDE */}
            <div id="bannerCarousel" className="carousel slide mb-5 shadow-lg rounded-5 overflow-hidden" data-bs-ride="carousel" style={{ minHeight: '450px' }}>
                
                <div className="carousel-indicators">
                    <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="0" className="active" aria-current="true" aria-label="Slide 1"></button>
                    <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="1" aria-label="Slide 2"></button>
                    <button type="button" data-bs-target="#bannerCarousel" data-bs-slide-to="2" aria-label="Slide 3"></button>
                </div>

                {/* Sửa minHeight ở đây */}
                <div className="carousel-inner" style={{ minHeight: '450px' }}>
                    <div className="carousel-item active" data-bs-interval="3000">
                        {/* Sửa height ở thẻ img */}
                        <img src={bannerMot} className="d-block w-100" alt="Banner 1" style={{ objectFit: 'cover', height: '450px' }} />
                    </div>
                    <div className="carousel-item" data-bs-interval="3000">
                        <img src={bannerHai} className="d-block w-100" alt="Banner 2" style={{ objectFit: 'cover', height: '450px' }} />
                    </div>
                    <div className="carousel-item" data-bs-interval="3000">
<img src={bannerBa} className="d-block w-100" alt="Banner 3" style={{ objectFit: 'cover', height: '450px' }} />
                    </div>
                </div>

                <button className="carousel-control-prev" type="button" data-bs-target="#bannerCarousel" data-bs-slide="prev">
                    <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Previous</span>
                </button>
                <button className="carousel-control-next" type="button" data-bs-target="#bannerCarousel" data-bs-slide="next">
                    <span className="carousel-control-next-icon" aria-hidden="true"></span>
                    <span className="visually-hidden">Next</span>
                </button>
            </div>

            {/* STATS SECTION */}
            <div className="row g-4 mb-5">
                {/* the thong ke tham du */}
                <div className="col-md-4">
                    <div className="card bg-white border-0 rounded-4 shadow-sm h-100 overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <div className="d-flex align-items-center mb-3">
                                <div className="bg-primary bg-opacity-10 p-2 rounded-3 me-3">
                                    <i className="bi bi-patch-check fs-4 text-primary"></i>
                                </div>
                                <span className="fw-bold text-uppercase small text-muted">Số % nghỉ</span>
                            </div>
                            <h2 className="display-5 fw-bold mb-0 text-primary">12%</h2>
                            <i className="bi bi-graph-up-arrow position-absolute bottom-0 end-0 p-3 text-primary opacity-10" style={{ fontSize: '3rem' }}></i>
                        </div>
                    </div>
                </div>

                {/* the thong ke so bai tap giao vien da giao */}
                <div className="col-md-4">
                    <div className="card bg-white border-0 rounded-4 shadow-sm h-100 overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-2 rounded-3 me-3" style={{ backgroundColor: 'rgba(236, 64, 122, 0.1)' }}>
                                    <i className="bi bi-journal-text fs-4" style={{ color: '#ec407a' }}></i>
                                </div>
                                <span className="fw-bold text-uppercase small text-muted" style={{ fontSize: '0.8rem' }}>Số bài tập giáo viên đã giao</span>
                            </div>
                            <h2 className="display-5 fw-bold mb-0" style={{ color: '#ec407a' }}>15</h2>
<i className="bi bi-file-earmark-check position-absolute bottom-0 end-0 p-3 opacity-10" style={{ fontSize: '3rem', color: '#ec407a' }}></i>
                        </div>
                    </div>
                </div>

                {/* the thong ke so buoi hoc trong tuan */}
                <div className="col-md-4">
                    <div className="card bg-white border-0 rounded-4 shadow-sm h-100 overflow-hidden">
                        <div className="card-body p-4 position-relative">
                            <div className="d-flex align-items-center mb-3">
                                <div className="p-2 rounded-3 me-3" style={{ backgroundColor: 'rgba(229, 57, 53, 0.1)' }}>
                                    <i className="bi bi-calendar-week fs-4" style={{ color: '#e53935' }}></i>
                                </div>
                                <span className="fw-bold text-uppercase small text-muted">Số buổi học trong tuần</span>
                            </div>
                            <h2 className="display-5 fw-bold mb-0" style={{ color: '#e53935' }}>{weeklySessionCount}</h2>
                            <i className="bi bi-calendar3 position-absolute bottom-0 end-0 p-3 opacity-10" style={{ fontSize: '3rem', color: '#e53935' }}></i>
                        </div>
                    </div>
                </div>
            </div>
{/* KHU VUC KET QUA HOC TAP (rut gon) */}
            <div className="mb-4">
                <div className="d-flex align-items-center justify-content-between mb-3">
                    <div className="d-flex align-items-center">
                        <div className="bg-warning bg-opacity-10 rounded-3 p-2 me-3">
                            <i className="bi bi-graph-up-arrow text-warning" style={{ color: '#ef7d00' }}></i>
                        </div>
                        <h5 className="fw-bold mb-0 text-dark">Kết quả học tập</h5>
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-bold"
                        onClick={() => navigate('/student/reports')}
                    >
                        Xem chi tiết <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                </div>

                <div className="card bg-white border-0 rounded-4 shadow-sm p-4">
                    {reportLoading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : (
                        <BarLineComparisonChart
                            height={260}
                            labels={reportSummary.map(c => c.className)}
                            barData={reportSummary.map(c => c.averageScore !== null ? c.averageScore : 0)}
                            barLabel="Điểm của bạn"
                            lineData={reportSummary.map(c => c.classAverageScore !== null ? c.classAverageScore : 0)}
                            lineLabel="Điểm TB lớp học phần"
                            yLeftLabel="Điểm của bạn"
                            yRightLabel="Điểm TB lớp học phần"
                            barTooltipFormat={(raw) => `Điểm của bạn: ${raw}`}
                            lineTooltipFormat={(value) => `Điểm TB lớp học phần: ${value}`}
                            emptyMessage="Chưa có dữ liệu điểm — kết quả sẽ hiển thị tại đây khi bạn có lớp và bài kiểm tra đã chấm."
                        />
                    )}

                    {!reportLoading && reportSummary.length > 0 && (
                        <>
                            <div className="d-flex flex-wrap gap-2 mt-4 pt-3 border-top">
                                <span className="text-muted small fw-bold text-uppercase align-self-center me-1">
                                    Xem theo bài kiểm tra:
                                </span>
                                {reportSummary.map((cls) => (
                                    <button
                                        key={cls.classId}
                                        type="button"
                                        className={`btn btn-sm rounded-pill px-3 fw-semibold ${
                                            selectedReportClassId === cls.classId ? 'btn-primary' : 'btn-outline-secondary'
                                        }`}
                                        onClick={() => setSelectedReportClassId(
                                            selectedReportClassId === cls.classId ? null : cls.classId
                                        )}
                                    >
                                        {cls.className}
                                    </button>
                                ))}
                            </div>

                            {selectedReportClassId && (() => {
                                const selectedClass = reportSummary.find(c => c.classId === selectedReportClassId);
                                const tests = selectedClass?.tests || [];
                                return (
                                    <div className="mt-4 animate__animated animate__fadeIn">
                                        <h6 className="fw-bold text-secondary mb-3">
                                            Các bài kiểm tra — {selectedClass?.className}
                                        </h6>
                                        <BarLineComparisonChart
                                            height={260}
                                            labels={tests.map(t => t.testName)}
                                            barData={tests.map(t => t.score !== null ? t.score : 0)}
                                            barLabel="Điểm của bạn"
                                            lineData={tests.map(t => t.classAverage)}
                                            lineLabel="Điểm TB lớp học phần"
                                            yLeftLabel="Điểm của bạn"
                                            yRightLabel="Điểm TB lớp học phần"
                                            barTooltipFormat={(raw) => `Điểm của bạn: ${raw}`}
                                            lineTooltipFormat={(value) => `Điểm TB lớp học phần: ${value}`}
                                            emptyMessage="Lớp này chưa có bài kiểm tra nào được chấm."
                                        />
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            </div>

            {/* KHU VUC LOP HIEN TAI */}
            <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                    <div className="bg-primary bg-opacity-10 rounded-3 p-2 me-3">
                        <i className="bi bi-book text-primary fs-5"></i>
                    </div>
                    <h5 className="fw-bold mb-0 text-dark">Lớp hiện tại</h5>
                </div>

                {error && (
                    <div className="alert alert-warning alert-dismissible fade show rounded-4" role="alert">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        {error}
                    </div>
                )}

                <div className="card bg-white border-0 rounded-4 shadow-sm p-4">
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : classes.length === 0 ? (
                        <div className="text-center py-4">
                            <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-inbox text-muted" style={{ fontSize: '2.5rem' }}></i>
                            </div>
<h5 className="fw-bold text-dark">Chưa có lớp từ database</h5>
                            <p className="text-muted mb-0">Tài khoản học sinh hiện chưa được gán vào lớp nào. Vui lòng liên hệ quản trị viên hoặc giáo viên phụ trách.</p>
                        </div>
                    ) : (
                        <div className="row g-3">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-muted text-uppercase small mb-2">Chọn lớp</label>
                                <div className="list-group">
                                    {classes.map((cls) => (
                                        <button
                                            key={cls.id}
                                            type="button"
                                            className={`list-group-item list-group-item-action rounded-4 mb-2 text-start ${currentClass?.id === cls.id ? 'active' : ''}`}
                                            onClick={() => handleSelectClass(cls.id)}
                                            style={{ minHeight: '84px' }}
                                        >
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <div className="fw-bold">{cls.classCode}</div>
                                                    <div className="text-muted small">{cls.teacher}</div>
                                                </div>
                                                {currentClass?.id === cls.id && (
                                                    <span className="badge bg-primary rounded-pill">Đang chọn</span>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="col-md-6 mt-3 mt-md-0">
                                {currentClass && (
                                    <div className="p-4 rounded-4 position-relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e88e5 0%, #1565c0 100%)', color: 'white' }}>
                                        <i className="bi bi-book-half position-absolute top-50 end-0 translate-middle-y opacity-25 me-n3" style={{ fontSize: '6rem' }}></i>
                                        <div className="position-relative z-index-1">
                                            <p className="mb-1 small text-white-50 text-uppercase fw-bold">Khóa học</p>
                                            <h4 className="fw-bold mb-2">{currentClass.className || currentClass.classCode}</h4>
                                            <p className="mb-2 small">
                                                <i className="bi bi-person-badge me-2"></i>
                                                {currentClass.teacher}
                                            </p>
                                            <p className="mb-1 small text-white-75">Số học sinh: {currentClass.studentCount} / {currentClass.maxStudents}</p>
                                            {currentClass.startDate && currentClass.endDate && (
                                                <p className="mb-0 small text-white-75">
                                                    Từ {currentClass.startDate} đến {currentClass.endDate}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* KHU VUC DIEM DANH GAN DAY */}
            <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                    <div className="bg-success bg-opacity-10 rounded-3 p-2 me-3">
<i className="bi bi-clipboard-check text-success fs-5"></i>
                    </div>
                    <h5 className="fw-bold mb-0 text-dark">Điểm danh gần đây</h5>
                </div>

                <div className="card bg-white border-0 rounded-4 shadow-sm p-4">
                    {attendanceLoading ? (
                        <div className="text-center py-4 text-muted">Đang tải điểm danh...</div>
                    ) : attendanceRows.length === 0 ? (
                        <div className="text-center text-muted py-4">Chưa có dữ liệu điểm danh. Khi giáo viên điểm danh, trạng thái sẽ hiển thị tại đây.</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="table align-middle mb-0 border-white">
                                <thead className="table-light">
                                    <tr>
                                        <th className="rounded-start-3 border-0">Lớp</th>
                                        <th className="border-0">Ngày học</th>
                                        <th className="border-0">Trạng thái</th>
                                        <th className="rounded-end-3 border-0">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* render danh sach diem danh */}
                                    {attendanceRows.slice(0, 5).map((row) => (
                                        <tr key={`${row.classId}-${row.sessionId}`}>
                                            <td className="border-bottom-0 py-3 fw-medium text-dark">{row.className}</td>
                                            <td className="border-bottom-0 py-3 text-muted">{row.sessionDate}</td>
                                            <td className="border-bottom-0 py-3">{renderAttendanceBadge(row.status, row.statusLabel)}</td>
                                            <td className="border-bottom-0 py-3 text-muted">{row.note || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* KHU VUC LOP HOC HOM NAY */}
            <div className="mb-4">
                <div className="d-flex align-items-center mb-3">
                    <div className="bg-danger bg-opacity-10 rounded-3 p-2 me-3">
                        <i className="bi bi-calendar-event text-danger fs-5"></i>
                    </div>
                    <h5 className="fw-bold mb-0 text-dark">Lớp học hôm nay</h5>
                </div>

                <div className="card bg-white border-0 rounded-4 shadow-sm p-4">
                    {todayLoading ? (
                        <div className="text-center py-4 text-muted">
                            <div className="spinner-border text-danger" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : todayError ? (
                        <div className="alert alert-warning rounded-4 mb-0" role="alert">
                            <i className="bi bi-exclamation-triangle me-2"></i>
                            {todayError}
                        </div>
                    ) : todayClasses.length === 0 ? (
                        <div className="text-center py-5">
                            <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '80px', height: '80px' }}>
                                <i className="bi bi-calendar-x text-muted" style={{ fontSize: '2.5rem' }}></i>
                            </div>
                            <h5 className="fw-bold text-dark">Hiện chưa có lớp học nào hôm nay</h5>
                            <p className="text-muted mb-4">Hãy quay lại sau hoặc xem lịch học chi tiết nhé!</p>
                            <button className="btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm" onClick={handleViewSchedule}>
                                <i className="bi bi-calendar3 me-2"></i>
                                XEM LỊCH HỌC
                            </button>
                        </div>
                    ) : (
                        <div className="row g-3">
                            {todayClasses.map((cls) => (
                                <div className="col-md-6" key={cls.id}>
                                    <div className="border rounded-4 p-3 h-100">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <div className="fw-bold">{cls.className || cls.classCode}</div>
                                                <div className="text-muted small">{cls.subject}</div>
                                            </div>
                                            <span className="badge bg-danger rounded-pill">Hôm nay</span>
                                        </div>
                                        <p className="mb-1 text-muted">Giáo viên: {cls.teacher || 'Chưa có'}</p>
                                        <p className="mb-1 text-muted">Phòng: {cls.room || 'Chưa gán phòng'}</p>
                                        <p className="mb-1 text-muted">Ngày: {cls.dateLabel}</p>
                                        <div className="mt-3 d-flex flex-wrap gap-2">
                                            <span className="badge bg-primary bg-opacity-10 text-primary">{cls.period}</span>
                                            <span className="badge bg-secondary bg-opacity-10 text-secondary">{cls.timeRange}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default Dashboard;