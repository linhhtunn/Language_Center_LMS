import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/BaseApi';

const StudentClasses = () => {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        loadStudentClasses();
    }, []);

    const loadStudentClasses = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get('Schedule/student-classes');
            const data = response?.data || response;
            setClasses(data?.classes || []);
        } catch (err) {
            const message = err?.message || 'Không thể tải danh sách lớp học.';
            setError(message);
            setClasses([]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewClass = (classId) => {
        navigate(`/student/class/${classId}`);
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Đang tải...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
                <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
        );
    }

    if (classes.length === 0) {
        return (
            <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Bạn hiện không đăng ký lớp nào.
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <div className="row g-3">
                {classes.map((classItem) => (
                    <div key={classItem.id} className="col-12 col-md-6 col-lg-4">
                        <div 
                            className="card h-100 shadow-sm border-0 rounded-4 hover-shadow" 
                            style={{ 
                                transition: 'all 0.3s ease',
                                cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 1rem 3rem rgba(0, 0, 0, 0.175)'}
                            onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'}
                        >
                            <div className="card-body">
                                {/* Header */}
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                    <div>
                                        <h5 className="card-title fw-bold mb-1" style={{ color: '#2c3e50' }}>
                                            {classItem.classCode}
                                        </h5>
                                        <p className="text-muted small mb-0">{classItem.className}</p>
                                    </div>
                                    <span className={`badge ${classItem.status === 'Hoạt động' ? 'bg-success' : 'bg-secondary'}`}>
                                        {classItem.status}
                                    </span>
                                </div>

                                {/* Divider */}
                                <hr className="my-2" style={{ opacity: 0.2 }} />

                                {/* Teacher */}
                                <div className="mb-3">
                                    <small className="text-muted d-block">Giảng viên</small>
                                    <p className="mb-0" style={{ color: '#34495e' }}>
                                        <i className="bi bi-person-fill me-2" style={{ color: '#3498db' }}></i>
                                        {classItem.teacher}
                                    </p>
                                </div>

                                {/* Student Count */}
                                <div className="mb-3">
                                    <small className="text-muted d-block">Số học sinh</small>
                                    <p className="mb-0" style={{ color: '#34495e' }}>
                                        <i className="bi bi-people-fill me-2" style={{ color: '#9b59b6' }}></i>
                                        {classItem.studentCount} / {classItem.maxStudents}
                                    </p>
                                </div>

                                {/* Dates */}
                                {(classItem.startDate || classItem.endDate) && (
                                    <div className="mb-3">
                                        <small className="text-muted d-block">Thời gian học</small>
                                        <p className="mb-0 small" style={{ color: '#34495e' }}>
                                            <i className="bi bi-calendar-event me-2" style={{ color: '#e74c3c' }}></i>
                                            {classItem.startDate && new Date(classItem.startDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                                            {classItem.endDate && ` - ${new Date(classItem.endDate + 'T00:00:00').toLocaleDateString('vi-VN')}`}
                                        </p>
                                    </div>
                                )}

                                {/* Progress Bar */}
                                {classItem.maxStudents > 0 && (
                                    <div className="mt-4">
                                        <div className="d-flex justify-content-between mb-1">
                                            <small className="text-muted">Mức độ tham gia</small>
                                            <small className="fw-bold">{Math.round((classItem.studentCount / classItem.maxStudents) * 100)}%</small>
                                        </div>
                                        <div className="progress" style={{ height: '6px', borderRadius: '3px' }}>
                                            <div 
                                                className="progress-bar bg-success" 
                                                role="progressbar" 
                                                style={{ width: `${(classItem.studentCount / classItem.maxStudents) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer with action button */}
                            <div className="card-footer bg-transparent border-top pt-3">
                                <button 
                                    className="btn btn-sm btn-primary w-100 rounded-3" 
                                    style={{ fontSize: '13px', fontWeight: '600' }}
                                    onClick={() => handleViewClass(classItem.id)}
                                >
                                    <i className="bi bi-arrow-right me-2"></i>
                                    Xem chi tiết
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StudentClasses;
