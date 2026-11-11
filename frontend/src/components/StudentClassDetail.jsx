import React, { useState, useEffect } from 'react';
import apiClient from '../api/BaseApi';
import { formatPeriodLabel } from '../constants/scheduleTime';

const StudentClassDetail = ({ classId }) => {
    const [classDetail, setClassDetail] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        loadClassDetail();
    }, [classId]);

    const loadClassDetail = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await apiClient.get(`Schedule/student-class-detail/${classId}`);
            const data = response?.data || response;
            setClassDetail(data);
        } catch (err) {
            const message = err?.message || 'Không thể tải thông tin lớp học.';
            setError(message);
        } finally {
            setLoading(false);
        }
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

    if (!classDetail) {
        return (
            <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                Không có thông tin lớp học.
            </div>
        );
    }

    return (
        <div className="animate__animated animate__fadeIn">
            {/* Header Section */}
            <div className="card border-0 shadow-sm mb-4 rounded-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                <div className="card-body p-4 text-white">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                            <h2 className="card-title fw-bold mb-2">{classDetail.classCode}</h2>
                            <p className="card-text mb-3 opacity-90">{classDetail.className}</p>
                            <span className={`badge ${classDetail.status === 'Hoạt động' ? 'bg-success' : 'bg-secondary'}`}>
                                {classDetail.status}
                            </span>
                        </div>
                    </div>

                    <hr className="opacity-25" />

                    <div className="row g-3">
                        <div className="col-md-6">
                            <div>
                                <small className="opacity-75 d-block mb-1">Giảng viên</small>
                                <p className="mb-0" style={{ fontSize: '15px', fontWeight: '500' }}>
                                    <i className="bi bi-person-fill me-2"></i>
                                    {classDetail.teacher}
                                </p>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div>
                                <small className="opacity-75 d-block mb-1">Số học sinh</small>
                                <p className="mb-0" style={{ fontSize: '15px', fontWeight: '500' }}>
                                    <i className="bi bi-people-fill me-2"></i>
                                    {classDetail.studentCount} / {classDetail.maxStudents}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Class Info */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-light border-0 rounded-top-4">
                            <h5 className="card-title fw-bold mb-0">
                                <i className="bi bi-info-circle me-2" style={{ color: '#3498db' }}></i>
                                Thông tin lớp
                            </h5>
                        </div>
                        <div className="card-body">
                            {/* Dates */}
                            {(classDetail.startDate || classDetail.endDate) && (
                                <div className="mb-4 pb-4 border-bottom">
                                    <small className="text-muted d-block mb-2">Thời gian học</small>
                                    <p className="mb-0" style={{ color: '#34495e', fontSize: '14px', fontWeight: '500' }}>
                                        {classDetail.startDate && new Date(classDetail.startDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                                        {classDetail.startDate && classDetail.endDate && ' → '}
                                        {classDetail.endDate && new Date(classDetail.endDate + 'T00:00:00').toLocaleDateString('vi-VN')}
                                    </p>
                                </div>
                            )}

                            {/* Capacity */}
                            <div className="mb-4 pb-4 border-bottom">
                                <small className="text-muted d-block mb-2">Công suất lớp</small>
                                <div className="progress mb-2" style={{ height: '8px', borderRadius: '4px' }}>
                                    <div 
                                        className="progress-bar bg-success" 
                                        style={{ width: `${(classDetail.studentCount / classDetail.maxStudents) * 100}%` }}
                                    ></div>
                                </div>
                                <small style={{ color: '#7f8c8d' }}>
                                    {Math.round((classDetail.studentCount / classDetail.maxStudents) * 100)}% ({classDetail.studentCount}/{classDetail.maxStudents})
                                </small>
                            </div>

                            {/* Description */}
                            {classDetail.description && (
                                <div>
                                    <small className="text-muted d-block mb-2">Mô tả</small>
                                    <p className="mb-0" style={{ color: '#34495e', fontSize: '14px' }}>
                                        {classDetail.description}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Upcoming Schedules */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4">
                        <div className="card-header bg-light border-0 rounded-top-4">
                            <h5 className="card-title fw-bold mb-0">
                                <i className="bi bi-calendar-event me-2" style={{ color: '#e74c3c' }}></i>
                                Lịch học sắp tới (7 ngày)
                            </h5>
                        </div>
                        <div className="card-body p-0">
                            {classDetail.upcomingSchedules && classDetail.upcomingSchedules.length > 0 ? (
                                <div className="list-group list-group-flush">
                                    {classDetail.upcomingSchedules.map((schedule, idx) => (
                                        <div key={schedule.id} className={`list-group-item ${idx !== classDetail.upcomingSchedules.length - 1 ? 'border-bottom' : ''}`}>
                                            <div className="d-flex justify-content-between align-items-start">
                                                <div>
                                                    <h6 className="fw-bold mb-2" style={{ color: '#2c3e50' }}>
                                                        {schedule.subject}
                                                    </h6>
                                                    <div className="d-flex flex-wrap gap-3 small text-muted">
                                                        <span>
                                                            <i className="bi bi-calendar3 me-1"></i>
                                                            {new Date(schedule.ngayHoc + 'T00:00:00').toLocaleDateString('vi-VN')}
                                                        </span>
                                                        <span>
                                                            <i className="bi bi-clock me-1"></i>
                                                            {formatPeriodLabel(schedule.slotId, schedule.slotEndId)}
                                                        </span>
                                                        <span>
                                                            <i className="bi bi-door-closed me-1"></i>
                                                            {schedule.room}
                                                        </span>
                                                    </div>
                                                </div>
                                                <span className="badge bg-primary rounded-pill">Sắp tới</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <p className="text-muted mb-0">
                                        <i className="bi bi-calendar-x me-2" style={{ fontSize: '20px' }}></i>
                                        <br />
                                        Không có lịch học trong 7 ngày tới
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Students List */}
            {classDetail.studentNames && classDetail.studentNames.length > 0 && (
                <div className="card border-0 shadow-sm rounded-4 mt-4">
                    <div className="card-header bg-light border-0 rounded-top-4">
                        <h5 className="card-title fw-bold mb-0">
                            <i className="bi bi-people-fill me-2" style={{ color: '#9b59b6' }}></i>
                            Danh sách học sinh ({classDetail.studentNames.length})
                        </h5>
                    </div>
                    <div className="card-body">
                        <div className="row">
                            {classDetail.studentNames.map((name, idx) => (
                                <div key={idx} className="col-md-6 col-lg-4 mb-3">
                                    <div className="d-flex align-items-center p-2 rounded-3" style={{ backgroundColor: '#f8f9fa' }}>
                                        <i className="bi bi-person-circle" style={{ fontSize: '24px', color: '#3498db', marginRight: '10px' }}></i>
                                        <span style={{ color: '#34495e', fontSize: '14px', fontWeight: '500' }}>{name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentClassDetail;
