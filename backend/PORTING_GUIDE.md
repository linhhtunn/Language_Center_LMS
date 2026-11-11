# Hướng dẫn chuyển controller .NET → Node (đọc trước khi viết module)

Mã nguồn gốc (chỉ đọc, KHÔNG sửa): `C:\Users\ADMIN\Downloads\ENGLISH_EDUCATION\QuanLyTrungTam\backend`
(Controllers/, Services/, Repositories/, DTOs/, Models/, Helpers/). Frontend gọi API ở `LMS/frontend/src/api/*.js`
và rải rác trong `frontend/src/pages`, `components`, `hooks` — đọc để biết frontend gửi/nhận trường nào.

## Mục tiêu số 1: frontend cũ chạy được KHÔNG cần sửa
Giữ y hệt: đường dẫn, HTTP method, mã trạng thái, tên trường JSON (cả request lẫn response), dạng lỗi.
Khi phân vân, gọi thử backend .NET đối chiếu rồi so (xem "Môi trường" bên dưới).

## Cấu trúc
- Mỗi nhóm controller = `src/modules/<module>/`. Router (`<module>.routes.ts`, `export default router`) đã được
  gắn ở gốc trong `src/app.ts` → **khai báo đường dẫn đầy đủ**, vd `router.get('/api/users/:id', ...)`.
  Express không phân biệt hoa thường như ASP.NET.
- Logic dài để trong `<module>.service.ts` (hoặc nhiều file trong module). Không nhét vào file khác module.
- **KHÔNG sửa file dùng chung** (`src/app.ts`, `src/config.ts`, `src/db.ts`, `src/utils/*`, `src/middlewares/*`,
  `src/shared/*`, `prisma/schema.prisma`, `package.json`). Cần thêm helper chung → viết trong module của bạn và
  ghi vào báo cáo cuối. Cần thêm thư viện npm → ghi vào báo cáo, không tự cài.

## Ánh xạ .NET → Node
| .NET | Node |
|---|---|
| `AppDbContext` / EF LINQ | `prisma` từ `src/db.js` (model = tên bảng chữ thường: `prisma.lophoc`, field = tên cột `MaLop`) |
| `[Authorize]` | `requireAuth` (`middlewares/auth.js`) → `req.user = { userId, email, role, fullName, profileId }` |
| `[Authorize(Roles="A,B")]` | `requireAuth, requireRole('A','B')` |
| `[AuthorizeByPermission("CODE")]` (class hoặc action) | `...requirePermission('CODE')` (`middlewares/permission.js`) — trả 403 `{message,statusCode:403}` như cũ |
| `User.GetUserId()` / `GetProfileId()` | `req.user!.userId` / `req.user!.profileId` |
| `PermissionHelper.HasRoleAsync/GetUserPrimaryRoleAsync` | `hasRole`, `getUserPrimaryRole` trong `middlewares/permission.js` |
| `ApiResponseDto.Ok/Fail` | `ok(data, msg)` / `fail(msg, code)` (`utils/apiResponse.js`) |
| `return Ok(x)` / `BadRequest(x)` / `NotFound(x)` / `NoContent()` | `res.json(x)` / `res.status(400).json(x)` / `res.status(404).json(x)` / `res.status(204).end()` |
| `NotFound()` / `Unauthorized()` / `Forbid()` không body | `res.status(404).end()` / `401` / `403` |
| `{id:guid}` constraint sai | `if (!isGuid(id)) return res.status(404).end()` |
| `[FromQuery] string? q` | `queryCI(req,'q')`, `queryInt`, `queryBool` (không phân biệt hoa thường như ASP.NET) |
| `[FromBody] Dto` | đọc `getCI(req.body,'tenTruong')` (ASP.NET bind không phân biệt hoa thường) |
| `[ApiController]` + `[Required]`… sai | `res.status(400).json(validationProblem({ TenTruong: ['msg'] }))` |
| `IFormFile`, `WebRootPath/uploads/...` | `upload.single('file')` / `upload.array(...)` / `upload.any()` + `saveUpload(file, 'subfolder')`, `deleteUpload(url)` (`utils/upload.js`) — URL trả về giữ dạng `/uploads/<subfolder>/<tên>` |
| Transaction `BeginTransactionAsync` | `prisma.$transaction(async (tx) => { ... })` |
| `FromSqlRaw` / `ExecuteSqlRaw` | `prisma.$queryRaw\`...\`` / `prisma.$executeRaw\`...\`` (tagged template, có tham số an toàn) |
| `Guid.NewGuid()` | `randomUUID()` từ `node:crypto` |
| `DateTime.Now` / `UtcNow` | `new Date()` (process chạy TZ=UTC) |
| Helpers/AutoGrader, BaiTapCauHoiNoiDung | `src/shared/autoGrader.ts` (`grade`, `hasValue`, `parseNoiDung`) |
| IAiJobQueue.Enqueue(new Ai1Job(..)) | `enqueueAiJob({ kind:'Ai1', maNopBai })` (`src/shared/aiJobQueue.ts`) |
| ChatbotExamGuard | `src/shared/chatbotExamGuard.ts` |
| IHubContext SignalR `.SendAsync("Ev", payload)` | `emitToUser('/chat'|'/notification', userId, 'Ev', payload)` (`src/realtime/socket.ts`) — giữ nguyên tên sự kiện |

