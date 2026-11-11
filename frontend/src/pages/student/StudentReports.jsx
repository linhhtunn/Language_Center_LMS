import React, { useEffect, useState } from 'react';
import { p0Api } from '../../api/p0Api';
import BarLineComparisonChart from '../../components/charts/BarLineComparisonChart';
import { fetchStudentClasses, summarizeStudentClassScores } from '../../utils/studentScoreSummary';
import { getStudentAiProgress } from '../../api/studentAssignmentService';

const StudentReports = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [dashboardData, setDashboardData] = useState(null);
  const [allClassesData, setAllClassesData] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState('');
  // Nhận xét tiến bộ AI3 - độc lập với lớp/khóa đang chọn ở trên, tải 1 lần khi vào trang.
  const [aiProgress, setAiProgress] = useState([]);

  useEffect(() => {
    getStudentAiProgress()
      .then((res) => {
        if (res.success) setAiProgress(res.data || []);
      })
      .catch((err) => console.error('Không tải được nhận xét tiến bộ AI:', err));
  }, []);

  // Load student classes first
  const loadStudentClasses = async () => {
    setLoadingClasses(true);
    setError('');
    try {
      const dataPayload = await fetchStudentClasses();
      setClasses(dataPayload);
      if (dataPayload.length > 0) {
        setSelectedClassId('all');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách khóa học của bạn.');
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    loadStudentClasses();
  }, []);

  // Load dashboard when class changes
  useEffect(() => {
    if (selectedClassId) {
      if (selectedClassId === 'all') {
        loadAllClassesDashboard(classes);
      } else {
        loadDashboard(selectedClassId);
      }
    }
  }, [selectedClassId, classes]);

  const loadDashboard = async (classId) => {
    setLoadingDashboard(true);
    try {
      const res = await p0Api.reports.studentDashboard(classId);
      setDashboardData(res);
    } catch (err) {
      console.error(err);
      alert('Không thể tải thống kê chi tiết khóa học này.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadAllClassesDashboard = async (studentClasses) => {
    if (!studentClasses || studentClasses.length === 0) return;
    setLoadingDashboard(true);
    try {
      setAllClassesData(await summarizeStudentClassScores(studentClasses));
    } catch (err) {
      console.error(err);
      alert('Không thể tải thống kê tất cả các khóa học.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải thông tin khóa học...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4 rounded-4" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
        <button onClick={loadStudentClasses} className="btn btn-outline-danger btn-sm ms-3">Thử lại</button>
      </div>
    );
  }

  const renderAllClassesView = () => {
    const validScores = allClassesData.filter(c => c.averageScore !== null);
    const overallGPA = validScores.length > 0
      ? Math.round((validScores.reduce((sum, c) => sum + c.averageScore, 0) / validScores.length) * 100) / 100
      : null;

    const avgAttendance = allClassesData.length > 0
      ? Math.round((allClassesData.reduce((sum, c) => sum + c.attendanceRate, 0) / allClassesData.length) * 100) / 100
      : 100;

    return (
      <div className="row g-4">
        {/* GPA & Attendance Summary widgets */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white h-100 animate__animated animate__fadeInUp" style={{ borderLeft: "5px solid #4361ee" }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Điểm Trung Bình Tích Lũy</span>
            <h2 className="fw-extrabold text-primary m-0" style={{ fontSize: '2.5rem' }}>
              {overallGPA !== null ? `${overallGPA.toFixed(2)} / 10.0` : 'Chưa có điểm'}
            </h2>
            <p className="text-muted small mt-2 mb-0">Tính trung bình trên tất cả các khóa học đã chấm điểm</p>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white h-100 animate__animated animate__fadeInUp" style={{ borderLeft: "5px solid #2ec4b6", animationDelay: '50ms' }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Tỷ Lệ Chuyên Cần Chung</span>
            <h2 className="fw-extrabold text-success m-0" style={{ fontSize: '2.5rem' }}>{avgAttendance}%</h2>
            <p className="text-muted small mt-2 mb-0">Tỷ lệ có mặt trung bình ở tất cả các lớp học</p>
          </div>
        </div>

        {/* Bar + Line Chart: điểm của bạn theo từng lớp, so với điểm TB lớp */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Kết quả học tập</h5>
            <BarLineComparisonChart
              height={300}
              labels={allClassesData.map(c => c.className)}
              barData={allClassesData.map(c => c.averageScore !== null ? c.averageScore : 0)}
              barLabel="Điểm của bạn"
              lineData={allClassesData.map(c => c.classAverageScore !== null ? c.classAverageScore : 0)}
              lineLabel="Điểm TB lớp học phần"
              yLeftLabel="Điểm của bạn"
              yRightLabel="Điểm TB lớp học phần"
              barTooltipFormat={(raw) => `Điểm của bạn: ${raw}`}
              lineTooltipFormat={(value) => `Điểm TB lớp học phần: ${value}`}
              emptyMessage="Chưa có dữ liệu khóa học"
            />
          </div>
        </div>

        {/* Table of Course Averages */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '150ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="border-bottom pb-2 mb-3">
              <h5 className="fw-bold m-0 text-secondary">
                <i className="bi bi-collection-play-fill me-2 text-primary"></i>
                Bảng điểm tổng hợp từng khóa học
              </h5>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Khóa học / Lớp học</th>
                    <th scope="col">Giảng viên</th>
                    <th scope="col" className="text-center">Tỷ lệ đi học</th>
                    <th scope="col" className="text-center">Điểm trung bình khóa</th>
                    <th scope="col" className="text-end pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {allClassesData.length > 0 ? (
                    allClassesData.map((clsItem, index) => (
                      <tr key={clsItem.classId || index}>
                        <td className="ps-3 fw-bold text-dark">
                          📚 {clsItem.className}
                        </td>
                        <td>{clsItem.teacher}</td>
                        <td className="text-center fw-semibold text-secondary">{clsItem.attendanceRate}%</td>
                        <td className="text-center">
                          {clsItem.averageScore !== null ? (
                            <span className="badge bg-success px-3 py-2 fs-6">
                              {clsItem.averageScore.toFixed(2)} / 10.0
                            </span>
                          ) : (
                            <span className="badge bg-secondary px-3 py-2 fs-6">Chưa chấm / Chưa học</span>
                          )}
                        </td>
                        <td className="text-end pe-3">
                          <button
                            className="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm"
                            onClick={() => setSelectedClassId(clsItem.classId)}
                          >
                            Xem chi tiết các bài kiểm tra
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Bạn chưa tham gia lớp học nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSingleClassView = () => {
    if (!dashboardData) return null;

    return (
      <div className="row g-4">
        {/* Attendance Summary */}
        <div className="col-12 col-md-4 mx-auto animate__animated animate__fadeInUp">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white" style={{ borderLeft: "5px solid #2ec4b6" }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Tỷ Lệ Điểm Danh Lớp</span>
            <h2 className="fw-extrabold text-success m-0" style={{ fontSize: '2.5rem' }}>{dashboardData.attendanceRate}%</h2>
            <p className="text-muted small mt-2 mb-0">Tính trên tổng số buổi đã điểm danh của lớp</p>
          </div>
        </div>

        {/* Bar + Line Chart: điểm của bạn theo từng bài kiểm tra, so với điểm TB lớp */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '50ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Biểu đồ kết quả bài kiểm tra</h5>
            <BarLineComparisonChart
              height={300}
              labels={dashboardData.tests.map(t => t.testName)}
              barData={dashboardData.tests.map(t => t.score !== null ? t.score : 0)}
              barLabel="Điểm của bạn"
              lineData={dashboardData.tests.map(t => t.classAverage)}
              lineLabel="Điểm TB lớp học phần"
              yLeftLabel="Điểm của bạn"
              yRightLabel="Điểm TB lớp học phần"
              barTooltipFormat={(raw) => `Điểm của bạn: ${raw}`}
              lineTooltipFormat={(value) => `Điểm TB lớp học phần: ${value}`}
              emptyMessage="Lớp học này chưa có bài kiểm tra nào được chấm"
            />
          </div>
        </div>

        {/* Test Grades Table */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="border-bottom pb-2 mb-3">
              <h5 className="fw-bold m-0 text-secondary">
                <i className="bi bi-journal-check me-2 text-primary"></i>
                Kết quả học tập lớp: {dashboardData.className}
              </h5>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Tên Bài Kiểm Tra</th>
                    <th scope="col" className="text-center">Điểm Số Của Bạn</th>
                    <th scope="col" className="text-center">Trung Bình Cả Lớp</th>
                    <th scope="col" className="text-center">Xếp Hạng Của Bạn</th>
                    <th scope="col" className="text-center">Đánh Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.tests.length > 0 ? (
                    dashboardData.tests.map((test, index) => {
                      const hasScore = test.score !== null && test.score !== undefined;
                      let ratingText = 'Chưa chấm';
                      let ratingColor = 'text-muted';

                      if (hasScore) {
                        if (test.score >= 8.5) {
                          ratingText = 'Giỏi / Xuất sắc 🌟';
                          ratingColor = 'text-success fw-bold';
                        } else if (test.score >= 7.0) {
                          ratingText = 'Khá 👍';
                          ratingColor = 'text-primary fw-bold';
                        } else if (test.score >= 5.0) {
                          ratingText = 'Trung bình 👌';
                          ratingColor = 'text-warning fw-bold';
                        } else {
                          ratingText = 'Cần cố gắng thêm 📚';
                          ratingColor = 'text-danger fw-bold';
                        }
                      }

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
                          <td className="text-center fw-bold text-secondary fs-6">
                            {test.classAverage.toFixed(1)} / 10.0
                          </td>
                          <td className="text-center fw-extrabold text-info fs-5">
                            {hasScore ? (
                              <span>🎖️ {test.rank}</span>
                            ) : (
                              <span className="text-muted fs-6">-</span>
                            )}
                          </td>
                          <td className={`text-center ${ratingColor}`}>{ratingText}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center py-4 text-muted">Lớp học này chưa được giao bài tập hay bài kiểm tra nào.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container py-4 animate__animated animate__fadeIn">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <h2 className="fw-bold text-uppercase text-primary m-0">Học Bạ & Bảng Điểm</h2>
          <p className="text-muted m-0">Xem chi tiết điểm số, xếp hạng và chuyên cần theo từng lớp học</p>
        </div>
        
        {classes.length > 0 ? (
          <div className="d-flex align-items-center gap-2">
            <span className="fw-bold text-secondary text-nowrap">Chọn lớp học:</span>
            <select
              className="form-select rounded-pill px-3 fw-bold text-primary border-primary w-auto"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              <option value="all">📚 Tất cả các khóa học</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  📚 {cls.className || cls.classCode}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span className="text-muted">Bạn chưa tham gia lớp học nào.</span>
        )}
      </div>

      {aiProgress.length > 0 ? (
        <div className="row g-4 mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm rounded-4 p-4 bg-white" style={{ borderLeft: '5px solid #7c3aed' }}>
              <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
                Nhận xét tiến bộ của AI
              </h5>
              <div className="d-flex flex-column gap-3">
                {aiProgress.map((item) => (
                  <div key={item.maKhoaHoc}>
                    <div className="fw-bold text-dark mb-1">📚 {item.tenKhoaHoc}</div>
                    <p className="text-secondary mb-0" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                      {item.noiDungNhanXet}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {loadingDashboard ? (
        <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '40vh' }}>
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Đang tải bảng điểm...</span>
          </div>
        </div>
      ) : selectedClassId === 'all' ? (
        renderAllClassesView()
      ) : (
        renderSingleClassView()
      )}
    </div>
  );
};

export default StudentReports;
