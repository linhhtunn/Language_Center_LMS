SET NAMES utf8mb4;

-- =======================================================================
-- SEED NGAN HANG DE: DE 16 ENGLISH TEST
--
-- Nguon noi dung: DE_16_ENGLISH_TEST_CO_DAP_AN.docx.
-- File Word chi duoc xem la nguon du lieu de thi; khong chua chi dan thay
-- the request cua nguoi dung.
--
-- Script nay tao mot ngan hang de rieng va 4 bai mau tuong ung 4 dang:
--   1) CQ_DIEN_TU_DANH_SACH
--   2) CQ_NOI_GHEP
--   3) CQ_TRAC_NGHIEM_1
--   4) CQ_SAP_XEP_CAU
--
-- Cac UUID duoc co dinh de chay lai script khong sinh ban ghi trung.
-- =======================================================================

SET @MaKhoaHoc = (SELECT `MaKhoaHoc` FROM `khoahoc` LIMIT 1);

SET @MucDo = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'MUC_DO'
    WHERE c.`MaCode` = 'TRUNG_BINH' LIMIT 1);
SET @KyNang = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'KY_NANG'
    WHERE c.`MaCode` = 'KN_DOC' LIMIT 1);
SET @LoaiBaiTap = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_BAI_TAP'
    WHERE c.`MaCode` = 'HOMEWORK' LIMIT 1);

SET @LoaiDienTuDanhSach = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_DIEN_TU_DANH_SACH' LIMIT 1);
SET @LoaiNoiGhep = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_NOI_GHEP' LIMIT 1);
SET @LoaiTracNghiem = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_TRAC_NGHIEM_1' LIMIT 1);
SET @LoaiSapXepCau = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_SAP_XEP_CAU' LIMIT 1);

SET @MaNganHangDe16 = 'f1dbd844-2a1b-4ef3-90e6-c4fb8a8d9016';

INSERT INTO `nganhangde`
    (`MaNganHang`, `MaKhoaHoc`, `MaCode`, `TenNganHang`, `MucDo`, `KyNang`,
     `Unit`, `MoTa`, `TrangThai`, `ThoiGianTao`, `DaXoa`)
SELECT @MaNganHangDe16, @MaKhoaHoc,
       'NHD-DE16-ENGLISH-TEST',
       'Ngân hàng Đề 16 English Test',
       @MucDo, @KyNang, 'Đề 16',
       'Seed data từ file DE_16_ENGLISH_TEST_CO_DAP_AN.docx',
       'ACTIVE', NOW(), 0
WHERE @MaKhoaHoc IS NOT NULL
ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `TenNganHang` = VALUES(`TenNganHang`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `Unit` = VALUES(`Unit`),
    `MoTa` = VALUES(`MoTa`),
    `TrangThai` = 'ACTIVE',
    `DaXoa` = 0;

SET @MaNganHangDe16 = (SELECT `MaNganHang` FROM `nganhangde`
    WHERE `MaCode` = 'NHD-DE16-ENGLISH-TEST' LIMIT 1);

-- =======================================================================
-- EXERCISE 1: DIEN TU VAO CHO TRONG
-- =======================================================================
SET @BaiDienTu = '16f8a72e-8c0c-4f63-b7d9-c4de16010001';
SET @DoanVanDienTu = 'Part A - The Speech Chain

Experts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ____________________.

They can also gain knowledge about the relationship of acoustic sounds to (2) ____________________.

The various stages of the speech chain happen on different levels that indicate the complicated (3) ____________________ of different processes.

The final (4) ____________________ of the speech chain is to establish a connection between the brain of a speaker and listener.

An additional phase involves the (5) ____________________ of sound between the speaker''s vocal cords and ears.

Feedback then lets the speaker make sure that his or her (6) ____________________ meets the intended quality.

Overall, the speech chain establishes the (7) ____________________ for communication research.

Part B - Bluegill Cuckolds

Bluegill cuckolds cheat their way into fertilising eggs that are not meant for them. They do this by hiding near another male''s (8) ____________________ and darting into it at just the right moment.

Because a cuckold has a much smaller (9) ____________________ than most males, it can easily get out of danger quickly.

Older cuckolds can avoid being noticed because they take on a (10) ____________________ that looks like the one on females.';
SET @WordBankDienTu = JSON_ARRAY(
    'framework', 'coordination', 'sensation', 'transmission', 'aim',
    'expression', 'articulation', 'perception', 'understanding',
    'hole', 'colour', 'nest', 'pattern', 'seed', 'tail', 'body'
);

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiDienTu, @MaKhoaHoc, @MaNganHangDe16,
    'Đề 16 - Exercise 1: Điền từ vào chỗ trống', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Chọn từ phù hợp trong danh sách cho trước để hoàn thành từng chỗ trống.',
    @DoanVanDienTu,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','DE16-EX1-WORDBANK','description','Đề 16 - Exercise 1','status','APPROVED','danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$')),
    1, 1, 0, NOW()
) ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `MaNganHang` = VALUES(`MaNganHang`),
    `TenBaiTap` = VALUES(`TenBaiTap`),
    `LaMauNganHang` = 1,
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`),
    `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`),
    `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`),
    `ChoXemDapAnSauNop` = 1,
    `TrangThai` = 1,
    `DaXoa` = 0;

INSERT INTO `baitapcauhoi`
    (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`)
