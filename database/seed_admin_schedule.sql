USE HeThongHocOnline_Final;

-- ==============================================================================
-- 1. XÓA DỮ LIỆU CŨ (DỌN DẸP SẠCH TRƯỚC KHI NẠP DEMO)
-- ==============================================================================
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE YeuCauLichDay; TRUNCATE TABLE BuoiHoc; TRUNCATE TABLE GiangVienLopHoc;
TRUNCATE TABLE HocSinhLopHoc; TRUNCATE TABLE PhuHuynhHocSinh; TRUNCATE TABLE NguoiDungVaiTro;
TRUNCATE TABLE GiangVien; TRUNCATE TABLE HocSinh; TRUNCATE TABLE PhuHuynh;
TRUNCATE TABLE NguoiDung; TRUNCATE TABLE LopHoc; TRUNCATE TABLE KhoaHoc;
TRUNCATE TABLE PhongHoc; TRUNCATE TABLE TietHoc;
SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- 2. THIẾT LẬP KHUNG GIỜ HỌC (14 TIẾT)
-- ==============================================================================
INSERT INTO TietHoc (MaTiet, TenTiet, GioBatDau, GioKetThuc) VALUES
(1, 'Tiết 1', '07:00:00', '07:50:00'), (2, 'Tiết 2', '07:55:00', '08:45:00'),
(3, 'Tiết 3', '08:50:00', '09:40:00'), (4, 'Tiết 4', '09:50:00', '10:40:00'),
(5, 'Tiết 5', '10:45:00', '11:35:00'), (6, 'Tiết 6', '12:30:00', '13:20:00'),
(7, 'Tiết 7', '13:25:00', '14:15:00'), (8, 'Tiết 8', '14:20:00', '15:10:00'),
(9, 'Tiết 9', '15:20:00', '16:10:00'), (10, 'Tiết 10', '16:15:00', '17:05:00'),
(11, 'Tiết 11', '17:30:00', '18:20:00'), (12, 'Tiết 12', '18:25:00', '19:15:00'),
(13, 'Tiết 13', '19:20:00', '20:10:00'), (14, 'Tiết 14', '20:15:00', '21:05:00');

-- ==============================================================================
-- 3. TẠO CÁC KHÓA HỌC (CHUYÊN VỀ TIẾNG ANH)
-- ==============================================================================
SET @kh_pt = UUID(), @kh_ielts = UUID();
INSERT INTO KhoaHoc (MaKhoaHoc, TenKhoaHoc, MoTa, GiaCoBan, DaXoa) VALUES
(@kh_pt, 'Tiếng Anh Phổ Thông', 'Chương trình Tiếng Anh bám sát SGK từ lớp 1-12', 5000000, 0),
(@kh_ielts, 'Lộ trình IELTS chuyên sâu', 'Target 6.5 - 7.5+', 15000000, 0);

-- ==============================================================================
-- 4. TẠO CÁC LỚP HỌC (LỚP 1 -> 12 VÀ CÁC LỚP IELTS)
-- ==============================================================================
SET @c_l1=UUID(), @c_l2=UUID(), @c_l3=UUID(), @c_l4=UUID(), @c_l5=UUID(), @c_l6=UUID();
SET @c_l7=UUID(), @c_l8=UUID(), @c_l9=UUID(), @c_l10=UUID(), @c_l11=UUID(), @c_l12=UUID();
SET @c_i1=UUID(), @c_i2=UUID(), @c_i3=UUID();

