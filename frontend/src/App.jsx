import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudentClassProvider } from './context/StudentClassContext';
import { TestProvider } from './context/TestContext';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './components/MainLayout';
import { Toaster } from 'react-hot-toast';
import Unauthorized from './components/Unauthorized';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherSchedule = lazy(() => import('./pages/teacher/TeacherSchedule'));
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'));
const ParentDashboard = lazy(() => import('./pages/parent/ParentDashboard'));
const ParentSchedule = lazy(() => import('./pages/parent/ParentSchedule'));
const SchedulePage = lazy(() => import('./pages/student/SchedulePage'));

const AdminCourses = lazy(() => import('./pages/admin/AdminCourses'));
const AdminClasses = lazy(() => import('./pages/admin/AdminClasses'));
const AdminCreateClass = lazy(() => import('./pages/admin/AdminCreateClass'));
const AdminCreateCourse = lazy(() => import('./pages/admin/AdminCreateCourse'));
const AdminCreateRoom = lazy(() => import('./pages/admin/AdminCreateRoom'));
const AdminEditRoom = lazy(() => import('./pages/admin/AdminEditRoom'));
const AdminAssignStudent = lazy(() => import('./pages/admin/AdminAssignStudent'));
const AdminMessages = lazy(() => import('./pages/admin/AdminMessages'));
const AdminStudyContent = lazy(() => import('./pages/admin/AdminStudyContent'));
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminCreateUser = lazy(() => import('./pages/admin/AdminCreateUser'));
const AdminNotifications = lazy(() => import('./pages/admin/AdminNotifications'));
const AdminAssignment = lazy(() => import('./pages/admin/AdminAssignment'));
const AdminFunctions = lazy(() => import('./pages/admin/AdminFunctions'));
const AdminSchedule = lazy(() => import('./pages/admin/AdminSchedule'));
const AdminReports = lazy(() => import('./pages/admin/AdminReports'));
const AdminStudentStats = lazy(() => import('./pages/admin/AdminStudentStats'));

const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherClasses = lazy(() => import('./pages/teacher/TeacherClasses'));
const TeacherProfile = lazy(() => import('./pages/teacher/TeacherProfile'));
const TeacherMessages = lazy(() => import('./pages/teacher/TeacherMessages'));
const TeacherExams = lazy(() => import('./pages/teacher/TeacherExams'));
const TeacherStudyContent = lazy(() => import('./pages/teacher/TeacherStudyContent'));
const TeacherReports = lazy(() => import('./pages/teacher/TeacherReports'));
const ExamGenerationManager = lazy(() => import('./pages/teacher/ExamGenerationManager'));

const ParentAttendance = lazy(() => import('./pages/parent/ParentAttendance'));
const ParentMessages = lazy(() => import('./pages/parent/ParentMessages'));
const ParentReports = lazy(() => import('./pages/parent/ParentReports'));
const ParentProfile = lazy(() => import('./pages/parent/ParentProfile'));

const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentStudyContent = lazy(() => import('./pages/student/StudentStudyContent'));
const StudentAssignmentPage = lazy(() => import('./pages/student/StudentAssignmentPage'));
const StudentReports = lazy(() => import('./pages/student/StudentReports'));
const StudentMessages = lazy(() => import('./pages/student/StudentMessages'));

const Placeholder = ({ title }) => (
  <div className="p-4 animate__animated animate__fadeIn">
    <div className="card border-0 shadow-sm rounded-5 p-5 text-center">
      <i className="bi bi-cone-striped fs-1 text-warning mb-3"></i>
      <h3 className="fw-bold text-uppercase">{title}</h3>
      <p className="text-muted">Tính năng này đang được phát triển và sẽ sớm ra mắt.</p>
    </div>
  </div>
);