VALUES
('16f8a72e-8c0c-4f63-b7d9-c4de16010101', @BaiDienTu, NULL, 1, 'Câu 1', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (1)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',1),
             'dapan','understanding','giaithich','Đáp án đúng là understanding: complete understanding nghĩa là sự hiểu biết hoàn chỉnh.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010102', @BaiDienTu, NULL, 2, 'Câu 2', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (2)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',2),
             'dapan','articulation','giaithich','Đáp án đúng là articulation: acoustic sounds có quan hệ với quá trình phát âm.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010103', @BaiDienTu, NULL, 3, 'Câu 3', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (3)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',3),
             'dapan','coordination','giaithich','Đáp án đúng là coordination: complicated coordination of different processes là sự phối hợp phức tạp của nhiều quá trình.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010104', @BaiDienTu, NULL, 4, 'Câu 4', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (4)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',4),
             'dapan','aim','giaithich','Đáp án đúng là aim: final aim nghĩa là mục tiêu cuối cùng.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010105', @BaiDienTu, NULL, 5, 'Câu 5', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (5)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',5),
             'dapan','transmission','giaithich','Đáp án đúng là transmission: transmission of sound là sự truyền âm thanh.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010106', @BaiDienTu, NULL, 6, 'Câu 6', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (6)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',6),
             'dapan','expression','giaithich','Đáp án đúng là expression: expression meets the intended quality nói về cách biểu đạt đạt chất lượng mong muốn.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010107', @BaiDienTu, NULL, 7, 'Câu 7', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (7)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',7),
             'dapan','framework','giaithich','Đáp án đúng là framework: establishes the framework nghĩa là thiết lập khuôn khổ.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','speech_chain')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010108', @BaiDienTu, NULL, 8, 'Câu 8', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (8)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',8),
             'dapan','nest','giaithich','Đáp án đúng là nest: hiding near another male''s nest phù hợp với ngữ cảnh cá làm tổ.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','bluegill')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010109', @BaiDienTu, NULL, 9, 'Câu 9', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (9)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',9),
             'dapan','body','giaithich','Đáp án đúng là body: a much smaller body giúp nó thoát nguy hiểm nhanh hơn.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','bluegill')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16010110', @BaiDienTu, NULL, 10, 'Câu 10', 1,
 JSON_OBJECT('debai', JSON_OBJECT('cauHoiGoc','Chỗ trống (10)','huongDan','Chọn từ phù hợp trong danh sách cho trước.','doanVan',@DoanVanDienTu,'danhSachTu',JSON_EXTRACT(@WordBankDienTu, '$'),'soChoTrong',10),
             'dapan','pattern','giaithich','Đáp án đúng là pattern: take on a pattern that looks like the one on females.','loai','CQ_DIEN_TU_DANH_SACH','la_tu_luan',false,'tags',JSON_ARRAY('de_16','word_bank','bluegill')), NOW())
ON DUPLICATE KEY UPDATE
    `MaBaiTap` = VALUES(`MaBaiTap`),
    `ThuTu` = VALUES(`ThuTu`),
    `SoCau` = VALUES(`SoCau`),
    `DiemCuaCau` = VALUES(`DiemCuaCau`),
    `NoiDung` = VALUES(`NoiDung`);

-- =======================================================================
-- EXERCISE 2: NOI GHEP
-- =======================================================================
SET @BaiNoiGhep = '16f8a72e-8c0c-4f63-b7d9-c4de16020001';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiNoiGhep, @MaKhoaHoc, @MaNganHangDe16,
    'Đề 16 - Exercise 2: Nối ghép các phần tương ứng', 1,
    @LoaiBaiTap, @LoaiNoiGhep, @MucDo, @KyNang,
    'Nối câu 11 đến 13 với phần kết thúc phù hợp từ A đến G. Có bốn phương án không sử dụng.',
    NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','DE16-EX2-MATCHING','description','Đề 16 - Exercise 2','status','APPROVED'),
    1, 1, 0, NOW()
) ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `MaNganHang` = VALUES(`MaNganHang`),
    `TenBaiTap` = VALUES(`TenBaiTap`),
    `LaMauNganHang` = 1,
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`),
    `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`),
    `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`),
    `ChoXemDapAnSauNop` = 1,
    `TrangThai` = 1,
    `DaXoa` = 0;

INSERT INTO `baitapcauhoi`
    (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`)
