import React, { useState, useEffect } from 'react';
import apiClient from '../../api/BaseApi';
import ScheduleTable from '../../components/ScheduleTable';
import { formatPeriodLabel, getSessionLabelFromPeriod } from '../../constants/scheduleTime';

const ParentSchedule = () => {
    const [scheduleData, setScheduleData] = useState([]);
    const [children, setChildren] = useState([]);
    const [selectedChild, setSelectedChild] = useState(null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [loadingSchedule, setLoadingSchedule] = useState(false);
    const [error, setError] = useState('');

    // Hàm lấy thứ Hai đầu tuần
    const getWeekStart = (dateInWeek) => {
        const date = new Date(dateInWeek);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    // Hàm format ngày cho API
    const formatDateForApi = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00:00`;
    };

    const getStudentDisplayName = (item) => {
        const name = item?.studentName || item?.tenCon || item?.hoTen || item?.fullName || item?.name || item?.tenHocSinh;
        if (typeof name === 'string' && name.trim()) {
            return name.trim();
        }

        return item?.studentId || item?.id || 'Học sinh';
    };

    // Load danh sách con phụ huynh lần đầu
    const loadChildren = async () => {
        try {
            const weekStart = getWeekStart(new Date());
            const response = await apiClient.get(`Schedule/parent-board?weekStart=${formatDateForApi(weekStart)}`);
            
            if (response?.success === false) {
                setError(response?.message || 'Không thể tải danh sách con.');
                setChildren([]);
                return;
            }

            const data = response?.data || response;
            const schedules = data?.schedules || [];

            // Extract unique children from schedule data
            const uniqueChildren = [];
            const seenIds = new Set();
            
            schedules.forEach(schedule => {
                const studentId = String(schedule.studentId || '');
                if (!seenIds.has(studentId)) {
                    uniqueChildren.push({
                        id: studentId,
                        tenCon: getStudentDisplayName(schedule),
                        lop: schedule.classCode
                    });
                    seenIds.add(studentId);
                }
            });

            setChildren(uniqueChildren);
            if (uniqueChildren.length > 0) {
                setSelectedChild(uniqueChildren[0]);
            }
        } catch (err) {
            console.error('Error loading children:', err);
            setChildren([]);
        }
    };

    // Load dữ liệu lịch từ API
    const loadScheduleData = async (date = currentDate) => {
        setLoadingSchedule(true);
        setError('');
        try {
            const weekStart = getWeekStart(date);
            const response = await apiClient.get(`Schedule/parent-board?weekStart=${formatDateForApi(weekStart)}`);
            
            // Kiểm tra nếu API trả về lỗi
            if (response?.success === false) {
                setError(response?.message || 'Không thể tải dữ liệu lịch.');
                setScheduleData([]);
                setLoadingSchedule(false);
                return;
            }

            const data = response?.data || response;

            // Transform API data to match ScheduleTable format
            const transformedData = (data?.schedules || []).map(schedule => {
                // Format ngayHoc to YYYY-MM-DD
                const ngayHocDate = new Date(schedule.ngayHoc);
                const year = ngayHocDate.getFullYear();
                const month = String(ngayHocDate.getMonth() + 1).padStart(2, '0');
                const day = String(ngayHocDate.getDate()).padStart(2, '0');
                const dateStr = `${year}-${month}-${day}`;

                return {
                    id: schedule.id,
                    date: dateStr,
                    slot: getSessionLabelFromPeriod(schedule.slotId),
                    subject: schedule.subject,
                    code: schedule.classCode,
                    period: formatPeriodLabel(schedule.slotId, schedule.slotEndId),
                    room: schedule.room,
                    teacher: schedule.teacher,
                    type: 'theory',
                    studentId: String(schedule.studentId || ''),
                    studentName: getStudentDisplayName(schedule),
                    // Keep original fields for filtering
                    slotId: schedule.slotId,
                    slotEndId: schedule.slotEndId,
                    className: schedule.className,
                    classCode: schedule.classCode,
                    ngayHoc: schedule.ngayHoc,
                    dayIdx: schedule.dayIdx
                };
            });

            setScheduleData(transformedData);
        } catch (err) {
            const message = err?.message || 'Không thể tải dữ liệu lịch.';
            setError(message);
            setScheduleData([]);
        } finally {
            setLoadingSchedule(false);
        }
    };

    // Load danh sách con lần đầu
    useEffect(() => {
        const initData = async () => {
            await loadChildren();
            await loadScheduleData(currentDate);
            setLoading(false);
        };
        initData();
    }, []);

    // Load dữ liệu lịch khi currentDate thay đổi
    useEffect(() => {
        if (children.length > 0) {
            loadScheduleData(currentDate);
        }
    }, [currentDate]);

    // Filter schedule data by selected child
    const filteredSchedule = selectedChild
        ? scheduleData.filter(item => String(item.studentId) === String(selectedChild.id))
        : scheduleData;

    const changeWeek = (offset) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (offset * 7));
        setCurrentDate(newDate);
    };

    return (
        <div className="container-fluid p-4 animate__animated animate__fadeIn">
            {/* Tiêu đề chính nằm riêng trên một dòng hoặc phía trên cùng */}
            <h2 className="fw-bold mb-4" style={{ fontSize: '24px', color: '#333' }}>
                Lịch học, lịch thi theo tuần
            </h2>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {/* Header: Chứa nút chọn con bên trái và điều hướng bên phải */}
            {children.length > 0 && (
                <div className="d-flex flex-column mb-4 gap-3">
                    
                    {/* 1. Bộ chọn con - Hiển thị dạng nút bấm */}
                    <div>
                        <p className="text-muted fw-bold mb-2" style={{ fontSize: '13px' }}>
                            <i className="bi bi-person-circle me-2" style={{ color: '#007bff' }}></i>
                            Chọn con để xem thời khóa biểu:
                        </p>
                        <div className="d-flex flex-wrap gap-2">
                            {children.map(child => (
                                <button 
                                    key={child.id}
                                    className={`btn fw-bold rounded-pill px-4 shadow-sm transition-all ${
                                        selectedChild?.id === child.id 
                                            ? 'btn-primary' 
                                            : 'btn-outline-primary'
                                    }`}
                                    onClick={() => setSelectedChild(child)}
                                    style={{ 
                                        height: '40px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <i className="bi bi-person me-1"></i>
                                    {child.tenCon}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* 2. Cụm điều hướng thời gian nằm bên trái dưới */}
                    <div className="d-flex align-items-center gap-2">
                        {/* Nút Hiện tại */}
                        <button 
                            className="btn btn-primary rounded-pill px-4 fw-bold shadow-sm" 
                            onClick={() => setCurrentDate(new Date())}
                            style={{ backgroundColor: '#007bff', border: 'none', height: '40px' }}
                        >
                            <i className="bi bi-calendar-today me-1"></i>
                            Hiện tại
                        </button>
                        
                        {/* Nút Trở về / Tiếp */}
                        <div className="d-flex align-items-center border rounded-pill bg-white px-2 shadow-sm" style={{ height: '40px' }}>
                            <button className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium" onClick={() => changeWeek(-1)}>
                                <i className="bi bi-chevron-left small"></i> Trước
                            </button>
                            <div className="vr mx-1 my-2" style={{ opacity: 0.2 }}></div>
                            <button className="btn btn-link text-dark p-0 px-2 text-decoration-none small fw-medium" onClick={() => changeWeek(1)}>
                                Sau <i className="bi bi-chevron-right small"></i>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hiển thị thông tin con đang xem */}
            {selectedChild && (
                <div className="alert alert-info rounded-4 mb-4 d-flex align-items-center shadow-sm">
                    <i className="bi bi-info-circle-fill me-2" style={{ fontSize: '18px' }}></i>
                    <div>
                        <strong>{selectedChild.tenCon}</strong> 
                        {selectedChild.lop && <span className="ms-2 badge bg-primary">{selectedChild.lop}</span>}
                    </div>
                </div>
            )}

            {/* Bảng lịch học */}
            <div className="card border-0 shadow-sm rounded-5 overflow-hidden">
                <div className="card-body p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : loadingSchedule ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải lịch...</span>
                            </div>
                        </div>
                    ) : children.length === 0 ? (
                        <div className="alert alert-info m-3">
                            <i className="bi bi-info-circle me-2"></i>
                            Không có con của phụ huynh hoặc chưa có lịch học.
                        </div>
                    ) : (
                        <ScheduleTable 
                            data={filteredSchedule} 
                            currentViewDate={currentDate} 
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentSchedule;