INSERT INTO LopHoc (MaLopHoc, TenLop, SiSoToiDa, DaXoa) VALUES
(@c_l1, 'Tiếng Anh Lớp 1', 30, 0), (@c_l2, 'Tiếng Anh Lớp 2', 30, 0), (@c_l3, 'Tiếng Anh Lớp 3', 30, 0),
(@c_l4, 'Tiếng Anh Lớp 4', 30, 0), (@c_l5, 'Tiếng Anh Lớp 5', 30, 0), (@c_l6, 'Tiếng Anh Lớp 6', 35, 0),
(@c_l7, 'Tiếng Anh Lớp 7', 35, 0), (@c_l8, 'Tiếng Anh Lớp 8', 35, 0), (@c_l9, 'Tiếng Anh Lớp 9', 35, 0),
(@c_l10, 'Tiếng Anh Lớp 10', 40, 0), (@c_l11, 'Tiếng Anh Lớp 11', 40, 0), (@c_l12, 'Tiếng Anh Lớp 12', 40, 0),
(@c_i1, 'IELTS 5.0', 15, 0), (@c_i2, 'IELTS 6.0', 15, 0), (@c_i3, 'IELTS 7.0', 10, 0);

-- ==============================================================================
-- 5. KHỞI TẠO BIẾN CHO 40 USERS (10 GV, 10 PH, 20 HS)
-- ==============================================================================
SET @u_gv1=UUID(), @u_gv2=UUID(), @u_gv3=UUID(), @u_gv4=UUID(), @u_gv5=UUID(), @u_gv6=UUID(), @u_gv7=UUID(), @u_gv8=UUID(), @u_gv9=UUID(), @u_gv10=UUID();
SET @gv1=UUID(), @gv2=UUID(), @gv3=UUID(), @gv4=UUID(), @gv5=UUID(), @gv6=UUID(), @gv7=UUID(), @gv8=UUID(), @gv9=UUID(), @gv10=UUID();

SET @u_ph1=UUID(), @u_ph2=UUID(), @u_ph3=UUID(), @u_ph4=UUID(), @u_ph5=UUID(), @u_ph6=UUID(), @u_ph7=UUID(), @u_ph8=UUID(), @u_ph9=UUID(), @u_ph10=UUID();
SET @ph1=UUID(), @ph2=UUID(), @ph3=UUID(), @ph4=UUID(), @ph5=UUID(), @ph6=UUID(), @ph7=UUID(), @ph8=UUID(), @ph9=UUID(), @ph10=UUID();

SET @u_hs1=UUID(), @u_hs2=UUID(), @u_hs3=UUID(), @u_hs4=UUID(), @u_hs5=UUID(), @u_hs6=UUID(), @u_hs7=UUID(), @u_hs8=UUID(), @u_hs9=UUID(), @u_hs10=UUID();
SET @u_hs11=UUID(), @u_hs12=UUID(), @u_hs13=UUID(), @u_hs14=UUID(), @u_hs15=UUID(), @u_hs16=UUID(), @u_hs17=UUID(), @u_hs18=UUID(), @u_hs19=UUID(), @u_hs20=UUID();
SET @hs1=UUID(), @hs2=UUID(), @hs3=UUID(), @hs4=UUID(), @hs5=UUID(), @hs6=UUID(), @hs7=UUID(), @hs8=UUID(), @hs9=UUID(), @hs10=UUID();
SET @hs11=UUID(), @hs12=UUID(), @hs13=UUID(), @hs14=UUID(), @hs15=UUID(), @hs16=UUID(), @hs17=UUID(), @hs18=UUID(), @hs19=UUID(), @hs20=UUID();