const RouteLoadingFallback = () => (
  <div className="d-flex align-items-center justify-content-center py-5" style={{ minHeight: '60vh' }}>
    <div className="text-center">
      <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="fw-semibold text-muted">Đang tải trang...</div>
    </div>
  </div>
);

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  switch (user.role) {
    case 'Admin': return <Navigate to="/admin" replace />;
    case 'Giao_Vien': return <Navigate to="/teacher" replace />;
    case 'Hoc_Sinh': return <Navigate to="/student" replace />;
    case 'Phu_Huynh': return <Navigate to="/parent" replace />;
    default: return <Navigate to="/login" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <StudentClassProvider>
        <TestProvider>
          <Toaster position="top-right" />
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<HomeRedirect />} />

                <Route element={<MainLayout />}>

                  {/* --- NHÓM QUẢN TRỊ (ADMIN) --- */}
                  <Route path="/admin" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_USERS_VIEW']}><AdminDashboard /></PrivateRoute>} />
                  <Route path="/admin/functions" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_PERMISSIONS_VIEW']}><AdminFunctions /></PrivateRoute>} />
                  <Route path="/admin/users" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_USERS_VIEW']}><AdminUsers /></PrivateRoute>} />
                  <Route path="/admin/courses" element={<PrivateRoute requiredPermissions={['COURSES_CREATE']}><AdminCourses /></PrivateRoute>} />
                  <Route path="/admin/courses/create" element={<PrivateRoute requiredPermissions={['COURSES_CREATE']}><AdminCreateCourse /></PrivateRoute>} />

                  <Route path="/admin/classes" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_CLASSES_VIEW']}><AdminClasses /></PrivateRoute>} />
                  <Route path="/admin/classes/create" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_CLASSES_VIEW']}><AdminCreateClass /></PrivateRoute>} />
                  <Route path="/admin/rooms/create" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_CLASSES_VIEW']}><AdminCreateRoom /></PrivateRoute>} />
                  <Route path="/admin/rooms/:id/edit" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_CLASSES_VIEW']}><AdminEditRoom /></PrivateRoute>} />
                  <Route path="/admin/classes/assign-students" element={<PrivateRoute requiredPermissions={['CLASSES_STUDENTS_VIEW']}><AdminAssignStudent /></PrivateRoute>} />

                  <Route path="/admin/attendance" element={<PrivateRoute requiredPermissions={['ATTENDANCE_ADMIN_VIEW']}><AdminAttendance /></PrivateRoute>} />
                  <Route path="/admin/exams" element={<PrivateRoute requiredPermissions={['ASSIGNMENTS_ADMIN_VIEW']}><AdminAssignment /></PrivateRoute>} />
                  <Route path="/admin/exams/generate" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_ADMIN']}><ExamGenerationManager /></PrivateRoute>} />
                  <Route path="/admin/reports" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_REPORTS_VIEW']}><AdminReports /></PrivateRoute>} />
                  <Route path="/admin/student-stats" element={<PrivateRoute><AdminStudentStats /></PrivateRoute>} />
                  <Route path="/admin/notifications" element={<PrivateRoute requiredPermissions={['NOTIFICATIONS_VIEW_ALL']}><AdminNotifications /></PrivateRoute>} />
                  <Route path="/admin/content" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_ADMIN']}><AdminStudyContent /></PrivateRoute>} />
                  <Route path="/admin/messages" element={<PrivateRoute requiredPermissions={['MESSAGES_ACCESS']}><AdminMessages /></PrivateRoute>} />

                  <Route path="/admin/schedules" element={<PrivateRoute requiredPermissions={['PAGE_ADMIN_CLASSES_VIEW']}><AdminSchedule /></PrivateRoute>} />

                  <Route path="/admin/profile" element={<PrivateRoute><Placeholder title="Hồ sơ cá nhân" /></PrivateRoute>} />

                  <Route
                    path="/admin/users/create"
                    element={
                      <PrivateRoute requiredPermissions={['USERS_CREATE']}>
                        <AdminCreateUser />
                      </PrivateRoute>
                    }
                  />

                  {/* --- NHÓM GIÁO VIÊN (TEACHER) --- */}
                  <Route path="/teacher" element={<PrivateRoute requiredPermissions={['PAGE_TEACHER_SCHEDULE_VIEW']}><TeacherDashboard /></PrivateRoute>} />
                  <Route path="/teacher/schedule" element={<PrivateRoute requiredPermissions={['PAGE_TEACHER_SCHEDULE_VIEW']}><TeacherSchedule /></PrivateRoute>} />
                  <Route path="/teacher/classes" element={<PrivateRoute requiredPermissions={['CLASSES_STUDENTS_VIEW']}><TeacherClasses /></PrivateRoute>} />
                  <Route path="/teacher/exams" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_TEACHER']}><TeacherExams /></PrivateRoute>} />
                  <Route path="/teacher/exams/generate" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_TEACHER']}><ExamGenerationManager /></PrivateRoute>} />
                  <Route path="/teacher/grading" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_TEACHER']}><Placeholder title="Chấm điểm" /></PrivateRoute>} />
                  <Route path="/teacher/content" element={<PrivateRoute requiredPermissions={['STUDY_CONTENT_TEACHER']}><TeacherStudyContent /></PrivateRoute>} />
                  <Route path="/teacher/notifications" element={<PrivateRoute><Placeholder title="Thông báo" /></PrivateRoute>} />
                  <Route path="/teacher/messages" element={<PrivateRoute requiredPermissions={['MESSAGES_ACCESS']}><TeacherMessages /></PrivateRoute>} />
                  <Route path="/teacher/attendance" element={<PrivateRoute requiredPermissions={['ATTENDANCE_EDIT']}><TeacherAttendance /></PrivateRoute>} />
                  <Route path="/teacher/reports" element={<PrivateRoute requiredPermissions={['PAGE_TEACHER_REPORTS_VIEW']}><TeacherReports /></PrivateRoute>} />
                  <Route path="/teacher/profile" element={<PrivateRoute><TeacherProfile /></PrivateRoute>} />

                  {/* --- NHÓM HỌC SINH (STUDENT) --- */}
                  <Route path="/student" element={<PrivateRoute requiredPermissions={['PAGE_STUDENT_SCHEDULE_VIEW']}><StudentDashboard /></PrivateRoute>} />
                  <Route path="/student/schedule" element={<PrivateRoute requiredPermissions={['PAGE_STUDENT_SCHEDULE_VIEW']}><SchedulePage /></PrivateRoute>} />
                  <Route path="/student/homework-list" element={<PrivateRoute><StudentAssignmentPage /></PrivateRoute>} />
                  <Route path="/student/reports" element={<PrivateRoute><StudentReports /></PrivateRoute>} />
                  <Route path="/student/homework" element={<PrivateRoute><StudentStudyContent /></PrivateRoute>} />
                  <Route path="/student/notifications" element={<PrivateRoute><Placeholder title="Thông báo" /></PrivateRoute>} />
                  <Route path="/student/messages" element={<PrivateRoute><StudentMessages /></PrivateRoute>} />
                  <Route path="/student/profile" element={<PrivateRoute><StudentProfile /></PrivateRoute>} />

                  {/* --- NHÓM PHỤ HUYNH (PARENT) --- */}
                  <Route path="/parent" element={<PrivateRoute requiredPermissions={['PAGE_PARENT_SCHEDULE_VIEW']}><ParentDashboard /></PrivateRoute>} />
                  <Route path="/parent/schedule" element={<PrivateRoute requiredPermissions={['PAGE_PARENT_SCHEDULE_VIEW']}><ParentSchedule /></PrivateRoute>} />
                  <Route path="/parent/attendance" element={<PrivateRoute requiredPermissions={['ATTENDANCE_VIEW_PARENT']}><ParentAttendance /></PrivateRoute>} />
                  <Route path="/parent/messages" element={<PrivateRoute requiredPermissions={['MESSAGES_ACCESS']}><ParentMessages /></PrivateRoute>} />
                  <Route path="/parent/reports" element={<PrivateRoute requiredPermissions={['PAGE_PARENT_SCHEDULE_VIEW']}><ParentReports /></PrivateRoute>} />
                  <Route path="/parent/profile" element={<PrivateRoute><ParentProfile /></PrivateRoute>} />
                  
                  {/* Trang 403 hiển thị trong layout có sidebar */}
                  <Route path="/unauthorized" element={<PrivateRoute><Unauthorized height="70vh" /></PrivateRoute>} />
                </Route>

                {/* Error Routes & Catch-All */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Router>
        </TestProvider>
      </StudentClassProvider>
    </AuthProvider>
  );
}

export default App;
