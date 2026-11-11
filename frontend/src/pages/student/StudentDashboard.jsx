import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import StudentClasses from "../../components/StudentClasses";
import NotificationPanel from "../../components/NotificationPanel";
import BaseApi from "../../api/BaseApi";
import "../../styles/notification-badge.css";
import "../../styles/notification-panel.css"; // Import notification panel styles

const StudentDashboard = () => {
    const { user } = useAuth();
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [weeklySessionCount, setWeeklySessionCount] = useState(0);

    // Fetch unread notification count and weekly schedule count
    useEffect(() => {
        fetchUnreadCount();
        fetchWeeklySessionCount();
    }, [user]);

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
            
            console.log('Setting unread count to:', count);
            setUnreadCount(count);
        } catch (error) {
            console.error('Error fetching unread count:', error);
            console.error('Error details:', error.response?.data || error.message);
            setUnreadCount(0);
        }
    };

    const getWeekStart = (date) => {
        const target = new Date(date);
        const day = target.getDay();
        const diff = target.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(target.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return monday;
    };

    const formatDateForApi = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T00:00:00`;
    };

    const fetchWeeklySessionCount = async () => {
        if (!user) {
            setWeeklySessionCount(0);
            return;
        }

        try {
            const weekStart = getWeekStart(new Date());
            const studentId = user.profileId || user.id;
            const url = `Schedule/student-board?weekStart=${formatDateForApi(weekStart)}${studentId ? `&studentId=${studentId}` : ''}`;
            const response = await BaseApi.get(url);
            const data = response?.data || response;
            const schedules = Array.isArray(data?.schedules) ? data.schedules : [];
            setWeeklySessionCount(schedules.length);
        } catch (error) {
            console.error('Error fetching weekly sessions count:', error);
            setWeeklySessionCount(0);
        }
    };

    // Refresh unread count when notification panel opens
    const handleNotificationPanelOpen = (isOpen) => {
        console.log('Notification panel toggle (student):', isOpen);
        setShowNotifications(isOpen);
        if (isOpen) {
            // Refresh count when panel opens (after marking as read via NotificationPanel)
            setTimeout(() => fetchUnreadCount(), 500);
        }
    };

    return (
        <div className="p-4 animate__animated animate__fadeIn" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            
            <div className="mb-4 d-flex justify-content-between align-items-center">
                <div>
                    <h2 className="fw-bold text-dark mb-2">Lớp học của bạn</h2>
                    <p className="text-muted mb-0">Quản lý và xem lịch học của các lớp đang học</p>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                    {/* Nút thông báo hình chuông */}
                    <div 
                        className={`position-relative hover-up rounded-circle d-flex align-items-center justify-content-center ${unreadCount > 0 ? 'notification-bell-active shadow-sm' : 'bg-white border border-secondary-subtle shadow-sm'}`} 
                        style={{ width: '48px', height: '48px', cursor: 'pointer', transition: 'all 0.2s ease' }}
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
                </div>
            </div>

            <StudentClasses />
        </div>
    );
};

export default StudentDashboard;