-- ==============================================================================
-- 6. INSERT BẢNG NGUOIDUNG & VAI TRÒ
-- ==============================================================================
-- 6.1 Insert 10 Giảng Viên (Tên thực tế)
INSERT INTO NguoiDung (MaNguoiDung, LoaiTaiKhoan, TenDangNhap, MatKhauHash, HoTen, Email, DaXoa) VALUES
(@u_gv1, 2, 'gv_minhthu', 'hash', 'Trần Thị Minh Thu', 'minhthu@epu.edu.vn', 0),
(@u_gv2, 2, 'gv_hoanghai', 'hash', 'Lê Hoàng Hải', 'hoanghai@epu.edu.vn', 0),
(@u_gv3, 2, 'gv_tuananh', 'hash', 'Phạm Tuấn Anh', 'tuananh@epu.edu.vn', 0),
(@u_gv4, 2, 'gv_bichngoc', 'hash', 'Vũ Bích Ngọc', 'bichngoc@epu.edu.vn', 0),
(@u_gv5, 2, 'gv_xuantruong', 'hash', 'Đặng Xuân Trường', 'xuantruong@epu.edu.vn', 0),
(@u_gv6, 2, 'gv_thuha', 'hash', 'Bùi Thu Hà', 'thuha@epu.edu.vn', 0),
(@u_gv7, 2, 'gv_quanghieu', 'hash', 'Hồ Quang Hiếu', 'quanghieu@epu.edu.vn', 0),
(@u_gv8, 2, 'gv_phuongthao', 'hash', 'Ngô Phương Thảo', 'phuongthao@epu.edu.vn', 0),
(@u_gv9, 2, 'gv_vanquyet', 'hash', 'Trịnh Văn Quyết', 'vanquyet@epu.edu.vn', 0),
(@u_gv10, 2, 'gv_lananh', 'hash', 'Nguyễn Lan Anh', 'lananh@epu.edu.vn', 0);

-- 6.2 Insert 10 Phụ Huynh (Tên thực tế)
INSERT INTO NguoiDung (MaNguoiDung, LoaiTaiKhoan, TenDangNhap, MatKhauHash, HoTen, Email, DaXoa) VALUES
(@u_ph1, 4, 'ph_daiquang', 'hash', 'Trần Đại Quang', 'daiquang.tran@gmail.com', 0),
(@u_ph2, 4, 'ph_thimai', 'hash', 'Nguyễn Thị Mai', 'thimai.nguyen@gmail.com', 0),
(@u_ph3, 4, 'ph_vanluan', 'hash', 'Lê Văn Luân', 'vanluan.le@gmail.com', 0),
(@u_ph4, 4, 'ph_thuthuy', 'hash', 'Phạm Thu Thủy', 'thuthuy.pham@gmail.com', 0),
(@u_ph5, 4, 'ph_anhtuan', 'hash', 'Hoàng Anh Tuấn', 'anhtuan.hoang@gmail.com', 0),
(@u_ph6, 4, 'ph_thihong', 'hash', 'Vũ Thị Hồng', 'thihong.vu@gmail.com', 0),
(@u_ph7, 4, 'ph_tridung', 'hash', 'Đặng Trí Dũng', 'tridung.dang@gmail.com', 0),
(@u_ph8, 4, 'ph_vanhung', 'hash', 'Bùi Văn Hùng', 'vanhung.bui@gmail.com', 0),
(@u_ph9, 4, 'ph_thituyet', 'hash', 'Phan Thị Tuyết', 'thituyet.phan@gmail.com', 0),
(@u_ph10, 4, 'ph_minhkhang', 'hash', 'Đỗ Minh Khang', 'minhkhang.do@gmail.com', 0);

