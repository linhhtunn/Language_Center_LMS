
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baitap` (
  `MaBaiTap` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenBaiTap` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MoTa` json DEFAULT NULL COMMENT 'JSON envelope ADMIN_ASSIGNMENT_V1: code, description, publishMode, openAt, dueAt, shuffle, accessCode...',
  `LoaiBaiTap` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `ThoiGianLamBai` int DEFAULT NULL,
  `DiemToiDa` decimal(5,2) DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `TrinhDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc',
  `KyNang` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc',
  `MucDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc',
  `HuongDanChung` text COLLATE utf8mb4_general_ci,
  `NoiDungNguCanhChung` text COLLATE utf8mb4_general_ci,
  `ChoXemDapAnSauNop` tinyint(1) DEFAULT '0',
  `ChoNopNhieuLan` tinyint(1) DEFAULT '0',
  `SoLanNopToiDa` int DEFAULT NULL,
  `LaMauNganHang` tinyint(1) NOT NULL DEFAULT '0' COMMENT '1 = bai tap goc trong ngan hang de; 0 = bai tap / de thi thuc te',
  `LoaiCauHoi` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (LOAI_CAU_HOI)',
  `MaNganHang` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL COMMENT 'FK -> nganhangde. Chi co nghia khi LaMauNganHang = 1',
  PRIMARY KEY (`MaBaiTap`),
  KEY `LoaiBaiTap` (`LoaiBaiTap`),
  KEY `MaKhoaHoc` (`MaKhoaHoc`),
  KEY `idx_bt_filter` (`TrinhDo`,`KyNang`,`MucDo`),
  KEY `idx_baitap_mau_ngan_hang` (`LaMauNganHang`),
  KEY `idx_baitap_loai_cau_hoi` (`LoaiCauHoi`),
  KEY `idx_baitap_ngan_hang` (`MaNganHang`),
  CONSTRAINT `baitap_ibfk_1` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`),
  CONSTRAINT `baitap_ibfk_2` FOREIGN KEY (`LoaiBaiTap`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `fk_baitap_nganhangde` FOREIGN KEY (`MaNganHang`) REFERENCES `nganhangde` (`MaNganHang`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `baitapcauhoi` (
  `MaBaiTap` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauHoi` char(36) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Tham chieu tuy chon toi cau hoi goc; NULL neu cau chi thuoc rieng bai nay',
  `DiemCuaCau` decimal(5,2) DEFAULT NULL,
  `ThuTu` int DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `MaCauHoiDe` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `SoCau` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Nhan hien thi cua cau. VD: Question 10, Bai 3',
  `NoiDung` json NOT NULL,
  PRIMARY KEY (`MaCauHoiDe`),
  KEY `uq_baitap_thutucau` (`MaBaiTap`,`ThuTu`),
  KEY `idx_btch_baitap` (`MaBaiTap`),
  CONSTRAINT `baitapcauhoi_ibfk_1` FOREIGN KEY (`MaBaiTap`) REFERENCES `baitap` (`MaBaiTap`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `binhluan` (
  `MaBinhLuan` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaSuKien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaBinhLuan`),
  KEY `MaNguoiDung` (`MaNguoiDung`),
  KEY `MaSuKien` (`MaSuKien`),
  CONSTRAINT `binhluan_ibfk_1` FOREIGN KEY (`MaSuKien`) REFERENCES `sukienlophoc` (`MaSuKien`),
  CONSTRAINT `binhluan_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `buoihoc` (
  `MaBuoiHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaPhongHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `NgayHoc` date NOT NULL,
  `MaTietBatDau` int NOT NULL,
  `MaTietKetThuc` int NOT NULL,
  `TieuDe` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaBuoiHoc`),
  KEY `MaLopHoc` (`MaLopHoc`),
  KEY `MaPhongHoc` (`MaPhongHoc`),
  KEY `MaTietBatDau` (`MaTietBatDau`),
  KEY `MaTietKetThuc` (`MaTietKetThuc`),
  CONSTRAINT `buoihoc_ibfk_1` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `buoihoc_ibfk_2` FOREIGN KEY (`MaPhongHoc`) REFERENCES `phonghoc` (`MaPhongHoc`),
  CONSTRAINT `buoihoc_ibfk_3` FOREIGN KEY (`MaTietBatDau`) REFERENCES `tiethoc` (`MaTiet`),
  CONSTRAINT `buoihoc_ibfk_4` FOREIGN KEY (`MaTietKetThuc`) REFERENCES `tiethoc` (`MaTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cauhoiluutu` (
  `MaLuuTu` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauHoiDe` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL COMMENT 'FK -> baitapcauhoi.MaCauHoiDe',
  `DapAnTamThoi` json DEFAULT NULL COMMENT 'Cung format voi DapAnHocVien',
  `DanhDauXemLai` tinyint(1) DEFAULT '0',
  `ThoiGianLuuCuoi` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaLuuTu`),
  UNIQUE KEY `uq_luutu_nopbai_cauhoi` (`MaNopBai`,`MaCauHoiDe`),
  KEY `idx_luutu_nopbai` (`MaNopBai`),
  KEY `fk_luutu_btch` (`MaCauHoiDe`),
  CONSTRAINT `fk_luutu_btch` FOREIGN KEY (`MaCauHoiDe`) REFERENCES `baitapcauhoi` (`MaCauHoiDe`),
  CONSTRAINT `fk_luutu_nopbai` FOREIGN KEY (`MaNopBai`) REFERENCES `nopbai` (`MaNopBai`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Auto-save tung cau trong khi lam bai, truoc khi nop chinh thuc';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cautrucde` (
  `MaCauTruc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenCauTruc` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `TrinhDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRINH_DO)',
  `KyNang` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (KY_NANG)',
  `MucDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (MUC_DO)',
  `MoTa` json DEFAULT NULL COMMENT 'JSON cau hinh cau truc de: courseId, level, difficulty, sections...',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaCauTruc`),
  KEY `idx_cautruc_filter` (`TrinhDo`,`KyNang`,`MucDo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Template cau truc de: trinh do + ky nang + so luong tung dang bai';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbot_ai_usage` (
  `UserId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `DayUtc` datetime(6) NOT NULL,
  `Requests` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`UserId`,`DayUtc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbot_exam_sessions` (
  `UserId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `AssignmentId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `ExpiresAtUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`UserId`,`AssignmentId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbot_messages` (
  `Id` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `ThreadId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `RequestId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `Role` varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
  `Content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `Source` varchar(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `CreatedAtUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  UNIQUE KEY `uq_chatbot_request` (`ThreadId`,`RequestId`,`Role`),
  KEY `ix_chatbot_time` (`ThreadId`,`CreatedAtUtc`),
  CONSTRAINT `chatbot_messages_ibfk_1` FOREIGN KEY (`ThreadId`) REFERENCES `chatbot_threads` (`Id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chatbot_threads` (
  `Id` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `UserId` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `Title` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `CreatedAtUtc` datetime(6) NOT NULL,
  `UpdatedAtUtc` datetime(6) NOT NULL,
  PRIMARY KEY (`Id`),
  KEY `ix_chatbot_owner` (`UserId`,`UpdatedAtUtc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietcautrucde` (
  `MaChiTiet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauTruc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `LoaiCauHoi` int NOT NULL COMMENT 'FK -> chitietdanhmuc (LOAI_CAU_HOI)',
  `MucDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (MUC_DO)',
  `SoLuongCanLay` int NOT NULL DEFAULT '1' COMMENT 'So bai tap A can lay ngau nhien',
  `TenPhan` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Ten hien thi phan',
  `ThuTu` int DEFAULT '0',
  PRIMARY KEY (`MaChiTiet`),
  UNIQUE KEY `uq_cautruc_loaicauhoi` (`MaCauTruc`,`LoaiCauHoi`),
  KEY `idx_ctcautruc_loai` (`LoaiCauHoi`),
  CONSTRAINT `fk_ctcautruc_cautruc` FOREIGN KEY (`MaCauTruc`) REFERENCES `cautrucde` (`MaCauTruc`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tung phan trong cau truc de: dang bai + so luong A can lay';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdanhmuc` (
  `MaChiTiet` int NOT NULL AUTO_INCREMENT,
  `MaNhom` int NOT NULL,
  `MaCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'VD: PH_LAB, TKH_OPEN',
  `TenChiTiet` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `ThuTu` int DEFAULT '0',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaChiTiet`),
  UNIQUE KEY `UQ_chitietdanhmuc_MaNhom_MaCode` (`MaNhom`,`MaCode`),
  KEY `MaNhom` (`MaNhom`),
  CONSTRAINT `chitietdanhmuc_ibfk_1` FOREIGN KEY (`MaNhom`) REFERENCES `nhomdanhmuc` (`MaNhom`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietdesinhngaunhien` (
  `MaChiTiet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaDe` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaBaiTap` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL COMMENT 'Bai tap duoc chon ngau nhien tu ngan hang goc',
  `ThuTuTrongDe` int DEFAULT '0',
  PRIMARY KEY (`MaChiTiet`),
  UNIQUE KEY `uq_desinh_de_baitap` (`MaDe`,`MaBaiTap`),
  KEY `idx_ctdesinh_baitap` (`MaBaiTap`),
  CONSTRAINT `fk_ctdesinh_baitap` FOREIGN KEY (`MaBaiTap`) REFERENCES `baitap` (`MaBaiTap`),
  CONSTRAINT `fk_ctdesinh_de` FOREIGN KEY (`MaDe`) REFERENCES `desinhngaunhien` (`MaDe`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='A bai tap duoc random cho tung de da sinh';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietkhoahoc_lophoc` (
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `GhiChu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaKhoaHoc`,`MaLopHoc`),
  KEY `idx_ChiTietKHLH_LopHoc_Active` (`MaLopHoc`,`DaXoa`,`TrangThai`),
  CONSTRAINT `chitietkhoahoc_lophoc_ibfk_1` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`),
  CONSTRAINT `chitietkhoahoc_lophoc_ibfk_2` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chitietnopbai` (
  `MaChiTiet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauHoi` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL COMMENT 'FK -> baitapcauhoi.MaCauHoiDe',
  `CauTraLoiHocSinh` text COLLATE utf8mb4_general_ci,
  `DiemDatDuoc` decimal(5,2) DEFAULT '0.00',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `DapAnHocVien` json DEFAULT NULL COMMENT 'JSON dap an hoc vien',
  `TrangThaiCau` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRANG_THAI_CAU_LAM)',
  `TrangThaiChamTay` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRANG_THAI_CHAM_BAI)',
  `DanhDauXemLai` tinyint(1) DEFAULT '0' COMMENT '1 = hoc vien danh dau muon xem lai cau nay',
  `NhanXetGiaoVien` text COLLATE utf8mb4_general_ci COMMENT 'Giao vien nhap phan hoi rieng cho tung cau tu luan',
  PRIMARY KEY (`MaChiTiet`),
  KEY `MaNopBai` (`MaNopBai`),
  KEY `idx_ctnb_nopbai_tt` (`MaNopBai`,`TrangThaiCau`),
  KEY `idx_ctnb_nopbai_xemlai` (`MaNopBai`,`DanhDauXemLai`),
  KEY `fk_ctnb_btch` (`MaCauHoi`),
  CONSTRAINT `chitietnopbai_ibfk_1` FOREIGN KEY (`MaNopBai`) REFERENCES `nopbai` (`MaNopBai`),
  CONSTRAINT `fk_ctnb_btch` FOREIGN KEY (`MaCauHoi`) REFERENCES `baitapcauhoi` (`MaCauHoiDe`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chucnang` (
  `MaChucNang` int NOT NULL AUTO_INCREMENT,
  `TenChucNang` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MoTa` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaChucNang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chucnanghethong` (
  `maChucNang` int NOT NULL AUTO_INCREMENT,
  `maChucNangCode` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tenChucNang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `maTrang` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `tenTrang` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `thuTu` int NOT NULL,
  PRIMARY KEY (`maChucNang`),
  UNIQUE KEY `uq_chucnang_code` (`maChucNangCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chuonghoc` (
  `MaChuong` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenChuong` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `ThuTu` int DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  PRIMARY KEY (`MaChuong`),
  KEY `MaKhoaHoc1` (`MaKhoaHoc`),
  KEY `idx_ChuongHoc_MaLopHoc` (`MaLopHoc`),
  CONSTRAINT `chuonghoc_ibfk_1` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dapandiendkhuyet` (
  `MaDapAnDien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauHoi` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `DapAnChuan` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `DapAnThayThe` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `PhanBietHoaThuong` tinyint(1) DEFAULT '0',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaDapAnDien`),
  KEY `idx_DapAnDienKhuyet_CauHoi_Active` (`MaCauHoi`,`DaXoa`,`TrangThai`),
  KEY `MaCauHoi1` (`MaCauHoi`),
  CONSTRAINT `dapandiendkhuyet_ibfk_1` FOREIGN KEY (`MaCauHoi`) REFERENCES `nganhangcauhoi` (`MaCauHoi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `desinhngaunhien` (
  `MaDe` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaCauTruc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenDe` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `LanSinh` int DEFAULT '1' COMMENT 'So thu tu de nay trong lan sinh',
  `TongSoLanSinh` int DEFAULT '1' COMMENT 'Tong so de yeu cau sinh trong lan do',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaDe`),
  KEY `idx_desinh_cautruc` (`MaCauTruc`),
  CONSTRAINT `fk_desinh_cautruc` FOREIGN KEY (`MaCauTruc`) REFERENCES `cautrucde` (`MaCauTruc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Moi ban ghi = 1 de thi cu the da duoc sinh ngau nhien';
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diemdanh` (
  `MaBuoiHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `GhiChu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaBuoiHoc`,`MaHocSinh`),
  KEY `idx_DiemDanh_HocSinh_Active` (`MaHocSinh`,`DaXoa`,`TrangThai`),
  KEY `MaTrangThai` (`MaTrangThai`),
  CONSTRAINT `diemdanh_ibfk_1` FOREIGN KEY (`MaBuoiHoc`) REFERENCES `buoihoc` (`MaBuoiHoc`),
  CONSTRAINT `diemdanh_ibfk_2` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`),
  CONSTRAINT `diemdanh_ibfk_3` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dinhkem` (
  `MaSuKien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaTaiNguyen` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaSuKien`,`MaTaiNguyen`),
  KEY `idx_DinhKem_TaiNguyen_Active` (`MaTaiNguyen`,`DaXoa`,`TrangThai`),
  CONSTRAINT `dinhkem_ibfk_1` FOREIGN KEY (`MaSuKien`) REFERENCES `sukienlophoc` (`MaSuKien`),
  CONSTRAINT `dinhkem_ibfk_2` FOREIGN KEY (`MaTaiNguyen`) REFERENCES `tainguyenluutru` (`MaTaiNguyen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dinhkemnopbai` (
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaTaiNguyen` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaNopBai`,`MaTaiNguyen`),
  KEY `idx_DinhKemNopBai_TaiNguyen_Active` (`MaTaiNguyen`,`DaXoa`,`TrangThai`),
  CONSTRAINT `dinhkemnopbai_ibfk_1` FOREIGN KEY (`MaNopBai`) REFERENCES `nopbai` (`MaNopBai`),
  CONSTRAINT `dinhkemnopbai_ibfk_2` FOREIGN KEY (`MaTaiNguyen`) REFERENCES `tainguyenluutru` (`MaTaiNguyen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dinhkemthongbao` (
  `MaThongBao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaTaiNguyen` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaThongBao`,`MaTaiNguyen`),
  KEY `idx_DinhKemThongBao_TaiNguyen_Active` (`MaTaiNguyen`,`DaXoa`,`TrangThai`),
  CONSTRAINT `dinhkemthongbao_ibfk_1` FOREIGN KEY (`MaThongBao`) REFERENCES `thongbao` (`MaThongBao`),
  CONSTRAINT `dinhkemthongbao_ibfk_2` FOREIGN KEY (`MaTaiNguyen`) REFERENCES `tainguyenluutru` (`MaTaiNguyen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giangvien` (
  `MaGiangVien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `SoDienThoai` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `QueQuan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `TrinhDoChuyenMon` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `HocVi` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `KinhNghiemGiangDay` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaGiangVien`),
  UNIQUE KEY `MaNguoiDung1` (`MaNguoiDung`),
  CONSTRAINT `giangvien_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giangvienkhoahoc` (
  `MaGiangVien` char(36) NOT NULL,
  `MaKhoaHoc` char(36) NOT NULL,
  `NguoiTao` char(36) DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`MaGiangVien`,`MaKhoaHoc`),
  KEY `IX_giangvienkhoahoc_MaKhoaHoc` (`MaKhoaHoc`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `giangvienlophoc` (
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaGiangVien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `LoaiVaiTro` tinyint DEFAULT '1',
  `NgayThamGia` date DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaLopHoc`,`MaGiangVien`),
  KEY `idx_GiangVienLopHoc_GiangVien_Active` (`MaGiangVien`,`DaXoa`,`TrangThai`),
  CONSTRAINT `giangvienlophoc_ibfk_1` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `giangvienlophoc_ibfk_2` FOREIGN KEY (`MaGiangVien`) REFERENCES `giangvien` (`MaGiangVien`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hocsinh` (
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NgaySinh` date DEFAULT NULL,
  `QueQuan` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `SoDienThoaiNguoiThan` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `TruongDangTheoHoc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaHocSinh`),
  UNIQUE KEY `MaNguoiDung2` (`MaNguoiDung`),
  CONSTRAINT `hocsinh_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hocsinhlophoc` (
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NgayThamGia` date DEFAULT NULL,
  `NgayRoiLop` date DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaLopHoc`,`MaHocSinh`),
  KEY `idx_HocSinhLopHoc_HocSinh_Active` (`MaHocSinh`,`DaXoa`,`TrangThai`),
  KEY `MaTrangThai1` (`MaTrangThai`),
  CONSTRAINT `hocsinhlophoc_ibfk_1` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `hocsinhlophoc_ibfk_2` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`),
  CONSTRAINT `hocsinhlophoc_ibfk_3` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hoithoai` (
  `MaHoiThoai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TieuDe` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaHoiThoai`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `khoahoc` (
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenKhoaHoc` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `GiaCoBan` decimal(14,2) DEFAULT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaKhoaHoc`),
  KEY `MaTrangThai2` (`MaTrangThai`),
  CONSTRAINT `khoahoc_ibfk_1` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lophoc` (
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenLop` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NgayBatDau` date DEFAULT NULL,
  `NgayKetThuc` date DEFAULT NULL,
  `SiSoHienTai` int DEFAULT '0',
  `SiSoToiDa` int DEFAULT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaLopHoc`),
  KEY `MaTrangThai3` (`MaTrangThai`),
  CONSTRAINT `lophoc_ibfk_1` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nganhangcauhoi` (
  `MaCauHoi` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `LoaiCauHoi` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `MucDo` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `AmThanhLink` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `HinhAnhLink` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `MaCauHoiCha` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThuTu` int DEFAULT '0',
  `TrinhDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRINH_DO)',
  `KyNang` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (KY_NANG)',
  `NoiDungChiTiet` json DEFAULT NULL COMMENT 'Metadata + Config theo dang bai',
  PRIMARY KEY (`MaCauHoi`),
  KEY `LoaiCauHoi` (`LoaiCauHoi`),
  KEY `MaKhoaHoc2` (`MaKhoaHoc`),
  KEY `MucDo` (`MucDo`),
  KEY `MaCauHoiCha` (`MaCauHoiCha`),
  KEY `idx_nhcq_filter` (`TrinhDo`,`KyNang`),
  CONSTRAINT `nganhangcauhoi_ibfk_1` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`),
  CONSTRAINT `nganhangcauhoi_ibfk_2` FOREIGN KEY (`LoaiCauHoi`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `nganhangcauhoi_ibfk_3` FOREIGN KEY (`MucDo`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `nganhangcauhoi_ibfk_4` FOREIGN KEY (`MaCauHoiCha`) REFERENCES `nganhangcauhoi` (`MaCauHoi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nganhangde` (
  `MaNganHang` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL COMMENT 'Ngan hang co the khong gan khoa hoc nao',
  `MaCode` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Ma ngan hang do nguoi soan tu dat, VD NHD-READ-01',
  `TenNganHang` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `TrinhDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRINH_DO)',
  `MucDo` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (MUC_DO)',
  `KyNang` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (KY_NANG)',
  `Unit` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `MoTa` text COLLATE utf8mb4_unicode_ci,
  `TrangThai` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT | ACTIVE | RETIRED',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT NULL,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `DaXoa` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`MaNganHang`),
  UNIQUE KEY `uq_nganhangde_ma_code` (`MaCode`),
  KEY `idx_nganhangde_khoa_hoc` (`MaKhoaHoc`),
  KEY `idx_nganhangde_trang_thai` (`TrangThai`),
  KEY `fk_nganhangde_trinhdo` (`TrinhDo`),
  KEY `fk_nganhangde_mucdo` (`MucDo`),
  KEY `fk_nganhangde_kynang` (`KyNang`),
  CONSTRAINT `fk_nganhangde_khoahoc` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`) ON DELETE SET NULL,
  CONSTRAINT `fk_nganhangde_kynang` FOREIGN KEY (`KyNang`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `fk_nganhangde_mucdo` FOREIGN KEY (`MucDo`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `fk_nganhangde_trinhdo` FOREIGN KEY (`TrinhDo`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoidung` (
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL COMMENT 'GUID cho tài khoản',
  `LoaiTaiKhoan` tinyint NOT NULL COMMENT '1: Admin, 2: GiangVien, 3: HocSinh, 4: PhuHuynh',
  `TenDangNhap` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MatKhauHash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `HoTen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `Email` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `AnhDaiDien` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `TokenXacMinh` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `DaXacMinhEmail` tinyint(1) DEFAULT '0',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `LanCuoiDangNhap` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`MaNguoiDung`),
  UNIQUE KEY `TenDangNhap` (`TenDangNhap`),
  UNIQUE KEY `Email` (`Email`),
  KEY `MaTrangThai4` (`MaTrangThai`),
  CONSTRAINT `nguoidung_ibfk_1` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoidungvaitro` (
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaVaiTro` int NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaNguoiDung`,`MaVaiTro`),
  KEY `idx_NguoiDungVaiTro_VaiTro_Active` (`MaVaiTro`,`DaXoa`,`TrangThai`),
  CONSTRAINT `nguoidungvaitro_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`),
  CONSTRAINT `nguoidungvaitro_ibfk_2` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoinhansukien` (
  `MaSuKien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaSuKien`,`MaHocSinh`),
  KEY `idx_NguoiNhanSuKien_HocSinh_Active` (`MaHocSinh`,`DaXoa`,`TrangThai`),
  CONSTRAINT `nguoinhansukien_ibfk_1` FOREIGN KEY (`MaSuKien`) REFERENCES `sukienlophoc` (`MaSuKien`),
  CONSTRAINT `nguoinhansukien_ibfk_2` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nguoinhanthongbao` (
  `MaThongBao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `DaDoc` tinyint(1) DEFAULT '0',
  `NgayDoc` datetime DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaThongBao`,`MaNguoiDung`),
  KEY `idx_NguoiNhanThongBao_User_DaDoc` (`MaNguoiDung`,`DaDoc`,`DaXoa`),
  CONSTRAINT `nguoinhanthongbao_ibfk_1` FOREIGN KEY (`MaThongBao`) REFERENCES `thongbao` (`MaThongBao`),
  CONSTRAINT `nguoinhanthongbao_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhanxetbaitapai1` (
  `MaNhanXet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaBaiTapGoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL COMMENT 'Bai tap mau nguon (ngan hang) - NULL neu de sinh truoc khi co nhom_bai_goc, ca Nopbai coi la 1 nhom',
  `TenBaiTapGoc` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `SoCauDung` int DEFAULT NULL,
  `SoCauTong` int DEFAULT NULL,
  `NoiDungNhanXet` text COLLATE utf8mb4_unicode_ci COMMENT '4 doan nhan xet theo rubric cua dung dang bai',
  `ChiTietCauHoi` longtext COLLATE utf8mb4_unicode_ci COMMENT 'Mang JSON chi tiet tung cau do AI1 chua',
  `DiemTuLuanAiCham` decimal(5,2) DEFAULT NULL COMMENT 'Co gia tri neu nhom co cau tu luan duoc AI cham',
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | DONE | FAILED',
  `ThongBaoLoi` text COLLATE utf8mb4_unicode_ci,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT NULL,
  `ThoiGianXong` datetime DEFAULT NULL,
  PRIMARY KEY (`MaNhanXet`),
  KEY `idx_nhanxetbaitapai1_nopbai` (`MaNopBai`),
  CONSTRAINT `fk_nhanxetbaitapai1_nopbai` FOREIGN KEY (`MaNopBai`) REFERENCES `nopbai` (`MaNopBai`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhanxetdekiemtraai2` (
  `MaNhanXet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NoiDungNhanXet` text COLLATE utf8mb4_unicode_ci,
  `XepLoai` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Xuat sac | Gioi | Kha | Trung binh | Yeu',
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | DONE | FAILED',
  `ThongBaoLoi` text COLLATE utf8mb4_unicode_ci,
  `ThoiGianTao` datetime DEFAULT NULL,
  `ThoiGianXong` datetime DEFAULT NULL,
  PRIMARY KEY (`MaNhanXet`),
  UNIQUE KEY `uq_nhanxetdekiemtraai2_nopbai` (`MaNopBai`),
  CONSTRAINT `fk_nhanxetdekiemtraai2_nopbai` FOREIGN KEY (`MaNopBai`) REFERENCES `nopbai` (`MaNopBai`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhanxettienboai3` (
  `MaNhanXet` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaKhoaHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `DanhSachNopBaiSoSanh` json DEFAULT NULL COMMENT 'Cac MaNopBai duoc doi chieu, thuong la lan moi nhat + (cac) lan truoc',
  `NoiDungNhanXet` text COLLATE utf8mb4_unicode_ci,
  `TrangThai` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING | DONE | FAILED',
  `ThongBaoLoi` text COLLATE utf8mb4_unicode_ci,
  `ThoiGianTao` datetime DEFAULT NULL,
  `ThoiGianXong` datetime DEFAULT NULL,
  PRIMARY KEY (`MaNhanXet`),
  KEY `idx_nhanxettienboai3_hocsinh_khoahoc` (`MaHocSinh`,`MaKhoaHoc`),
  KEY `fk_nhanxettienboai3_khoahoc` (`MaKhoaHoc`),
  CONSTRAINT `fk_nhanxettienboai3_hocsinh` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`) ON DELETE CASCADE,
  CONSTRAINT `fk_nhanxettienboai3_khoahoc` FOREIGN KEY (`MaKhoaHoc`) REFERENCES `khoahoc` (`MaKhoaHoc`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nhomdanhmuc` (
  `MaNhom` int NOT NULL AUTO_INCREMENT,
  `MaCode` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'VD: LOAI_PHONG, TRANG_THAI_KHOA_HOC',
  `TenNhom` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `GhiChu` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaNhom`),
  UNIQUE KEY `MaCode` (`MaCode`),
  UNIQUE KEY `UQ_nhomdanhmuc_MaCode` (`MaCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nopbai` (
  `MaNopBai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaSuKien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `ThoiGianBatDau` datetime DEFAULT NULL,
  `ThoiGianNop` datetime DEFAULT NULL,
  `NhanXetGiaoVien` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `DiemSo` decimal(5,2) DEFAULT NULL,
  `LanNop` int DEFAULT '1',
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `ThoiGianThucTe` int DEFAULT NULL COMMENT 'So giay hoc vien thuc te lam bai',
  `TrangThaiChamBai` int DEFAULT NULL COMMENT 'FK -> chitietdanhmuc (TRANG_THAI_CHAM_BAI)',
  PRIMARY KEY (`MaNopBai`),
  KEY `MaHocSinh` (`MaHocSinh`),
  KEY `MaSuKien1` (`MaSuKien`),
  KEY `MaTrangThai5` (`MaTrangThai`),
  KEY `idx_nopbai_trang_thai_cham` (`TrangThaiChamBai`),
  KEY `idx_nopbai_sukien_hocsinh` (`MaSuKien`,`MaHocSinh`),
  CONSTRAINT `nopbai_ibfk_1` FOREIGN KEY (`MaSuKien`) REFERENCES `sukienlophoc` (`MaSuKien`),
  CONSTRAINT `nopbai_ibfk_2` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`),
  CONSTRAINT `nopbai_ibfk_3` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phonghoc` (
  `MaPhongHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenPhong` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `SucChua` int DEFAULT NULL,
  `LoaiPhong` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `Link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaPhongHoc`),
  KEY `LoaiPhong` (`LoaiPhong`),
  CONSTRAINT `phonghoc_ibfk_1` FOREIGN KEY (`LoaiPhong`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phuhuynh` (
  `MaPhuHuynh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `SoDienThoai` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `DiaChiLienHe` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `NgheNghiep` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaPhuHuynh`),
  UNIQUE KEY `MaNguoiDung3` (`MaNguoiDung`),
  CONSTRAINT `phuhuynh_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `phuhuynhhocsinh` (
  `MaPhuHuynh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHocSinh` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaQuanHe` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaPhuHuynh`,`MaHocSinh`),
  KEY `idx_PhuHuynhHocSinh_HocSinh_Active` (`MaHocSinh`,`DaXoa`,`TrangThai`),
  KEY `MaQuanHe` (`MaQuanHe`),
  CONSTRAINT `phuhuynhhocsinh_ibfk_1` FOREIGN KEY (`MaPhuHuynh`) REFERENCES `phuhuynh` (`MaPhuHuynh`),
  CONSTRAINT `phuhuynhhocsinh_ibfk_2` FOREIGN KEY (`MaHocSinh`) REFERENCES `hocsinh` (`MaHocSinh`),
  CONSTRAINT `phuhuynhhocsinh_ibfk_3` FOREIGN KEY (`MaQuanHe`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `quyen` (
  `MaQuyen` int NOT NULL AUTO_INCREMENT,
  `MaChucNang` int NOT NULL,
  `TenQuyen` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `MoTa` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaQuyen`),
  KEY `MaChucNang` (`MaChucNang`),
  CONSTRAINT `quyen_ibfk_1` FOREIGN KEY (`MaChucNang`) REFERENCES `chucnang` (`MaChucNang`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_sessions` (
  `SessionId` varchar(32) NOT NULL,
  `UserId` char(36) NOT NULL,
  `RefreshToken` varchar(512) NOT NULL,
  `ExpiresAtUtc` datetime(6) NOT NULL,
  `CreatedAtUtc` datetime(6) NOT NULL,
  `UpdatedAtUtc` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`SessionId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sukienlophoc` (
  `MaSuKien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `DangSuKien` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `MaBaiTap` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `HanNop` datetime DEFAULT NULL,
  `MaTrangThai` int DEFAULT NULL COMMENT 'Trỏ về ChiTietDanhMuc',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaSuKien`),
  KEY `DangSuKien` (`DangSuKien`),
  KEY `MaBaiTap` (`MaBaiTap`),
  KEY `MaLopHoc1` (`MaLopHoc`),
  KEY `MaNguoiDung4` (`MaNguoiDung`),
  KEY `MaTrangThai6` (`MaTrangThai`),
  CONSTRAINT `sukienlophoc_ibfk_1` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `sukienlophoc_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`),
  CONSTRAINT `sukienlophoc_ibfk_3` FOREIGN KEY (`DangSuKien`) REFERENCES `chitietdanhmuc` (`MaChiTiet`),
  CONSTRAINT `sukienlophoc_ibfk_4` FOREIGN KEY (`MaBaiTap`) REFERENCES `baitap` (`MaBaiTap`),
  CONSTRAINT `sukienlophoc_ibfk_5` FOREIGN KEY (`MaTrangThai`) REFERENCES `chitietdanhmuc` (`MaChiTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tailieu` (
  `MaTaiLieu` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaChuongHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenTaiLieu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `LinkTaiLieu` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `MoTa` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaTaiLieu`),
  KEY `MaChuongHoc` (`MaChuongHoc`),
  CONSTRAINT `tailieu_ibfk_1` FOREIGN KEY (`MaChuongHoc`) REFERENCES `chuonghoc` (`MaChuong`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tainguyenluutru` (
  `MaTaiNguyen` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TenTaiNguyen` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `Link` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaTaiNguyen`),
  KEY `MaNguoiDung5` (`MaNguoiDung`),
  CONSTRAINT `tainguyenluutru_ibfk_1` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thanhvienhoithoai` (
  `MaHoiThoai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDung` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaHoiThoai`,`MaNguoiDung`),
  KEY `idx_ThanhVienHoiThoai_User_Active` (`MaNguoiDung`,`DaXoa`,`TrangThai`),
  CONSTRAINT `thanhvienhoithoai_ibfk_1` FOREIGN KEY (`MaHoiThoai`) REFERENCES `hoithoai` (`MaHoiThoai`),
  CONSTRAINT `thanhvienhoithoai_ibfk_2` FOREIGN KEY (`MaNguoiDung`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `thongbao` (
  `MaThongBao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `TieuDe` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `DoiTuong` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT (_utf8mb4'Tat_Ca'),
  PRIMARY KEY (`MaThongBao`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tiethoc` (
  `MaTiet` int NOT NULL AUTO_INCREMENT,
  `TenTiet` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `GioBatDau` time NOT NULL,
  `GioKetThuc` time NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tinnhan` (
  `MaTinNhan` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaHoiThoai` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaNguoiDungGui` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `NoiDung` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `DaDoc` tinyint(1) DEFAULT '0',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaTinNhan`),
  KEY `MaHoiThoai` (`MaHoiThoai`),
  KEY `MaNguoiDungGui` (`MaNguoiDungGui`),
  CONSTRAINT `tinnhan_ibfk_1` FOREIGN KEY (`MaHoiThoai`) REFERENCES `hoithoai` (`MaHoiThoai`),
  CONSTRAINT `tinnhan_ibfk_2` FOREIGN KEY (`MaNguoiDungGui`) REFERENCES `nguoidung` (`MaNguoiDung`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaitro` (
  `MaVaiTro` int NOT NULL AUTO_INCREMENT,
  `TenVaiTro` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaVaiTro`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaitrochucnang` (
  `maVaiTro` int NOT NULL,
  `maChucNang` int NOT NULL,
  PRIMARY KEY (`maVaiTro`,`maChucNang`),
  KEY `fk_vtc_chucnang` (`maChucNang`),
  CONSTRAINT `fk_vtc_chucnang` FOREIGN KEY (`maChucNang`) REFERENCES `chucnanghethong` (`maChucNang`) ON DELETE CASCADE,
  CONSTRAINT `fk_vtc_vaitro` FOREIGN KEY (`maVaiTro`) REFERENCES `vaitro` (`MaVaiTro`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaitroquyen` (
  `MaVaiTro` int NOT NULL,
  `MaQuyen` int NOT NULL,
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`MaVaiTro`,`MaQuyen`),
  KEY `idx_VaiTroQuyen_Quyen_Active` (`MaQuyen`,`DaXoa`,`TrangThai`),
  CONSTRAINT `vaitroquyen_ibfk_1` FOREIGN KEY (`MaVaiTro`) REFERENCES `vaitro` (`MaVaiTro`),
  CONSTRAINT `vaitroquyen_ibfk_2` FOREIGN KEY (`MaQuyen`) REFERENCES `quyen` (`MaQuyen`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `yeucaulichday` (
  `MaYeuCau` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaGiangVien` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaLopHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
  `MaBuoiHoc` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `NgayHocDeXuat` date NOT NULL,
  `MaTietBatDauDeXuat` int NOT NULL,
  `MaTietKetThucDeXuat` int NOT NULL,
  `LyDo` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `TrangThaiDuyet` tinyint DEFAULT '0',
  `NguoiTao` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianTao` datetime DEFAULT CURRENT_TIMESTAMP,
  `NguoiSua` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  `ThoiGianSua` datetime DEFAULT NULL,
  `TrangThai` tinyint(1) DEFAULT '1',
  `DaXoa` tinyint(1) DEFAULT '0',
  `GhiChuAdmin` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `LoaiYeuCau` tinyint DEFAULT NULL,
  `MaPhongHocDeXuat` char(36) CHARACTER SET ascii COLLATE ascii_general_ci DEFAULT NULL,
  PRIMARY KEY (`MaYeuCau`),
  KEY `MaBuoiHoc` (`MaBuoiHoc`),
  KEY `MaGiangVien` (`MaGiangVien`),
  KEY `MaLopHoc2` (`MaLopHoc`),
  KEY `MaTietBatDauDeXuat` (`MaTietBatDauDeXuat`),
  KEY `MaTietKetThucDeXuat` (`MaTietKetThucDeXuat`),
  KEY `IX_yeucaulichday_MaPhongHocDeXuat` (`MaPhongHocDeXuat`),
  CONSTRAINT `FK_yeucaulichday_phonghoc_MaPhongHocDeXuat` FOREIGN KEY (`MaPhongHocDeXuat`) REFERENCES `phonghoc` (`MaPhongHoc`),
  CONSTRAINT `yeucaulichday_ibfk_1` FOREIGN KEY (`MaGiangVien`) REFERENCES `giangvien` (`MaGiangVien`),
  CONSTRAINT `yeucaulichday_ibfk_2` FOREIGN KEY (`MaLopHoc`) REFERENCES `lophoc` (`MaLopHoc`),
  CONSTRAINT `yeucaulichday_ibfk_3` FOREIGN KEY (`MaBuoiHoc`) REFERENCES `buoihoc` (`MaBuoiHoc`),
  CONSTRAINT `yeucaulichday_ibfk_4` FOREIGN KEY (`MaTietBatDauDeXuat`) REFERENCES `tiethoc` (`MaTiet`),
  CONSTRAINT `yeucaulichday_ibfk_5` FOREIGN KEY (`MaTietKetThucDeXuat`) REFERENCES `tiethoc` (`MaTiet`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

