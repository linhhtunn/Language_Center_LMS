import React, { useParams } from 'react-router-dom';
import StudentClassDetail from '../../components/StudentClassDetail';

const StudentClassPage = () => {
    const { classId } = useParams();

    return (
        <div className="p-4 animate__animated animate__fadeIn" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            
            <div className="mb-4">
                <a href="/student" className="btn btn-sm btn-outline-secondary mb-3 rounded-pill">
                    <i className="bi bi-arrow-left me-2"></i>
                    Quay lại danh sách lớp
                </a>
                <h2 className="fw-bold text-dark mb-2">Chi tiết lớp học</h2>
                <p className="text-muted mb-0">Xem thông tin chi tiết và lịch học của lớp</p>
            </div>

            <StudentClassDetail classId={classId} />
        </div>
    );
};

export default StudentClassPage;
