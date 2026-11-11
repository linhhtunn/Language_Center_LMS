
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

LOCK TABLES `baitap` WRITE;
/*!40000 ALTER TABLE `baitap` DISABLE KEYS */;
/*!40000 ALTER TABLE `baitap` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `baitapcauhoi` WRITE;
/*!40000 ALTER TABLE `baitapcauhoi` DISABLE KEYS */;
/*!40000 ALTER TABLE `baitapcauhoi` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `binhluan` WRITE;
/*!40000 ALTER TABLE `binhluan` DISABLE KEYS */;
/*!40000 ALTER TABLE `binhluan` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `buoihoc` WRITE;
/*!40000 ALTER TABLE `buoihoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `buoihoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `cauhoiluutu` WRITE;
/*!40000 ALTER TABLE `cauhoiluutu` DISABLE KEYS */;
/*!40000 ALTER TABLE `cauhoiluutu` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `cautrucde` WRITE;
/*!40000 ALTER TABLE `cautrucde` DISABLE KEYS */;
/*!40000 ALTER TABLE `cautrucde` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chatbot_ai_usage` WRITE;
/*!40000 ALTER TABLE `chatbot_ai_usage` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatbot_ai_usage` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chatbot_exam_sessions` WRITE;
/*!40000 ALTER TABLE `chatbot_exam_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatbot_exam_sessions` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chatbot_messages` WRITE;
/*!40000 ALTER TABLE `chatbot_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatbot_messages` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chatbot_threads` WRITE;
/*!40000 ALTER TABLE `chatbot_threads` DISABLE KEYS */;
/*!40000 ALTER TABLE `chatbot_threads` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chitietcautrucde` WRITE;
/*!40000 ALTER TABLE `chitietcautrucde` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietcautrucde` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chitietdanhmuc` WRITE;
/*!40000 ALTER TABLE `chitietdanhmuc` DISABLE KEYS */;
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,1,'CQ_TRAC_NGHIEM_1','Trắc nghiệm 1 đáp án',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,1,'CQ_TRAC_NGHIEM_NHIEU','Trắc nghiệm nhiều đáp án',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,1,'CQ_DIEN_KHUYET_TU_NHAP','Điền khuyết - tự nhập',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,1,'CQ_DIEN_TU_DANH_SACH','Điền từ từ danh sách cho sẵn',4,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (5,1,'CQ_WORD_FORM','Cho dạng đúng của từ (Word Form)',5,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (6,1,'CQ_DOAN_VAN_BLANK','Doc doan van - chon dap an cho blank',6,NULL,'2026-11-11 06:51:15',NULL,NULL,0,1);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (7,1,'CQ_DOC_HIEU','Doc hieu (Reading Comprehension)',7,NULL,'2026-11-11 06:51:15',NULL,NULL,0,1);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (8,1,'CQ_MATCHING_HEADINGS','Noi tieu de voi doan van',8,NULL,'2026-11-11 06:51:15',NULL,NULL,0,1);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (9,1,'CQ_MATCHING_PARAGRAPH','Noi doan van bi thieu vao bai doc',9,NULL,'2026-11-11 06:51:15',NULL,NULL,0,1);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (10,1,'CQ_SHORT_ANSWER','Trả lời ngắn theo bài đọc',10,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (11,1,'CQ_INSERT_SENTENCE','Chọn vị trí chèn câu vào đoạn văn',11,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (12,1,'CQ_ERROR_CORRECTION','Tìm và sửa lỗi sai',12,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (13,1,'CQ_TRIOS','Một từ dùng chung cho ba câu (Trios)',13,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (14,1,'CQ_SENTENCE_TRANSFORM','Viết lại câu (Sentence Transformation)',14,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (15,1,'CQ_IDIOM','Giải thích thành ngữ / cụm từ',15,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (16,1,'CQ_TU_LUAN','Tự luận / Viết đoạn văn / Bài luận',16,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (17,1,'CQ_HOAN_THIEN_CAU','Hoàn thiện câu (Listening)',17,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (18,1,'CQ_PHAN_LOAI','Phân loại (Classification)',18,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (19,1,'CQ_NOI_GHEP','Nối ghép các phần tương ứng',19,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (20,2,'CAU_CHUA_LAM','Chưa làm (trắng)',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (21,2,'CAU_DA_LAM','Đã làm (xanh)',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (22,2,'CAU_XEM_LAI','Đánh dấu xem lại (vàng)',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (23,2,'CAU_KHONG_HOP_LE','Chưa hợp lệ (đỏ)',4,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (24,3,'CHAM_CHO_CHAM','Chờ giáo viên chấm',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (25,3,'CHAM_DA_CHAM','Đã chấm',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (26,3,'CHAM_CAN_SUA','Cần làm lại',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (27,4,'LOP_1','Lớp 1',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (28,4,'LOP_2','Lớp 2',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (29,4,'LOP_3','Lớp 3',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (30,4,'LOP_4','Lớp 4',4,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (31,4,'LOP_5','Lớp 5',5,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (32,4,'LOP_6','Lớp 6',6,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (33,4,'LOP_7','Lớp 7',7,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (34,4,'LOP_8','Lớp 8',8,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (35,4,'LOP_9','Lớp 9',9,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (36,4,'LOP_10','Lớp 10',10,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (37,4,'LOP_11','Lớp 11',11,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (38,4,'LOP_12','Lớp 12',12,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (39,4,'IELTS','IELTS',13,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (40,4,'TOEIC','TOEIC',14,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (41,5,'CO_BAN','Cơ bản',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (42,5,'TRUNG_BINH','Trung bình',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (43,5,'NANG_CAO','Nâng cao',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (44,6,'KN_NGHE','Nghe',1,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (45,6,'KN_DOC','Đọc',2,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (46,6,'KN_VIET','Viết',3,NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (47,1,'CQ_SAP_XEP_CAU','Sắp xếp câu thành đoạn văn / hội thoại',20,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (48,7,'HOMEWORK','Bài tập',1,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (49,7,'QUIZ','Kiểm tra nhanh',2,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (50,7,'EXAM','Đề thi',3,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (51,8,'GIAO_BAI','Giao bài tập',1,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (52,8,'TO_CHUC_KIEM_TRA','Tổ chức kiểm tra',2,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (53,8,'TO_CHUC_THI','Tổ chức thi',3,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (54,9,'DRAFT','Nháp',1,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (55,9,'SCHEDULED','Đã lên lịch',2,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (56,9,'ACTIVE','Đang mở',3,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (57,9,'CLOSED','Đã đóng',4,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (58,10,'NOT_STARTED','Chưa bắt đầu',1,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (59,10,'IN_PROGRESS','Đang làm bài',2,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (60,10,'SUBMITTED','Đã nộp bài',3,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (61,10,'GRADED','Đã chấm điểm',4,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `chitietdanhmuc` (`MaChiTiet`, `MaNhom`, `MaCode`, `TenChiTiet`, `ThuTu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (62,10,'LATE','Nộp trễ',5,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
/*!40000 ALTER TABLE `chitietdanhmuc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chitietdesinhngaunhien` WRITE;
/*!40000 ALTER TABLE `chitietdesinhngaunhien` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietdesinhngaunhien` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chitietkhoahoc_lophoc` WRITE;
/*!40000 ALTER TABLE `chitietkhoahoc_lophoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietkhoahoc_lophoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chitietnopbai` WRITE;
/*!40000 ALTER TABLE `chitietnopbai` DISABLE KEYS */;
/*!40000 ALTER TABLE `chitietnopbai` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chucnang` WRITE;
/*!40000 ALTER TABLE `chucnang` DISABLE KEYS */;
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,'QuanLyBaiTap','Quan ly bai tap va ngan hang cau hoi',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,'LamBai','Chuc nang lam bai tap / de thi',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,'SinhDe','Chuc nang tao cau truc va sinh de',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,'QuanLyNguoiDung','Quản lý người dùng',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (5,'QuanLyLopHoc','Quản lý lớp học',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (6,'QuanLyBaoCao','Quản lý báo cáo',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (7,'QuanLyPhanQuyen','Quản lý phân quyền',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (8,'QuanLyThongBao','Quản lý thông báo',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (9,'QuanLyTinNhan','Quản lý tin nhắn',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (10,'QuanLyDiemDanh','Quản lý điểm danh',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (11,'QuanLyLichHoc','Quản lý lịch học / lịch dạy',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (12,'QuanLyKhoaHoc','Quản lý khóa học',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (13,'QuanLyPhuHuynh','Quản lý phụ huynh - học sinh',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
INSERT INTO `chucnang` (`MaChucNang`, `TenChucNang`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (14,'QuanLyNoiDungHoc','Quản lý nội dung học',NULL,'2026-11-11 06:51:17',NULL,NULL,1,0);
/*!40000 ALTER TABLE `chucnang` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chucnanghethong` WRITE;
/*!40000 ALTER TABLE `chucnanghethong` DISABLE KEYS */;
/*!40000 ALTER TABLE `chucnanghethong` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `chuonghoc` WRITE;
/*!40000 ALTER TABLE `chuonghoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `chuonghoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `dapandiendkhuyet` WRITE;
/*!40000 ALTER TABLE `dapandiendkhuyet` DISABLE KEYS */;
/*!40000 ALTER TABLE `dapandiendkhuyet` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `desinhngaunhien` WRITE;
/*!40000 ALTER TABLE `desinhngaunhien` DISABLE KEYS */;
/*!40000 ALTER TABLE `desinhngaunhien` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `diemdanh` WRITE;
/*!40000 ALTER TABLE `diemdanh` DISABLE KEYS */;
/*!40000 ALTER TABLE `diemdanh` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `dinhkem` WRITE;
/*!40000 ALTER TABLE `dinhkem` DISABLE KEYS */;
/*!40000 ALTER TABLE `dinhkem` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `dinhkemnopbai` WRITE;
/*!40000 ALTER TABLE `dinhkemnopbai` DISABLE KEYS */;
/*!40000 ALTER TABLE `dinhkemnopbai` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `dinhkemthongbao` WRITE;
/*!40000 ALTER TABLE `dinhkemthongbao` DISABLE KEYS */;
/*!40000 ALTER TABLE `dinhkemthongbao` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `giangvien` WRITE;
/*!40000 ALTER TABLE `giangvien` DISABLE KEYS */;
INSERT INTO `giangvien` (`MaGiangVien`, `MaNguoiDung`, `SoDienThoai`, `QueQuan`, `TrinhDoChuyenMon`, `HocVi`, `KinhNghiemGiangDay`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('354e345c-fbb6-4deb-a832-a0940fc36cc9','85721d14-6c0c-4593-919e-403b2f89b1fd',NULL,NULL,'',NULL,NULL,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
/*!40000 ALTER TABLE `giangvien` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `giangvienkhoahoc` WRITE;
/*!40000 ALTER TABLE `giangvienkhoahoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `giangvienkhoahoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `giangvienlophoc` WRITE;
/*!40000 ALTER TABLE `giangvienlophoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `giangvienlophoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `hocsinh` WRITE;
/*!40000 ALTER TABLE `hocsinh` DISABLE KEYS */;
INSERT INTO `hocsinh` (`MaHocSinh`, `MaNguoiDung`, `NgaySinh`, `QueQuan`, `SoDienThoaiNguoiThan`, `TruongDangTheoHoc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('fb624d5d-14f4-4aee-b6f6-03dbee23d829','8353cb7a-b6a8-4c37-91c9-f6eee25c7441',NULL,NULL,NULL,'Chưa cập nhật',NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
/*!40000 ALTER TABLE `hocsinh` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `hocsinhlophoc` WRITE;
/*!40000 ALTER TABLE `hocsinhlophoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `hocsinhlophoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `hoithoai` WRITE;
/*!40000 ALTER TABLE `hoithoai` DISABLE KEYS */;
/*!40000 ALTER TABLE `hoithoai` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `khoahoc` WRITE;
/*!40000 ALTER TABLE `khoahoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `khoahoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `lophoc` WRITE;
/*!40000 ALTER TABLE `lophoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `lophoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nganhangcauhoi` WRITE;
/*!40000 ALTER TABLE `nganhangcauhoi` DISABLE KEYS */;
/*!40000 ALTER TABLE `nganhangcauhoi` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nganhangde` WRITE;
/*!40000 ALTER TABLE `nganhangde` DISABLE KEYS */;
/*!40000 ALTER TABLE `nganhangde` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nguoidung` WRITE;
/*!40000 ALTER TABLE `nguoidung` DISABLE KEYS */;
INSERT INTO `nguoidung` (`MaNguoiDung`, `LoaiTaiKhoan`, `TenDangNhap`, `MatKhauHash`, `HoTen`, `Email`, `AnhDaiDien`, `MaTrangThai`, `TokenXacMinh`, `DaXacMinhEmail`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`, `LanCuoiDangNhap`) VALUES ('54cf819b-c886-46e1-a7f4-2a5f60c17293',1,'admin','$2a$12$SSABbFAwsx4s5IuixP4QLusE8iwyB7KFnYOsoF19OWcYP1NvVfhbm','Tai khoan Admin','admin@qltt.local',NULL,NULL,NULL,1,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0,'2026-11-11 06:52:41.302091');
INSERT INTO `nguoidung` (`MaNguoiDung`, `LoaiTaiKhoan`, `TenDangNhap`, `MatKhauHash`, `HoTen`, `Email`, `AnhDaiDien`, `MaTrangThai`, `TokenXacMinh`, `DaXacMinhEmail`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`, `LanCuoiDangNhap`) VALUES ('7ec7c74d-8cfe-4c58-9907-0cd0a785625f',4,'phuhuynh','QlttParent@2026!P6','Tai khoan Phu Huynh','phuhuynh@qltt.local',NULL,NULL,NULL,1,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0,NULL);
INSERT INTO `nguoidung` (`MaNguoiDung`, `LoaiTaiKhoan`, `TenDangNhap`, `MatKhauHash`, `HoTen`, `Email`, `AnhDaiDien`, `MaTrangThai`, `TokenXacMinh`, `DaXacMinhEmail`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`, `LanCuoiDangNhap`) VALUES ('8353cb7a-b6a8-4c37-91c9-f6eee25c7441',3,'hocsinh','QlttStudent@2026!S5','Tai khoan Hoc Sinh','hocsinh@qltt.local',NULL,NULL,NULL,1,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0,NULL);
INSERT INTO `nguoidung` (`MaNguoiDung`, `LoaiTaiKhoan`, `TenDangNhap`, `MatKhauHash`, `HoTen`, `Email`, `AnhDaiDien`, `MaTrangThai`, `TokenXacMinh`, `DaXacMinhEmail`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`, `LanCuoiDangNhap`) VALUES ('85721d14-6c0c-4593-919e-403b2f89b1fd',2,'giaovien','QlttTeacher@2026!G7','Tai khoan Giao Vien','giaovien@qltt.local',NULL,NULL,NULL,1,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0,NULL);
/*!40000 ALTER TABLE `nguoidung` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nguoidungvaitro` WRITE;
/*!40000 ALTER TABLE `nguoidungvaitro` DISABLE KEYS */;
INSERT INTO `nguoidungvaitro` (`MaNguoiDung`, `MaVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('54cf819b-c886-46e1-a7f4-2a5f60c17293',1,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
INSERT INTO `nguoidungvaitro` (`MaNguoiDung`, `MaVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('7ec7c74d-8cfe-4c58-9907-0cd0a785625f',4,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
INSERT INTO `nguoidungvaitro` (`MaNguoiDung`, `MaVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('8353cb7a-b6a8-4c37-91c9-f6eee25c7441',3,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
INSERT INTO `nguoidungvaitro` (`MaNguoiDung`, `MaVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('85721d14-6c0c-4593-919e-403b2f89b1fd',2,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
/*!40000 ALTER TABLE `nguoidungvaitro` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nguoinhansukien` WRITE;
/*!40000 ALTER TABLE `nguoinhansukien` DISABLE KEYS */;
/*!40000 ALTER TABLE `nguoinhansukien` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nguoinhanthongbao` WRITE;
/*!40000 ALTER TABLE `nguoinhanthongbao` DISABLE KEYS */;
/*!40000 ALTER TABLE `nguoinhanthongbao` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nhanxetbaitapai1` WRITE;
/*!40000 ALTER TABLE `nhanxetbaitapai1` DISABLE KEYS */;
/*!40000 ALTER TABLE `nhanxetbaitapai1` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nhanxetdekiemtraai2` WRITE;
/*!40000 ALTER TABLE `nhanxetdekiemtraai2` DISABLE KEYS */;
/*!40000 ALTER TABLE `nhanxetdekiemtraai2` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nhanxettienboai3` WRITE;
/*!40000 ALTER TABLE `nhanxettienboai3` DISABLE KEYS */;
/*!40000 ALTER TABLE `nhanxettienboai3` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nhomdanhmuc` WRITE;
/*!40000 ALTER TABLE `nhomdanhmuc` DISABLE KEYS */;
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,'LOAI_CAU_HOI','Loại câu hỏi','19 dang bai cua he thong',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,'TRANG_THAI_CAU_LAM','Trạng thái câu khi làm bài','Mau sac o cau tren thanh dieu huong',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,'TRANG_THAI_CHAM_BAI','Trạng thái chấm bài','Cau / bai can giao vien cham tay',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,'TRINH_DO','Trình độ học viên','Lop 1-12, IELTS, TOEIC',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (5,'MUC_DO','Mức độ câu hỏi','Co ban, Trung binh, Nang cao',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (6,'KY_NANG','Kỹ năng ngôn ngữ','Nghe, Doc, Viet',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (7,'LOAI_BAI_TAP','Loại bài tập',NULL,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (8,'DANG_SU_KIEN','Dạng sự kiện lớp học',NULL,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (9,'TRANG_THAI_SU_KIEN','Trạng thái sự kiện',NULL,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `nhomdanhmuc` (`MaNhom`, `MaCode`, `TenNhom`, `GhiChu`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (10,'TRANG_THAI_NOP_BAI','Trạng thái nộp bài',NULL,NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
/*!40000 ALTER TABLE `nhomdanhmuc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `nopbai` WRITE;
/*!40000 ALTER TABLE `nopbai` DISABLE KEYS */;
/*!40000 ALTER TABLE `nopbai` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `phonghoc` WRITE;
/*!40000 ALTER TABLE `phonghoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `phonghoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `phuhuynh` WRITE;
/*!40000 ALTER TABLE `phuhuynh` DISABLE KEYS */;
INSERT INTO `phuhuynh` (`MaPhuHuynh`, `MaNguoiDung`, `SoDienThoai`, `DiaChiLienHe`, `NgheNghiep`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES ('5abf41b1-729c-4341-aa77-f9d368d23da4','7ec7c74d-8cfe-4c58-9907-0cd0a785625f','0000000000',NULL,NULL,NULL,'2026-11-11 06:51:19',NULL,NULL,1,0);
/*!40000 ALTER TABLE `phuhuynh` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `phuhuynhhocsinh` WRITE;
/*!40000 ALTER TABLE `phuhuynhhocsinh` DISABLE KEYS */;
/*!40000 ALTER TABLE `phuhuynhhocsinh` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `quyen` WRITE;
/*!40000 ALTER TABLE `quyen` DISABLE KEYS */;
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,1,'BAITAP_CREATE','Tao bai tap / de thi',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,1,'BAITAP_EDIT','Sua bai tap / de thi',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,1,'BAITAP_DELETE','Xoa bai tap / de thi',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,1,'NGANHANGCAUHOI_CREATE','Tao cau hoi vao ngan hang',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (5,1,'NGANHANGCAUHOI_EDIT','Sua cau hoi trong ngan hang',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (6,1,'NGANHANGCAUHOI_DELETE','Xoa cau hoi trong ngan hang',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (7,1,'CHAM_BAI_MANUAL','Cham bai thu cong (tu luan)',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (8,2,'PAGE_STUDENT_EXAM_VIEW','Xem trang lam bai',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (9,2,'STUDENT_SUBMIT_EXAM','Nop bai',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (10,2,'STUDENT_VIEW_RESULT','Xem ket qua bai da nop',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (11,3,'CAUTRUCDE_CREATE','Tao cau truc de',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (12,3,'CAUTRUCDE_EDIT','Sua cau truc de',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (13,3,'SINHDE_EXECUTE','Thuc hien sinh de ngau nhien',NULL,'2026-11-11 06:51:15',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (14,4,'PAGE_ADMIN_USERS_VIEW','Xem trang quản lý người dùng',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (15,4,'USERS_CREATE','Tạo người dùng',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (16,4,'USERS_EDIT','Sửa người dùng',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (17,4,'USERS_DELETE','Xóa người dùng',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (18,5,'PAGE_ADMIN_CLASSES_VIEW','Xem trang quản lý lớp học',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (19,5,'CLASSES_STUDENTS_VIEW','Xem danh sách học sinh trong lớp',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (20,6,'PAGE_ADMIN_REPORTS_VIEW','Xem báo cáo Admin',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (21,6,'PAGE_TEACHER_REPORTS_VIEW','Xem báo cáo giáo viên',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (22,7,'PAGE_ADMIN_PERMISSIONS_VIEW','Xem trang phân quyền',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (23,7,'PERMISSIONS_ROLE_CREATE','Tạo vai trò mới',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (24,7,'PERMISSIONS_ROLE_EDIT','Sửa quyền của vai trò',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (25,7,'PERMISSIONS_ROLE_DELETE','Xóa vai trò',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (26,8,'NOTIFICATIONS_VIEW_ALL','Xem toàn bộ thông báo (Admin)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (27,8,'NOTIFICATIONS_CREATE','Tạo thông báo',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (28,8,'NOTIFICATIONS_EDIT','Sửa thông báo',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (29,8,'NOTIFICATIONS_DELETE','Xóa thông báo',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (30,9,'MESSAGES_ACCESS','Truy cập tính năng nhắn tin',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (31,10,'ATTENDANCE_VIEW','Xem điểm danh (Admin/Giáo viên)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (32,10,'ATTENDANCE_EDIT','Cập nhật điểm danh (Giáo viên)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (33,10,'ATTENDANCE_VIEW_PARENT','Xem điểm danh con (Phụ huynh)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (34,10,'ATTENDANCE_VIEW_STUDENT','Xem điểm danh của mình (Học sinh)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (35,10,'ATTENDANCE_ADMIN_VIEW','Xem điểm danh tổng hợp (Admin)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (36,11,'PAGE_TEACHER_SCHEDULE_VIEW','Xem lịch dạy giáo viên',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (37,11,'PAGE_STUDENT_SCHEDULE_VIEW','Xem lịch học học sinh',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (38,11,'PAGE_PARENT_SCHEDULE_VIEW','Xem lịch học phụ huynh',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (39,11,'SCHEDULE_CHANGE_REQUEST_ADMIN','Duyệt/từ chối yêu cầu đổi lịch (Admin)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (40,12,'COURSES_CREATE','Tạo khóa học',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (41,12,'COURSES_EDIT','Sửa khóa học',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (42,12,'COURSES_DELETE','Xóa khóa học',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (43,13,'PARENT_CHILDREN_EDIT','Gán/xóa học sinh cho phụ huynh',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (44,1,'ASSIGNMENTS_ADMIN_VIEW','Xem bài tập (Admin)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (45,1,'ASSIGNMENTS_STUDENT_ACCESS','Truy cập bài tập (Học sinh)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (46,14,'STUDY_CONTENT_ADMIN','Quản lý nội dung (Admin)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (47,14,'STUDY_CONTENT_TEACHER','Quản lý nội dung (Giáo viên)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `quyen` (`MaQuyen`, `MaChucNang`, `TenQuyen`, `MoTa`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (48,14,'STUDY_CONTENT_STUDENT','Xem nội dung học (Học sinh)',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
/*!40000 ALTER TABLE `quyen` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `sukienlophoc` WRITE;
/*!40000 ALTER TABLE `sukienlophoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `sukienlophoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `tailieu` WRITE;
/*!40000 ALTER TABLE `tailieu` DISABLE KEYS */;
/*!40000 ALTER TABLE `tailieu` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `tainguyenluutru` WRITE;
/*!40000 ALTER TABLE `tainguyenluutru` DISABLE KEYS */;
/*!40000 ALTER TABLE `tainguyenluutru` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `thanhvienhoithoai` WRITE;
/*!40000 ALTER TABLE `thanhvienhoithoai` DISABLE KEYS */;
/*!40000 ALTER TABLE `thanhvienhoithoai` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `thongbao` WRITE;
/*!40000 ALTER TABLE `thongbao` DISABLE KEYS */;
/*!40000 ALTER TABLE `thongbao` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `tiethoc` WRITE;
/*!40000 ALTER TABLE `tiethoc` DISABLE KEYS */;
/*!40000 ALTER TABLE `tiethoc` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `tinnhan` WRITE;
/*!40000 ALTER TABLE `tinnhan` DISABLE KEYS */;
/*!40000 ALTER TABLE `tinnhan` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `vaitro` WRITE;
/*!40000 ALTER TABLE `vaitro` DISABLE KEYS */;
INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,'Admin',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,'Giao_Vien',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,'Hoc_Sinh',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
INSERT INTO `vaitro` (`MaVaiTro`, `TenVaiTro`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,'Phu_Huynh',NULL,'2026-11-11 06:51:18',NULL,NULL,1,0);
/*!40000 ALTER TABLE `vaitro` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `vaitrochucnang` WRITE;
/*!40000 ALTER TABLE `vaitrochucnang` DISABLE KEYS */;
/*!40000 ALTER TABLE `vaitrochucnang` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `vaitroquyen` WRITE;
/*!40000 ALTER TABLE `vaitroquyen` DISABLE KEYS */;
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,1,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,2,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,3,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,4,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,5,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,6,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,7,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,8,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,9,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,10,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,11,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,12,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,13,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,14,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,15,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,16,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,17,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,18,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,19,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,20,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,21,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,22,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,23,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,24,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,25,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,26,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,27,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,28,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,29,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,30,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,31,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,32,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,33,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,34,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,35,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,36,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,37,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,38,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,39,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,40,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,41,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,42,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,43,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,44,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,45,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,46,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,47,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,48,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,19,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,21,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,30,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,31,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,32,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,36,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,47,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,34,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,37,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,45,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,48,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,30,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,33,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
INSERT INTO `vaitroquyen` (`MaVaiTro`, `MaQuyen`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,38,NULL,'2026-11-11 06:51:25',NULL,NULL,1,0);
/*!40000 ALTER TABLE `vaitroquyen` ENABLE KEYS */;
UNLOCK TABLES;

LOCK TABLES `yeucaulichday` WRITE;
/*!40000 ALTER TABLE `yeucaulichday` DISABLE KEYS */;
/*!40000 ALTER TABLE `yeucaulichday` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;


-- 14 tiet hoc chuan (ban .NET chi tao khi goi API lich hoc; tao lop kem lich tren DB moi se loi khoa ngoai neu thieu)
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (1,'Tiet 1','07:00:00','07:50:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (2,'Tiet 2','07:55:00','08:45:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (3,'Tiet 3','08:50:00','09:40:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (4,'Tiet 4','09:50:00','10:40:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (5,'Tiet 5','10:45:00','11:35:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (6,'Tiet 6','12:30:00','13:20:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (7,'Tiet 7','13:25:00','14:15:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (8,'Tiet 8','14:20:00','15:10:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (9,'Tiet 9','15:20:00','16:10:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (10,'Tiet 10','16:15:00','17:05:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (11,'Tiet 11','17:30:00','18:20:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (12,'Tiet 12','18:25:00','19:15:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (13,'Tiet 13','19:20:00','20:10:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
INSERT INTO `tiethoc` (`MaTiet`, `TenTiet`, `GioBatDau`, `GioKetThuc`, `NguoiTao`, `ThoiGianTao`, `NguoiSua`, `ThoiGianSua`, `TrangThai`, `DaXoa`) VALUES (14,'Tiet 14','20:15:00','21:05:00',NULL,'2026-11-11 07:22:11',NULL,NULL,1,0);