VALUES
('16f8a72e-8c0c-4f63-b7d9-c4de16020101', @BaiNoiGhep, NULL, 1, 'Câu 11-13', 3,
 JSON_OBJECT(
    'debai', JSON_OBJECT(
        'cauHoiGoc','Nối câu 11 đến 13 với phần kết thúc phù hợp từ A đến G. Có bốn phương án không sử dụng.',
        'danhSachTrai', JSON_ARRAY(
            JSON_OBJECT('id','q11','text','11. The human differs from other primates because it ______.'),
            JSON_OBJECT('id','q12','text','12. The breaking down of speech into stages ______.'),
            JSON_OBJECT('id','q13','text','13. The visual component in the production of meaning ______.')
        ),
        'danhSachPhai', JSON_ARRAY(
            JSON_OBJECT('id','A','text','depends heavily on communicative feedback.'),
            JSON_OBJECT('id','B','text','uses only the sensory nerves when communicating.'),
            JSON_OBJECT('id','C','text','utilizes a unique anatomical set of speech organs.'),
            JSON_OBJECT('id','D','text','shows the interaction of cognitive and physical processes.'),
            JSON_OBJECT('id','E','text','includes body movements and facial expressions.'),
            JSON_OBJECT('id','F','text','has more than just a physical capacity for speech.'),
            JSON_OBJECT('id','G','text','translates verbal signs into visual symbols.')
        )
    ),
    'dapan', JSON_OBJECT('q11','F','q12','D','q13','E'),
    'giaithich','Đáp án theo đề gốc: 11-F, 12-D, 13-E.',
    'loai','CQ_NOI_GHEP',
    'la_tu_luan',false,
    'tags',JSON_ARRAY('de_16','matching','speech')
 ), NOW())
ON DUPLICATE KEY UPDATE
    `MaBaiTap` = VALUES(`MaBaiTap`),
    `ThuTu` = VALUES(`ThuTu`),
    `SoCau` = VALUES(`SoCau`),
    `DiemCuaCau` = VALUES(`DiemCuaCau`),
    `NoiDung` = VALUES(`NoiDung`);

-- =======================================================================
-- EXERCISE 3: TRAC NGHIEM MOT DAP AN
-- =======================================================================
SET @BaiTracNghiem = '16f8a72e-8c0c-4f63-b7d9-c4de16030001';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTracNghiem, @MaKhoaHoc, @MaNganHangDe16,
    'Đề 16 - Exercise 3: Trắc nghiệm một đáp án', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Chọn đáp án đúng nhất A, B, C hoặc D.',
    NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','DE16-EX3-MC','description','Đề 16 - Exercise 3','status','APPROVED'),
    1, 1, 0, NOW()
) ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `MaNganHang` = VALUES(`MaNganHang`),
    `TenBaiTap` = VALUES(`TenBaiTap`),
    `LaMauNganHang` = 1,
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`),
    `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`),
    `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`),
    `ChoXemDapAnSauNop` = 1,
    `TrangThai` = 1,
    `DaXoa` = 0;

INSERT INTO `baitapcauhoi`
    (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`)
