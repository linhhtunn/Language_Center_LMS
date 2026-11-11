import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import NotificationPanel from '../../components/NotificationPanel';
import BaseApi from '../../api/BaseApi';
import { p0Api } from '../../api/p0Api';
import '../../styles/notification-badge.css';

ChartJS.register(...registerables);

const ParentDashboard = () => {
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [childrenData, setChildrenData] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);

    // Drill down state
    const [activeView, setActiveView] = useState('overall'); // 'overall' or 'drilldown'
    const [selectedClassId, setSelectedClassId] = useState('');
    const [drilldownData, setDrilldownData] = useState(null);
    const [loadingDrilldown, setLoadingDrilldown] = useState(false);

    // Fetch children and statistics
    const loadParentDashboard = async () => {
        setLoading(true);
        setError('');
        try {
            const data = await p0Api.reports.parentDashboard();
            setChildrenData(data || []);
            if (data && data.length > 0) {
                setSelectedChild(data[0]);
            }
        } catch (err) {
            console.error(err);
            setError(err.message || 'Không thể tải thông tin con của bạn.');
        } finally {
            setLoading(false);
        }
    };

    // Fetch child course drill down details
    const loadChildCourseDetails = async (studentId, classId) => {
        setLoadingDrilldown(true);
        try {
            const res = await p0Api.reports.studentDashboard(classId, studentId);
            setDrilldownData(res);
            setActiveView('drilldown');
            setSelectedClassId(classId);
        } catch (err) {
            console.error(err);
            alert('Không thể tải chi tiết điểm bài kiểm tra của con.');
        } finally {
            setLoadingDrilldown(false);
        }
    };

    // Fetch unread notification count
    const fetchUnreadCount = async () => {
        try {
            const res = await BaseApi.get('Notification/unread-count');
            console.log('Full response object:', res);
            
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
        } catch (error) {
            console.error('Error fetching unread count:', error);
            setUnreadCount(0);
        }
    };

    useEffect(() => {
        loadParentDashboard();
        fetchUnreadCount();
    }, []);

    const handleNotificationPanelOpen = (isOpen) => {
        setShowNotifications(isOpen);
        if (isOpen) {
            // Refresh count when panel opens (after marking as read via NotificationPanel)
            setTimeout(() => fetchUnreadCount(), 500);
        }
    };

    const handleChildChange = (child) => {
        setSelectedChild(child);
        setActiveView('overall');
        setDrilldownData(null);
    };

    // Course Averages Chart Data
    const validCoursesForChart = selectedChild?.courses?.filter(c => c.finalAverageScore !== null) || [];
    const courseLabels = validCoursesForChart.map(c => c.courseName || c.className);
    const courseAverages = validCoursesForChart.map(c => c.finalAverageScore);

    const chartData = {
        labels: courseLabels,
        datasets: [
            {
                label: 'Điểm trung bình khóa học',
                data: courseAverages,
                backgroundColor: 'rgba(0, 81, 151, 0.75)',
                borderColor: '#005197',
                borderWidth: 2,
                borderRadius: 8,
                maxBarThickness: 50,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                beginAtZero: true,
                max: 10,
                ticks: { stepSize: 1 }
            }
        }
    };

    if (loading) {
        return (
            <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '60vh' }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải thông tin dashboard phụ huynh...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger m-4 rounded-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                {error}
                <button onClick={loadParentDashboard} className="btn btn-outline-danger btn-sm ms-3">Thử lại</button>
            </div>
        );
    }

    return (
        <div className="p-0 animate__animated animate__fadeIn" style={{ fontFamily: "'Inter', sans-serif" }}>
            
            {/* TOPBAR */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 px-4 pt-4 gap-3 border-bottom pb-3">
                <div>
                    <h2 className="fw-bold mb-1" style={{ color: '#005197', letterSpacing: '-0.5px' }}>
                        Bảng điều khiển phụ huynh
                    </h2>
                    <p className="text-muted fw-500 mb-0">Theo dõi điểm số, chuyên cần và học tập của các con.</p>
                </div>

                <div className="d-flex align-items-center gap-3 self-end">
                    {/* Notification Bell */}
                    <div 
                        className={`position-relative hover-up rounded-circle d-flex align-items-center justify-content-center ${unreadCount > 0 ? 'notification-bell-active shadow-sm' : 'bg-white border border-secondary-subtle shadow-sm'}`}
                        style={{ width: '45px', height: '45px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onClick={() => handleNotificationPanelOpen(!showNotifications)}
                        title="Thông báo"
                    >
                        <i className={`bi bi-bell-fill ${unreadCount > 0 ? 'text-danger' : 'text-secondary'} fs-5`}></i>
                        {unreadCount > 0 && (
                            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light notification-badge-animated" style={{fontSize: '10px', fontWeight: 700, minWidth: '22px', height: '22px', padding: '0 6px', lineHeight: '20px'}}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        )}
                    </div>
                    <NotificationPanel isOpen={showNotifications} onClose={() => handleNotificationPanelOpen(false)} onMarkAsRead={fetchUnreadCount} />

                    {/* Child Selector */}
                    {childrenData.length > 0 && selectedChild && (
                        <div className="dropdown">
                            <div 
                                className="bg-white px-3 py-2 rounded-4 shadow-sm border border-2 d-flex flex-column justify-content-center"
                                style={{ minWidth: '220px', cursor: 'pointer' }}
                                data-bs-toggle="dropdown"
                            >
                                <label className="fw-bold text-muted d-block mb-0" style={{ fontSize: '9px', pointerEvents: 'none' }}>
                                    HỌC SINH ĐANG XEM:
                                </label>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span className="fw-bold text-primary" style={{ fontSize: '13px' }}>
                                        {selectedChild.studentName}
                                    </span>
                                    <i className="bi bi-chevron-down text-primary small ms-2"></i>
                                </div>
                            </div>
                            
                            <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-4 mt-2 p-2">
                                {childrenData.map(child => (
                                    <li key={child.studentId}>
                                        <button 
                                            className={`dropdown-item rounded-3 py-2 mb-1 fw-bold ${selectedChild.studentId === child.studentId ? 'bg-primary-subtle text-primary' : ''}`}
                                            onClick={() => handleChildChange(child)}
                                        >
                                            {child.studentName}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="px-4 pb-5">
                {selectedChild ? (
                    <>
                        {activeView === 'overall' ? (
                            <>
                                {/* Overall Summary View */}
                                <div className="card border-0 rounded-5 mb-4 shadow-sm text-white overflow-hidden" 
                                     style={{ background: 'linear-gradient(135deg, #005197 0%, #00a8ff 100%)', minHeight: '130px' }}>
                                    <div className="card-body p-4 d-flex align-items-center">
                                        <div>
                                            <h5 className="fw-bold mb-1 opacity-75">HỌC BẠ CON</h5>
                                            <h1 className="fw-bold m-0" style={{ letterSpacing: '-1px' }}>{selectedChild.studentName.toUpperCase()}</h1>
                                            <p className="lead fw-500 mb-0 opacity-90 mt-1" style={{ fontSize: '14px' }}>
                                                Có {selectedChild.courses?.length || 0} khóa học đang theo dõi.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart: final average of all courses */}
                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                                    <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                                        <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
                                        Điểm trung bình các khóa học của con
                                    </h5>
                                    <div style={{ height: '300px' }}>
                                        {validCoursesForChart.length > 0 ? (
                                            <Bar data={chartData} options={chartOptions} />
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                                Con chưa có điểm số nào trong các khóa học để vẽ biểu đồ.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* List of courses for drill down */}
                                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                                    <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                                        <i className="bi bi-journals me-2 text-primary"></i>
                                        Nhấp vào một khóa học để xem bảng điểm và xếp hạng
                                    </h5>
                                    
                                    <div className="row g-3">
                                        {selectedChild.courses && selectedChild.courses.length > 0 ? (
                                            selectedChild.courses.map((course) => (
                                                <div className="col-12 col-md-6" key={course.classId}>
                                                    <div 
                                                        className="p-3 border rounded-4 hover-up shadow-hover d-flex justify-content-between align-items-center"
                                                        style={{ cursor: 'pointer', transition: '0.2s', backgroundColor: '#fafbfd' }}
                                                        onClick={() => loadChildCourseDetails(selectedChild.studentId, course.classId)}
                                                    >
                                                        <div>
                                                            <div className="fw-bold text-dark fs-6">{course.courseName || course.className}</div>
                                                            <small className="text-muted fw-bold">Lớp: {course.className}</small>
                                                        </div>
                                                        <div className="text-end">
                                                            <span className="small text-muted d-block mb-1">Điểm TB</span>
                                                            <span className={`badge ${course.finalAverageScore >= 8.0 ? 'bg-success' : course.finalAverageScore >= 5.0 ? 'bg-primary' : course.finalAverageScore !== null ? 'bg-danger' : 'bg-secondary'} px-3 py-2 fs-6`}>
                                                                {course.finalAverageScore !== null ? course.finalAverageScore.toFixed(1) : 'Chưa có'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="col-12 text-center py-4 text-muted border rounded-4">
                                                Con chưa được phân vào lớp học nào.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Drill Down View: Student's Specific Course */}
                                <div className="mb-3">
                                    <button 
                                        className="btn btn-outline-primary rounded-pill px-4 fw-bold"
                                        onClick={() => setActiveView('overall')}
                                    >
                                        <i className="bi bi-arrow-left me-2"></i>Quay lại danh sách khóa học
                                    </button>
                                </div>

                                {loadingDrilldown ? (
                                    <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '40vh' }}>
                                        <div className="spinner-border text-info" role="status">
                                            <span className="visually-hidden">Đang tải chi tiết điểm...</span>
                                        </div>
                                    </div>
                                ) : drilldownData ? (
                                    <div className="row g-4 animate__animated animate__fadeIn">
                                        {/* Attendance card */}
                                        <div className="col-12 col-md-4 mx-auto">
                                            <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white" style={{ borderLeft: "5px solid #2ec4b6" }}>
                                                <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px' }}>Tỷ Lệ Điểm Danh Khóa Học</span>
                                                <h2 className="fw-extrabold text-success m-0" style={{ fontSize: '2.5rem' }}>{drilldownData.attendanceRate}%</h2>
                                                <p className="text-muted small mt-2 mb-0">Theo dõi chuyên cần của con tại lớp này</p>
                                            </div>
                                        </div>

                                        {/* Table of tests */}
                                        <div className="col-12">
                                            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                                                <div className="border-bottom pb-2 mb-3">
                                                    <h5 className="fw-bold m-0 text-secondary">
                                                        <i className="bi bi-card-checklist me-2 text-primary"></i>
                                                        Bảng điểm chi tiết môn: {
                                                            selectedChild.courses.find(c => c.classId === selectedClassId)?.courseName || drilldownData.className
                                                        }
                                                    </h5>
                                                </div>
                                                
                                                <div className="table-responsive">
                                                    <table className="table table-hover align-middle">
                                                        <thead className="table-light">
                                                            <tr>
                                                                <th scope="col" className="ps-3">Tên Bài Kiểm Trắc / Kiểm Tra</th>
                                                                <th scope="col" className="text-center">Điểm Số Của Con</th>
                                                                <th scope="col" className="text-center">Điểm Trung Bình Của Lớp</th>
                                                                <th scope="col" className="text-center">Xếp Hạng Trong Lớp</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {drilldownData.tests && drilldownData.tests.length > 0 ? (
                                                                drilldownData.tests.map((test, index) => {
                                                                    const hasScore = test.score !== null && test.score !== undefined;
                                                                    return (
                                                                        <tr key={test.testId || index}>
                                                                            <td className="ps-3 fw-bold text-dark">{test.testName}</td>
                                                                            <td className="text-center">
                                                                                {hasScore ? (
                                                                                    <span className={`badge ${test.score >= 8.0 ? 'bg-success' : test.score >= 5.0 ? 'bg-primary' : 'bg-danger'} px-3 py-2 fs-6`}>
                                                                                        {test.score.toFixed(1)} / 10.0
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="badge bg-secondary px-3 py-2 fs-6">Chưa nộp / Chưa chấm</span>
                                                                                )}
                                                                            </td>
                                                                            <td className="text-center fw-bold text-secondary">
                                                                                {test.classAverage.toFixed(1)} / 10.0
                                                                            </td>
                                                                            <td className="text-center fw-extrabold text-info fs-5">
                                                                                {hasScore ? (
                                                                                    <span>🎖️ {test.rank}</span>
                                                                                ) : (
                                                                                    <span className="text-muted fs-6">-</span>
                                                                                )}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan="4" className="text-center py-4 text-muted">Lớp học này chưa có thông tin bài kiểm tra.</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="alert alert-warning text-center rounded-4">Không thể tải thông tin.</div>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    <div className="alert alert-info text-center rounded-4 py-5">
                        <i className="bi bi-people fs-2 mb-2 d-block"></i>
                        Tài khoản phụ huynh này chưa được liên kết với học sinh nào. Vui lòng liên hệ Admin để thực hiện liên kết.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParentDashboard;