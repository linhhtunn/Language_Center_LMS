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

## Lỗi của bản gốc — hiện vẫn giữ nguyên hành vi (cần quyết định có sửa không)
Xem danh sách đầy đủ trong lịch sử commit / báo cáo chuyển đổi. Quan trọng nhất:
- Sửa bài tập (PUT AdminAssignment) khi thêm câu hỏi/lớp mới → 500, không lưu (cờ `EMULATE_EF_NAVIGATION_ADD_BUG` trong `assignments/assignmentsAdmin.ts`).
- Tìm kiếm bài tập (`?search=`) luôn 500.
- `Reports/student/dashboard`, `class/{id}/dashboard`: ai đăng nhập cũng xem được dữ liệu của mọi học sinh/lớp.
- Báo cáo hiện số liệu mẫu bịa ra khi chưa có dữ liệu.
- `assign-courses`, duyệt/từ chối đổi lịch: không kiểm tra quyền.
- Thông báo realtime (`NewNotification`, `ScheduleChanged`) không bao giờ được phát.
- Câu tự luận chưa chấm bị tính là SAI ở trang kết quả.