VALUES
('16f8a72e-8c0c-4f63-b7d9-c4de16030114', @BaiTracNghiem, NULL, 1, 'Câu 14', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 14. ______ hard we tried to please our mother, she was never satisfied.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','Whatever'),JSON_OBJECT('id','B','text','No matter what'),JSON_OBJECT('id','C','text','Whereas'),JSON_OBJECT('id','D','text','However'))),'dapan','D','giaithich','Đáp án theo đề gốc: D.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030115', @BaiTracNghiem, NULL, 2, 'Câu 15', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 15. When Rita was promoted to sales manager, she was ______.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','over the hill'),JSON_OBJECT('id','B','text','up in the clouds'),JSON_OBJECT('id','C','text','over the moon'),JSON_OBJECT('id','D','text','in the seventh moon'))),'dapan','C','giaithich','Đáp án theo đề gốc: C.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030116', @BaiTracNghiem, NULL, 3, 'Câu 16', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 16. I''m afraid ______ but to ask him to resign.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','it''s no alternative'),JSON_OBJECT('id','B','text','there''s no alternative'),JSON_OBJECT('id','C','text','it''s not an alternative'),JSON_OBJECT('id','D','text','there''s not a remedy'))),'dapan','B','giaithich','Đáp án theo đề gốc: B.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030117', @BaiTracNghiem, NULL, 4, 'Câu 17', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 17. We are unlikely ever to find a cure for the common cold, ______.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','however we try hard'),JSON_OBJECT('id','B','text','we try however hard'),JSON_OBJECT('id','C','text','we try hard however'),JSON_OBJECT('id','D','text','however hard we try'))),'dapan','D','giaithich','Đáp án theo đề gốc: D.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030118', @BaiTracNghiem, NULL, 5, 'Câu 18', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 18. Enough is enough. I''m not going to ______ with her rudeness any longer.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','put along'),JSON_OBJECT('id','B','text','get along'),JSON_OBJECT('id','C','text','put up'),JSON_OBJECT('id','D','text','get up'))),'dapan','C','giaithich','Đáp án theo đề gốc: C.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030119', @BaiTracNghiem, NULL, 6, 'Câu 19', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 19. This meat is a bit burnt. You ______ it for so long.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','didn''t ought to cook'),JSON_OBJECT('id','B','text','mustn''t have cooked'),JSON_OBJECT('id','C','text','oughtn''t to have cooked'),JSON_OBJECT('id','D','text','shouldn''t have cooked'))),'dapan','D','giaithich','Đáp án theo đề gốc: D.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030120', @BaiTracNghiem, NULL, 7, 'Câu 20', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 20. My neighbour informed ______ a large crack running down the outside wall of my house.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','me that there was'),JSON_OBJECT('id','B','text','to me that there was'),JSON_OBJECT('id','C','text','me on there being'),JSON_OBJECT('id','D','text','to me of there being'))),'dapan','A','giaithich','Đáp án theo đề gốc: A.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030121', @BaiTracNghiem, NULL, 8, 'Câu 21', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 21. It isn''t the funniest film I''ve ever seen. I would say it''s ______ amusing at best.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','softly'),JSON_OBJECT('id','B','text','mildly'),JSON_OBJECT('id','C','text','modestly'),JSON_OBJECT('id','D','text','barely'))),'dapan','B','giaithich','Đáp án theo đề gốc: B.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030122', @BaiTracNghiem, NULL, 9, 'Câu 22', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 22. Only after sending the e-mail ______ that I hadn''t added the attachment.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','I noticed'),JSON_OBJECT('id','B','text','I had noticed'),JSON_OBJECT('id','C','text','did I notice'),JSON_OBJECT('id','D','text','had I noticed'))),'dapan','C','giaithich','Đáp án theo đề gốc: C.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030123', @BaiTracNghiem, NULL, 10, 'Câu 23', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 23. Next month I ______ your mother for twenty years.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','will have been knowing'),JSON_OBJECT('id','B','text','am knowing'),JSON_OBJECT('id','C','text','know'),JSON_OBJECT('id','D','text','will have known'))),'dapan','D','giaithich','Đáp án theo đề gốc: D.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030124', @BaiTracNghiem, NULL, 11, 'Câu 24', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 24. David apologised ______ the last three training sessions.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','that he didn''t attend'),JSON_OBJECT('id','B','text','not having attended'),JSON_OBJECT('id','C','text','that he hadn''t attended'),JSON_OBJECT('id','D','text','for not attending'))),'dapan','D','giaithich','Đáp án theo đề gốc: D.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030125', @BaiTracNghiem, NULL, 12, 'Câu 25', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 25. The students didn''t understand the purpose of the experiment and had to ______ them.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','make it explained to'),JSON_OBJECT('id','B','text','have it explained'),JSON_OBJECT('id','C','text','have it explained to'),JSON_OBJECT('id','D','text','make it explained'))),'dapan','C','giaithich','Đáp án theo đề gốc: C.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030126', @BaiTracNghiem, NULL, 13, 'Câu 26', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 26. Don''t ______ before you come to them.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','cross your fingers'),JSON_OBJECT('id','B','text','cross your bridges'),JSON_OBJECT('id','C','text','bear your crosses'),JSON_OBJECT('id','D','text','cross your bears'))),'dapan','B','giaithich','Đáp án theo đề gốc: B. Cụm đầy đủ là don''t cross your bridges before you come to them.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030127', @BaiTracNghiem, NULL, 14, 'Câu 27', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 27. He was a militant socialist ______ his life.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','during'),JSON_OBJECT('id','B','text','throughout'),JSON_OBJECT('id','C','text','for'),JSON_OBJECT('id','D','text','over all'))),'dapan','B','giaithich','Đáp án theo đề gốc: B.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW()),
('16f8a72e-8c0c-4f63-b7d9-c4de16030128', @BaiTracNghiem, NULL, 15, 'Câu 28', 1,
 JSON_OBJECT('debai',JSON_OBJECT('cauHoiGoc','Question 28. There was no heating in the building. ______, the workers had to be sent home.','luaChon',JSON_ARRAY(JSON_OBJECT('id','A','text','By consequence'),JSON_OBJECT('id','B','text','Subsequently'),JSON_OBJECT('id','C','text','Consequently'),JSON_OBJECT('id','D','text','Otherwise'))),'dapan','C','giaithich','Đáp án theo đề gốc: C.','loai','CQ_TRAC_NGHIEM_1','la_tu_luan',false,'tags',JSON_ARRAY('de_16','multiple_choice')), NOW())
