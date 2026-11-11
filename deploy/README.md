# Triển khai theo phiên bản (Language Center LMS)

Mỗi lần cập nhật là một **phiên bản** có số (`v1.0.0`, `v1.1.0`, …). VPS giữ lại 3 phiên bản gần nhất để quay lui khi cần.

## Đặt số phiên bản

| Thay đổi | Ví dụ |
|---|---|
| Sửa lỗi nhỏ | `v1.0.0` → `v1.0.1` |
| Thêm tính năng | `v1.0.1` → `v1.1.0` |
| Thay đổi lớn (đổi cấu trúc dữ liệu nhiều, giao diện mới) | `v1.1.0` → `v2.0.0` |

## Cập nhật lên phiên bản mới

Từ thư mục gốc repo, mở Git Bash:

```bash
deploy/release.sh v1.1.0
```

Script tự làm 5 bước:
1. Build bản mới trong khi bản cũ **vẫn phục vụ khách**.
2. **Sao lưu database** ngay trước khi đổi.
3. Đổi sang bản mới. Trong vài giây chuyển đổi, khách thấy trang *"Hệ thống đang cập nhật"* và trang tự tải lại.
4. Kiểm tra sức khoẻ: trang web, API, kết nối database.
5. Nếu kiểm tra **không đạt**, script **tự khôi phục database và quay về bản cũ**. Lỗi được lưu ở `/opt/lms/last_failed_deploy.log`.

## Quay lui thủ công

Dùng khi bản mới chạy được nhưng sau đó phát hiện lỗi:

```bash
ssh linhnt /opt/lms/rollback.sh            # về bản ngay trước
ssh linhnt /opt/lms/rollback.sh v1.0.0     # về đúng bản v1.0.0
```

Mặc định lệnh này **giữ nguyên dữ liệu** khách đã nhập. Chỉ khi bản mới làm hỏng dữ liệu, bạn mới thêm `--restore-db`. Lệnh đó khôi phục database về thời điểm ngay trước khi cài bản lỗi, và **mất dữ liệu nhập sau thời điểm đó**.

## Xem lịch sử

```bash
ssh linhnt "cat /opt/lms/CURRENT_VERSION; tail -20 /opt/lms/releases.log"
```

## Nguyên tắc để cập nhật không làm hỏng dữ liệu

- Thay đổi database chỉ nên **thêm** (thêm bảng, thêm cột cho phép trống). Không xoá hay đổi tên cột trong cùng một phiên bản. Làm như vậy thì bản cũ vẫn chạy được trên database mới, và quay lui an toàn.
- Chạy thử bản mới trên máy (`docker compose up -d --build`) trước khi `release.sh`.
- Nên cập nhật vào lúc ít người dùng (tối muộn).
