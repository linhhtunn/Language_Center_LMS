# Checklist chuyển backend .NET → Node.js

Nguồn gốc: dự án `ENGLISH_EDUCATION` (ASP.NET Core 8 + EF Core + MySQL).
Mục tiêu: **giữ nguyên đường dẫn API và dạng JSON** để frontend dùng lại gần như nguyên vẹn.

## Quy ước khi chuyển một controller
1. Tạo `backend/src/modules/<ten>/<ten>.routes.ts` (+ `<ten>.service.ts` nếu logic dài).
2. Đường dẫn giữ **y hệt** cột "Route" bên dưới (phân biệt hoa thường như bản cũ, ví dụ `/api/Auth`).
3. Trả về qua `ok(data, message)` / `fail(message, code)` trong `src/utils/apiResponse.ts`.
4. `[Authorize]` → `requireAuth`; `[Authorize(Roles="Admin")]` → `requireRole('Admin')`.
5. Tên trường JSON: .NET trả **camelCase** (`maLop`, `tenLop`); Prisma đặt tên theo cột (`MaLop`).
   Phải map lại trước khi trả về, nếu không frontend sẽ đọc ra `undefined`.
6. Kiểu `Decimal` của Prisma → đổi sang `Number(...)`; `DateOnly` của .NET → chuỗi `YYYY-MM-DD`.
7. Đăng ký router trong `src/app.ts`, viết ít nhất 1 test trong `backend/tests`.

## Tiến độ (23 controller, ~168 API)

| | Controller .NET | Route | Số API | Ghi chú |
|---|---|---|---|---|
| [x] | AuthController | `/api/Auth` | 4 | Xong — mẫu tham khảo |
| [ ] | UsersController | `/api/users` | 6 | |
| [ ] | PermissionsController | `/api/Permissions` | 6 | |
| [ ] | CoursesController | `/api/courses` | 5 | |
| [ ] | ClassesController | `/api/classes` | 7 | |
| [ ] | ClassStudentsController | `/api/classes/:classId/students` | 3 | |
| [ ] | GiangVienController | `/api/GiangVien` | 6 | |
| [ ] | HocSinhController | `/api/HocSinh` | 4 | |
| [ ] | ParentController | `/api/Parent` | 5 | |
| [ ] | ParentChildrenController | (route theo action) | 3 | |
| [ ] | AttendanceController | (route theo action) | 4 | |
| [ ] | AdminAttendanceController | `/api/admin/attendance` | 1 | + AdminAttendanceService |
| [ ] | ScheduleController | `/api/Schedule` | 25 | + ScheduleGeneratorService, ScheduleConstraintSolver, ScheduleChangeRequestService — **phức tạp nhất, cần test so kết quả với bản cũ** |
| [ ] | MessagesController | `/api/Messages` | 10 | + realtime `/chat` |
| [ ] | NotificationController | `/api/Notification` | 10 | + realtime `/notification`, upload đính kèm |
| [ ] | AdminStudyContentController | `/api/AdminStudyContent` | 4 | upload tài liệu (multer) |
| [ ] | TeacherStudyContentController | `/api/TeacherStudyContent` | 10 | upload tài liệu |
| [ ] | StudentStudyContentController | `/api/StudentStudyContent` | 5 | |
| [ ] | AdminAssignmentController | `/api/AdminAssignment` | 24 | 3.600 dòng, có transaction → dùng `prisma.$transaction` |
| [ ] | StudentAssignmentController | `/api/StudentAssignment` | 6 | + StudentAssignmentService |
| [ ] | ReportsController | `/api/Reports` | 13 | + ReportsService (1.500 dòng) |
| [ ] | ChatbotController | `/api/Chatbot` | 6 | Claude/Gemini SDK, giới hạn lượt/ngày |
| [ ] | SystemController | `/api/System` | 1 | |

## Phần không phải controller
- [ ] **AiFeedbackWorker** (3 AI nhận xét bài làm): vòng lặp nền đọc hàng đợi → gọi Claude/Gemini.
- [ ] **Realtime**: frontend đổi `@microsoft/signalr` → `socket.io-client`
      (`frontend/src/hooks/useChatHub.js` và chỗ nhận thông báo). Backend đã có khung ở `src/realtime/socket.ts`.
- [ ] **AuthorizationMiddleware / PermissionHelper**: kiểm tra quyền chi tiết theo `permissionCodes`.
- [ ] **LoginAuditMiddleware**: ghi nhật ký đăng nhập.
- [ ] **FirebasePushService** (đang tắt ở bản cũ) — làm sau.
- [ ] Bootstrap dữ liệu: đã thay bằng `database/02_seed.sql`, không cần chạy code khi khởi động.
