import React, { useState, useEffect, useRef } from 'react';
import apiClient, { getApiBaseUrl } from '../api/BaseApi';

const triggerBrowserDownload = (blob, fileName) => {
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName || 'dinh-kem';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
};

// Utility function để convert UTC time sang local time
const formatLocalDate = (utcDateString) => {
  try {
    const utcDate = new Date(utcDateString);
    return utcDate.toLocaleDateString('vi-VN');
  } catch (error) {
    return 'N/A';
  }
};

const formatLocalTime = (utcDateString) => {
  try {
    const utcDate = new Date(utcDateString);
    return utcDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return 'N/A';
  }
};

const NotificationPanel = ({ isOpen, onClose, onMarkAsRead }) => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            console.log('NotificationPanel opened');
            markAllNotificationsAsRead();
            fetchNotifications();
        }
    }, [isOpen]);

    // Đóng panel khi click bên ngoài
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (panelRef.current && !panelRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen, onClose]);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            console.log('Fetching notifications from API...');
            const response = await apiClient.get('Notification/my-notifications');
            const resData = response.data || response;
            
            const isArray = Array.isArray(resData);
            const dataList = isArray ? resData : (resData.data || []);
            
            const normalizedData = dataList.map(item => ({
                id: item.id || item.Id,
                title: item.title || item.Title || '',
                content: item.content || item.Content || '',
                target: item.target || item.Target || 'Tất cả',
                createdAt: item.createdAt || item.CreatedAt || item.ThoiGianTao || new Date().toISOString(),
                isRead: item.isRead || item.IsRead || false,
                attachments: (item.attachments || item.Attachments || []).map(a => ({
                    id: a.id || a.Id,
                    fileName: a.fileName || a.FileName || 'tep-dinh-kem'
                }))
            }));
            
            setNotifications(normalizedData);
        } catch (error) {
            console.error('Lỗi lấy thông báo:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const markAllNotificationsAsRead = async () => {
        try {
            console.log('Marking all notifications as read...');
            const response = await apiClient.post('Notification/mark-all-as-read');
            if (response.data?.success || response.success) {
                console.log('All notifications marked as read');
                // Notify parent component to update count
                if (onMarkAsRead) {
                    onMarkAsRead();
                }
            }
        } catch (error) {
            console.error('Lỗi đánh dấu tất cả thông báo:', error);
        }
    };

    const handleMarkAsRead = async (notificationId) => {
        console.log('Mark as read clicked:', notificationId);
        try {
            const response = await apiClient.post(`Notification/${notificationId}/mark-as-read`);
            if (response.data?.success || response.success) {
                // Update local state
                setNotifications(prev => 
                    prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
                );
                // Notify parent component to update count
                if (onMarkAsRead) {
                    onMarkAsRead();
                }
            }
        } catch (error) {
            console.error('Lỗi đánh dấu thông báo:', error);
        }
    };

    const handleDownloadAttachment = async (event, attachment) => {
        event.stopPropagation(); // tránh kích hoạt đánh dấu đã đọc khi bấm tải file
        try {
            const token = apiClient.getAuthToken();
            const response = await fetch(`${getApiBaseUrl()}/Notification/attachments/${attachment.id}/download`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(payload?.message || 'Không thể tải file đính kèm.');
            }
            const blob = await response.blob();
            triggerBrowserDownload(blob, attachment.fileName);
        } catch (error) {
            console.error('Lỗi tải file đính kèm:', error);
            alert(error.message || 'Không thể tải file đính kèm.');
        }
    };

    const getTargetColor = (target) => {
        switch (target) {
            case 'Tất cả':
                return 'success';
            case 'Giáo viên':
                return 'warning';
            case 'Phụ huynh':
                return 'info';
            case 'Học sinh':
            default:
                return 'primary';
        }
    };

    const getTargetIcon = (target) => {
        switch (target) {
            case 'Giáo viên':
                return 'bi-person-badge';
            case 'Phụ huynh':
                return 'bi-person-heart';
            case 'Học sinh':
                return 'bi-mortarboard';
            default:
                return 'bi-broadcast';
        }
    };

    if (!isOpen) return null;

    return (
        <div
            ref={panelRef}
            className="position-fixed bg-white rounded-4 shadow-lg p-0"
            style={{
                top: '70px',
                right: '20px',
                width: '380px',
                maxHeight: '500px',
                zIndex: 1050,
                border: '1px solid #e9ecef'
            }}
        >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center p-4 border-bottom bg-light rounded-top-4">
                <h6 className="mb-0 fw-bold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-bell-fill text-warning"></i>
                    Thông báo ({notifications.length})
                </h6>
                <button
                    className="btn btn-sm btn-link text-muted p-0"
                    onClick={onClose}
                    title="Đóng"
                >
                    <i className="bi bi-x-lg fs-5"></i>
                </button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto custom-scrollbar" style={{ maxHeight: '420px' }}>
                {isLoading ? (
                    <div className="d-flex justify-content-center align-items-center py-5">
                        <div className="spinner-border spinner-border-sm text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                        </div>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center text-muted py-5">
                        <i className="bi bi-inbox fs-1 mb-2 d-block opacity-50"></i>
                        <p className="small">Không có thông báo nào</p>
                    </div>
                ) : (
                    notifications.map((notif, index) => (
                        <div
                            key={notif.id || index}
                            className={`p-3 border-bottom hover-bg-light transition-all ${notif.isRead ? 'opacity-50' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleMarkAsRead(notif.id)}
                        >
                            <div className="d-flex align-items-start gap-3">
                                <div
                                    className={`bg-${getTargetColor(notif.target)} rounded-circle p-2 flex-shrink-0 position-relative`}
                                    style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                >
                                    <i className={`bi ${getTargetIcon(notif.target)} text-white`}></i>
                                    {!notif.isRead && (
                                        <span
                                            className="position-absolute top-0 end-0 translate-middle p-1 bg-danger border border-light rounded-circle"
                                            style={{ width: '12px', height: '12px' }}
                                            title="Chưa xem"
                                        ></span>
                                    )}
                                </div>

                                <div className="flex-grow-1 min-w-0">
                                    <div className="d-flex justify-content-between align-items-start mb-1">
                                        <h6 className="mb-0 fw-bold text-dark text-truncate" style={{ fontSize: '13px' }}>
                                            {notif.title}
                                        </h6>
                                        <span
                                            className={`badge bg-${getTargetColor(notif.target)} ms-2 flex-shrink-0`}
                                            style={{ fontSize: '9px' }}
                                        >
                                            {notif.target}
                                        </span>
                                    </div>
                                    <p className="mb-2 text-muted small" style={{ fontSize: '12px', lineHeight: '1.4' }}>
                                        {notif.content}
                                    </p>
                                    {notif.attachments.length > 0 && (
                                        <div className="d-flex gap-1 flex-wrap mb-2">
                                            {notif.attachments.map((att) => (
                                                <button
                                                    key={att.id}
                                                    type="button"
                                                    className="btn btn-sm btn-outline-secondary"
                                                    style={{ fontSize: '11px', padding: '2px 8px' }}
                                                    onClick={(e) => handleDownloadAttachment(e, att)}
                                                    title={att.fileName}
                                                >
                                                    <i className="bi bi-paperclip"></i>{' '}
                                                    {att.fileName.length > 16 ? `${att.fileName.slice(0, 14)}…` : att.fileName}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <div className="d-flex gap-2 align-items-center flex-wrap">
                                        <span className="text-muted opacity-75 small" style={{ fontSize: '11px' }}>
                                            <i className="bi bi-calendar3 me-1"></i>
                                            {formatLocalDate(notif.createdAt)}
                                        </span>
                                        <span className="text-muted opacity-75 small" style={{ fontSize: '11px' }}>
                                            <i className="bi bi-clock me-1"></i>
                                            {formatLocalTime(notif.createdAt)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>


        </div>
    );
};

export default NotificationPanel;