-- 6.3 Insert 20 Học Sinh (Tên thực tế, cùng họ với phụ huynh)
INSERT INTO NguoiDung (MaNguoiDung, LoaiTaiKhoan, TenDangNhap, MatKhauHash, HoTen, Email, DaXoa) VALUES
(@u_hs1, 3, 'hs_tranlam', 'hash', 'Trần Lâm', 'tranlam@gmail.com', 0),
(@u_hs2, 3, 'hs_tranlena', 'hash', 'Trần Lê Na', 'tranlena@gmail.com', 0),
(@u_hs3, 3, 'hs_nguyenbach', 'hash', 'Nguyễn Hoàng Bách', 'hoangbach@gmail.com', 0),
(@u_hs4, 3, 'hs_nguyenyen', 'hash', 'Nguyễn Thị Yến', 'thiyen@gmail.com', 0),
(@u_hs5, 3, 'hs_lebaotram', 'hash', 'Lê Bảo Trâm', 'baotram@gmail.com', 0),
(@u_hs6, 3, 'hs_leminhtriet', 'hash', 'Lê Minh Triết', 'minhtriet@gmail.com', 0),
(@u_hs7, 3, 'hs_phamgiabao', 'hash', 'Phạm Gia Bảo', 'giabao@gmail.com', 0),
(@u_hs8, 3, 'hs_phamhuonggiang', 'hash', 'Phạm Hương Giang', 'huonggiang@gmail.com', 0),
(@u_hs9, 3, 'hs_hoangminhdat', 'hash', 'Hoàng Minh Đạt', 'minhdat@gmail.com', 0),
(@u_hs10, 3, 'hs_hoangthutrang', 'hash', 'Hoàng Thu Trang', 'thutrang@gmail.com', 0),
(@u_hs11, 3, 'hs_vutuankiet', 'hash', 'Vũ Tuấn Kiệt', 'tuankiet@gmail.com', 0),
(@u_hs12, 3, 'hs_vuphuonganh', 'hash', 'Vũ Phương Anh', 'phuonganh@gmail.com', 0),
(@u_hs13, 3, 'hs_dangquynhchi', 'hash', 'Đặng Quỳnh Chi', 'quynhchi@gmail.com', 0),
(@u_hs14, 3, 'hs_danghaidang', 'hash', 'Đặng Hải Đăng', 'haidang@gmail.com', 0),
(@u_hs15, 3, 'hs_buiducphat', 'hash', 'Bùi Đức Phát', 'ducphat@gmail.com', 0),
(@u_hs16, 3, 'hs_buingocdiep', 'hash', 'Bùi Ngọc Diệp', 'ngocdiep@gmail.com', 0),
(@u_hs17, 3, 'hs_phanbaolong', 'hash', 'Phan Bảo Long', 'baolong@gmail.com', 0),
(@u_hs18, 3, 'hs_phanthaovy', 'hash', 'Phan Thảo Vy', 'thaovy@gmail.com', 0),
(@u_hs19, 3, 'hs_doquangsang', 'hash', 'Đỗ Quang Sang', 'quangsang@gmail.com', 0),
(@u_hs20, 3, 'hs_dogiahan', 'hash', 'Đỗ Gia Hân', 'giahan@gmail.com', 0);

-- 6.4 Insert Quyền (NguoiDungVaiTro)
INSERT INTO NguoiDungVaiTro (MaNguoiDung, MaVaiTro) VALUES 
(@u_gv1, 2), (@u_gv2, 2), (@u_gv3, 2), (@u_gv4, 2), (@u_gv5, 2), (@u_gv6, 2), (@u_gv7, 2), (@u_gv8, 2), (@u_gv9, 2), (@u_gv10, 2),
(@u_ph1, 4), (@u_ph2, 4), (@u_ph3, 4), (@u_ph4, 4), (@u_ph5, 4), (@u_ph6, 4), (@u_ph7, 4), (@u_ph8, 4), (@u_ph9, 4), (@u_ph10, 4),
(@u_hs1, 3), (@u_hs2, 3), (@u_hs3, 3), (@u_hs4, 3), (@u_hs5, 3), (@u_hs6, 3), (@u_hs7, 3), (@u_hs8, 3), (@u_hs9, 3), (@u_hs10, 3),
(@u_hs11, 3), (@u_hs12, 3), (@u_hs13, 3), (@u_hs14, 3), (@u_hs15, 3), (@u_hs16, 3), (@u_hs17, 3), (@u_hs18, 3), (@u_hs19, 3), (@u_hs20, 3);

