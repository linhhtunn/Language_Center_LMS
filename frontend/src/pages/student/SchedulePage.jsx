import React, { useState, useEffect } from "react";
import apiClient from "../../api/BaseApi";
import ScheduleTable from "../../components/ScheduleTable";
import { useAuth } from "../../context/AuthContext";
import { formatPeriodLabel, getSessionLabelFromPeriod } from "../../constants/scheduleTime";

const SchedulePage = () => {
    const [viewDate, setViewDate] = useState(new Date());
    const [scheduleData, setScheduleData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

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

    // Load dữ liệu lịch từ API
    const loadScheduleData = async (date = viewDate) => {
        setLoading(true);
        setError('');
        try {
            const weekStart = getWeekStart(date);
            const studentId = user?.profileId || user?.id;
            console.log('Loading schedule for weekStart:', formatDateForApi(weekStart));
            console.log('Student ID:', studentId);
            const url = `Schedule/student-board?weekStart=${formatDateForApi(weekStart)}${studentId ? `&studentId=${studentId}` : ''}`;
            console.log('API URL:', url);
            const response = await apiClient.get(url);
            console.log('API response:', response);
            const data = response?.data || response;
            console.log('Data:', data);

            const formatDateForTable = (value) => {
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return '';
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            // Transform API data to match ScheduleTable format
            let transformedData = (data?.schedules || []).map(schedule => ({
                id: schedule.id,
                code: schedule.classCode || schedule.className,
                subject: schedule.subject,
                teacher: schedule.teacher,
                room: schedule.room,
                period: formatPeriodLabel(schedule.slotId, schedule.slotEndId),
                time: `${schedule.slotId}:00`,
                date: formatDateForTable(schedule.ngayHoc),
                slot: getSessionLabelFromPeriod(schedule.slotId),
                type: 'theory'
            }));

            console.log('Transformed data:', transformedData);
            setScheduleData(transformedData);
        } catch (err) {
            console.error('Error loading schedule:', err);
            const message = err?.message || 'Không thể tải dữ liệu lịch.';
            setError(message);
            setScheduleData([]);
        } finally {
            setLoading(false);
        }
    };

    // Load dữ liệu khi viewDate hoặc user thay đổi
    useEffect(() => {
        if (!user) return;
        loadScheduleData(viewDate);
    }, [viewDate, user?.id, user?.profileId]);

    const handlePrevWeek = () => {
        const d = new Date(viewDate);
        d.setDate(viewDate.getDate() - 7);
        setViewDate(d);
    };

    const handleNextWeek = () => {
        const d = new Date(viewDate);
        d.setDate(viewDate.getDate() + 7);
        setViewDate(d);
    };

    const handleToday = () => setViewDate(new Date());

    return (
        <div className="p-4 animate__animated animate__fadeIn" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            
            <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
                <div>
                    <h3 className="fw-bold text-dark mb-1">Lịch học, lịch thi theo tuần</h3>
                </div>
                
                <div className="d-flex gap-2 bg-white p-1 rounded-pill shadow-sm border">
                    <button onClick={handleToday} className="btn btn-primary btn-sm rounded-pill px-3 fw-bold">Hiện tại</button>
                    <button onClick={handlePrevWeek} className="btn btn-outline-secondary btn-sm rounded-pill border-0 px-2">
                        <i className="bi bi-chevron-left"></i> Trở về
                    </button>
                    <button onClick={handleNextWeek} className="btn btn-outline-secondary btn-sm rounded-pill border-0 px-2">
                        Tiếp <i className="bi bi-chevron-right"></i>
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                    <button type="button" className="btn-close" onClick={() => setError('')}></button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Đang tải...</span>
                    </div>
                </div>
            ) : scheduleData.length === 0 ? (
                <div className="alert alert-info">
                    <i className="bi bi-info-circle me-2"></i>
                    Không có lịch học nào trong tuần này.
                </div>
            ) : (
                <ScheduleTable data={scheduleData} currentViewDate={viewDate} />
            )}

            <div className="mt-4 d-flex flex-wrap gap-4 fw-bold small text-muted">
                <div className="d-flex align-items-center"><span className="me-2" style={{width: '25px', height: '12px', backgroundColor: '#f0f7ff', border:'1px solid #ddd'}}></span> Lý thuyết</div>
                <div className="d-flex align-items-center"><span className="me-2" style={{width: '25px', height: '12px', backgroundColor: '#f6ffed', border:'1px solid #ddd'}}></span> Thực hành</div>
                <div className="d-flex align-items-center"><span className="me-2" style={{width: '25px', height: '12px', backgroundColor: '#fffdf0', border:'1px solid #ddd'}}></span> Lịch thi</div>
            </div>
        </div>
    );
};

export default SchedulePage;