ON DUPLICATE KEY UPDATE
    `MaBaiTap` = VALUES(`MaBaiTap`),
    `ThuTu` = VALUES(`ThuTu`),
    `SoCau` = VALUES(`SoCau`),
    `DiemCuaCau` = VALUES(`DiemCuaCau`),
    `NoiDung` = VALUES(`NoiDung`);

-- =======================================================================
-- EXERCISE 4: SAP XEP CAU THANH DOAN VAN
-- =======================================================================
SET @BaiSapXep = '16f8a72e-8c0c-4f63-b7d9-c4de16040001';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiSapXep, @MaKhoaHoc, @MaNganHangDe16,
    'Đề 16 - Exercise 4: Sắp xếp câu thành đoạn văn', 1,
    @LoaiBaiTap, @LoaiSapXepCau, @MucDo, @KyNang,
    'Sắp xếp các câu A đến F theo đúng thứ tự để tạo thành một đoạn văn hoàn chỉnh.',
    NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','DE16-EX4-ARRANGE','description','Đề 16 - Exercise 4','status','APPROVED'),
    1, 1, 0, NOW()
) ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `MaNganHang` = VALUES(`MaNganHang`),
    `TenBaiTap` = VALUES(`TenBaiTap`),
    `LaMauNganHang` = 1,
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`),
    `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`),
    `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`),
    `ChoXemDapAnSauNop` = 1,
    `TrangThai` = 1,
    `DaXoa` = 0;

INSERT INTO `baitapcauhoi`
    (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`)
VALUES
('16f8a72e-8c0c-4f63-b7d9-c4de16040129', @BaiSapXep, NULL, 1, 'Câu 29', 1,
 JSON_OBJECT(
    'debai', JSON_OBJECT(
        'cauHoiGoc','Question 29. Sắp xếp các câu A đến F theo đúng thứ tự để tạo thành một đoạn văn hoàn chỉnh.',
        'danhSach', JSON_ARRAY(
            JSON_OBJECT('id','A','text','At £8 - equivalent today to £500 - the hobbyhorse could be afforded only by true gentlemen, and it soon became a much sought-after status symbol.'),
            JSON_OBJECT('id','B','text','Inventors had first begun to wrestle with the challenge of coming up with a human-powered vehicle in the 17th century.'),
            JSON_OBJECT('id','C','text','But the craze died out after a year following a statement from the London College of Surgeons, which warned about possible internal injuries.'),
            JSON_OBJECT('id','D','text','The beginnings of the modern bicycle emerged in 1818 when Karl von Drais invented what we now know as the hobbyhorse.'),
            JSON_OBJECT('id','E','text','The bicycle was an absolutely extraordinary creation.'),
            JSON_OBJECT('id','F','text','It was bicycle-shaped with wooden wheels but had no pedals, so the rider had to push it forward with his feet.')
        )
    ),
    'dapan', JSON_ARRAY('E','B','D','F','A','C'),
    'giaithich','Thứ tự đúng theo đề gốc: E -> B -> D -> F -> A -> C.',
    'loai','CQ_SAP_XEP_CAU',
    'la_tu_luan',false,
    'tags',JSON_ARRAY('de_16','sentence_arrangement','bicycle')
 ), NOW())
ON DUPLICATE KEY UPDATE
    `MaBaiTap` = VALUES(`MaBaiTap`),
    `ThuTu` = VALUES(`ThuTu`),
    `SoCau` = VALUES(`SoCau`),
    `DiemCuaCau` = VALUES(`DiemCuaCau`),
    `NoiDung` = VALUES(`NoiDung`);