-- ==============================================================================
-- 7. INSERT PROFILE (GIẢNG VIÊN, HỌC SINH, PHỤ HUYNH)
-- ==============================================================================
-- CHUYÊN MÔN GIẢNG VIÊN ĐƯỢC ĐỔI SANG TIẾNG ANH
INSERT INTO GiangVien (MaGiangVien, MaNguoiDung, TrinhDoChuyenMon, DaXoa) VALUES
(@gv1, @u_gv1, 'Sư phạm Tiếng Anh', 0), (@gv2, @u_gv2, 'Cử nhân Ngôn ngữ Anh', 0), (@gv3, @u_gv3, 'Thạc sĩ TESOL', 0), (@gv4, @u_gv4, 'IELTS 8.0, Nghiệp vụ Sư phạm', 0),
(@gv5, @u_gv5, 'Sư phạm Tiếng Anh Tiểu học', 0), (@gv6, @u_gv6, 'Cử nhân Ngôn ngữ Anh', 0), (@gv7, @u_gv7, 'IELTS 8.0', 0), (@gv8, @u_gv8, 'IELTS 8.5', 0),
(@gv9, @u_gv9, 'Thạc sĩ Ngôn ngữ học', 0), (@gv10, @u_gv10, 'IELTS 8.5, TESOL', 0);

INSERT INTO PhuHuynh (MaPhuHuynh, MaNguoiDung, SoDienThoai, DaXoa) VALUES
(@ph1, @u_ph1, '0901234567', 0), (@ph2, @u_ph2, '0988765432', 0), (@ph3, @u_ph3, '0912345678', 0), (@ph4, @u_ph4, '0933456789', 0),
(@ph5, @u_ph5, '0944567890', 0), (@ph6, @u_ph6, '0977890123', 0), (@ph7, @u_ph7, '0966789012', 0), (@ph8, @u_ph8, '0988901234', 0),
(@ph9, @u_ph9, '0999012345', 0), (@ph10, @u_ph10, '0900123456', 0);

INSERT INTO HocSinh (MaHocSinh, MaNguoiDung, TruongDangTheoHoc, DaXoa) VALUES
(@hs1, @u_hs1, 'TH Kim Đồng', 0), (@hs2, @u_hs2, 'TH Kim Đồng', 0), (@hs3, @u_hs3, 'TH Nguyễn Du', 0), (@hs4, @u_hs4, 'TH Nguyễn Du', 0),
(@hs5, @u_hs5, 'THCS Cầu Giấy', 0), (@hs6, @u_hs6, 'THCS Cầu Giấy', 0), (@hs7, @u_hs7, 'THCS Trưng Vương', 0), (@hs8, @u_hs8, 'THCS Trưng Vương', 0),
(@hs9, @u_hs9, 'THPT Chu Văn An', 0), (@hs10, @u_hs10, 'THPT Chuyên Sư Phạm', 0), (@hs11, @u_hs11, 'THPT Yên Hòa', 0), (@hs12, @u_hs12, 'THPT Kim Liên', 0),
(@hs13, @u_hs13, 'THPT Phan Đình Phùng', 0), (@hs14, @u_hs14, 'THPT Việt Đức', 0), (@hs15, @u_hs15, 'THPT Trần Phú', 0), (@hs16, @u_hs16, 'ĐH Ngoại Thương', 0),
(@hs17, @u_hs17, 'ĐH Kinh tế Quốc dân', 0), (@hs18, @u_hs18, 'ĐH Bách Khoa', 0), (@hs19, @u_hs19, 'ĐH Quốc Gia', 0), (@hs20, @u_hs20, 'ĐH FPT', 0);

-- Map: 1 Phụ huynh quản lý 2 Học sinh (cùng họ)
INSERT INTO PhuHuynhHocSinh (MaPhuHuynh, MaHocSinh, MaQuanHe) VALUES 
(@ph1, @hs1, NULL), (@ph1, @hs2, NULL), (@ph2, @hs3, NULL), (@ph2, @hs4, NULL),
(@ph3, @hs5, NULL), (@ph3, @hs6, NULL), (@ph4, @hs7, NULL), (@ph4, @hs8, NULL),
(@ph5, @hs9, NULL), (@ph5, @hs10, NULL), (@ph6, @hs11, NULL), (@ph6, @hs12, NULL),
(@ph7, @hs13, NULL), (@ph7, @hs14, NULL), (@ph8, @hs15, NULL), (@ph8, @hs16, NULL),
(@ph9, @hs17, NULL), (@ph9, @hs18, NULL), (@ph10, @hs19, NULL), (@ph10, @hs20, NULL);

