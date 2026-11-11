import React, { useEffect, useState } from 'react';
import { p0Api } from '../../api/p0Api';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const ParentReports = () => {
  const [childrenData, setChildrenData] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedChild, setSelectedChild] = useState(null);
  
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [singleClassData, setSingleClassData] = useState(null);
  const [allCoursesData, setAllCoursesData] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [error, setError] = useState('');

  // Fetch children list first
  const loadParentDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await p0Api.reports.parentDashboard();
      setChildrenData(data || []);
      if (data && data.length > 0) {
        setSelectedChildId(data[0].studentId);
        setSelectedChild(data[0]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải thông tin con của bạn.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentDashboard();
  }, []);

  // Handle changing child
  const handleChildChange = (studentId) => {
    setSelectedChildId(studentId);
    const child = childrenData.find(c => c.studentId === studentId);
    setSelectedChild(child);
    setSelectedClassId('all');
  };

  // Load dashboard statistics when class or child changes
  useEffect(() => {
    if (selectedChildId) {
      if (selectedClassId === 'all') {
        loadAllCoursesDashboard(selectedChildId, selectedChild?.courses || []);
      } else {
        loadDashboard(selectedClassId, selectedChildId);
      }
    }
  }, [selectedClassId, selectedChildId, selectedChild]);

  const loadDashboard = async (classId, studentId) => {
    setLoadingDashboard(true);
    try {
      const res = await p0Api.reports.studentDashboard(classId, studentId);
      setSingleClassData(res);
    } catch (err) {
      console.error(err);
      alert('Không thể tải thống kê chi tiết khóa học của con.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const loadAllCoursesDashboard = async (studentId, childCourses) => {
    if (!childCourses || childCourses.length === 0) {
      setAllCoursesData([]);
      return;
    }
    setLoadingDashboard(true);
    try {
      const promises = childCourses.map(c => p0Api.reports.studentDashboard(c.classId, studentId));
      const results = await Promise.all(promises);
      const coursesData = results.map((res, idx) => {
        const courseObj = childCourses[idx];
        const gradedScores = (res.tests || [])
          .filter(t => t.score !== null && t.score !== undefined)
          .map(t => t.score);
        const avg = gradedScores.length > 0
          ? Math.round((gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length) * 100) / 100
          : null;
        return {
          classId: courseObj.classId,
          className: courseObj.courseName || courseObj.className || 'Lớp học',
          averageScore: avg ?? courseObj.finalAverageScore,
          tests: res.tests || [],
          attendanceRate: res.attendanceRate
        };
      });
      setAllCoursesData(coursesData);
    } catch (err) {
      console.error(err);
      alert('Không thể tải thông tin tổng hợp của con.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const renderAllClassesView = () => {
    const validScores = allCoursesData.filter(c => c.averageScore !== null);
    const overallGPA = validScores.length > 0
      ? Math.round((validScores.reduce((sum, c) => sum + c.averageScore, 0) / validScores.length) * 100) / 100
      : null;

    const avgAttendance = allCoursesData.length > 0
      ? Math.round((allCoursesData.reduce((sum, c) => sum + c.attendanceRate, 0) / allCoursesData.length) * 100) / 100
      : 100;

    const chartData = {
      labels: allCoursesData.map(c => c.className),
      datasets: [
        {
          label: 'Điểm trung bình khóa học',
          data: allCoursesData.map(c => c.averageScore !== null ? c.averageScore : 0),
          backgroundColor: '#4361ee',
          borderRadius: 6,
          maxBarThickness: 50,
        }
      ]
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 10,
          ticks: { stepSize: 1 }
        }
      }
    };

    return (
      <div className="row g-4">
        {/* GPA & Attendance Summary widgets */}
        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white h-100 animate__animated animate__fadeInUp" style={{ borderLeft: "5px solid #4361ee" }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Điểm Trung Bình Tích Lũy Của Con</span>
            <h2 className="fw-extrabold text-primary m-0" style={{ fontSize: '2.5rem' }}>
              {overallGPA !== null ? `${overallGPA.toFixed(2)} / 10.0` : 'Chưa có điểm'}
            </h2>
            <p className="text-muted small mt-2 mb-0">Tính trung bình trên các khóa học con đã học</p>
          </div>
        </div>

        <div className="col-12 col-md-6">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white h-100 animate__animated animate__fadeInUp" style={{ borderLeft: "5px solid #2ec4b6", animationDelay: '50ms' }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Chuyên Cần Chung Của Con</span>
            <h2 className="fw-extrabold text-success m-0" style={{ fontSize: '2.5rem' }}>{avgAttendance}%</h2>
            <p className="text-muted small mt-2 mb-0">Tỷ lệ đi học đầy đủ trung bình ở tất cả các lớp</p>
          </div>
        </div>

        {/* Bar Chart of Course Averages */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Biểu đồ điểm trung bình học tập của con</h5>
            <div style={{ height: '300px' }}>
              {allCoursesData.length > 0 ? (
                <Bar data={chartData} options={chartOptions} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Con chưa tham gia khóa học nào hoặc chưa được chấm điểm
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Table of Course Averages */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '150ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="border-bottom pb-2 mb-3">
              <h5 className="fw-bold m-0 text-secondary">
                <i className="bi bi-collection-play-fill me-2 text-primary"></i>
                Bảng điểm tổng hợp các khóa học của con
              </h5>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Khóa học / Lớp học</th>
                    <th scope="col" className="text-center">Tỷ lệ đi học</th>
                    <th scope="col" className="text-center">Điểm trung bình khóa</th>
                    <th scope="col" className="text-end pe-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {allCoursesData.length > 0 ? (
                    allCoursesData.map((clsItem, index) => (
                      <tr key={clsItem.classId || index}>
                        <td className="ps-3 fw-bold text-dark">
                          📚 {clsItem.className}
                        </td>
                        <td className="text-center fw-semibold text-secondary">{clsItem.attendanceRate}%</td>
                        <td className="text-center">
                          {clsItem.averageScore !== null ? (
                            <span className="badge bg-success px-3 py-2 fs-6">
                              {clsItem.averageScore.toFixed(2)} / 10.0
                            </span>
                          ) : (
                            <span className="badge bg-secondary px-3 py-2 fs-6">Chưa có điểm</span>
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
                      <td colSpan="4" className="text-center py-4 text-muted">Con chưa tham gia lớp học nào.</td>
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
    if (!singleClassData) return null;

    const testChartData = {
      labels: singleClassData.tests.map(t => t.testName),
      datasets: [
        {
          label: 'Điểm của con',
          data: singleClassData.tests.map(t => t.score !== null ? t.score : 0),
          backgroundColor: '#2ec4b6',
          borderRadius: 6,
          maxBarThickness: 40,
        },
        {
          label: 'Trung bình cả lớp',
          data: singleClassData.tests.map(t => t.classAverage),
          backgroundColor: '#ccd9ff',
          borderRadius: 6,
          maxBarThickness: 40,
        }
      ]
    };

    const testChartOptions = {
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

    return (
      <div className="row g-4">
        {/* Attendance Summary */}
        <div className="col-12 col-md-4 mx-auto animate__animated animate__fadeInUp">
          <div className="card border-0 shadow-sm rounded-4 p-4 text-center bg-white" style={{ borderLeft: "5px solid #2ec4b6" }}>
            <span className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '12px', letterSpacing: '1px' }}>Tỷ Lệ Điểm Danh Lớp</span>
            <h2 className="fw-extrabold text-success m-0" style={{ fontSize: '2.5rem' }}>{singleClassData.attendanceRate}%</h2>
            <p className="text-muted small mt-2 mb-0">Tính trên các buổi học con đã điểm danh</p>
          </div>
        </div>

        {/* Test Performance Bar Chart */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '50ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Biểu đồ so sánh kết quả của con với lớp</h5>
            <div style={{ height: '300px' }}>
              {singleClassData.tests.length > 0 ? (
                <Bar data={testChartData} options={testChartOptions} />
              ) : (
                <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                  Khóa học này chưa có thông tin kiểm tra
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Test Grades Table */}
        <div className="col-12 animate__animated animate__fadeInUp" style={{ animationDelay: '100ms' }}>
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
            <div className="border-bottom pb-2 mb-3">
              <h5 className="fw-bold m-0 text-secondary">
                <i className="bi bi-journal-check me-2 text-primary"></i>
                Bảng điểm chi tiết khóa học của con: {singleClassData.className}
              </h5>
            </div>
            
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Tên Bài Kiểm Tra</th>
                    <th scope="col" className="text-center">Điểm Số Của Con</th>
                    <th scope="col" className="text-center">Trung Bình Cả Lớp</th>
                    <th scope="col" className="text-center">Xếp Hạng Của Con</th>
                    <th scope="col" className="text-center">Đánh Giá</th>
                  </tr>
                </thead>
                <tbody>
                  {singleClassData.tests.length > 0 ? (
                    singleClassData.tests.map((test, index) => {
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
                      <td colSpan="5" className="text-center py-4 text-muted">Khóa học này chưa được giao bài tập hay bài kiểm tra nào.</td>
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

  if (loading) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải thông tin...</span>
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
    <div className="container py-4 animate__animated animate__fadeIn">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom gap-3">
        <div>
          <h2 className="fw-bold text-uppercase text-primary m-0">Học Bạ & Báo Cáo Học Tập Của Con</h2>
          <p className="text-muted m-0">Xem biểu đồ điểm số, xếp hạng và chuyên cần của con</p>
        </div>
        
        {childrenData.length > 0 ? (
          <div className="d-flex flex-wrap align-items-center gap-3">
            {/* Child Selector */}
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-secondary text-nowrap">Chọn con:</span>
              <select
                className="form-select rounded-pill px-3 fw-bold text-primary border-primary w-auto"
                value={selectedChildId}
                onChange={(e) => handleChildChange(e.target.value)}
              >
                {childrenData.map((child) => (
                  <option key={child.studentId} value={child.studentId}>
                    👶 {child.studentName}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Selector */}
            <div className="d-flex align-items-center gap-2">
              <span className="fw-bold text-secondary text-nowrap">Chọn lớp học:</span>
              <select
                className="form-select rounded-pill px-3 fw-bold text-primary border-primary w-auto"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="all">📚 Tất cả các khóa học</option>
                {selectedChild?.courses?.map((cls) => (
                  <option key={cls.classId} value={cls.classId}>
                    📚 {cls.courseName || cls.className}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : (
          <span className="text-muted">Tài khoản này chưa được liên kết với học sinh nào.</span>
        )}
      </div>

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

export default ParentReports;
