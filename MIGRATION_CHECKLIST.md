# Checklist chuyển backend .NET → Node.js

Nguồn gốc: dự án `ENGLISH_EDUCATION` (ASP.NET Core 8 + EF Core + MySQL).
Mục tiêu: **giữ nguyên đường dẫn API và dạng JSON** để frontend dùng lại nguyên vẹn.
Quy ước viết module: xem [backend/PORTING_GUIDE.md](backend/PORTING_GUIDE.md).

## Trạng thái: đã chuyển xong toàn bộ (23/23 controller)

Mỗi module đã được so sánh trực tiếp với backend .NET gốc chạy trên cùng database
(cùng request → so status, header, JSON). Kết quả: 214 test, 20 file test đều đạt.

| | Controller .NET | Module Node (`backend/src/modules/`) | API |
|---|---|---|---|
| [x] | AuthController | `auth` | 4 |
| [x] | UsersController | `users` | 6 |
| [x] | PermissionsController | `permissions` | 6 |
| [x] | SystemController | `system` | 1 |
| [x] | CoursesController | `courses` | 5 |
| [x] | ClassesController + ClassStudentsController | `classes` | 10 |
| [x] | GiangVienController | `teachers` | 6 |
| [x] | HocSinhController | `students` | 4 |
| [x] | ParentController + ParentChildrenController | `parents` | 8 |
| [x] | ScheduleController (+ xếp lịch, đổi lịch) | `schedule` | 25 |
| [x] | AttendanceController + AdminAttendanceController | `attendance` | 5 |
| [x] | AdminAssignmentController | `assignments` | 24 |
| [x] | StudentAssignmentController | `studentAssignments` | 6 |
| [x] | Admin/Teacher/StudentStudyContentController | `studyContent` | 19 |
| [x] | MessagesController | `messages` | 10 |
| [x] | NotificationController | `notifications` | 10 |
| [x] | ReportsController | `reports` | 13 |
| [x] | ChatbotController | `chatbot` | 6 |

Ngoài controller:
- [x] AiFeedbackWorker (3 AI nhận xét) → `modules/aiFeedback`, khởi động trong `server.ts`.
- [x] SignalR ChatHub/NotificationHub → Socket.IO (`src/realtime/socket.ts`), frontend đã chuyển sang `socket.io-client`.
- [x] AuthorizationMiddleware/PermissionHelper → `middlewares/permission.ts`.
- [x] LoginRateLimit, LoginAudit, ExceptionMiddleware → `middlewares/*`, `app.ts`.
- [x] Bootstrap dữ liệu → `database/02_seed.sql` (vai trò, 48 quyền, gán quyền, danh mục, 14 tiết học, 4 tài khoản demo).
- [ ] FirebasePushService: bản gốc đang tắt, bản Node để trống (no-op).

## Khác biệt có chủ ý so với bản .NET
- Gọi API cần quyền mà **thiếu/hết hạn token → 401** (bản .NET trả 403). Nhờ vậy frontend tự làm mới token thay vì đá sang trang "không có quyền".
- Body JSON sai cú pháp → 400 dạng `{ success:false, ... }` thay cho ProblemDetails; lỗi validate không có `traceId`.
- Socket: chỉ thành viên mới vào được phòng hội thoại; nhóm theo vai trò hoạt động đúng; mỗi kết nối nhận sự kiện 1 lần.
- Tải tài liệu: chặn đường dẫn `../`.
- Thời gian: phần lẻ giây có tối đa 3 chữ số (bản .NET tới 7).

## Lỗi của bản gốc đã sửa trong bản Node
| # | Lỗi bản .NET | Bản Node |
|---|---|---|
| 1 | Sửa bài tập thêm câu hỏi / lớp mới → 500, không lưu | Lưu đúng (`EMULATE_EF_NAVIGATION_ADD_BUG = false`) |
| 2 | Tìm kiếm bài tập (`?search=`) luôn 500 | Tìm theo tên + mô tả, không phân biệt hoa thường |
| 3 | Ai đăng nhập cũng xem được dashboard mọi học sinh / lớp | Admin; GV chỉ lớp mình dạy; HS chỉ của mình; PH chỉ của con (`reports.access.ts`) |
| 4 | `GiangVien/assign-courses`, duyệt/từ chối đổi lịch không kiểm tra quyền | Cần `USERS_EDIT` / `SCHEDULE_CHANGE_REQUEST_ADMIN` |
| 5 | Báo cáo bịa số liệu (backend seeded + frontend "demo universe") | Chỉ số thật; trống → 0 / `null` / "Chưa có dữ liệu"; `admin/student-performance` tính từ điểm + điểm danh thật |
| 6 | Câu tự luận chưa chấm lưu 0.00 → hiện SAI | Lưu `NULL`, hiện "chờ chấm" (cả bài nộp cũ nhờ `TrangThaiChamTay`) |
| 7 | Thông báo realtime không bao giờ được gửi | `POST /api/Notification` đẩy `NewNotification` tới đúng người nhận; frontend hiện toast + cập nhật chuông |

## Lỗi của bản gốc còn giữ nguyên (chưa sửa)
- PUT bài tập không gửi `code` → sinh mã mới (KT-003 thành BT-002).
- `rooms/create`, `rooms/:id`, `PUT /api/Schedule/:id` chỉ cần đăng nhập (chưa kiểm tra quyền).
- Sĩ số lớp trong dashboard GV lấy `SiSoHienTai` thay vì đếm ghi danh thật.
- Một số module bài tập/đề thi ở frontend (AdminAssignment, TeacherExams...) vẫn dùng dữ liệu mock.