-- ==============================================================================
-- 8. PHÂN CÔNG GIẢNG DẠY VÀ NHẬP HỌC (LỚP HỌC)
-- ==============================================================================
-- Phân công Giảng viên phụ trách các lớp
INSERT INTO GiangVienLopHoc (MaLopHoc, MaGiangVien, LoaiVaiTro) VALUES 
(@c_l1, @gv5, 1), (@c_l2, @gv5, 1), (@c_l3, @gv5, 1), (@c_l4, @gv5, 1),
(@c_l5, @gv4, 1), (@c_l6, @gv2, 1), (@c_l7, @gv3, 1), (@c_l8, @gv1, 1),
(@c_l9, @gv9, 1), (@c_l10, @gv4, 1), (@c_l11, @gv2, 1), (@c_l12, @gv9, 1),
(@c_i1, @gv6, 1), (@c_i2, @gv7, 1), (@c_i3, @gv10, 1);

-- Thêm Học sinh vào các lớp
INSERT INTO HocSinhLopHoc (MaLopHoc, MaHocSinh, NgayThamGia) VALUES 
(@c_l1, @hs1, CURDATE()), (@c_l1, @hs2, CURDATE()), (@c_l2, @hs3, CURDATE()), (@c_l2, @hs4, CURDATE()),
(@c_l5, @hs5, CURDATE()), (@c_l6, @hs6, CURDATE()), (@c_l7, @hs7, CURDATE()), (@c_l8, @hs8, CURDATE()),
(@c_l10, @hs9, CURDATE()), (@c_l11, @hs10, CURDATE()), (@c_l12, @hs11, CURDATE()), (@c_l12, @hs12, CURDATE()),
(@c_i1, @hs13, CURDATE()), (@c_i1, @hs14, CURDATE()), (@c_i2, @hs15, CURDATE()), (@c_i2, @hs16, CURDATE()),
(@c_i3, @hs17, CURDATE()), (@c_i3, @hs18, CURDATE()), (@c_i3, @hs19, CURDATE()), (@c_i3, @hs20, CURDATE());

-- ==============================================================================
-- 9. TẠO DANH SÁCH PHÒNG HỌC VÀ LỊCH DEMO
-- ==============================================================================
SET @r1=UUID(), @r2=UUID(), @r3=UUID(), @r4=UUID(), @r5=UUID();
SET @r6=UUID(), @r7=UUID(), @r8=UUID(), @r9=UUID(), @r10=UUID();

INSERT INTO PhongHoc (MaPhongHoc, TenPhong, SucChua, DaXoa) VALUES 
(@r1, 'A101', 30, 0), (@r2, 'A102', 30, 0), (@r3, 'A103', 30, 0), (@r4, 'A104', 30, 0), (@r5, 'A105', 40, 0),
(@r6, 'A106', 40, 0), (@r7, 'A107', 40, 0), (@r8, 'A108', 20, 0), (@r9, 'A109', 20, 0), (@r10, 'A110', 50, 0);

SET @monday = CURDATE() - INTERVAL (WEEKDAY(CURDATE())) DAY;
INSERT INTO BuoiHoc (MaBuoiHoc, MaLopHoc, MaPhongHoc, NgayHoc, MaTietBatDau, MaTietKetThuc, TieuDe, DaXoa) VALUES
(UUID(), @c_l1, @r1, DATE_ADD(@monday, INTERVAL 2 DAY), 1, 3, 'Tiếng Anh Lớp 1 - Từ vựng & Phát âm', 0),
(UUID(), @c_i1, @r2, DATE_ADD(@monday, INTERVAL 3 DAY), 11, 13, 'IELTS Speaking - Part 1', 0),
(UUID(), @c_l12, @r5, DATE_ADD(@monday, INTERVAL 4 DAY), 6, 8, 'Ôn thi THPT Quốc gia môn Tiếng Anh', 0);