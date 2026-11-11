# Language Center LMS

Hệ thống quản lý trung tâm ngoại ngữ (học sinh, giáo viên, phụ huynh, admin): lớp học, lịch học,
điểm danh, bài tập, tài liệu, tin nhắn, thông báo, báo cáo, AI nhận xét bài làm và chatbot.

Phiên bản này viết lại toàn bộ backend bằng **Node.js + TypeScript** từ dự án gốc dùng ASP.NET Core
(23 controller, ~170 API, giữ nguyên đường dẫn và dạng JSON nên frontend dùng lại được).

## Công nghệ

| Phần | Công nghệ |
|---|---|
| Frontend | React 18 + Vite, React Bootstrap, Chart.js |
| Backend | Node.js 22, Express 5, TypeScript |
| Database | MySQL 8, truy cập qua Prisma |
| Đăng nhập | JWT (access token 15 phút) + refresh token lưu trong DB, mật khẩu bcrypt |
| Realtime | Socket.IO (namespace `/chat`, `/notification`) |
| AI | Claude (`@anthropic-ai/sdk`) hoặc Gemini |
| Triển khai | Docker Compose + Caddy (HTTPS tự động) |

## Cấu trúc thư mục

```
backend/     API Node.js (src/), Prisma schema (prisma/), file upload mẫu (uploads/)
frontend/    Giao diện React
database/    01_schema.sql (cấu trúc bảng), 02_seed.sql (dữ liệu khởi tạo), SQL bài tập mẫu
deploy/      Script triển khai theo phiên bản lên VPS, tự quay lui khi lỗi
MIGRATION_CHECKLIST.md   Đối chiếu .NET → Node, khác biệt có chủ ý, lỗi của bản gốc
backend/PORTING_GUIDE.md Quy ước viết module (giữ tương thích JSON với bản .NET)
```

## Chạy trên máy (dev)

Cần: Node.js 22+, Docker Desktop.

```powershell
# 1. Database (MySQL ở cổng 3307, tự tạo bảng + dữ liệu mẫu lần đầu)
Copy-Item .env.example .env        # điền MYSQL_ROOT_PASSWORD
docker compose up -d mysql

# 2. Backend (http://localhost:5050)
cd backend
Copy-Item .env.example .env        # sửa DATABASE_URL đúng mật khẩu ở bước 1
npm install
npx prisma generate
npm run dev

# 3. Frontend (http://localhost:3000), mở terminal khác
cd frontend
npm install
npm run dev
```

Tài khoản demo (đổi hoặc xoá trước khi chạy thật):

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | admin@qltt.local | QlttAdmin@2026!A9 |
| Giáo viên | giaovien@qltt.local | QlttTeacher@2026!G7 |
| Học sinh | hocsinh@qltt.local | QlttStudent@2026!S5 |
| Phụ huynh | phuhuynh@qltt.local | QlttParent@2026!P6 |

## Test

Test chạy với MySQL thật đã nạp `database/01_schema.sql` + `02_seed.sql`:

```powershell
cd backend
$env:DATABASE_URL="mysql://root:MAT_KHAU@127.0.0.1:3307/HeThongHocOnline_Final"
npx vitest run --no-file-parallelism
```

Một số test so sánh thêm với backend .NET gốc ở `http://localhost:5099` nếu đang chạy; không có thì tự bỏ qua phần so sánh.

## Lệnh hay dùng (thư mục backend)

| Lệnh | Tác dụng |
|---|---|
| `npm run dev` | Chạy backend, tự khởi động lại khi sửa code |
| `npm test` | Chạy test |
| `npm run typecheck` | Kiểm tra lỗi TypeScript |
| `npx prisma db pull` | Cập nhật `schema.prisma` khi database đổi cấu trúc |
| `npx prisma studio` | Xem/sửa dữ liệu trên trình duyệt |

## Triển khai

Xem [deploy/README.md](deploy/README.md). Trên VPS dự án nằm ở `/opt/lms`, cần tên miền và
database **riêng**, không dùng chung với dự án .NET cũ.
