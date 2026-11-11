import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSignalRBaseUrl } from '../api/BaseApi';
import studentStudyContentService from '../api/studentStudyContentService';

const Sidebar = () => {
    const { user, logout, refreshPermissions } = useAuth();
    const navigate = useNavigate();
    const [refreshing, setRefreshing] = useState(false);
    const [studentClassLabel, setStudentClassLabel] = useState('Dang tai lop hien tai...');

    const permissionCodes = Array.isArray(user?.permissionCodes) ? user.permissionCodes : [];
    const hasPermission = (code) => permissionCodes.includes(code);

    const rolePath = user?.role === 'Giao_Vien'
        ? 'teacher'
        : user?.role === 'Hoc_Sinh'
            ? 'student'
            : user?.role === 'Phu_Huynh'
                ? 'parent'
                : 'admin';

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleRefreshPermissions = async () => {
        setRefreshing(true);
        try {
            const result = await refreshPermissions();
            if (result.success) {
                alert('Quyen truy cap da duoc cap nhat!');
                window.location.reload();
            } else {
                alert(result.message);
            }
        } catch (error) {
            alert(`Loi khi cap nhat quyen: ${error.message}`);
        } finally {
            setRefreshing(false);
        }
    };

    const goToProfile = () => {
        navigate(`/${rolePath}/profile`);
    };

    const getNavLinkClass = ({ isActive }) => {
        const baseClass = 'nav-link py-3 px-4 fw-bold d-flex align-items-center mb-2 rounded-4 transition-all border-start border-4';
        return isActive
            ? `${baseClass} bg-primary text-white shadow border-primary active`
            : `${baseClass} text-secondary border-white hover-bg-light`;
    };

    const resolveAvatarUrl = (avatarPath, displayName) => {
        if (avatarPath) {
            if (/^https?:\/\//i.test(avatarPath)) {
                return avatarPath;
            }

            const baseUrl = getSignalRBaseUrl().replace(/\/+$/, '');
            const normalizedPath = avatarPath.startsWith('/') ? avatarPath : `/${avatarPath}`;
            return `${baseUrl}${normalizedPath}`;
        }

        return `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=005197&color=fff&bold=true`;
    };

    const displayName = user?.hoTen || user?.fullName || user?.name || 'Nguoi dung';
    const displayRole = user?.role?.replace('_', ' ').toUpperCase() || 'USER';
    const displayAvatar = resolveAvatarUrl(
        user?.avatarPreview || user?.AnhDaiDien || user?.anhDaiDien || user?.avatarUrl || user?.avatar,
        displayName
    );

    const permissionMenus = [
        {
            code: 'PAGE_ADMIN_USERS_VIEW',
            to: '/admin/users',
            icon: 'bi bi-person-badge-fill',
            label: 'Quan ly nguoi dung'
        },
        {
            code: 'PAGE_ADMIN_CLASSES_VIEW',
            to: '/admin/classes',
            icon: 'bi bi-collection-fill',
            label: 'Quan ly lop hoc'
        },
        {
            code: 'PAGE_ADMIN_REPORTS_VIEW',
            roles: ['Admin'],
            to: '/admin/reports',
            icon: 'bi bi-pie-chart-fill',
            label: 'Bao cao va thong ke'
        },
        {
            code: 'PAGE_TEACHER_SCHEDULE_VIEW',
            roles: ['Giao_Vien'],
            to: '/teacher/schedule',
            icon: 'bi bi-calendar-event',
            label: 'Quan ly lich day'
        },
        {
            code: 'PAGE_STUDENT_SCHEDULE_VIEW',
            roles: ['Hoc_Sinh'],
            to: '/student/schedule',
            icon: 'bi bi-calendar3',
            label: 'Quan ly lich hoc'
        },
        {
            code: 'PAGE_PARENT_SCHEDULE_VIEW',
            roles: ['Phu_Huynh'],
            to: '/parent/schedule',
            icon: 'bi bi-calendar3',
            label: 'Xem lich hoc'
        }
    ].filter((item) => hasPermission(item.code) && (!item.roles || item.roles.includes(user?.role)));

    useEffect(() => {
        let isMounted = true;

        if (rolePath !== 'student') {
            setStudentClassLabel('Dang tai lop hien tai...');
            return () => {
                isMounted = false;
            };
        }

        const fetchStudentCurrentClass = async () => {
            try {
                const overview = await studentStudyContentService.getCurrentContent();
                if (!isMounted) {
                    return;
                }

                setStudentClassLabel(overview?.TenLop || overview?.tenLop || 'Chua xep lop hien tai');
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setStudentClassLabel(error.message || 'Chua xep lop hien tai');
            }
        };

        fetchStudentCurrentClass();

        return () => {
            isMounted = false;
        };
    }, [rolePath, user?.id]);

    return (
        <div className="col-md-3 col-lg-2 bg-white d-flex flex-column vh-100 sticky-top border-end shadow-sm p-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <div className="flex-shrink-0">
                <div
                    onClick={goToProfile}
                    className="d-flex align-items-center p-3 mb-4 rounded-4 border bg-white shadow-sm position-relative shadow-hover"
                    style={{ transition: '0.3s', cursor: 'pointer', minHeight: '85px' }}
                >
                    <div className="position-absolute top-0 start-0 h-100 w-2 bg-primary"></div>
                    <img
                        src={displayAvatar}
                        className="rounded-circle me-3 border border-2 border-primary-subtle object-fit-cover"
                        width="42"
                        height="42"
                        alt="avatar"
                    />
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <h6 className="mb-1 fw-bold text-dark" style={{ fontSize: displayName.length > 15 ? '0.75rem' : '0.85rem', lineHeight: '1.2', wordBreak: 'break-word' }}>
                            {displayName}
                        </h6>
                        <span className="badge bg-info-subtle text-info rounded-pill px-2 py-1" style={{ fontSize: '9px', fontWeight: '800' }}>
                            {displayRole}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-grow-1 overflow-y-auto custom-scrollbar px-1">
                <ul className="nav nav-pills flex-column shadow-none">
                    <li className="nav-item">
                        <NavLink to={`/${rolePath}`} className={getNavLinkClass} end>
                            <i className="bi bi-grid-fill me-3 fs-5"></i>
                            <span style={{ fontSize: '14px' }}>Trang chu</span>
                        </NavLink>
                    </li>

                    {permissionMenus.map((menu) => (
                        <li className="nav-item" key={menu.code}>
                            <NavLink to={menu.to} className={getNavLinkClass}>
                                <i className={`${menu.icon} me-3 fs-5`}></i>
                                <span style={{ fontSize: '14px' }}>{menu.label}</span>
                            </NavLink>
                        </li>
                    ))}

                    {rolePath === 'admin' && (
                        <>
                            <li className="nav-item"><NavLink to="/admin/functions" className={getNavLinkClass}><i className="bi bi-toggle-on me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly chuc nang</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/courses" className={getNavLinkClass}><i className="bi bi-journal-bookmark-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly khoa hoc</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/schedules" className={getNavLinkClass}><i className="bi bi-calendar-check-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Lich day va hoc</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/student-stats" className={getNavLinkClass}><i className="bi bi-people-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Thong ke hoc sinh</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/content" className={getNavLinkClass}><i className="bi bi-file-earmark-richtext-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Noi dung hoc tap</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/exams" className={getNavLinkClass}><i className="bi bi-journal-code me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Bai tap - De thi</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/attendance" className={getNavLinkClass}><i className="bi bi-clipboard-check-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly diem danh</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/notifications" className={getNavLinkClass}><i className="bi bi-send-check-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly thong bao</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/admin/messages" className={getNavLinkClass}><i className="bi bi-chat-dots-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly nhan tin</span></NavLink></li>
                        </>
                    )}

                    {rolePath === 'parent' && (
                        <>
                            <li className="nav-item"><NavLink to="/parent/attendance" className={getNavLinkClass}><i className="bi bi-clipboard2-check me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Xem diem danh</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/parent/messages" className={getNavLinkClass}><i className="bi bi-chat-dots me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly nhan tin</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/parent/reports" className={getNavLinkClass}><i className="bi bi-bar-chart-line me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Bao cao thong ke</span></NavLink></li>
                        </>
                    )}

                    {rolePath === 'student' && (
                        <>
                            <li className="nav-item"><NavLink to="/student/homework-list" className={getNavLinkClass}><i className="bi bi-pencil-square me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Bai tap/bai thi</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/student/reports" className={getNavLinkClass}><i className="bi bi-pie-chart-fill me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Bao cao thong ke</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/student/homework" className={getNavLinkClass}><i className="bi bi-laptop me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Hoc chu dong</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/student/messages" className={getNavLinkClass}><i className="bi bi-chat-dots me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly nhan tin</span></NavLink></li>
                        </>
                    )}

                    {rolePath === 'teacher' && (
                        <>
                            <li className="nav-item"><NavLink to="/teacher/classes" className={getNavLinkClass}><i className="bi bi-people me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly lop hoc</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/exams" className={getNavLinkClass}><i className="bi bi-file-earmark-text me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly bai tap - De thi</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/grading" className={getNavLinkClass}><i className="bi bi-pencil-square me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Cham diem</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/content" className={getNavLinkClass}><i className="bi bi-book me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Noi dung hoc tap</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/messages" className={getNavLinkClass}><i className="bi bi-chat-dots me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Quan ly nhan tin</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/attendance" className={getNavLinkClass}><i className="bi bi-clipboard2-check me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Diem danh</span></NavLink></li>
                            <li className="nav-item"><NavLink to="/teacher/reports" className={getNavLinkClass}><i className="bi bi-bar-chart-line me-3 fs-5"></i><span style={{ fontSize: '14px' }}>Bao cao va thong ke</span></NavLink></li>
                        </>
                    )}
                </ul>
            </div>

            <div className="px-3 py-2 small text-muted border-top">
                <details style={{ fontSize: '11px' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Debug Info</summary>
                    <div className="mt-2 small" style={{ backgroundColor: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                        <div><strong>User:</strong> {user?.hoTen || user?.fullName || user?.name}</div>
                        <div><strong>Role:</strong> {user?.role}</div>
                        <div><strong>Permissions ({permissionCodes.length}):</strong></div>
                        {permissionCodes.length > 0 ? (
                            <ul style={{ fontSize: '10px', margin: '4px 0', paddingLeft: '16px' }}>
                                {permissionCodes.map((code, idx) => (
                                    <li key={idx} style={{ wordBreak: 'break-word' }}>{code}</li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ color: 'red', fontWeight: 'bold' }}>Khong co quyen</div>
                        )}
                    </div>
                </details>
            </div>

            <div className="flex-shrink-0 mt-auto pt-3 border-top d-flex gap-2">
                <button
                    onClick={handleRefreshPermissions}
                    disabled={refreshing}
                    className="btn flex-grow-1 text-info fw-bold py-2.5 rounded-4 border-0 shadow-sm d-flex align-items-center justify-content-center btn-refresh"
                    style={{ backgroundColor: '#E3F2FD', transition: '0.3s', fontSize: '14px' }}
                    title="Cap nhat quyen truy cap tu he thong"
                >
                    <i className={`bi bi-arrow-clockwise me-2 fs-5 ${refreshing ? 'spin' : ''}`}></i>
                    {refreshing ? 'Dang cap nhat...' : 'Lam moi'}
                </button>
                <button
                    onClick={handleLogout}
                    className="btn flex-grow-1 text-danger fw-bold py-2.5 rounded-4 border-0 shadow-sm d-flex align-items-center justify-content-center btn-logout"
                    style={{ backgroundColor: '#FFF0F0', transition: '0.3s', fontSize: '14px' }}
                >
                    <i className="bi bi-power me-2 fs-5"></i> Dang xuat
                </button>
            </div>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #eee; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .hover-bg-light:hover { background-color: #f8f9fa !important; color: #005197 !important; }
                .btn-refresh:hover:not(:disabled) { background-color: #bbdefb !important; transform: translateY(-2px); }
                .btn-refresh:disabled { opacity: 0.7; cursor: not-allowed; }
                .btn-refresh .spin { animation: spin 1s linear infinite; }
                .btn-logout:hover { background-color: #ffe0e0 !important; transform: translateY(-2px); }
                .shadow-hover:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
                .nav-link.active { border-left-width: 4px !important; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
};

export default Sidebar;
