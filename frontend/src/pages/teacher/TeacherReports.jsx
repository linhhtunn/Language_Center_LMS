import React, { useEffect, useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { p0Api } from '../../api/p0Api';
import { getApiBaseUrl } from '../../api/BaseApi';

ChartJS.register(...registerables);

const TeacherReports = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [report, setReport] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  // Student Detail popup state
  const [studentDetail, setStudentDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Student List popup state
  const [studentListModal, setStudentListModal] = useState({
    show: false,
    title: '',
    students: [],
    loading: false,
    searchQuery: ''
  });

  const loadStudentDetail = async (studentId) => {
    setLoadingDetail(true);
    try {
      // If selectedClassId is 'all', look up the student's matched class or fallback to an active class
      let targetClassId = selectedClassId;
      if (targetClassId === 'all') {
        // Fallback: try to find a class where this student belongs from classes state
        // (the backend studentDashboard requires a classId)
        // Let's check classes list
        if (classes.length > 0) {
          targetClassId = classes[0].id;
        }
      }

      const res = await p0Api.reports.studentDashboard(targetClassId, studentId);
      setStudentDetail(res);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể tải chi tiết học tập của học sinh này.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const openStudentList = async (title, source) => {
    setStudentListModal({
      show: true,
      title: title,
      students: [],
      loading: true,
      searchQuery: ''
    });
    try {
      let list = [];
      if (typeof source === 'function') {
        list = await source();
      } else {
        list = source;
      }
      setStudentListModal(prev => ({
        ...prev,
        students: list || [],
        loading: false
      }));
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể tải danh sách học sinh.');
      setStudentListModal(prev => ({ ...prev, show: false, loading: false }));
    }
  };

  const fetchAllStudentsOfTeacher = async () => {
    const studentPromises = classes.map(c => p0Api.classes.students(c.id));
    const results = await Promise.all(studentPromises);
    const uniqueStudents = [];
    const seenIds = new Set();
    results.forEach((classList) => {
      (classList || []).forEach((student) => {
        const id = student.studentId || student.profileId;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueStudents.push({
            studentId: id,
            studentName: student.fullName || student.studentName,
            email: student.email
          });
        }
      });
    });
    return uniqueStudents;
  };

  const fetchAllStudentsWithOverview = async () => {
    const reportPromises = classes.map(c => p0Api.reports.teacherClassOverview(c.id));
    const reports = await Promise.all(reportPromises);
    const allStudents = [];
    reports.forEach(rep => {
      if (rep && rep.students) {
        rep.students.forEach(s => {
          allStudents.push(s);
        });
      }
    });
    return allStudents;
  };

  const filterStudentsByScoreLabel = (studentsList, index) => {
    return (studentsList || []).filter(s => {
      const score = s.averageScore ?? s.AverageScore ?? 0;
      if (index === 0) return score < 5.0;
      if (index === 1) return score >= 5.0 && score < 7.0;
      if (index === 2) return score >= 7.0 && score < 8.5;
      if (index === 3) return score >= 8.5;
      return true;
    }).map(s => ({
      studentId: s.studentId,
      studentName: s.studentName,
      email: s.email || ''
    }));
  };

  // Load teacher assigned classes
  const loadClasses = async () => {
    setLoadingClasses(true);
    setError('');
    try {
      const res = await p0Api.classes.assignedToMe();
      setClasses(res || []);
      // Default to "all" to show the overall teaching dashboard first
      setSelectedClassId('all');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải danh sách lớp học giảng dạy.');
    } finally {
      setLoadingClasses(false);
    }
  };

  // Load report for selected class or all classes
  const loadClassReport = async (classId) => {
    if (!classId) return;
    setLoadingReport(true);
    try {
      let res;
      if (classId === 'all') {
        res = await p0Api.reports.teacherOverview();
      } else {
        res = await p0Api.reports.teacherClassOverview(classId);
      }
      setReport(res);
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể tải dữ liệu thống kê.');
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      loadClassReport(selectedClassId);
    }
  }, [selectedClassId]);

  const handleExport = async () => {
    if (!selectedClassId) return;
    setExporting(true);
    try {
      const userData = localStorage.getItem('user');
      const token = userData ? JSON.parse(userData)?.token : null;

      const baseUrl = getApiBaseUrl();
      const exportUrl = selectedClassId === 'all'
        ? `${baseUrl}/reports/teacher/export`
        : `${baseUrl}/reports/teacher/classes/${selectedClassId}/export`;

      const filename = selectedClassId === 'all'
        ? 'BaoCaoTongQuanGiangDay.csv'
        : `BaoCaoLopHoc_${classes.find(c => c.id === selectedClassId)?.name || 'Export'}.csv`;

      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Yêu cầu xuất Excel thất bại.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message || 'Lỗi khi xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  if (loadingClasses) {
    return (
      <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4 rounded-4" role="alert">
        <i className="bi bi-exclamation-triangle-fill me-2"></i>
        {error}
        <button onClick={loadClasses} className="btn btn-outline-danger btn-sm ms-3">Thử lại</button>
      </div>
    );
  }

  // Attendance Chart Data
  const attendanceChartData = {
    labels: ['Có mặt', 'Đi muộn', 'Vắng mặt', 'Có phép'],
    datasets: [
      {
        data: [
          report?.attendanceRate?.present || 0,
          report?.attendanceRate?.late || 0,
          report?.attendanceRate?.absent || 0,
          report?.attendanceRate?.excused || 0
        ],
        backgroundColor: ['#2ec4b6', '#ff9f1c', '#e71d36', '#011627'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    ]
  };

  // Score Distribution Chart Data
  const scoreChartData = {
    labels: ['Dưới 5.0 (Yếu/Kém)', '5.0 - 7.0 (Trung bình)', '7.0 - 8.5 (Khá)', 'Trên 8.5 (Giỏi)'],
    datasets: [
      {
        label: 'Số bài nộp đạt điểm',
        data: [
          report?.scoreDistribution?.under5 || 0,
          report?.scoreDistribution?.from5To7 || 0,
          report?.scoreDistribution?.from7To85 || 0,
          report?.scoreDistribution?.above85 || 0
        ],
        backgroundColor: '#4361ee',
        borderRadius: 8,
      }
    ]
  };

  return (
    <div className="container-fluid py-4 animate__animated animate__fadeIn">
      {/* Selection Header */}
      <div className="row g-3 align-items-center mb-4 border-bottom pb-3">
        <div className="col-12 col-md-6">
          <h2 className="fw-bold text-uppercase text-primary m-0">Thống Kê Giảng Dạy</h2>
          <p className="text-muted m-0">Quản lý chuyên cần, quy mô sĩ số và tiến trình học tập của học viên</p>
        </div>
        <div className="col-12 col-md-6 d-flex gap-2 justify-content-md-end">
          <select
            className="form-select rounded-pill px-3 w-auto"
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="all">Tất cả các lớp phụ trách</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="btn btn-outline-primary fw-bold shadow-sm"
            disabled={exporting || loadingReport || !report}
          >
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Đang xuất...
              </>
            ) : (
              <>
                <i className="bi bi-download me-2"></i> Xuất báo cáo
              </>
            )}
          </button>
        </div>
      </div>

      {loadingReport ? (
        <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '40vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải dữ liệu báo cáo...</span>
          </div>
        </div>
      ) : report ? (
        <>
          {/* Top Summary Widgets */}
          <div className="row g-3 mb-4">
            {/* Widget 1 */}
            <div className="col-12 col-sm-6 col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: '50ms' }}>
              <div 
                className="card border-0 shadow-sm rounded-4 p-3 bg-white text-center dashboard-card-hover transition-all h-100"
                onClick={() => {
                  if (selectedClassId === 'all') {
                    openStudentList(
                      'Danh sách tất cả học sinh đang giảng dạy',
                      fetchAllStudentsOfTeacher
                    );
                  } else {
                    const currentClassName = classes.find(c => c.id === selectedClassId)?.name || 'lớp';
                    openStudentList(
                      `Danh sách học sinh lớp ${currentClassName}`,
                      (report.students || []).map(s => ({
                        studentId: s.studentId,
                        studentName: s.studentName
                      }))
                    );
                  }
                }}
                style={{ 
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <span className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '12px' }}>Sĩ Số Học Sinh</span>
                <h2 className="fw-bold text-primary m-0">{report.totalStudents}</h2>
              </div>
            </div>
            {/* Widget 2 */}
            <div className="col-12 col-sm-6 col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: '100ms' }}>
              <div className="card border-0 shadow-sm rounded-4 p-3 bg-white text-center dashboard-card-hover transition-all">
                <span className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '12px' }}>
                  {selectedClassId === 'all' ? 'Số Lớp Giảng Dạy' : 'Tỷ Lệ Chuyên Cần'}
                </span>
                <h2 className={`fw-bold ${selectedClassId === 'all' ? 'text-info' : 'text-success'} m-0`}>
                  {selectedClassId === 'all' ? report.totalClasses : `${report.attendanceRate.presentPercent ?? report.attendanceRate.PresentPercent}%`}
                </h2>
              </div>
            </div>
            {/* Widget 3 */}
            <div className="col-12 col-sm-6 col-md-4 animate__animated animate__fadeInUp" style={{ animationDelay: '150ms' }}>
              <div className="card border-0 shadow-sm rounded-4 p-3 bg-white text-center dashboard-card-hover transition-all">
                <span className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '12px' }}>
                  {selectedClassId === 'all' ? 'Tỷ Lệ Chuyên Cần Chung' : 'Tỷ Lệ Nộp Bài Tập'}
                </span>
                <h2 className={`fw-bold ${selectedClassId === 'all' ? 'text-success' : 'text-warning'} m-0`}>
                  {selectedClassId === 'all' ? `${report.attendanceRate.presentPercent ?? report.attendanceRate.PresentPercent}%` : `${report.homeworkCompletionRate}%`}
                </h2>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="row g-4 mb-4">
            {/* Attendance Chart */}
            <div className="col-12 col-lg-5 animate__animated animate__fadeInUp" style={{ animationDelay: '200ms' }}>
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white chart-card-hover transition-all">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                  {selectedClassId === 'all' ? 'Chuyên Cần Chung' : 'Chuyên Cần Lớp'}
                </h5>
                <div style={{ height: '280px' }} className="d-flex align-items-center justify-content-center">
                  {report.attendanceRate.total > 0 ? (
                    <Doughnut
                      data={attendanceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        onClick: () => {
                          if (selectedClassId === 'all') {
                            openStudentList(
                              'Danh sách chuyên cần học sinh',
                              async () => {
                                const allStudents = await fetchAllStudentsWithOverview();
                                return allStudents.map(s => ({
                                  studentId: s.studentId,
                                  studentName: s.studentName,
                                  email: s.email || ''
                                }));
                              }
                            );
                          } else {
                            openStudentList(
                              `Danh sách chuyên cần học sinh lớp ${report.className}`,
                              (report.students || []).map(s => ({
                                studentId: s.studentId,
                                studentName: s.studentName
                              }))
                            );
                          }
                        }
                      }}
                    />
                  ) : (
                    <span className="text-muted">Chưa có thông tin điểm danh</span>
                  )}
                </div>
              </div>
            </div>

            {/* Score Distribution Chart */}
            <div className="col-12 col-lg-7 animate__animated animate__fadeInUp" style={{ animationDelay: '250ms' }}>
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white chart-card-hover transition-all">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                  Phổ Điểm Chung
                  {report.scoreDistribution.total > 0 && (
                    <span className="badge bg-primary ms-3">ĐTB: {report.scoreDistribution.averageScore}</span>
                  )}
                </h5>
                <div style={{ height: '280px' }}>
                  {report.scoreDistribution.total > 0 ? (
                    <Bar
                      data={scoreChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                        onClick: (event, elements, chart) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const label = chart.data.labels[index];
                            if (selectedClassId === 'all') {
                              openStudentList(
                                `Học sinh có ĐTB thuộc nhóm: ${label}`,
                                async () => {
                                  const allStudents = await fetchAllStudentsWithOverview();
                                  return filterStudentsByScoreLabel(allStudents, index);
                                }
                              );
                            } else {
                              openStudentList(
                                `Học sinh lớp ${report.className} có ĐTB thuộc nhóm: ${label}`,
                                filterStudentsByScoreLabel(report.students, index)
                              );
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted">Chưa có điểm bài tập nào được chấm</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Table/Progress list */}
          <div className="animate__animated animate__fadeInUp" style={{ animationDelay: '300ms' }}>
            {selectedClassId === 'all' ? (
              /* Quy mô sĩ số lớp học phụ trách */
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Quy Mô Lớp Học Giảng Dạy</h5>
                <div className="row g-3">
                  {report.classSizes && report.classSizes.length > 0 ? (
                    report.classSizes.map((cls, idx) => {
                      const pct = cls.capacity > 0 ? Math.min(100, Math.round(cls.studentCount / cls.capacity * 100)) : 0;
                      return (
                        <div 
                          key={idx} 
                          className="col-12 col-md-6 mb-2"
                          onClick={() => {
                            const matchedClass = classes.find(c => c.name === cls.className);
                            if (matchedClass) {
                              openStudentList(
                                `Danh sách học sinh lớp ${cls.className}`,
                                async () => {
                                  const students = await p0Api.classes.students(matchedClass.id);
                                  return (students || []).map(s => ({
                                    studentId: s.studentId,
                                    studentName: s.fullName || s.studentName,
                                    email: s.email
                                  }));
                                }
                              );
                            }
                          }}
                        >
                          <div 
                            className="p-3 border rounded-4 bg-light"
                            style={{ 
                              cursor: 'pointer',
                              transition: 'all 0.2s ease-in-out'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)';
                              e.currentTarget.style.borderColor = '#4361ee';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = '';
                              e.currentTarget.style.boxShadow = '';
                              e.currentTarget.style.borderColor = '';
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="fw-bold text-dark">{cls.className}</span>
                              <span className="badge bg-secondary px-3">{cls.studentCount} / {cls.capacity} Học sinh</span>
                            </div>
                            <div className="progress rounded-pill" style={{ height: '10px' }}>
                              <div 
                                className={`progress-bar rounded-pill ${pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-success'}`}
                                role="progressbar" 
                                style={{ width: `${pct}%` }} 
                                aria-valuenow={pct} 
                                aria-valuemin="0" 
                                aria-valuemax="100"
                              ></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-12 text-center p-4 text-muted">
                      Bạn chưa được phân công lớp học nào hoặc lớp trống.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Student Progress Table */
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Chi Tiết Từng Học Sinh</h5>
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th scope="col">Họ Tên Học Sinh</th>
                        <th scope="col" className="text-center">Chuyên Cần (%)</th>
                        <th scope="col" className="text-center">Điểm Trung Bình</th>
                        <th scope="col" className="text-center">Bài Tập Hoàn Thành</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.students && report.students.map((student) => (
                        <tr 
                          key={student.studentId}
                          onClick={() => loadStudentDetail(student.studentId)}
                          style={{ cursor: 'pointer' }}
                          title="Nhấn để xem báo cáo học tập chi tiết"
                        >
                          <td className="fw-bold text-primary text-decoration-none hover-underline">
                            <i className="bi bi-person-badge-fill me-2"></i>
                            {student.studentName}
                          </td>
                          <td className="text-center fw-semibold text-success">{student.attendanceRate}%</td>
                          <td className="text-center">
                            <span className={`badge ${student.averageScore >= 8.0 ? 'bg-success' : student.averageScore >= 5.0 ? 'bg-primary' : 'bg-danger'} px-3 py-2 fs-6`}>
                              {student.averageScore.toFixed(1)}
                            </span>
                          </td>
                          <td className="text-center fw-semibold">
                            {student.completedHomeworkCount} / {student.totalHomeworkCount}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="text-center p-5 text-muted">Vui lòng chọn lớp học để xem thống kê</div>
      )}

      {/* Loading Detail Spinner */}
      {loadingDetail && (
        <div className="modal fade show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)', zIndex: 1060 }}>
          <div className="d-flex align-items-center justify-content-center h-100">
            <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Đang tải chi tiết học sinh...</span>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Modal */}
      {showDetailModal && studentDetail && (
        <div className="modal fade show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1050 }} onClick={() => setShowDetailModal(false)}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white p-3 px-4 border-0">
                <h5 className="modal-title fw-bold text-uppercase mb-0">
                  <i className="bi bi-person-card-details me-2"></i>
                  Chi Tiết Học Tập Học Sinh
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDetailModal(false)} />
              </div>
              <div className="modal-body p-4 bg-light">
                {/* Header Information */}
                <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white">
                  <div className="row align-items-center">
                    <div className="col-12 col-md-8">
                      <h4 className="fw-bold text-dark mb-1">{studentDetail.studentName}</h4>
                      <p className="text-muted m-0">
                        <i className="bi bi-book-half me-2"></i>Lớp học: <strong>{studentDetail.className}</strong>
                      </p>
                    </div>
                    <div className="col-12 col-md-4 mt-3 mt-md-0 d-flex gap-3 justify-content-md-end">
                      <div className="text-center p-2 px-3 border rounded-3 bg-light">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Chuyên Cần</span>
                        <span className="fw-bold text-success fs-5">{studentDetail.attendanceRate}%</span>
                      </div>
                      <div className="text-center p-2 px-3 border rounded-3 bg-light">
                        <span className="text-muted small d-block mb-1 text-uppercase fw-semibold" style={{ fontSize: '10px' }}>Điểm Trung Bình</span>
                        <span className="fw-bold text-primary fs-5">
                          {(() => {
                            const nonNullScores = studentDetail.tests.filter(t => t.score !== null && t.score !== undefined).map(t => t.score);
                            return nonNullScores.length > 0 ? (nonNullScores.reduce((sum, val) => sum + val, 0) / nonNullScores.length).toFixed(1) : 'Chưa có';
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Results Table */}
                <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                  <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                    <i className="bi bi-journal-check me-2 text-primary"></i>
                    Kết Quả Các Bài Kiểm Tra
                  </h5>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th scope="col" className="ps-3">Tên Bài Kiểm Tra</th>
                          <th scope="col" className="text-center">Điểm Số Của Học Sinh</th>
                          <th scope="col" className="text-center">Trung Bình Cả Lớp</th>
                          <th scope="col" className="text-center">Xếp Hạng</th>
                          <th scope="col" className="text-center">Đánh Giá</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentDetail.tests.length > 0 ? (
                          studentDetail.tests.map((test, index) => {
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
                                    <span className="badge bg-secondary px-3 py-2 fs-6">Chưa chấm / Chưa nộp</span>
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
                            <td colSpan="5" className="text-center py-4 text-muted">Học sinh chưa có bài tập hay bài kiểm tra nào trong lớp này.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light border-0 py-3 px-4">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setShowDetailModal(false)}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student List Modal */}
      {studentListModal.show && (
        <div className="modal fade show d-block animate__animated animate__fadeIn" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1040 }} onClick={() => setStudentListModal(prev => ({ ...prev, show: false }))}>
          <div className="modal-dialog modal-dialog-centered modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header bg-primary text-white p-3 px-4 border-0">
                <h5 className="modal-title fw-bold text-uppercase mb-0">
                  <i className="bi bi-people-fill me-2"></i>
                  {studentListModal.title}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setStudentListModal(prev => ({ ...prev, show: false }))} />
              </div>
              <div className="modal-body p-4 bg-light" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                
                {/* Search Bar */}
                <div className="input-group mb-3 shadow-sm rounded-pill overflow-hidden border">
                  <span className="input-group-text border-0 bg-white ps-3 text-muted">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-0 py-2 ps-2"
                    placeholder="Tìm kiếm học sinh theo tên hoặc email..."
                    value={studentListModal.searchQuery}
                    onChange={(e) => setStudentListModal(prev => ({ ...prev, searchQuery: e.target.value }))}
                  />
                  {studentListModal.searchQuery && (
                    <button 
                      className="btn btn-link text-muted border-0 bg-white pe-3" 
                      onClick={() => setStudentListModal(prev => ({ ...prev, searchQuery: '' }))}
                    >
                      <i className="bi bi-x-circle-fill"></i>
                    </button>
                  )}
                </div>

                {studentListModal.loading ? (
                  <div className="d-flex align-items-center justify-content-center p-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Đang tải danh sách học sinh...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive bg-white rounded-4 shadow-sm p-2">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col" className="ps-3 border-0">Họ và tên</th>
                          <th scope="col" className="border-0">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const query = studentListModal.searchQuery.trim().toLowerCase();
                          const filtered = studentListModal.students.filter(s => 
                            !query || 
                            (s.studentName && s.studentName.toLowerCase().includes(query)) ||
                            (s.email && s.email.toLowerCase().includes(query))
                          );

                          if (filtered.length === 0) {
                            return (
                              <tr>
                                <td colSpan="2" className="text-center py-4 text-muted">
                                  Không tìm thấy học sinh nào.
                                </td>
                              </tr>
                            );
                          }

                          return filtered.map((student, idx) => (
                            <tr key={student.studentId || idx}>
                              <td className="ps-3 fw-bold text-dark">
                                <div className="d-flex align-items-center gap-2">
                                  <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      backgroundColor: `hsl(${(student.studentName?.charCodeAt(0) * 15 || 0) % 360}, 65%, 55%)` 
                                    }}
                                  >
                                    {student.studentName?.charAt(0)?.toUpperCase() || 'H'}
                                  </div>
                                  <span>{student.studentName}</span>
                                </div>
                              </td>
                              <td className="text-secondary">{student.email || 'Chưa cập nhật'}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer bg-light border-0 py-3 px-4">
                <button type="button" className="btn btn-secondary rounded-pill px-4" onClick={() => setStudentListModal(prev => ({ ...prev, show: false }))}>Đóng</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherReports;