## JSON phải giống System.Text.Json (CamelCase)
- Tên thuộc tính DTO/anonymous object C# → camelCase theo thuật toán .NET: `MaLop→maLop`, `ID→id`, `MaHS→maHS`.
  Dùng `dotnetCamel(name)`. Khi controller cũ trả thẳng entity EF, dùng `camelizeKeys(entity)`
  (nhưng tên navigation EF ≠ tên quan hệ Prisma — phải đổi tay, vd `MaLopNavigation` vs `lophoc`).
- **Key của Dictionary C# KHÔNG đổi** sang camelCase.
- Giá trị `null` vẫn phải có mặt (đừng để `undefined` làm mất key).
- `DateTime` → để nguyên `Date`, replacer trong app.ts tự ghi `"2026-11-11T13:41:30"` (không Z) như .NET.
- Thuộc tính kiểu **DateOnly** trong C# → `toDateOnly(d)` ("yyyy-MM-dd"); **TimeOnly/TimeSpan** → `toTimeOnly(d)` ("HH:mm:ss").
  Đọc vào: `parseDateOnly`, `parseTimeOnly`, `parseDotnetDateTime`. Xem kiểu trong `Models/*.cs` của bản cũ.
- `decimal` → tự thành number. `Guid` → chuỗi chữ thường.
- Enum C# mặc định ghi thành **số**.

## Môi trường thử (đang chạy sẵn)
- MySQL dùng chung: `DATABASE_URL="mysql://root:refPass123@127.0.0.1:3308/HeThongHocOnline_Final"`
- Backend .NET đối chiếu (cùng database): `http://localhost:5099` (Swagger: `/swagger`). Đăng nhập lấy token:
  `curl -s -X POST localhost:5099/api/Auth/login -H 'Content-Type: application/json' -d '{"data":{"email":"admin@qltt.local","password":"QlttAdmin@2026!A9"}}'`
  Tài khoản: admin / giaovien / hocsinh / phuhuynh `@qltt.local`, mật khẩu xem `tests/helpers.ts`.
  Token của Node và .NET KHÁC nhau (khác secret) — lấy token riêng cho từng bên.
- Chạy server Node của bạn ở cổng riêng (được giao trong đề bài): `DATABASE_URL=... PORT=<cổng> npx tsx src/server.ts`.
- Database dùng chung với các agent khác: dữ liệu thử phải có tiền tố riêng (vd tên lớp `TEST_<module>_...`),
  KHÔNG xoá/sửa 4 tài khoản demo và dữ liệu seed. Muốn so .NET vs Node thì tạo dữ liệu một lần rồi GET từ cả hai.

## Kiểm tra trước khi báo xong
1. `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/modules/<module>\|tests/<module>"` → không lỗi ở file của bạn
   (lỗi ở module khác đang được agent khác viết thì bỏ qua).
2. `tests/<module>.test.ts` dùng `tests/helpers.ts` (`app`, `auth('admin')`...). Chạy: `DATABASE_URL=... npx vitest run tests/<module>.test.ts`.
3. Với vài endpoint GET quan trọng: gọi cả .NET (5099) và Node, so cấu trúc JSON (tên key, kiểu, định dạng ngày).
4. KHÔNG sửa `../MIGRATION_CHECKLIST.md` (nhiều agent cùng sửa sẽ ghi đè nhau) — người điều phối sẽ cập nhật.
5. Không chạy `git commit` — người điều phối sẽ commit.
