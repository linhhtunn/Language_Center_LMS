import React, { useEffect, useState } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, registerables } from 'chart.js';
import { p0Api } from '../../api/p0Api';
import { getApiBaseUrl } from '../../api/BaseApi';

ChartJS.register(...registerables);

const AdminReports = () => {
  const [data, setData] = useState(null);
  const [classesList, setClassesList] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('center');
  const [classDashboard, setClassDashboard] = useState(null);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
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
      const res = await p0Api.reports.studentDashboard(selectedClassId, studentId);
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

  // Load both Center Report and Classes List
  const fetchInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [centerRes, classesRes] = await Promise.all([
        p0Api.reports.adminOverview(),
        p0Api.classes.list()
      ]);
      setData(centerRes);
      setClassesList(classesRes || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không thể tải báo cáo thống kê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // Fetch Class Dashboard when selection changes
  useEffect(() => {
    if (selectedClassId !== 'center') {
      loadClassDashboard(selectedClassId);
    }
  }, [selectedClassId]);

  const loadClassDashboard = async (classId) => {
    setLoadingDashboard(true);
    try {
      const res = await p0Api.reports.classDashboard(classId);
      setClassDashboard(res);
      if (res?.tests?.length > 0) {
        setSelectedTestId(res.tests[0].testId);
      } else {
        setSelectedTestId('');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể tải thống kê chi tiết lớp học này.');
    } finally {
      setLoadingDashboard(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const userData = localStorage.getItem('user');
      const token = userData ? JSON.parse(userData)?.token : null;

      const baseUrl = getApiBaseUrl();
      const response = await fetch(`${baseUrl}/reports/admin/export`, {
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
      a.download = `BaoCaoAdmin_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(err.message || 'Lỗi khi xuất báo cáo.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
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
        <button onClick={fetchInitialData} className="btn btn-outline-danger btn-sm ms-3">Thử lại</button>
      </div>
    );
  }

  // Attendance Chart Data (Center)
  const attendanceChartData = {
    labels: ['Có mặt', 'Đi muộn', 'Vắng mặt', 'Có phép'],
    datasets: [
      {
        data: [
          data?.attendanceRate?.present || 0,
          data?.attendanceRate?.late || 0,
          data?.attendanceRate?.absent || 0,
          data?.attendanceRate?.excused || 0
        ],
        backgroundColor: ['#2ec4b6', '#ff9f1c', '#e71d36', '#011627'],
        borderWidth: 2,
        borderColor: '#ffffff',
      }
    ]
  };

  // Score Distribution Chart Data (Center)
  const scoreChartData = {
    labels: ['Dưới 5.0 (Yếu/Kém)', '5.0 - 7.0 (Trung bình)', '7.0 - 8.5 (Khá)', 'Trên 8.5 (Giỏi)'],
    datasets: [
      {
        label: 'Số lượng bài nộp',
        data: [
          data?.scoreDistribution?.under5 || 0,
          data?.scoreDistribution?.from5To7 || 0,
          data?.scoreDistribution?.from7To85 || 0,
          data?.scoreDistribution?.above85 || 0
        ],
        backgroundColor: '#ef7d00',
        borderRadius: 8,
      }
    ]
  };

  // Class sizes Chart Data (Center)
  const classSizesLabels = data?.classSizes?.map(c => c.className) || [];
  const classSizesStudents = data?.classSizes?.map(c => c.studentCount) || [];
  const classSizesCapacity = data?.classSizes?.map(c => c.capacity) || [];

  const classChartData = {
    labels: classSizesLabels,
    datasets: [
      {
        label: 'Sĩ số hiện tại',
        data: classSizesStudents,
        backgroundColor: '#4361ee',
        borderRadius: 6,
      },
      {
        label: 'Sức chứa tối đa',
        data: classSizesCapacity,
        backgroundColor: '#ccd9ff',
        borderRadius: 6,
      }
    ]
  };

  // Class specific test chart configuration
  const currentTestObj = classDashboard?.tests?.find(t => t.testId === selectedTestId);
  const testDistributionChartData = currentTestObj ? {
    labels: currentTestObj.scoreDistribution.map(d => `Điểm ${d.score}`),
    datasets: [
      {
        label: 'Số học sinh đạt điểm',
        data: currentTestObj.scoreDistribution.map(d => d.count),
        backgroundColor: '#ef7d00',
        borderRadius: 6,
      }
    ]
  } : null;

  // Student Average Score Histogram Data
  const averageScoreHistData = classDashboard ? {
    labels: classDashboard.averageScoreDistribution.map(b => `Khoảng ${b.interval}`),
    datasets: [
      {
        label: 'Số học sinh',
        data: classDashboard.averageScoreDistribution.map(b => b.count),
        backgroundColor: '#4361ee',
        borderRadius: 6,
      }
    ]
  } : null;

  return (
    <div className="container-fluid py-4 animate__animated animate__fadeIn">
      {/* Header */}
      <div className="row g-3 align-items-center mb-4 pb-3 border-bottom">
        <div className="col-12 col-md-6">
          <h2 className="fw-bold text-uppercase text-primary m-0">Báo Cáo & Thống Kê</h2>
          <p className="text-muted m-0">Học lực, chuyên cần và phân bố điểm số toàn trung tâm và từng môn lớp</p>
        </div>
        <div className="col-12 col-md-6 d-flex gap-2 justify-content-md-end">
          <select
            className="form-select rounded-pill px-3 w-auto fw-bold text-primary border-primary text-nowrap"
            style={{ minWidth: '220px' }}
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
          >
            <option value="center">Báo cáo trung tâm</option>
            {classesList.map((cls) => (
              <option key={cls.id} value={cls.id}>
                Lớp {cls.name || cls.tenLop}
              </option>
            ))}
          </select>
          {selectedClassId === 'center' && (
            <button
              onClick={handleExport}
              className="btn btn-outline-primary fw-bold shadow-sm"
              disabled={exporting}
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
          )}
        </div>
      </div>

      {selectedClassId === 'center' ? (
        <>
          {/* Stats Cards (Center) */}
          <div className="row g-3 mb-4">
            <div className="col-12 col-sm-6 col-md-3">
              <div 
                className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center justify-content-between h-100" 
                onClick={() => openStudentList(
                  'Danh sách tất cả học sinh', 
                  async () => {
                    const users = await p0Api.users.list();
                    return (users || [])
                      .filter(u => (u.accountType === 3 || (u.roles || []).some(r => r.name === 'Hoc_Sinh')) && u.profileId)
                      .map(u => ({ studentId: u.profileId, studentName: u.fullName, email: u.email }));
                  }
                )}
                style={{ 
                  background: 'linear-gradient(135deg, #eef2f7 0%, #d9e2ec 100%)', 
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
                <div>
                  <h6 className="text-secondary text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>Tổng Học Sinh</h6>
                  <h3 className="fw-bold m-0 text-dark">{data?.totalStudents || 0}</h3>
                </div>
                <div className="rounded-circle bg-white text-primary shadow-sm d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}><i className="bi bi-people-fill fs-4"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #eef2f7 0%, #d9e2ec 100%)' }}>
                <div>
                  <h6 className="text-secondary text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>Tổng Giảng Viên</h6>
                  <h3 className="fw-bold m-0 text-dark">{data?.totalTeachers || 0}</h3>
                </div>
                <div className="rounded-circle bg-white text-success shadow-sm d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}><i className="bi bi-person-workspace fs-4"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #eef2f7 0%, #d9e2ec 100%)' }}>
                <div>
                  <h6 className="text-secondary text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>Số Lớp Học</h6>
                  <h3 className="fw-bold m-0 text-dark">{data?.totalClasses || 0}</h3>
                </div>
                <div className="rounded-circle bg-white text-warning shadow-sm d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}><i className="bi bi-building-fill fs-4"></i></div>
              </div>
            </div>

            <div className="col-12 col-sm-6 col-md-3">
              <div className="card border-0 shadow-sm rounded-4 p-3 d-flex flex-row align-items-center justify-content-between" style={{ background: 'linear-gradient(135deg, #eef2f7 0%, #d9e2ec 100%)' }}>
                <div>
                  <h6 className="text-secondary text-uppercase fw-semibold mb-1" style={{ fontSize: '11px' }}>Số Khóa Học</h6>
                  <h3 className="fw-bold m-0 text-dark">{data?.totalCourses || 0}</h3>
                </div>
                <div className="rounded-circle bg-white text-danger shadow-sm d-flex align-items-center justify-content-center" style={{ width: '56px', height: '56px', flexShrink: 0 }}><i className="bi bi-book-half fs-4"></i></div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="row g-4">
            <div className="col-12 col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Tỷ Lệ Điểm Danh Chung</h5>
                <div className="d-flex align-items-center justify-content-center p-3" style={{ height: '300px' }}>
                  {data?.attendanceRate?.total > 0 ? (
                    <Doughnut
                      data={attendanceChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom' } },
                        onClick: () => {
                          openStudentList(
                            'Danh sách tất cả học sinh',
                            async () => {
                              const users = await p0Api.users.list();
                              return (users || [])
                                .filter(u => (u.accountType === 3 || (u.roles || []).some(r => r.name === 'Hoc_Sinh')) && u.profileId)
                                .map(u => ({ studentId: u.profileId, studentName: u.fullName, email: u.email }));
                            }
                          );
                        }
                      }}
                    />
                  ) : (
                    <span className="text-muted">Chưa có dữ liệu chuyên cần</span>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
                  Phổ Điểm Toàn Trung Tâm
                  {data?.scoreDistribution?.total > 0 && (
                    <span className="badge bg-primary ms-3 fs-6">ĐTB: {data.scoreDistribution.averageScore}</span>
                  )}
                </h5>
                <div style={{ height: '300px' }}>
                  {data?.scoreDistribution?.total > 0 ? (
                    <Bar
                      data={scoreChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } },
                        onClick: () => {
                          openStudentList(
                            'Danh sách tất cả học sinh',
                            async () => {
                              const users = await p0Api.users.list();
                              return (users || [])
                                .filter(u => (u.accountType === 3 || (u.roles || []).some(r => r.name === 'Hoc_Sinh')) && u.profileId)
                                .map(u => ({ studentId: u.profileId, studentName: u.fullName, email: u.email }));
                            }
                          );
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted">Chưa có dữ liệu điểm số</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-12">
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Thống Kê Quy Mô Lớp Học (Học Sinh / Lớp)</h5>
                <div style={{ height: '350px' }}>
                  {data?.classSizes?.length > 0 ? (
                    <Bar
                      data={classChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: { y: { beginAtZero: true } },
                        onClick: (event, elements, chart) => {
                          if (elements.length > 0) {
                            const index = elements[0].index;
                            const className = classSizesLabels[index];
                            const cls = classesList.find(c => (c.name || c.tenLop) === className);
                            if (cls) {
                              openStudentList(
                                `Danh sách học sinh lớp ${className}`,
                                async () => {
                                  const students = await p0Api.classes.students(cls.id);
                                  return (students || []).map(s => ({
                                    studentId: s.studentId,
                                    studentName: s.fullName || s.studentName,
                                    email: s.email
                                  }));
                                }
                              );
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted">Chưa có dữ liệu lớp học</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : loadingDashboard ? (
        <div className="d-flex align-items-center justify-content-center p-5" style={{ minHeight: '40vh' }}>
          <div className="spinner-border text-info" role="status">
            <span className="visually-hidden">Đang tải thống kê lớp học...</span>
          </div>
        </div>
      ) : classDashboard ? (
        <>
          {/* Class Summary Widgets */}
          <div className="row g-3 mb-4 animate__animated animate__fadeInUp">
            <div className="col-12 col-md-6">
              <div 
                className="card border-0 shadow-sm rounded-4 p-3 bg-white text-center h-100"
                onClick={() => openStudentList(
                  `Danh sách học sinh lớp ${classDashboard.className}`,
                  classDashboard.attendance.map(a => ({
                    studentId: a.studentId,
                    studentName: a.studentName
                  }))
                )}
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
                <h2 className="fw-bold text-primary m-0">{classDashboard.totalStudents} học sinh</h2>
              </div>
            </div>
            <div className="col-12 col-md-6">
              <div className="card border-0 shadow-sm rounded-4 p-3 bg-white text-center">
                <span className="text-muted text-uppercase fw-semibold mb-1" style={{ fontSize: '12px' }}>Số Bài Kiểm Tra</span>
                <h2 className="fw-bold text-success m-0">{classDashboard.totalTests} bài</h2>
              </div>
            </div>
          </div>

          <div className="row g-4 mb-4">
            {/* Left: Test Grade Distribution */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <div className="d-flex justify-content-between align-items-center border-bottom pb-2 mb-3">
                  <h5 className="fw-bold m-0 text-secondary">Phổ điểm bài kiểm tra</h5>
                  {classDashboard.tests.length > 0 && (
                    <select
                      className="form-select form-select-sm w-auto rounded-pill"
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                    >
                      {classDashboard.tests.map(t => (
                        <option key={t.testId} value={t.testId}>{t.testName}</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div style={{ height: '300px' }}>
                  {testDistributionChartData ? (
                    <Bar
                      data={testDistributionChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                          }
                        },
                        onClick: () => {
                          openStudentList(
                            `Danh sách học sinh lớp ${classDashboard.className}`,
                            classDashboard.attendance.map(a => ({
                              studentId: a.studentId,
                              studentName: a.studentName
                            }))
                          );
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted">Không có bài kiểm tra hoặc dữ liệu điểm số</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Average Score Interval Distribution */}
            <div className="col-12 col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 p-4 h-100 bg-white">
                <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">Phân bố điểm trung bình học sinh</h5>
                <div style={{ height: '300px' }}>
                  {averageScoreHistData ? (
                    <Bar
                      data={averageScoreHistData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { stepSize: 1 }
                          }
                        },
                        onClick: () => {
                          openStudentList(
                            `Danh sách học sinh lớp ${classDashboard.className}`,
                            classDashboard.attendance.map(a => ({
                              studentId: a.studentId,
                              studentName: a.studentName
                            }))
                          );
                        }
                      }}
                    />
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      <span className="text-muted">Chưa đủ dữ liệu điểm số để vẽ biểu đồ</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance table - "Tạo thành bảng, k tạo thành biểu đồ" */}
          <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
            <h5 className="fw-bold mb-3 text-secondary border-bottom pb-2">
              <i className="bi bi-calendar-check-fill me-2 text-success"></i>
              Bảng điểm danh chuyên cần của lớp học
            </h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead className="table-light">
                  <tr>
                    <th scope="col" className="ps-3">Học sinh</th>
                    <th scope="col" className="text-center">Số buổi học</th>
                    <th scope="col" className="text-center">Đi học</th>
                    <th scope="col" className="text-center">Vắng</th>
                    <th scope="col" className="text-center">Đi muộn</th>
                    <th scope="col" className="text-center">Nghỉ phép</th>
                    <th scope="col" className="text-center">Tỉ lệ đi học (%)</th>
                    <th scope="col" className="text-center">Tỉ lệ vắng (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {classDashboard.attendance.length > 0 ? (
                    classDashboard.attendance.map((att, idx) => {
                      let badgeColor = 'bg-success';
                      if (att.attendanceRate < 75.0) badgeColor = 'bg-danger';
                      else if (att.attendanceRate < 90.0) badgeColor = 'bg-warning text-dark';

                      return (
                        <tr 
                          key={att.studentId || idx}
                          onClick={() => att.studentId && loadStudentDetail(att.studentId)}
                          style={{ cursor: att.studentId ? 'pointer' : 'default' }}
                          title={att.studentId ? "Nhấn để xem báo cáo học tập chi tiết" : ""}
                        >
                          <td className="ps-3 fw-bold text-primary">
                            <i className="bi bi-person-badge-fill me-2"></i>
                            {att.studentName}
                          </td>
                          <td className="text-center">{att.totalSessions}</td>
                          <td className="text-center text-success fw-bold">{att.presentSessions}</td>
                          <td className="text-center text-danger fw-bold">{att.absentSessions}</td>
                          <td className="text-center text-warning fw-bold">{att.lateSessions}</td>
                          <td className="text-center text-secondary">{att.excusedSessions}</td>
                          <td className="text-center">
                            <span className={`badge ${badgeColor} px-3 py-2 fs-6`}>
                              {att.attendanceRate}%
                            </span>
                          </td>
                          <td className="text-center text-muted">{att.absentRate}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-4 text-muted">Lớp học này chưa có thông tin điểm danh.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="alert alert-info rounded-4 text-center py-4">Vui lòng chọn báo cáo hoặc lớp học để xem.</div>
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

export default AdminReports;
