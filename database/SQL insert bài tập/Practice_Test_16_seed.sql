SET NAMES utf8mb4;

-- =======================================================================
-- SEED NGAN HANG DE: PRACTICE TEST 16 (thay Tuan on thi chuyen va luyen thi
-- dai hoc, on thi IELTS)
--
-- Nguon noi dung: file PDF "PRACTICE TEST 16" + file dap an do nguoi dung
-- cung cap. Day la NGAN HANG DE MOI, TACH BIET voi "Dang de 16 English
-- Test" (NHD-DE16-ENGLISH-TEST) da co san trong du an truoc do.
--
-- KHONG bao gom phan LISTENING: cac cau hoi Listening tham chieu file am
-- thanh CH6_*.mp3 ma khong ai (ke ca file dap an duoc cung cap) co duoc,
-- nen khong the xac dinh dap an chuan. Muc III ("Identify the one
-- underlined word or phrase...") cung khong seed vi PDF chi co tieu de,
-- khong co cau hoi kem theo.
--
-- Moi muc lon trong de = 1 dong `baitap` (LaMauNganHang = 1), moi cau/moi
-- cho trong = 1 dong `baitapcauhoi`. UUID cua nganhangde va cua tung baitap
-- duoc co dinh (khong dung UUID() cho hai bang nay) + ON DUPLICATE KEY
-- UPDATE nen script chay lai nhieu lan van an toan. Rieng baitapcauhoi
-- (cau hoi con) khong co UUID co dinh - moi lan chay se DELETE toan bo cau
-- cu cua tung baitap roi INSERT lai tu dau, dung y het co che
-- UpsertBankExerciseAsync ben backend dang lam.
-- =======================================================================

SET @MaKhoaHoc = (SELECT `MaKhoaHoc` FROM `khoahoc` LIMIT 1);

SET @LoaiTracNghiem = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_TRAC_NGHIEM_1' LIMIT 1);
SET @LoaiDienKhuyet = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_DIEN_KHUYET_TU_NHAP' LIMIT 1);
SET @LoaiDienTuDanhSach = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_DIEN_TU_DANH_SACH' LIMIT 1);
SET @LoaiWordForm = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_WORD_FORM' LIMIT 1);
SET @LoaiSentenceTransform = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_SENTENCE_TRANSFORM' LIMIT 1);
SET @LoaiTrios = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_TRIOS' LIMIT 1);
SET @LoaiNoiGhep = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_NOI_GHEP' LIMIT 1);

SET @MucDo = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'MUC_DO'
    WHERE c.`MaCode` = 'TRUNG_BINH' LIMIT 1);
SET @KyNang = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'KY_NANG'
    WHERE c.`MaCode` = 'KN_DOC' LIMIT 1);
SET @LoaiBaiTap = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_BAI_TAP'
    WHERE c.`MaCode` = 'HOMEWORK' LIMIT 1);

-- -----------------------------------------------------------------------
-- Ngan hang de rieng cho Practice Test 16.
-- -----------------------------------------------------------------------
SET @MaNganHangPT16 = '0a160000-0000-4000-8000-000000000000';

INSERT INTO `nganhangde`
    (`MaNganHang`, `MaKhoaHoc`, `MaCode`, `TenNganHang`, `MucDo`, `KyNang`,
     `Unit`, `MoTa`, `TrangThai`, `ThoiGianTao`, `DaXoa`)
SELECT @MaNganHangPT16, @MaKhoaHoc,
       'NHD-PRACTICE-TEST-16',
       'Ngân hàng Practice Test 16',
       @MucDo, @KyNang, 'Practice Test 16',
       'Seed data từ file PRACTICE TEST 16 (thầy Tuấn). Không bao gồm phần Listening (chưa có file audio gốc để xác định đáp án).',
       'ACTIVE', NOW(), 0
WHERE @MaKhoaHoc IS NOT NULL
ON DUPLICATE KEY UPDATE
    `MaKhoaHoc` = VALUES(`MaKhoaHoc`),
    `TenNganHang` = VALUES(`TenNganHang`),
    `MucDo` = VALUES(`MucDo`),
    `KyNang` = VALUES(`KyNang`),
    `Unit` = VALUES(`Unit`),
    `MoTa` = VALUES(`MoTa`),
    `TrangThai` = VALUES(`TrangThai`),
    `DaXoa` = 0;

-- =========================================================================
-- SECTIONS
-- =========================================================================

-- -----------------------------------------------------------------------
-- Section 01 — I. Từ có phần gạch chân phát âm khác
-- -----------------------------------------------------------------------
SET @Bai01 = '0a160001-0000-4000-8000-000000000001';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai01, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - I. Phát âm', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Mark the letter A, B, C, or D to indicate the word whose underlined part is pronounced differently from the other three.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-01','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai01;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai01, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"Find the word that has underlined part pronounced differently.","luaChon":[{"id":"A","text":"mea<u>s</u>ure"},{"id":"B","text":"trea<u>s</u>ure"},{"id":"C","text":"pre<u>ss</u>ure"},{"id":"D","text":"plea<u>s</u>ure"}]},"dapan":"C","giaithich":"pressure phát âm /ʃ/, ba từ còn lại phát âm /ʒ/.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["pronunciation"]}', NOW()),
(UUID(), @Bai01, NULL, 2, 'Câu 2', 1, '{"debai":{"cauHoiGoc":"Find the word that has underlined part pronounced differently.","luaChon":[{"id":"A","text":"rest<u>au</u>rant"},{"id":"B","text":"maus<u>o</u>leum"},{"id":"C","text":"c<u>au</u>se"},{"id":"D","text":"<u>au</u>dience"}]},"dapan":"A","giaithich":"restaurant phát âm /ɒ/, ba từ còn lại phát âm /ɔː/.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["pronunciation"]}', NOW()),
(UUID(), @Bai01, NULL, 3, 'Câu 3', 1, '{"debai":{"cauHoiGoc":"Find the word that has underlined part pronounced differently.","luaChon":[{"id":"A","text":"illu<u>s</u>ion"},{"id":"B","text":"permi<u>ss</u>ion"},{"id":"C","text":"televi<u>s</u>ion"},{"id":"D","text":"ero<u>s</u>ion"}]},"dapan":"B","giaithich":"permission phát âm /ʃ/, ba từ còn lại phát âm /ʒ/.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["pronunciation"]}', NOW()),
(UUID(), @Bai01, NULL, 4, 'Câu 4', 1, '{"debai":{"cauHoiGoc":"Find the word that has underlined part pronounced differently.","luaChon":[{"id":"A","text":"beauti<u>f</u>ul"},{"id":"B","text":"<u>b</u>louse"},{"id":"C","text":"ca<u>b</u>in"},{"id":"D","text":"clim<u>b</u>er"}]},"dapan":"D","giaithich":"climber có \\"b\\" câm, ba từ còn lại phát âm rõ /b/.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["pronunciation"]}', NOW()),
(UUID(), @Bai01, NULL, 5, 'Câu 5', 1, '{"debai":{"cauHoiGoc":"Find the word that has underlined part pronounced differently.","luaChon":[{"id":"A","text":"vis<u>u</u>al"},{"id":"B","text":"act<u>u</u>al"},{"id":"C","text":"cas<u>u</u>al"},{"id":"D","text":"eq<u>u</u>al"}]},"dapan":"D","giaithich":"equal phát âm /iːkwəl/, ba từ còn lại phát âm /ʒuəl/ hoặc tương tự.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["pronunciation"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 02 — II. Từ có trọng âm khác
-- -----------------------------------------------------------------------
SET @Bai02 = '0a160002-0000-4000-8000-000000000002';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai02, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - II. Trọng âm', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Mark the letter A, B, C, or D to indicate the word that differs from the other three in the position of primary stress.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-02','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai02;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai02, NULL, 1, 'Câu 6', 1, '{"debai":{"cauHoiGoc":"Find the word that has stress pattern different.","luaChon":[{"id":"A","text":"multimedia"},{"id":"B","text":"environment"},{"id":"C","text":"documentary"},{"id":"D","text":"education"}]},"dapan":"B","giaithich":"environment trọng âm rơi vào âm tiết 2, ba từ còn lại trọng âm rơi vào âm tiết 3.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["stress"]}', NOW()),
(UUID(), @Bai02, NULL, 2, 'Câu 7', 1, '{"debai":{"cauHoiGoc":"Find the word that has stress pattern different.","luaChon":[{"id":"A","text":"memorable"},{"id":"B","text":"miraculous"},{"id":"C","text":"professional"},{"id":"D","text":"embarrassing"}]},"dapan":"A","giaithich":"memorable trọng âm rơi vào âm tiết 1, ba từ còn lại trọng âm rơi vào âm tiết 2.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["stress"]}', NOW()),
(UUID(), @Bai02, NULL, 3, 'Câu 8', 1, '{"debai":{"cauHoiGoc":"Find the word that has stress pattern different.","luaChon":[{"id":"A","text":"investigate"},{"id":"B","text":"communicate"},{"id":"C","text":"eliminate"},{"id":"D","text":"manufacture"}]},"dapan":"D","giaithich":"manufacture trọng âm rơi vào âm tiết 2, ba từ còn lại (động từ tận cùng -ate) trọng âm rơi vào âm tiết 1.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["stress"]}', NOW()),
(UUID(), @Bai02, NULL, 4, 'Câu 9', 1, '{"debai":{"cauHoiGoc":"Find the word that has stress pattern different.","luaChon":[{"id":"A","text":"emergency"},{"id":"B","text":"photography"},{"id":"C","text":"geography"},{"id":"D","text":"accuracy"}]},"dapan":"D","giaithich":"accuracy trọng âm rơi vào âm tiết 1, ba từ còn lại trọng âm rơi vào âm tiết 2.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["stress"]}', NOW()),
(UUID(), @Bai02, NULL, 5, 'Câu 10', 1, '{"debai":{"cauHoiGoc":"Find the word that has stress pattern different.","luaChon":[{"id":"A","text":"imprison"},{"id":"B","text":"endanger"},{"id":"C","text":"horrify"},{"id":"D","text":"develop"}]},"dapan":"C","giaithich":"horrify trọng âm rơi vào âm tiết 1, ba từ còn lại trọng âm rơi vào âm tiết 2.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["stress"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 03 — IV. Choose the best answer (1-60, khong co cau 25 va 37)
-- -----------------------------------------------------------------------
SET @Bai03 = '0a160003-0000-4000-8000-000000000003';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai03, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - IV. Choose the best answer', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Mark the letter A, B, C, or D to indicate the correct answer to each of the following questions.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-03','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai03;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai03, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"______ hard we tried to please our mother, she was never satisfied.","luaChon":[{"id":"A","text":"Whatever"},{"id":"B","text":"No matter what"},{"id":"C","text":"Whereas"},{"id":"D","text":"However"}]},"dapan":"D","giaithich":"However + tính từ/trạng từ + S + V: dù có ... đến đâu.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 2, 'Câu 2', 1, '{"debai":{"cauHoiGoc":"When Rita was promoted to sales manager, she was ______.","luaChon":[{"id":"A","text":"over the hill"},{"id":"B","text":"up in the clouds"},{"id":"C","text":"over the moon"},{"id":"D","text":"in the seventh moon"}]},"dapan":"C","giaithich":"\\"over the moon\\" = rất vui mừng, hạnh phúc.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["idiom"]}', NOW()),
(UUID(), @Bai03, NULL, 3, 'Câu 3', 1, '{"debai":{"cauHoiGoc":"I’m afraid ______ but to ask him to resign.","luaChon":[{"id":"A","text":"it’s no alternative"},{"id":"B","text":"there’s no alternative"},{"id":"C","text":"it’s not an alternative"},{"id":"D","text":"there’s not a remedy"}]},"dapan":"B","giaithich":"there’s no alternative but to V: không còn lựa chọn nào khác ngoài việc.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 4, 'Câu 4', 1, '{"debai":{"cauHoiGoc":"We are unlikely ever to find a cure for the common cold, ______.","luaChon":[{"id":"A","text":"however we try hard"},{"id":"B","text":"we try however hard"},{"id":"C","text":"we try hard however"},{"id":"D","text":"however hard we try"}]},"dapan":"D","giaithich":"However + adj/adv + S + V là trật tự đúng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 5, 'Câu 5', 1, '{"debai":{"cauHoiGoc":"Enough is enough. I’m not going to ______ with her rudeness any longer.","luaChon":[{"id":"A","text":"put along"},{"id":"B","text":"get along"},{"id":"C","text":"put up"},{"id":"D","text":"get up"}]},"dapan":"C","giaithich":"put up with = chịu đựng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 6, 'Câu 6', 1, '{"debai":{"cauHoiGoc":"This meat is a bit burnt. You ______ it for so long.","luaChon":[{"id":"A","text":"didn’t ought to cook"},{"id":"B","text":"mustn’t have cooked"},{"id":"C","text":"oughtn’t to have cooked"},{"id":"D","text":"shouldn’t to have cooked"}]},"dapan":"D","giaithich":"shouldn’t have + V3: lẽ ra không nên làm gì (nhưng đã làm) - phê phán việc đã xảy ra.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 7, 'Câu 7', 1, '{"debai":{"cauHoiGoc":"My neighbour informed ______ a large crack running down the outside wall of my house. It had apparently appeared during the night.","luaChon":[{"id":"A","text":"me that there was"},{"id":"B","text":"to me that there was"},{"id":"C","text":"me on there being"},{"id":"D","text":"to me of there being"}]},"dapan":"A","giaithich":"inform sb that + mệnh đề: báo cho ai biết rằng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 8, 'Câu 8', 1, '{"debai":{"cauHoiGoc":"It isn’t the funniest film I’ve ever seen. I would say it’s ______ amusing at best.","luaChon":[{"id":"A","text":"softly"},{"id":"B","text":"mildly"},{"id":"C","text":"modestly"},{"id":"D","text":"barely"}]},"dapan":"B","giaithich":"mildly amusing = hơi hài hước một chút, đúng sắc thái \\"at best\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 9, 'Câu 9', 1, '{"debai":{"cauHoiGoc":"Only after sending the e-mail ______ that I hadn’t added the attachment I wanted to accompany it.","luaChon":[{"id":"A","text":"I noticed"},{"id":"B","text":"I had noticed"},{"id":"C","text":"did I notice"},{"id":"D","text":"had I noticed"}]},"dapan":"C","giaithich":"Only after + cụm từ đứng đầu câu -> đảo ngữ: did + S + V.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","inversion"]}', NOW()),
(UUID(), @Bai03, NULL, 10, 'Câu 10', 1, '{"debai":{"cauHoiGoc":"Next month I ______ your mother for twenty years. And we’ve been married for sixteen of those.","luaChon":[{"id":"A","text":"will have been knowing"},{"id":"B","text":"am knowing"},{"id":"C","text":"know"},{"id":"D","text":"will have known"}]},"dapan":"D","giaithich":"Tương lai hoàn thành (will have known) diễn tả hành động kéo dài tới một mốc trong tương lai; know là động từ chỉ trạng thái nên không chia tiếp diễn.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","tense"]}', NOW()),
(UUID(), @Bai03, NULL, 11, 'Câu 11', 1, '{"debai":{"cauHoiGoc":"David apologised ______ the last three training sessions. He said he had been in bed with the flu for two of them and visiting sick relatives for the third.","luaChon":[{"id":"A","text":"that he didn’t attend"},{"id":"B","text":"not having attended"},{"id":"C","text":"that he hadn’t attended"},{"id":"D","text":"for not attending"}]},"dapan":"D","giaithich":"apologise for + V-ing: xin lỗi vì đã làm gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 12, 'Câu 12', 1, '{"debai":{"cauHoiGoc":"The students didn’t understand the purpose of the experiment and had to ______ them.","luaChon":[{"id":"A","text":"make it explained to"},{"id":"B","text":"have it explained"},{"id":"C","text":"have it explained to"},{"id":"D","text":"make it explained"}]},"dapan":"C","giaithich":"have something explained to someone: cấu trúc bị động nhờ vả, cần \\"to them\\" để chỉ đối tượng được giải thích cho.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","causative"]}', NOW()),
(UUID(), @Bai03, NULL, 13, 'Câu 13', 1, '{"debai":{"cauHoiGoc":"Don’t ______ before you come to them.","luaChon":[{"id":"A","text":"cross your fingers"},{"id":"B","text":"cross your bridges"},{"id":"C","text":"bear your crosses"},{"id":"D","text":"cross your bears"}]},"dapan":"B","giaithich":"don’t cross your bridges before you come to them = đừng lo trước những việc chưa xảy ra.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["idiom"]}', NOW()),
(UUID(), @Bai03, NULL, 14, 'Câu 14', 1, '{"debai":{"cauHoiGoc":"He was a militant socialist ______ his life.","luaChon":[{"id":"A","text":"during"},{"id":"B","text":"throughout"},{"id":"C","text":"for"},{"id":"D","text":"over all"}]},"dapan":"B","giaithich":"throughout his life = suốt cả cuộc đời.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 15, 'Câu 15', 1, '{"debai":{"cauHoiGoc":"There was no heating in the building. ______, the workers had to be sent home.","luaChon":[{"id":"A","text":"By consequence"},{"id":"B","text":"Subsequently"},{"id":"C","text":"Consequently"},{"id":"D","text":"Otherwise"}]},"dapan":"C","giaithich":"Consequently = vì vậy, diễn tả kết quả.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 16, 'Câu 16', 1, '{"debai":{"cauHoiGoc":"This is an awful hotel. I wish we ______ to the Hilton instead.","luaChon":[{"id":"A","text":"would go"},{"id":"B","text":"had gone"},{"id":"C","text":"went"},{"id":"D","text":"should go"}]},"dapan":"B","giaithich":"wish + quá khứ hoàn thành: ước điều trái với quá khứ.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 17, 'Câu 17', 1, '{"debai":{"cauHoiGoc":"With ______, it is obvious that our approach to the problem was completely wrong.","luaChon":[{"id":"A","text":"retrospect"},{"id":"B","text":"afterthought"},{"id":"C","text":"review"},{"id":"D","text":"hindsight"}]},"dapan":"D","giaithich":"with hindsight = khi nhìn lại/biết trước sự việc đã xảy ra.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 18, 'Câu 18', 1, '{"debai":{"cauHoiGoc":"The meeting ______ place in the main hall, but it had to be cancelled.","luaChon":[{"id":"A","text":"will have taken"},{"id":"B","text":"would take"},{"id":"C","text":"was to take"},{"id":"D","text":"is due to take"}]},"dapan":"C","giaithich":"be to take place: cấu trúc chỉ kế hoạch đã định trong quá khứ (nhưng không thành).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 19, 'Câu 19', 1, '{"debai":{"cauHoiGoc":"The children were exhausted. The gym teacher had ______ run around and around the field for an hour nonstop.","luaChon":[{"id":"A","text":"made them to"},{"id":"B","text":"made them"},{"id":"C","text":"obliged them"},{"id":"D","text":"them to run"}]},"dapan":"B","giaithich":"make sb + V (nguyên thể không to) ở thể chủ động.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","causative"]}', NOW()),
(UUID(), @Bai03, NULL, 20, 'Câu 20', 1, '{"debai":{"cauHoiGoc":"—Listen, I have an alternative suggestion.—No. My mind is made up, so ______ the matter any further.","luaChon":[{"id":"A","text":"it’s no point to discuss"},{"id":"B","text":"there’s no point in discussing"},{"id":"C","text":"it isn’t any point in discussing"},{"id":"D","text":"there isn’t a point in discussing"}]},"dapan":"B","giaithich":"There’s no point in V-ing: không có ích gì khi làm gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 21, 'Câu 21', 1, '{"debai":{"cauHoiGoc":"The plan to build a new motorway ______ due to lack of money.","luaChon":[{"id":"A","text":"dropped off"},{"id":"B","text":"dropped away"},{"id":"C","text":"fell through"},{"id":"D","text":"fell away"}]},"dapan":"C","giaithich":"fall through = (kế hoạch) thất bại, không thành hiện thực.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 22, 'Câu 22', 1, '{"debai":{"cauHoiGoc":"We had intended to go out last night, but we were so tired we didn’t ______, so we stayed home.","luaChon":[{"id":"A","text":"feel it up"},{"id":"B","text":"feel up to it"},{"id":"C","text":"live up to it"},{"id":"D","text":"live it up"}]},"dapan":"B","giaithich":"feel up to it = cảm thấy đủ sức/muốn làm việc gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 23, 'Câu 23', 1, '{"debai":{"cauHoiGoc":"—What would you say Margaret’s main qualities are?—Well, for one thing, she’s an excellent judge of character. She can ______ people immediately if they try to deceive her.","luaChon":[{"id":"A","text":"see into"},{"id":"B","text":"look through"},{"id":"C","text":"look into"},{"id":"D","text":"see through"}]},"dapan":"D","giaithich":"see through somebody = nhìn thấu bản chất/ý đồ của ai.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 24, 'Câu 24', 1, '{"debai":{"cauHoiGoc":"The police have announced that they are going to ______ illegal gambling.","luaChon":[{"id":"A","text":"crack down on"},{"id":"B","text":"crack up on"},{"id":"C","text":"drop down on"},{"id":"D","text":"step up to"}]},"dapan":"A","giaithich":"crack down on = trấn áp, xử lý mạnh tay.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 25, 'Câu 26', 1, '{"debai":{"cauHoiGoc":"Of Charles Dickens’ many novels, Great Expectations is perhaps __ to many readers.","luaChon":[{"id":"A","text":"the most satisfying one"},{"id":"B","text":"most satisfying one"},{"id":"C","text":"more than satisfying one"},{"id":"D","text":"the more satisfying than"}]},"dapan":"A","giaithich":"So sánh nhất cần \\"the\\" đứng trước: the most satisfying one.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","comparison"]}', NOW()),
(UUID(), @Bai03, NULL, 26, 'Câu 27', 1, '{"debai":{"cauHoiGoc":"Children learn primarily by __ the world around them.","luaChon":[{"id":"A","text":"experiencing directly of"},{"id":"B","text":"experience direct"},{"id":"C","text":"directly physical experience"},{"id":"D","text":"direct physical experience of"}]},"dapan":"D","giaithich":"by + danh từ: by (adj) direct physical experience of + O, đúng cấu trúc cụm danh từ sau giới từ by.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 27, 'Câu 28', 1, '{"debai":{"cauHoiGoc":"The total weight of all the ants in the world is much greater than __.","luaChon":[{"id":"A","text":"to all human beings"},{"id":"B","text":"all human beings is that"},{"id":"C","text":"that of all human beings"},{"id":"D","text":"is of all human beings"}]},"dapan":"C","giaithich":"So sánh \\"the total weight of X\\" với \\"the total weight of Y\\" -> dùng \\"that of\\" để thay thế cụm danh từ trước, tránh lặp.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","comparison"]}', NOW()),
(UUID(), @Bai03, NULL, 28, 'Câu 29', 1, '{"debai":{"cauHoiGoc":"Tuna, __, may weigh up to 1,000 pounds.","luaChon":[{"id":"A","text":"is the sea giant"},{"id":"B","text":"can be giants of the sea"},{"id":"C","text":"one of the sea giants"},{"id":"D","text":"the sea of the giant"}]},"dapan":"C","giaithich":"Cụm đồng vị (appositive) chen giữa chủ ngữ và động từ chính phải là cụm danh từ, không phải mệnh đề: \\"one of the sea giants\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 29, 'Câu 30', 1, '{"debai":{"cauHoiGoc":"Black, red, and even bright pink diamonds __.","luaChon":[{"id":"A","text":"occasionally to find"},{"id":"B","text":"occasionally found"},{"id":"C","text":"have occasionally been found"},{"id":"D","text":"have occasionally found"}]},"dapan":"C","giaithich":"Diamonds (chủ ngữ) bị phát hiện -> thể bị động thì hiện tại hoàn thành: have occasionally been found.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","passive"]}', NOW()),
(UUID(), @Bai03, NULL, 30, 'Câu 31', 1, '{"debai":{"cauHoiGoc":"Under no circumstances __ in areas where poisonous snakes are known to live.","luaChon":[{"id":"A","text":"one should not climb rocks"},{"id":"B","text":"one should be climbing rocks"},{"id":"C","text":"should one climb rocks"},{"id":"D","text":"should be climbing rocks"}]},"dapan":"C","giaithich":"Under no circumstances đứng đầu câu -> đảo ngữ: trợ động từ + S + V.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","inversion"]}', NOW()),
(UUID(), @Bai03, NULL, 31, 'Câu 32', 1, '{"debai":{"cauHoiGoc":"Many historians believe it was never __ to practice genocide against the Native Americans.","luaChon":[{"id":"A","text":"the government’s official policy"},{"id":"B","text":"official the government’s policy"},{"id":"C","text":"the government’s policy official was"},{"id":"D","text":"been the government’s official policy"}]},"dapan":"A","giaithich":"it was never + cụm danh từ (the government’s official policy) to V: đó chưa bao giờ là chính sách chính thức.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 32, 'Câu 33', 1, '{"debai":{"cauHoiGoc":"Not only __, it also performs an essential function in the reproduction of the plant.","luaChon":[{"id":"A","text":"the flower looks beautiful"},{"id":"B","text":"the flower is looking beautiful"},{"id":"C","text":"does the flower look beautiful"},{"id":"D","text":"the beautiful flower"}]},"dapan":"C","giaithich":"Not only đứng đầu câu -> đảo ngữ: does + S + V nguyên thể.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","inversion"]}', NOW()),
(UUID(), @Bai03, NULL, 33, 'Câu 34', 1, '{"debai":{"cauHoiGoc":"Although many people do not consider it harmful, alcohol is the __ in the United States.","luaChon":[{"id":"A","text":"drug commonly abused most"},{"id":"B","text":"most commonly abused drug"},{"id":"C","text":"most abused commonly drug"},{"id":"D","text":"commonly most abused drug"}]},"dapan":"B","giaithich":"Trật tự đúng: the + most + trạng từ (commonly) + quá khứ phân từ (abused) + danh từ (drug).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","word_order"]}', NOW()),
(UUID(), @Bai03, NULL, 34, 'Câu 35', 1, '{"debai":{"cauHoiGoc":"Motorists heading north into Oregon from California should know __ for the first hundred miles.","luaChon":[{"id":"A","text":"is accessing few major roads"},{"id":"B","text":"access towns by the major roads"},{"id":"C","text":"that few major roads access towns"},{"id":"D","text":"few major roads to access towns"}]},"dapan":"C","giaithich":"know + mệnh đề danh từ bắt đầu bằng \\"that\\": that few major roads access towns.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 35, 'Câu 36', 1, '{"debai":{"cauHoiGoc":"It was essential to submit the plan the following day. Therefore, __ he was near exhaustion, he went on working late into the night.","luaChon":[{"id":"A","text":"whereas"},{"id":"B","text":"while"},{"id":"C","text":"however"},{"id":"D","text":"though"}]},"dapan":"D","giaithich":"though + mệnh đề: mặc dù, diễn tả sự nhượng bộ phù hợp ngữ cảnh.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 36, 'Câu 38', 1, '{"debai":{"cauHoiGoc":"The bridge was collapsing and the train was plunging into the ravine. But Superman arrived __, as usual, caught the train in his arms of steel and carried it to safety.","luaChon":[{"id":"A","text":"in the nick of time"},{"id":"B","text":"in the fullness of time"},{"id":"C","text":"on the spur of the moment"},{"id":"D","text":"in the heat of the moment"}]},"dapan":"A","giaithich":"in the nick of time = vừa kịp lúc, đúng lúc nguy cấp.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["idiom"]}', NOW()),
(UUID(), @Bai03, NULL, 37, 'Câu 39', 1, '{"debai":{"cauHoiGoc":"__ Vincent felt angry. The vandals had scratched his new car badly.","luaChon":[{"id":"A","text":"It isn''t to wonder"},{"id":"B","text":"It''s not a wonder"},{"id":"C","text":"It isn''t wonderful"},{"id":"D","text":"It''s no wonder"}]},"dapan":"D","giaithich":"It’s no wonder (that) + mệnh đề = chẳng có gì lạ khi.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 38, 'Câu 40', 1, '{"debai":{"cauHoiGoc":"She listened __ Roger read to her in a low voice.","luaChon":[{"id":"A","text":"meanwhile"},{"id":"B","text":"at the same time"},{"id":"C","text":"while"},{"id":"D","text":"whereas"}]},"dapan":"C","giaithich":"while + mệnh đề (liên từ) diễn tả hai hành động song song, khác với meanwhile/at the same time (trạng từ, không nối trực tiếp mệnh đề).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 39, 'Câu 41', 1, '{"debai":{"cauHoiGoc":"We had arranged to meet at 8 o''clock but he didn''t __ until half an hour later.","luaChon":[{"id":"A","text":"show off"},{"id":"B","text":"stick up"},{"id":"C","text":"turn up"},{"id":"D","text":"put in"}]},"dapan":"C","giaithich":"turn up = xuất hiện, đến nơi.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 40, 'Câu 42', 1, '{"debai":{"cauHoiGoc":"You and your big mouth! It was supposed to be a secret. You __ told her!","luaChon":[{"id":"A","text":"shouldn''t have"},{"id":"B","text":"ought to haven''t"},{"id":"C","text":"musn''t have"},{"id":"D","text":"needn''t to"}]},"dapan":"A","giaithich":"shouldn’t have + V3: lẽ ra không nên làm (nhưng đã làm) - trách móc việc đã xảy ra.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 41, 'Câu 43', 1, '{"debai":{"cauHoiGoc":"She suggested __ to lunch on Sunday.","luaChon":[{"id":"A","text":"us to come"},{"id":"B","text":"us that we come"},{"id":"C","text":"to us that we should come"},{"id":"D","text":"to us our coming"}]},"dapan":"C","giaithich":"suggest to sb that S (should) + V nguyên thể: gợi ý với ai rằng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 42, 'Câu 44', 1, '{"debai":{"cauHoiGoc":"Experts are __ into the cause of the explosion.","luaChon":[{"id":"A","text":"seeking"},{"id":"B","text":"researching"},{"id":"C","text":"inquiring"},{"id":"D","text":"investigating"}]},"dapan":"D","giaithich":"investigate into = điều tra về.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 43, 'Câu 45', 1, '{"debai":{"cauHoiGoc":"__ at the hotel when there was a power cut.","luaChon":[{"id":"A","text":"We had arrived hardly"},{"id":"B","text":"Hardly had we arrived"},{"id":"C","text":"Hardly we had arrived"},{"id":"D","text":"Scarcely we had arrived"}]},"dapan":"B","giaithich":"Hardly ... when: đảo ngữ Hardly + had + S + V3, diễn tả \\"vừa mới ... thì đã\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","inversion"]}', NOW()),
(UUID(), @Bai03, NULL, 44, 'Câu 46', 1, '{"debai":{"cauHoiGoc":"In the next lesson, I __ you how to prepare chicken in a lemon sauce.","luaChon":[{"id":"A","text":"will have shown"},{"id":"B","text":"show"},{"id":"C","text":"will be showing"},{"id":"D","text":"am showing"}]},"dapan":"C","giaithich":"Tương lai tiếp diễn (will be showing) diễn tả hành động sẽ diễn ra theo kế hoạch/lịch trình đã định.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","tense"]}', NOW()),
(UUID(), @Bai03, NULL, 45, 'Câu 47', 1, '{"debai":{"cauHoiGoc":"Kim asked Ben __ to come to dinner.","luaChon":[{"id":"A","text":"if he''d like"},{"id":"B","text":"will he like"},{"id":"C","text":"would he like"},{"id":"D","text":"if he liked"}]},"dapan":"A","giaithich":"Câu tường thuật câu hỏi Yes/No dùng \\"if/whether\\" + mệnh đề, giữ nguyên thì would (lời mời lịch sự).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","reported_speech"]}', NOW()),
(UUID(), @Bai03, NULL, 46, 'Câu 48', 1, '{"debai":{"cauHoiGoc":"The next morning the battery was dead and Marian couldn''t __.","luaChon":[{"id":"A","text":"make the car started"},{"id":"B","text":"have the car started"},{"id":"C","text":"get the car started"},{"id":"D","text":"have the car start"}]},"dapan":"C","giaithich":"get something + V3 (bị động): get the car started = làm cho xe nổ máy được.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","causative"]}', NOW()),
(UUID(), @Bai03, NULL, 47, 'Câu 49', 1, '{"debai":{"cauHoiGoc":"They''ve made us a lot of promises but I don''t trust them. As far as I''m concerned, a bird in the hand is worth __.","luaChon":[{"id":"A","text":"two in the bush"},{"id":"B","text":"two birds flying"},{"id":"C","text":"two in the tree"},{"id":"D","text":"a whole flock flying"}]},"dapan":"A","giaithich":"Thành ngữ: \\"a bird in the hand is worth two in the bush\\" = một cái đang có chắc chắn còn hơn hai cái chưa chắc có được.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["idiom"]}', NOW()),
(UUID(), @Bai03, NULL, 48, 'Câu 50', 1, '{"debai":{"cauHoiGoc":"Because he had to go back to work, Tom could stay with us __ two weeks.","luaChon":[{"id":"A","text":"during only"},{"id":"B","text":"for only"},{"id":"C","text":"only during"},{"id":"D","text":"throughout only"}]},"dapan":"B","giaithich":"for + khoảng thời gian: for only two weeks. \\"during\\" đi với danh từ chỉ sự kiện/giai đoạn, không dùng với khoảng thời gian cụ thể như \\"two weeks\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","preposition"]}', NOW()),
(UUID(), @Bai03, NULL, 49, 'Câu 51', 1, '{"debai":{"cauHoiGoc":"I climbed the slippery stairs with great care. __, I nearly fell twice.","luaChon":[{"id":"A","text":"Even though"},{"id":"B","text":"Even thus"},{"id":"C","text":"Thus"},{"id":"D","text":"Even so"}]},"dapan":"D","giaithich":"Even so = dù vậy, nối hai câu có ý tương phản.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 50, 'Câu 52', 1, '{"debai":{"cauHoiGoc":"—Do you ever wish you __ to university?—Yes, but my parents couldn''t afford it.","luaChon":[{"id":"A","text":"went"},{"id":"B","text":"would go"},{"id":"C","text":"were going"},{"id":"D","text":"had gone"}]},"dapan":"D","giaithich":"wish + quá khứ hoàn thành (had gone): ước một điều trái với quá khứ.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 51, 'Câu 53', 1, '{"debai":{"cauHoiGoc":"It __ to be seen whether I have made the right decision or not.","luaChon":[{"id":"A","text":"continues"},{"id":"B","text":"remains"},{"id":"C","text":"stands"},{"id":"D","text":"keeps"}]},"dapan":"B","giaithich":"It remains to be seen (whether/if) = vẫn còn phải chờ xem.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["vocabulary"]}', NOW()),
(UUID(), @Bai03, NULL, 52, 'Câu 54', 1, '{"debai":{"cauHoiGoc":"Where were you? I thought you __ for me.","luaChon":[{"id":"A","text":"will wait"},{"id":"B","text":"will have waited"},{"id":"C","text":"were going to wait"},{"id":"D","text":"are waiting"}]},"dapan":"C","giaithich":"were going to + V: diễn tả dự định trong quá khứ (tương lai trong quá khứ).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","tense"]}', NOW()),
(UUID(), @Bai03, NULL, 53, 'Câu 55', 1, '{"debai":{"cauHoiGoc":"When I came back from Columbia, the customs officer __ empty my suitcase.","luaChon":[{"id":"A","text":"made me to"},{"id":"B","text":"made that I"},{"id":"C","text":"obliged me"},{"id":"D","text":"made me"}]},"dapan":"D","giaithich":"make sb + V nguyên thể (không to) ở thể chủ động: made me empty.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar","causative"]}', NOW()),
(UUID(), @Bai03, NULL, 54, 'Câu 56', 1, '{"debai":{"cauHoiGoc":"__ to make a decision right away. Take a few days and think the matter over first.","luaChon":[{"id":"A","text":"There isn''t a need"},{"id":"B","text":"It''s not needful"},{"id":"C","text":"It isn''t needed"},{"id":"D","text":"There''s no need"}]},"dapan":"D","giaithich":"There’s no need to V = không cần thiết phải làm gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["grammar"]}', NOW()),
(UUID(), @Bai03, NULL, 55, 'Câu 57', 1, '{"debai":{"cauHoiGoc":"Physically, I __ after my mother, but my sister doesn''t look anything like her.","luaChon":[{"id":"A","text":"run"},{"id":"B","text":"put"},{"id":"C","text":"take"},{"id":"D","text":"look"}]},"dapan":"C","giaithich":"take after sb = giống ai (về ngoại hình/tính cách).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 56, 'Câu 58', 1, '{"debai":{"cauHoiGoc":"The room was so hot and airless that several people __ and had to be revived.","luaChon":[{"id":"A","text":"dropped out"},{"id":"B","text":"passed away"},{"id":"C","text":"dropped away"},{"id":"D","text":"passed out"}]},"dapan":"D","giaithich":"pass out = ngất xỉu.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 57, 'Câu 59', 1, '{"debai":{"cauHoiGoc":"The dentist told me that when the effect of the anaesthetic __, I might feel a little pain. But it was more than a little.","luaChon":[{"id":"A","text":"dropped off"},{"id":"B","text":"went out"},{"id":"C","text":"wore off"},{"id":"D","text":"turned out"}]},"dapan":"C","giaithich":"wear off = (tác dụng, cảm giác) mất dần đi.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai03, NULL, 58, 'Câu 60', 1, '{"debai":{"cauHoiGoc":"When I first met him, he __ as a very indecisive person. He didn''t seem to know what he wanted at all.","luaChon":[{"id":"A","text":"went across"},{"id":"B","text":"passed off"},{"id":"C","text":"came across"},{"id":"D","text":"passed across"}]},"dapan":"C","giaithich":"come across as = tạo ấn tượng là, có vẻ là.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 04 — V. Complete the passage - Đoạn 1 (screenaholic)
-- -----------------------------------------------------------------------
SET @Bai04 = '0a160004-0000-4000-8000-000000000004';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai04, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - V. Complete the passage (Đoạn 1 - screenaholic)', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Read the passage below and mark the letter A, B, C, or D to indicate the correct answer for each blank.',
    'Do you (1) yourself checking your phone later and later every night just to watch one more short video? Do you (2) asleep while holding your phone, wake up suddenly and realize the video has been playing for an hour? Do you spend half the weekend scrolling through social media and feel strangely satisfied? (3) you''re a screenaholic.\n\nSomeone somewhere (4) said that the average amount of screen time the average person wants is five minutes longer than they actually (5). Being a screenaholic is about wanting five hours longer. But screenaholics can find that their habit gets them (6) deep trouble with teachers, parents, colleagues and friends.\n\nBeing late for class or work because you stayed up watching videos is a pretty poor excuse if you''re (7) about your future. Friends can get (8) offended if you ignore them during a meal just to reply to messages or check notifications. Throughout history, successful people have often (9) their ability to focus with a strong sense of self-discipline. It''s easy to see how this can (10) people a competitive advantage.\n\nSo if you want to (11) advantage of study opportunities, career opportunities, or simply real conversations with people around you, and if you''ve just been criticized once too often about scrolling (12) the best part of a family dinner, what''s the (13)?\n\nA psychologist studied digital habits and over time he claimed to (14) his own daily screen time from a standard six hours to less than one, saying he experienced no bad reactions. But if you really can''t (15) without your phone and don''t want to damage your studies, your work, or your relationships, at least learn to control it before it controls you.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-04','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai04;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai04, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (1).","luaChon":[{"id":"A","text":"notice"},{"id":"B","text":"catch"},{"id":"C","text":"find"},{"id":"D","text":"observe"}]},"dapan":"C","giaithich":"find yourself + V-ing: nhận ra mình đang làm gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (2).","luaChon":[{"id":"A","text":"fall"},{"id":"B","text":"grow"},{"id":"C","text":"turn"},{"id":"D","text":"become"}]},"dapan":"A","giaithich":"fall asleep: chìm vào giấc ngủ (collocation cố định).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (3).","luaChon":[{"id":"A","text":"Instead"},{"id":"B","text":"Otherwise"},{"id":"C","text":"Then"},{"id":"D","text":"Perhaps"}]},"dapan":"D","giaithich":"Perhaps you''re a screenaholic: có lẽ, phù hợp giọng văn suy đoán nhẹ nhàng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (4).","luaChon":[{"id":"A","text":"formerly"},{"id":"B","text":"once"},{"id":"C","text":"previously"},{"id":"D","text":"earlier"}]},"dapan":"B","giaithich":"someone somewhere once said: đã từng có ai đó nói rằng (cụm cố định khi trích dẫn).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (5).","luaChon":[{"id":"A","text":"receive"},{"id":"B","text":"take"},{"id":"C","text":"get"},{"id":"D","text":"own"}]},"dapan":"C","giaithich":"get five minutes: có được năm phút (đối lập với \\"want\\" ở trên).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (6).","luaChon":[{"id":"A","text":"into"},{"id":"B","text":"under"},{"id":"C","text":"onto"},{"id":"D","text":"toward"}]},"dapan":"A","giaithich":"get sb into trouble: khiến ai gặp rắc rối.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 7, 'Chỗ trống (7)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (7).","luaChon":[{"id":"A","text":"anxious"},{"id":"B","text":"serious"},{"id":"C","text":"hopeful"},{"id":"D","text":"determined"}]},"dapan":"B","giaithich":"be serious about your future: nghiêm túc về tương lai của mình.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 8, 'Chỗ trống (8)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (8).","luaChon":[{"id":"A","text":"highly"},{"id":"B","text":"deeply"},{"id":"C","text":"quite"},{"id":"D","text":"strongly"}]},"dapan":"B","giaithich":"deeply offended: cảm thấy bị xúc phạm sâu sắc (collocation với offended).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 9, 'Chỗ trống (9)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (9).","luaChon":[{"id":"A","text":"linked"},{"id":"B","text":"fastened"},{"id":"C","text":"joined"},{"id":"D","text":"attached"}]},"dapan":"A","giaithich":"link A with B: gắn liền/liên kết khả năng tập trung với tính kỷ luật.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 10, 'Chỗ trống (10)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (10).","luaChon":[{"id":"A","text":"bring"},{"id":"B","text":"offer"},{"id":"C","text":"give"},{"id":"D","text":"make"}]},"dapan":"C","giaithich":"give sb an advantage: mang lại lợi thế cho ai.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 11, 'Chỗ trống (11)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (11).","luaChon":[{"id":"A","text":"take"},{"id":"B","text":"use"},{"id":"C","text":"win"},{"id":"D","text":"hold"}]},"dapan":"A","giaithich":"take advantage of: tận dụng cơ hội.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 12, 'Chỗ trống (12)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (12).","luaChon":[{"id":"A","text":"past"},{"id":"B","text":"through"},{"id":"C","text":"during"},{"id":"D","text":"over"}]},"dapan":"B","giaithich":"scroll through: lướt (điện thoại) suốt/xuyên qua khoảng thời gian đó.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 13, 'Chỗ trống (13)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (13).","luaChon":[{"id":"A","text":"cure"},{"id":"B","text":"repair"},{"id":"C","text":"correction"},{"id":"D","text":"recovery"}]},"dapan":"A","giaithich":"what''s the cure?: đâu là cách chữa/giải pháp - dẫn vào ví dụ về vị chuyên gia tâm lý ở đoạn sau.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 14, 'Chỗ trống (14)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (14).","luaChon":[{"id":"A","text":"subtract"},{"id":"B","text":"decline"},{"id":"C","text":"reduce"},{"id":"D","text":"sink"}]},"dapan":"C","giaithich":"reduce his daily screen time: giảm bớt thời gian dùng màn hình mỗi ngày.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai04, NULL, 15, 'Chỗ trống (15)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (15).","luaChon":[{"id":"A","text":"stay"},{"id":"B","text":"do"},{"id":"C","text":"set"},{"id":"D","text":"keep"}]},"dapan":"B","giaithich":"can''t do without something: không thể sống thiếu cái gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 05 — V. Complete the passage - Đoạn 2 (body sensors / lie detection)
-- -----------------------------------------------------------------------
SET @Bai05 = '0a160005-0000-4000-8000-000000000005';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai05, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - V. Complete the passage (Đoạn 2 - body sensors)', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Read the passage below and mark the letter A, B, C, or D to indicate the correct answer for each blank.',
    'Can technology tell when a passenger is hiding something? A group of engineers working with tiny body sensors may have found a possible answer almost by accident. During one trial, an assistant dropped a metal tray, (1) a sharp noise. The sensor they were using to record a volunteer''s physical responses showed an unexpected (2). The sudden shock had caused the (3) of the skin around the person''s eyes and mouth to change slightly.\n\nThis led the team to (4) the idea that if a highly sensitive sensor could detect fear or surprise, it might also be (5) of showing when people were (6) a lie. The researchers then (7) up an experiment to test their theory.\n\nSome volunteers were given private information which they were not allowed to (8) with another group. The second group was asked to (9) what the secret information was. The results were (10), with the system correctly identifying most of the volunteers who were not telling the truth.\n\nSome experts believe that these tests could lead to the (11) of a new security device which would (12) airport officers. At present, these officers often have to (13) on their own judgement when questioning passengers about what they are carrying. However, although the new device may be more (14) than many traditional methods of detecting lies, most scientists agree that more (15) tests are needed before it can be used widely.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-05','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai05;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai05, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (1).","luaChon":[{"id":"A","text":"producing"},{"id":"B","text":"making"},{"id":"C","text":"causing"},{"id":"D","text":"creating"}]},"dapan":"C","giaithich":"cause a sharp noise: gây ra một tiếng động lớn (kết quả của việc làm rơi khay).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (2).","luaChon":[{"id":"A","text":"response"},{"id":"B","text":"remark"},{"id":"C","text":"reaction"},{"id":"D","text":"reflection"}]},"dapan":"C","giaithich":"an unexpected reaction: một phản ứng bất ngờ của cảm biến.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (3).","luaChon":[{"id":"A","text":"shape"},{"id":"B","text":"appearance"},{"id":"C","text":"expression"},{"id":"D","text":"condition"}]},"dapan":"B","giaithich":"the appearance of the skin: hình dáng/vẻ ngoài của da thay đổi nhẹ.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (4).","luaChon":[{"id":"A","text":"think over"},{"id":"B","text":"work out"},{"id":"C","text":"bring about"},{"id":"D","text":"come up with"}]},"dapan":"D","giaithich":"come up with an idea: nghĩ ra một ý tưởng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (5).","luaChon":[{"id":"A","text":"able"},{"id":"B","text":"suitable"},{"id":"C","text":"capable"},{"id":"D","text":"possible"}]},"dapan":"C","giaithich":"be capable of + V-ing: có khả năng làm gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (6).","luaChon":[{"id":"A","text":"saying"},{"id":"B","text":"telling"},{"id":"C","text":"speaking"},{"id":"D","text":"giving"}]},"dapan":"B","giaithich":"tell a lie: nói dối (collocation cố định).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 7, 'Chỗ trống (7)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (7).","luaChon":[{"id":"A","text":"fixed"},{"id":"B","text":"made"},{"id":"C","text":"set"},{"id":"D","text":"arranged"}]},"dapan":"C","giaithich":"set up an experiment: thiết lập/tiến hành một thí nghiệm.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 8, 'Chỗ trống (8)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (8).","luaChon":[{"id":"A","text":"exchange"},{"id":"B","text":"discuss"},{"id":"C","text":"explain"},{"id":"D","text":"share"}]},"dapan":"D","giaithich":"share information with sb: chia sẻ thông tin với ai.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 9, 'Chỗ trống (9)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (9).","luaChon":[{"id":"A","text":"look up"},{"id":"B","text":"find out"},{"id":"C","text":"search for"},{"id":"D","text":"point out"}]},"dapan":"B","giaithich":"find out what something was: tìm hiểu/khám phá ra điều gì.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 10, 'Chỗ trống (10)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (10).","luaChon":[{"id":"A","text":"impressive"},{"id":"B","text":"successful"},{"id":"C","text":"surprising"},{"id":"D","text":"remarkable"}]},"dapan":"A","giaithich":"impressive results: kết quả ấn tượng, phù hợp với việc hệ thống nhận diện đúng phần lớn người nói dối.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 11, 'Chỗ trống (11)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (11).","luaChon":[{"id":"A","text":"invention"},{"id":"B","text":"growth"},{"id":"C","text":"development"},{"id":"D","text":"progress"}]},"dapan":"C","giaithich":"the development of a new device: việc phát triển một thiết bị mới.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 12, 'Chỗ trống (12)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (12).","luaChon":[{"id":"A","text":"support"},{"id":"B","text":"assist"},{"id":"C","text":"guide"},{"id":"D","text":"serve"}]},"dapan":"B","giaithich":"assist airport officers: hỗ trợ nhân viên sân bay.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 13, 'Chỗ trống (13)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (13).","luaChon":[{"id":"A","text":"depend"},{"id":"B","text":"focus"},{"id":"C","text":"rely"},{"id":"D","text":"count"}]},"dapan":"C","giaithich":"rely on their own judgement: dựa vào phán đoán của chính mình (rely on là collocation chuẩn).","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 14, 'Chỗ trống (14)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (14).","luaChon":[{"id":"A","text":"exact"},{"id":"B","text":"accurate"},{"id":"C","text":"certain"},{"id":"D","text":"truthful"}]},"dapan":"B","giaithich":"more accurate than traditional methods: chính xác hơn so với các phương pháp truyền thống.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW()),
(UUID(), @Bai05, NULL, 15, 'Chỗ trống (15)', 1, '{"debai":{"cauHoiGoc":"Chọn đáp án đúng cho chỗ trống (15).","luaChon":[{"id":"A","text":"reliable"},{"id":"B","text":"proving"},{"id":"C","text":"convincing"},{"id":"D","text":"persuasive"}]},"dapan":"A","giaithich":"more reliable tests: các thử nghiệm đáng tin cậy hơn cần được thực hiện trước khi áp dụng rộng rãi.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["cloze_test"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 06 — VI. Read the passage and complete it with ONE suitable word
-- -----------------------------------------------------------------------
SET @Bai06 = '0a160006-0000-4000-8000-000000000006';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai06, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - VI. School performances (điền một từ)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Read the passage carefully and complete it with ONE suitable word.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-06','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai06;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai06, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"doanVanTruoc":"School performances are the result of the efforts of a group of people who work together to create the events we enjoy. First,","doanVanSau":"is an idea;"},"dapan":"there","giaithich":"there is/are + danh từ: cấu trúc giới thiệu sự tồn tại.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"doanVanTruoc":"it can be an idea","doanVanSau":"a music show, a short play, a cultural festival or even a charity event."},"dapan":"for","giaithich":"an idea for something: một ý tưởng cho việc gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"doanVanTruoc":"","doanVanSau":", the event organiser is the key person,"},"dapan":"Then","giaithich":"Then: từ nối chỉ trình tự, tiếp theo đó.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"doanVanTruoc":"the event organiser is the key person, the","doanVanSau":"in charge of finding the money for the event,"},"dapan":"one","giaithich":"the one in charge of: người phụ trách việc gì (one thay cho danh từ person).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"doanVanTruoc":"and choosing the","doanVanSau":"members of the team to help develop the idea."},"dapan":"other","giaithich":"the other members: những thành viên khác trong nhóm.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"doanVanTruoc":"After a decision is made to go","doanVanSau":"with an idea for a performance, a detailed plan is necessary."},"dapan":"ahead","giaithich":"go ahead with: xúc tiến/tiến hành ý tưởng gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 7, 'Chỗ trống (7)', 1, '{"debai":{"doanVanTruoc":"The plan contains the written details of both","doanVanSau":"visual and sound parts of the event."},"dapan":"the","giaithich":"both the X and Y: cả hai phần X và Y.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 8, 'Chỗ trống (8)', 1, '{"debai":{"doanVanTruoc":"A programme writer is responsible","doanVanSau":"preparing the entire content."},"dapan":"for","giaithich":"be responsible for: chịu trách nhiệm cho việc gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 9, 'Chỗ trống (9)', 1, '{"debai":{"doanVanTruoc":"The organiser will work closely with the stage director to transform the plan","doanVanSau":"a live performance."},"dapan":"into","giaithich":"transform A into B: biến A thành B.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 10, 'Chỗ trống (10)', 1, '{"debai":{"doanVanTruoc":"The stage designer will","doanVanSau":"called upon to help determine what kinds of background, lighting and props will be needed."},"dapan":"be","giaithich":"will be called upon: thể bị động, sẽ được yêu cầu/nhờ tới.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 11, 'Chỗ trống (11)', 1, '{"debai":{"doanVanTruoc":"help determine","doanVanSau":"kinds of background, lighting and props will be needed."},"dapan":"what","giaithich":"what kinds of: những loại gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 12, 'Chỗ trống (12)', 1, '{"debai":{"doanVanTruoc":"","doanVanSau":"plans are drawn, students and technicians will build and decorate the stage."},"dapan":"Once","giaithich":"Once + mệnh đề: một khi, ngay khi.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 13, 'Chỗ trống (13)', 1, '{"debai":{"doanVanTruoc":"A costume designer and make-up assistant will work with the organiser to ensure that performers","doanVanSau":"exactly right for their particular roles in the event."},"dapan":"look","giaithich":"look right: trông phù hợp/đúng chuẩn.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 14, 'Chỗ trống (14)', 1, '{"debai":{"doanVanTruoc":"performers look exactly right for","doanVanSau":"particular roles in the event."},"dapan":"their","giaithich":"their particular roles: sở hữu cách chỉ vai diễn của chính các diễn viên (performers).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW()),
(UUID(), @Bai06, NULL, 15, 'Chỗ trống (15)', 1, '{"debai":{"doanVanTruoc":"A director now","doanVanSau":"over and rehearsals are held regularly until the lines, music and movements are learned properly."},"dapan":"takes","giaithich":"take over: tiếp quản, đảm nhiệm vai trò điều hành.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["open_cloze"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 07 — VII. Give the correct form of the word (1-20)
-- -----------------------------------------------------------------------
SET @Bai07 = '0a160007-0000-4000-8000-000000000007';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai07, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - VII. Word form (1-20)', 1,
    @LoaiBaiTap, @LoaiWordForm, @MucDo, @KyNang,
    'Give the correct form of the word given in brackets to complete each sentence.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-07','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai07;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai07, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"The sun and the moon are often ______ in poetry. (person)"},"question":"The sun and the moon are often ______ in poetry.","word":"person","dapan":"personified","giaithich":"personify (v): nhân cách hoá.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 2, 'Câu 2', 1, '{"debai":{"cauHoiGoc":"I felt ______ to speak on the subject. In fact, I could have done it perfectly. (qualifications)"},"question":"I felt ______ to speak on the subject. In fact, I could have done it perfectly.","word":"qualifications","dapan":"qualified","giaithich":"qualified (adj): đủ tư cách/năng lực.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 3, 'Câu 3', 1, '{"debai":{"cauHoiGoc":"Those corrupted officials tried to establish a ______ for their shameful transaction with the Mafia. (coverage)"},"question":"Those corrupted officials tried to establish a ______ for their shameful transaction with the Mafia.","word":"coverage","dapan":"cover-up","giaithich":"cover-up (n): hành vi che đậy, giấu giếm.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 4, 'Câu 4', 1, '{"debai":{"cauHoiGoc":"He was ______ by his many disappointments. (bitter)"},"question":"He was ______ by his many disappointments.","word":"bitter","dapan":"embittered","giaithich":"embittered (adj): trở nên cay đắng, oán hận.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 5, 'Câu 5', 1, '{"debai":{"cauHoiGoc":"After admitting their mistakes, they apologized ______ for what they had done. (reserve)"},"question":"After admitting their mistakes, they apologized ______ for what they had done.","word":"reserve","dapan":"unreservedly","giaithich":"unreservedly (adv): hoàn toàn, không dè dặt.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 6, 'Câu 6', 1, '{"debai":{"cauHoiGoc":"His latest ______ is a racehorse. (acquire)"},"question":"His latest ______ is a racehorse.","word":"acquire","dapan":"acquisition","giaithich":"acquisition (n): thứ vừa có được/mua được.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 7, 'Câu 7', 1, '{"debai":{"cauHoiGoc":"______ expressions are gainfully employed when the listener or reader is successful in making the intended connection. (refer)"},"question":"______ expressions are gainfully employed when the listener or reader is successful in making the intended connection.","word":"refer","dapan":"Referential","giaithich":"referential (adj): mang tính quy chiếu, ám chỉ.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 8, 'Câu 8', 1, '{"debai":{"cauHoiGoc":"The reason for Bruce Lee’s death was sleeping pill ______. (dosage)"},"question":"The reason for Bruce Lee’s death was sleeping pill ______.","word":"dosage","dapan":"overdose","giaithich":"overdose (n): (việc dùng thuốc) quá liều.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 9, 'Câu 9', 1, '{"debai":{"cauHoiGoc":"This statue ______ the soldiers who died in the war. (memory)"},"question":"This statue ______ the soldiers who died in the war.","word":"memory","dapan":"commemorates","giaithich":"commemorate (v): tưởng niệm.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 10, 'Câu 10', 1, '{"debai":{"cauHoiGoc":"What a terrible film! It’s really ______ in my view. (rate)"},"question":"What a terrible film! It’s really ______ in my view.","word":"rate","dapan":"overrated","giaithich":"overrated (adj): bị đánh giá quá cao (so với thực tế).","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 11, 'Câu 11', 1, '{"debai":{"cauHoiGoc":"The troops were thoroughly ______ by this set-back. (moral)"},"question":"The troops were thoroughly ______ by this set-back.","word":"moral","dapan":"demoralized","giaithich":"demoralized (adj): mất tinh thần, nhụt chí.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 12, 'Câu 12', 1, '{"debai":{"cauHoiGoc":"We try to ensure the ______ of our employees. (be)"},"question":"We try to ensure the ______ of our employees.","word":"be","dapan":"well-being","giaithich":"well-being (n): sự an sinh, phúc lợi.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 13, 'Câu 13', 1, '{"debai":{"cauHoiGoc":"There’s nothing to match the warmth and ______ of a genuine log-fire. (cozy)"},"question":"There’s nothing to match the warmth and ______ of a genuine log-fire.","word":"cozy","dapan":"coziness","giaithich":"coziness (n): sự ấm cúng.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 14, 'Câu 14', 1, '{"debai":{"cauHoiGoc":"At schools, the teachers are ______ by the urgent needs of a large number of children clamoring for attention, and the frequent overcrowding of classrooms. (siege)"},"question":"At schools, the teachers are ______ by the urgent needs of a large number of children clamoring for attention, and the frequent overcrowding of classrooms.","word":"siege","dapan":"besieged","giaithich":"besieged (adj): bị bủa vây, quá tải bởi nhiều yêu cầu.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 15, 'Câu 15', 1, '{"debai":{"cauHoiGoc":"The air stewardess made it clear how ______ she was of his behavior. (contempt)"},"question":"The air stewardess made it clear how ______ she was of his behavior.","word":"contempt","dapan":"contemptuous","giaithich":"contemptuous (adj): khinh miệt, coi thường.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 16, 'Câu 16', 1, '{"debai":{"cauHoiGoc":"I felt that turning up at the wedding in jeans and a T-shirt was rather ______. (appropriacy)"},"question":"I felt that turning up at the wedding in jeans and a T-shirt was rather ______.","word":"appropriacy","dapan":"inappropriate","giaithich":"inappropriate (adj): không phù hợp.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 17, 'Câu 17', 1, '{"debai":{"cauHoiGoc":"She gave a solemn ______ to respect their decision. (take)"},"question":"She gave a solemn ______ to respect their decision.","word":"take","dapan":"undertaking","giaithich":"undertaking (n): sự cam kết, lời hứa trang trọng.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 18, 'Câu 18', 1, '{"debai":{"cauHoiGoc":"Please ensure that your child’s sports clothes are clearly marked in ______ ink. (delete)"},"question":"Please ensure that your child’s sports clothes are clearly marked in ______ ink.","word":"delete","dapan":"indelible","giaithich":"indelible (adj): (mực) không phai, không xoá được.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 19, 'Câu 19', 1, '{"debai":{"cauHoiGoc":"The police took ______ action against that player, who was involved in the match-fixing scandal. (discipline)"},"question":"The police took ______ action against that player, who was involved in the match-fixing scandal.","word":"discipline","dapan":"disciplinary","giaithich":"disciplinary (adj): thuộc về kỷ luật.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai07, NULL, 20, 'Câu 20', 1, '{"debai":{"cauHoiGoc":"In order for the project to be started, they needed a large ______. (lay)"},"question":"In order for the project to be started, they needed a large ______.","word":"lay","dapan":"outlay","giaithich":"outlay (n): khoản chi phí ban đầu.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 08 — VII. Word form - PRECIOUS METAL (đoạn văn, 10 chỗ trống)
-- -----------------------------------------------------------------------
SET @Bai08 = '0a160008-0000-4000-8000-000000000008';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai08, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - VII. Word form (Precious Metal)', 1,
    @LoaiBaiTap, @LoaiWordForm, @MucDo, @KyNang,
    'Give the correct form of the word given in brackets to complete the passage about gold.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-08','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai08;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai08, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Gold... durable to the point of virtual ______ (destroy), and usually found..."},"question":"Gold has several qualities... It is attractive in colour, durable to the point of virtual ______, and usually found in nature in a comparatively pure form.","word":"destroy","dapan":"indestructibility","giaithich":"indestructibility (n): tính không thể bị phá huỷ.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"...usually found in nature in a ______ (compare) pure form."},"question":"...usually found in nature in a ______ pure form.","word":"compare","dapan":"comparatively","giaithich":"comparatively (adv): một cách tương đối.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"The history of gold is ______ (equal) by that of any other metal because of its value in the minds of men from earliest times."},"question":"The history of gold is ______ by that of any other metal because of its value in the minds of men from earliest times.","word":"equal","dapan":"unequalled","giaithich":"unequalled (adj): không gì sánh bằng.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Because it is visually pleasing it was one of the first metals to attract human ______ (attend)."},"question":"Because it is visually pleasing it was one of the first metals to attract human ______.","word":"attend","dapan":"attention","giaithich":"attention (n): sự chú ý.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"...gold has continued to be a highly ______ (favour) material out of which jewellery..."},"question":"...gold has continued to be a highly ______ material out of which jewellery and other decorative objects are crafted.","word":"favour","dapan":"favoured","giaithich":"favoured (adj): được ưa chuộng.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"...out of which jewellery and other ______ (decor) objects are crafted."},"question":"...out of which jewellery and other ______ objects are crafted.","word":"decor","dapan":"decorative","giaithich":"decorative (adj): mang tính trang trí.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 7, 'Chỗ trống (7)', 1, '{"debai":{"cauHoiGoc":"The ______ (exploit) of mines by slave labour and the looting of Indian palaces, temples, and graves..."},"question":"The ______ of mines by slave labour and the looting of Indian palaces, temples, and graves in Central and South America resulted in an unprecedented influx of gold.","word":"exploit","dapan":"exploitation","giaithich":"exploitation (n): sự khai thác.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 8, 'Chỗ trống (8)', 1, '{"debai":{"cauHoiGoc":"...resulted in a(n) ______ (precedent) influx of gold that literally unbalanced the economic structure of Europe."},"question":"...resulted in a(n) ______ influx of gold that literally unbalanced the economic structure of Europe.","word":"precedent","dapan":"unprecedented","giaithich":"unprecedented (adj): chưa từng có tiền lệ.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 9, 'Chỗ trống (9)', 1, '{"debai":{"cauHoiGoc":"...literally unbalanced the ______ (economy) structure of Europe."},"question":"...literally unbalanced the ______ structure of Europe.","word":"economy","dapan":"economic","giaithich":"economic (adj): thuộc về kinh tế.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW()),
(UUID(), @Bai08, NULL, 10, 'Chỗ trống (10)', 1, '{"debai":{"cauHoiGoc":"Until today the world remains ______ (captive) by the allure of gold."},"question":"Until today the world remains ______ by the allure of gold.","word":"captive","dapan":"captivated","giaithich":"captivated (adj): bị mê hoặc, cuốn hút.","loai":"CQ_WORD_FORM","la_tu_luan":false,"tags":["word_form"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 09 — VIII. Fill in correct prepositions (1-10, tách theo từng
-- chỗ trống — câu 2/3/5/9/10 có nhiều hơn 1 chỗ trống nên tách thành
-- nhiều dòng, chỗ trống khác trong cùng câu hiển thị tạm bằng "(…)").
-- -----------------------------------------------------------------------
SET @Bai09 = '0a160009-0000-4000-8000-000000000009';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai09, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - VIII. Điền giới từ', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Fill in the correct preposition in each gap. Note: some sentences in this section have more than one gap; other gaps in the same sentence are shown as "(…)" until answered separately.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-09','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai09;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai09, NULL, 1, 'Câu 1a', 1, '{"debai":{"doanVanTruoc":"The coat has been sent","doanVanSau":"the dry cleaner''s (…) the other things."},"dapan":"to","giaithich":"send something to a place: gửi cái gì đến đâu.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 2, 'Câu 1b', 2, '{"debai":{"doanVanTruoc":"The coat has been sent to the dry cleaner''s","doanVanSau":"the other things."},"dapan":"with","giaithich":"together with: cùng với những thứ khác.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 3, 'Câu 2a', 3, '{"debai":{"doanVanTruoc":"","doanVanSau":"the other sights the tourists visited a glass factory where they watched (…) admiration sweating men making wonders (…) molten glass."},"dapan":"Among","giaithich":"among the other sights: trong số các danh lam khác.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 4, 'Câu 2b', 4, '{"debai":{"doanVanTruoc":"Among the other sights the tourists visited a glass factory where they watched","doanVanSau":"admiration sweating men making wonders (…) molten glass."},"dapan":"in","giaithich":"watch in admiration: xem trong sự thán phục.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 5, 'Câu 2c', 5, '{"debai":{"doanVanTruoc":"Among the other sights the tourists visited a glass factory where they watched in admiration sweating men making wonders","doanVanSau":"molten glass."},"dapan":"out of","giaithich":"make something out of: làm cái gì từ nguyên liệu gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 6, 'Câu 3a', 6, '{"debai":{"doanVanTruoc":"","doanVanSau":"their way to the station they were caught (…) the rain and before long were wet (…)."},"dapan":"On","giaithich":"on your way to: trên đường đến đâu.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 7, 'Câu 3b', 7, '{"debai":{"doanVanTruoc":"On their way to the station they were caught","doanVanSau":"the rain and before long were wet (…)."},"dapan":"in","giaithich":"be caught in the rain: bị mắc mưa.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 8, 'Câu 3c', 8, '{"debai":{"doanVanTruoc":"On their way to the station they were caught in the rain and before long were wet","doanVanSau":"."},"dapan":"through","giaithich":"wet through: ướt sũng hoàn toàn.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 9, 'Câu 4', 9, '{"debai":{"doanVanTruoc":"During restoration work every effort was made to save the picture","doanVanSau":"complete ruin."},"dapan":"from","giaithich":"save something from: cứu cái gì khỏi.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 10, 'Câu 5a', 10, '{"debai":{"doanVanTruoc":"Make","doanVanSau":"the quarrel (…) him, please, (…) my sake, if not (…) your own."},"dapan":"up","giaithich":"make up the quarrel: giải hoà, làm lành.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 11, 'Câu 5b', 11, '{"debai":{"doanVanTruoc":"Make up the quarrel","doanVanSau":"him, please, (…) my sake, if not (…) your own."},"dapan":"with","giaithich":"make up (the quarrel) with somebody: làm lành với ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 12, 'Câu 5c', 12, '{"debai":{"doanVanTruoc":"Make up the quarrel with him, please,","doanVanSau":"my sake, if not (…) your own."},"dapan":"for","giaithich":"for someone''s sake: vì lợi ích của ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 13, 'Câu 5d', 13, '{"debai":{"doanVanTruoc":"Make up the quarrel with him, please, for my sake, if not","doanVanSau":"your own."},"dapan":"for","giaithich":"if not for your own (sake): nếu không vì lợi ích của chính bạn.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 14, 'Câu 6', 14, '{"debai":{"doanVanTruoc":"He searched his mind","doanVanSau":"a possible course of action."},"dapan":"for","giaithich":"search (one''s mind) for: tìm kiếm trong đầu.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 15, 'Câu 7', 15, '{"debai":{"doanVanTruoc":"It was all your idea, I just went","doanVanSau":"it."},"dapan":"along with","giaithich":"go along with something: đồng tình/đi theo ý tưởng của ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 16, 'Câu 8', 16, '{"debai":{"doanVanTruoc":"Where do you suggest we should go this week-end? Do you have any particular place","doanVanSau":"mind?"},"dapan":"in","giaithich":"have somewhere in mind: đã nghĩ sẵn đến nơi nào đó.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 17, 'Câu 9a', 17, '{"debai":{"doanVanTruoc":"The driver stretched","doanVanSau":"his hand, pulled the hand brake and the car stopped half-way (…) the hill."},"dapan":"out","giaithich":"stretch out one''s hand: đưa/vươn tay ra.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 18, 'Câu 9b', 18, '{"debai":{"doanVanTruoc":"The driver stretched out his hand, pulled the hand brake and the car stopped half-way","doanVanSau":"the hill."},"dapan":"up","giaithich":"half-way up the hill: giữa lưng chừng đồi (theo hướng lên).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 19, 'Câu 10a', 19, '{"debai":{"doanVanTruoc":"I see no point","doanVanSau":"your wasting time (…) rewriting your report; have it typed."},"dapan":"in","giaithich":"there''s no point in V-ing: không có ích gì khi làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW()),
(UUID(), @Bai09, NULL, 20, 'Câu 10b', 20, '{"debai":{"doanVanTruoc":"I see no point in your wasting time","doanVanSau":"rewriting your report; have it typed."},"dapan":"in","giaithich":"waste time in V-ing: lãng phí thời gian vào việc gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["preposition"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 10 — IX. Complete phrasal verbs (get + ...) (1-20)
-- -----------------------------------------------------------------------
SET @Bai10 = '0a160010-0000-4000-8000-000000000010';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai10, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - IX. Phrasal verbs (get)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Complete each sentence with the missing particle(s) to form the correct phrasal verb with "get".', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-10','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai10;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai10, NULL, 1, 'Câu 1', 1, '{"debai":{"doanVanTruoc":"What are you getting","doanVanSau":"? I can''t understand what you''re trying to say."},"dapan":"at","giaithich":"get at = ám chỉ, ngụ ý điều gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 2, 'Câu 2', 2, '{"debai":{"doanVanTruoc":"I only get","doanVanSau":"watching TV when the children are in bed."},"dapan":"round to","giaithich":"get round to = có thời gian/sắp xếp để làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 3, 'Câu 3', 3, '{"debai":{"doanVanTruoc":"Instead of being given a ticket, the driver got","doanVanSau":"a warning."},"dapan":"off with","giaithich":"get off with = chỉ bị phạt nhẹ hơn mức đáng lẽ phải chịu.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 4, 'Câu 4', 4, '{"debai":{"doanVanTruoc":"She''s having trouble getting","doanVanSau":"with her sprained ankle."},"dapan":"about","giaithich":"get about = đi lại được.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 5, 'Câu 5', 5, '{"debai":{"doanVanTruoc":"Do you get","doanVanSau":"with your colleagues?"},"dapan":"on","giaithich":"get on with sb = hoà hợp với ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 6, 'Câu 6', 6, '{"debai":{"doanVanTruoc":"If you don''t get those invitations","doanVanSau":"today, they''ll never arrive on time."},"dapan":"off","giaithich":"get something off = gửi đi cái gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 7, 'Câu 7', 7, '{"debai":{"doanVanTruoc":"How are you getting","doanVanSau":"at school?"},"dapan":"on","giaithich":"get on (at school) = học hành/tiến triển ra sao.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 8, 'Câu 8', 8, '{"debai":{"doanVanTruoc":"He has a talent for getting the most complicated ideas","doanVanSau":"."},"dapan":"across","giaithich":"get something across = truyền đạt/làm cho người khác hiểu điều gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 9, 'Câu 9', 9, '{"debai":{"doanVanTruoc":"I''ve been trying to get","doanVanSau":"for ages but the line is always engaged."},"dapan":"through","giaithich":"get through = gọi điện thoại thông được.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 10, 'Câu 10', 10, '{"debai":{"doanVanTruoc":"This awful weather is really getting me","doanVanSau":"."},"dapan":"down","giaithich":"get sb down = làm ai chán nản.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 11, 'Câu 11', 11, '{"debai":{"doanVanTruoc":"My father is always getting","doanVanSau":"me about my clothes."},"dapan":"at","giaithich":"get at sb = chỉ trích/phê bình ai liên tục.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 12, 'Câu 12', 12, '{"debai":{"doanVanTruoc":"If you aren''t well organised, you''ll never get","doanVanSau":"."},"dapan":"ahead","giaithich":"get ahead = thành công, tiến bộ trong công việc.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 13, 'Câu 13', 13, '{"debai":{"doanVanTruoc":"I don''t know how he gets","doanVanSau":"cheating on his tests."},"dapan":"away with","giaithich":"get away with = làm điều sai mà không bị phát hiện/trừng phạt.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 14, 'Câu 14', 14, '{"debai":{"doanVanTruoc":"Stop talking and get","doanVanSau":"your work, will you?"},"dapan":"on with","giaithich":"get on with something = tiếp tục làm việc gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 15, 'Câu 15', 15, '{"debai":{"doanVanTruoc":"She has barely enough money left to get","doanVanSau":"."},"dapan":"by","giaithich":"get by = sống tạm, xoay xở đủ sống.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 16, 'Câu 16', 16, '{"debai":{"doanVanTruoc":"I wish I could get","doanVanSau":"going to this wedding but I have no choice."},"dapan":"out of","giaithich":"get out of something = tránh/thoát khỏi việc phải làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 17, 'Câu 17', 17, '{"debai":{"doanVanTruoc":"News of their \\"secret\\" wedding got","doanVanSau":"fast."},"dapan":"round","giaithich":"get round = (tin tức) lan truyền.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 18, 'Câu 18', 18, '{"debai":{"doanVanTruoc":"She says she won''t help us, but we''ll soon get","doanVanSau":"her."},"dapan":"round","giaithich":"get round sb = thuyết phục/dỗ được ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 19, 'Câu 19', 19, '{"debai":{"doanVanTruoc":"I don''t know if she''ll ever get","doanVanSau":"her husband''s death."},"dapan":"over","giaithich":"get over something = vượt qua/nguôi ngoai chuyện gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW()),
(UUID(), @Bai10, NULL, 20, 'Câu 20', 20, '{"debai":{"doanVanTruoc":"What are the children getting","doanVanSau":"in the garden?"},"dapan":"up to","giaithich":"get up to something = đang làm gì đó (thường ngầm/nghịch ngợm).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["phrasal_verb"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 11 — X. Think of one word matching three answers (1-20)
-- -----------------------------------------------------------------------
SET @Bai11 = '0a160011-0000-4000-8000-000000000011';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai11, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - X. Trios (một từ chung cho 3 câu)', 1,
    @LoaiBaiTap, @LoaiTrios, @MucDo, @KyNang,
    'Think of ONE word only which can be used appropriately in all three sentences.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-11','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai11;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai11, NULL, 1, 'Nhóm 1', 1, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["I can''t see the _______ of all this paperwork, can you?","I was so frustrated that I was on the ______ of giving up, but my piano teacher persuaded me to keep on practising.","Now, let''s move on to the final ______ for discussion at this meeting."],"dapan":"point","giaithich":"point = ý nghĩa/mục đích; on the point of = sắp sửa; point for discussion = vấn đề để thảo luận.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 2, 'Nhóm 2', 2, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["I think it''s ________ to say that not everyone in the boardroom agreed with the decision about the site of the new factory.","Rita complained that it was not _______ that she had a smaller company car than her colleagues.","My husband looks nothing like his brothers and sisters because he is so _______"],"dapan":"fair","giaithich":"fair to say = có thể nói rằng; fair = công bằng; fair = tóc/da sáng màu.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 3, 'Nhóm 3', 3, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["The workers at the car factory are at present ______ in negotiations to improve their position.","As the business expanded and more staff were required, the company _____the services of a recruitment agency.","When my brother and his new girlfriend announced that they were _____it took the whole family by surprise."],"dapan":"engaged","giaithich":"engaged in = đang tham gia vào; engaged the services of = thuê dịch vụ của; engaged = đính hôn.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 4, 'Nhóm 4', 4, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["The instructions were written in such a complicated way that Joe had to spend a long time _____ out how to set up the printer.","First results indicated that the new drug was ______and had no side effects.","John was annoyed to find the drinks machine was not _______yet again."],"dapan":"working","giaithich":"working out = tìm ra cách; working = có hiệu quả; working = hoạt động (máy móc).","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 5, 'Nhóm 5', 5, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Lisa is in _____while I''m away from the office, OK?","They''ve introduced a small ______for parking outside the station.","The protestors moved back quickly in reaction to a sudden ______the police."],"dapan":"charge","giaithich":"in charge = phụ trách; charge = phí; charge = cuộc xông tới đột ngột (của cảnh sát).","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 6, 'Nhóm 6', 6, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Most holidaymakers come to this part of the world to ______ in the scenery and soothing sounds of the jungle.","I know it''s Dave''s fourth whisky, but I can assure you he can hold his_______","May I have a soft ________, please? I''m driving today."],"dapan":"drink","giaithich":"drink in = đắm mình thưởng thức; hold his drink = uống mà không say; soft drink = nước giải khát không cồn.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 7, 'Nhóm 7', 7, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["To ensure that you don''t lose your file, I recommend making a back-up _______of your documents just in case.","Small children are extremely malleable and quickly _______ behaviour they see on TV.","During the exam he couldn''t _______ from other students'' papers as each had a separate table."],"dapan":"copy","giaithich":"a back-up copy = bản sao lưu; copy behaviour = bắt chước hành vi; copy from = chép bài.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 8, 'Nhóm 8', 8, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["A special unit was to be brought in as the man was armed to the ________","You must be joking saying you believe Elizabeth. She was lying to us through her ________","Decay has set in because she hasn''t taken enough care of her ___________over the years."],"dapan":"teeth","giaithich":"armed to the teeth = vũ trang tận răng; lie through your teeth = nói dối trắng trợn; teeth = răng (cần chăm sóc).","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 9, 'Nhóm 9', 9, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Soon after Lucy felt a ___________ pain in her chest, she got scared and called in on her GP.","Entering this part of the town one instantly sees the ___________contrast that exists between the poor and rich.","His face covered in small cuts was a sign that his razor was not______________ enough."],"dapan":"sharp","giaithich":"a sharp pain = cơn đau nhói; a sharp contrast = sự tương phản rõ rệt; sharp (razor) = sắc (lưỡi dao).","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 10, 'Nhóm 10', 10, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Before we _______ on to the next item on the agenda, is there anything you need me to explain in further detail?","It''s a hold-up. Don''t __________ a muscle and stay where you are.","Would you be so kind as to _________ your heavy suitcase? It''s standing in my way."],"dapan":"move","giaithich":"move on = chuyển sang; don''t move a muscle = đừng nhúc nhích; move your suitcase = di chuyển vali.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 11, 'Nhóm 11', 11, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["He was afraid that his revolutionary proposals would …………………… with strong opposition from hardliners.","The Chinese factories were operating non stop churning out shoes to …………………… the demand in Europe and the US.","With only 200 dollars a month, the family struggled to make ends ……………………"],"dapan":"meet","giaithich":"meet with opposition = vấp phải sự phản đối; meet the demand = đáp ứng nhu cầu; make ends meet = đủ sống, thu chi cân bằng.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 12, 'Nhóm 12', 12, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["The birds build their nests in early September and begin to …………………… their eggs two weeks later, always being on the lookout for predators.","The press speculated whether the new telecommunications company was going to …………………… cables on the seabed to improve the existing system.","One of my responsibilities at home is to …………………… the table in the evening."],"dapan":"lay","giaithich":"lay eggs = đẻ trứng; lay cables = đặt/lắp cáp; lay the table = dọn bàn ăn.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 13, 'Nhóm 13', 13, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["It''s irritating that they do nothing but …………………… lies about our family. The whole village is about to believe their incredible stories.","Don''t allow the educational system to restrict your thinking abilities. I urge you to …………………… your wings and do things your way.","He opened the jar, took out some jam with his knife and …………………… it evenly on the warm toast."],"dapan":"spread","giaithich":"spread lies = tung tin đồn; spread your wings = tự do phát triển bản thân; spread jam = phết mứt.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 14, 'Nhóm 14', 14, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Marijuana is not regarded as a …………………… drug. That''s why some countries are thinking of letting people use it, at least for medical purposes.","It''s …………………… to believe that there are no good people out there. I''m sure you can find some good-natured individuals in this area.","I''m trying to spare you learning things the …………………… way. Follow my advice and you don''t need to make mistakes."],"dapan":"hard","giaithich":"a hard drug = ma tuý nặng; hard to believe = khó tin; the hard way = theo cách khó khăn (tự trải nghiệm).","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 15, 'Nhóm 15', 15, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["The latest …………………… in The New York Times was not favourable. He felt the morale was underrated.","At the end of your first year at work we will …………………… your salary and give you a company car.","The reclusive dictator showed up at a military parade to …………………… his troops and show his defiant opponents he was still in power."],"dapan":"review","giaithich":"a review = bài phê bình; review your salary = xem xét lại lương; review his troops = duyệt binh.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 16, 'Nhóm 16', 16, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Blankets and shelters were in …………………… supply in the aftermath of the disaster.","Nobody in this business knew his real name. He was called Bill for ……………………","She reacted angrily when her name hadn''t been included on the …………………… list; the job was hers."],"dapan":"short","giaithich":"in short supply = khan hiếm; for short = gọi tắt là; shortlist = danh sách rút gọn.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 17, 'Nhóm 17', 17, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Though the movie was widely …………………… across the country, the sales were a disappointment for the studio.","For a woman to get …………………… in the business world seems to be a tall order in a predominantly male environment.","This web site was shut down soon after the Internet provider realized it …………………… extreme views inciting violence."],"dapan":"promoted","giaithich":"widely promoted = được quảng bá rộng rãi; get promoted = được thăng chức; promoted (extreme views) = quảng bá/cổ suý quan điểm cực đoan.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 18, 'Nhóm 18', 18, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["Holmes immediately spotted two …………………… marks on the neck of the victim which he thought might have been left by a snake of some kind.","Don''t …………………… the hand that feeds you. It was me who got you promoted and now, Ron, you''re plotting behind my back. Shame on you!","''Fred, can I have some of your apple?''''Sure. Have a ……………………''"],"dapan":"bite","giaithich":"bite marks = vết cắn; don''t bite the hand that feeds you = đừng vô ơn; have a bite = ăn một miếng.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 19, 'Nhóm 19', 19, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["I''m absolutely …………………… the horse will win the race. There''s no doubt about it.","It came as a shock to her husband when she tested …………………… for a sexually transmitted disease.","The guru stresses the power of …………………… thinking in his lectures, saying it helps to overcome problems and reduce strain."],"dapan":"positive","giaithich":"absolutely positive = hoàn toàn chắc chắn; tested positive = xét nghiệm dương tính; positive thinking = tư duy tích cực.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW()),
(UUID(), @Bai11, NULL, 20, 'Nhóm 20', 20, '{"debai":{"cauHoiGoc":"Think of one word only which can match with three answers."},"sentences":["It was one of the gang''s members that …………………… the agent''s cover as he''d seen him in uniform before.","Feeling tired, Lind put away the book, …………………… out the candle and went to sleep.","Separatists …………………… up several bridges in the province sending a violent message to the capital."],"dapan":"blew","giaithich":"blow sb''s cover = làm lộ thân phận; blow out the candle = thổi tắt nến; blow up = cho nổ tung.","loai":"CQ_TRIOS","la_tu_luan":false,"tags":["trios"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 12 — X (Writing). Câu viết lại — bộ 1 (1-20)
-- Dang CQ_SENTENCE_TRANSFORM la_tu_luan=true: hoc sinh go tu do, dapan la
-- cau mau de doi chieu, giao vien cham tay (giong CQ_TU_LUAN).
-- -----------------------------------------------------------------------
SET @Bai12 = '0a160012-0000-4000-8000-000000000012';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai12, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - X. Viết lại câu (bộ 1)', 1,
    @LoaiBaiTap, @LoaiSentenceTransform, @MucDo, @KyNang,
    'Rewrite each sentence so that it has a similar meaning, using the word given. Do not change the word given.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-12','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai12;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai12, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"The new rules about school uniforms will apply next year. (force)"},"originalSentence":"The new rules about school uniforms will apply next year.","requiredWord":"force","dapan":"The new rules about school uniforms will come into force next year.","giaithich":"come into force: (luật, quy định) bắt đầu có hiệu lực.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 2, 'Câu 2', 2, '{"debai":{"cauHoiGoc":"So many people were really delighted when the government lost the election. (jubilation)"},"originalSentence":"So many people were really delighted when the government lost the election.","requiredWord":"jubilation","dapan":"There was great jubilation when the government lost the election.","giaithich":"jubilation (n): niềm hân hoan lớn.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 3, 'Câu 3', 3, '{"debai":{"cauHoiGoc":"The Queen has ruled the country for almost fifty years. (throne)"},"originalSentence":"The Queen has ruled the country for almost fifty years.","requiredWord":"throne","dapan":"The Queen has been on the throne for almost fifty years.","giaithich":"be on the throne: (vua/nữ hoàng) ở ngôi, trị vì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 4, 'Câu 4', 4, '{"debai":{"cauHoiGoc":"That woman looks an awful lot like my mother. (bears)"},"originalSentence":"That woman looks an awful lot like my mother.","requiredWord":"bears","dapan":"That woman bears a strong resemblance to my mother.","giaithich":"bear a resemblance to: có nét giống với ai.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 5, 'Câu 5', 5, '{"debai":{"cauHoiGoc":"You certainly could never accuse Tom of being mean. (nothing)"},"originalSentence":"You certainly could never accuse Tom of being mean.","requiredWord":"nothing","dapan":"Tom is nothing if not generous.","giaithich":"nothing if not + adj: chắc chắn là, hết mực (nhấn mạnh phẩm chất).","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 6, 'Câu 6', 6, '{"debai":{"cauHoiGoc":"I''m not going any further till I''ve had something to eat. (far)"},"originalSentence":"I''m not going any further till I''ve had something to eat.","requiredWord":"far","dapan":"This is as far as I''m going till I''ve had something to eat.","giaithich":"as far as = xa đến đây/mức này thôi.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 7, 'Câu 7', 7, '{"debai":{"cauHoiGoc":"It''s entirely your own fault that you failed the exam. (blame)"},"originalSentence":"It''s entirely your own fault that you failed the exam.","requiredWord":"blame","dapan":"You have no one but yourself to blame for (failing) the exam.","giaithich":"have no one but yourself to blame: chỉ có thể trách chính mình.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 8, 'Câu 8', 8, '{"debai":{"cauHoiGoc":"Bobby ate two ice creams one after the other after lunch. (row)"},"originalSentence":"Bobby ate two ice creams one after the other after lunch.","requiredWord":"row","dapan":"Bobby ate two ice creams in a row after lunch.","giaithich":"in a row: liên tiếp, liền nhau.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 9, 'Câu 9', 9, '{"debai":{"cauHoiGoc":"Was your mother any better when you visited her? (improvement)"},"originalSentence":"Was your mother any better when you visited her?","requiredWord":"improvement","dapan":"Was there any improvement in your mother''s condition when you visited her?","giaithich":"improvement in someone''s condition: sự cải thiện về tình trạng sức khoẻ.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 10, 'Câu 10', 10, '{"debai":{"cauHoiGoc":"The workforce reluctantly agreed to a cut in pay. (reluctance)"},"originalSentence":"The workforce reluctantly agreed to a cut in pay.","requiredWord":"reluctance","dapan":"It was with great reluctance that the workforce agreed to a cut in pay.","giaithich":"with great reluctance: một cách miễn cưỡng.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 11, 'Câu 11', 11, '{"debai":{"cauHoiGoc":"I put the cheque in the envelope without signing it. (neglected)"},"originalSentence":"I put the cheque in the envelope without signing it.","requiredWord":"neglected","dapan":"I neglected to sign the cheque before I put it in the envelope.","giaithich":"neglect to do something: quên/sao lãng không làm gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 12, 'Câu 12', 12, '{"debai":{"cauHoiGoc":"Freddy was always quarrelling with his sister. (row)"},"originalSentence":"Freddy was always quarrelling with his sister.","requiredWord":"row","dapan":"Freddy was always having a row with his sister.","giaithich":"have a row with sb: cãi nhau với ai.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 13, 'Câu 13', 13, '{"debai":{"cauHoiGoc":"My grandmother surprised us by announcing she was going on a world cruise. (surprise)"},"originalSentence":"My grandmother surprised us by announcing she was going on a world cruise.","requiredWord":"surprise","dapan":"Much to our surprise, she announced (that) she was going on a world cruise.","giaithich":"much to sb''s surprise: khiến ai vô cùng ngạc nhiên.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 14, 'Câu 14', 14, '{"debai":{"cauHoiGoc":"You must remember to lock the drawer, whatever you do. (account)"},"originalSentence":"You must remember to lock the drawer, whatever you do.","requiredWord":"account","dapan":"On no account must you forget to lock the drawer.","giaithich":"On no account + đảo ngữ: tuyệt đối không được.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 15, 'Câu 15', 15, '{"debai":{"cauHoiGoc":"No one is quite sure if the player will perform well at his new football club. (seen)"},"originalSentence":"No one is quite sure if the player will perform well at his new football club.","requiredWord":"seen","dapan":"It remains to be seen whether the player will perform well at his new football club.","giaithich":"It remains to be seen whether: vẫn còn phải chờ xem.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 16, 'Câu 16', 16, '{"debai":{"cauHoiGoc":"The government will cease subsidising the project from the end of the month. (receive)"},"originalSentence":"The government will cease subsidising the project from the end of the month.","requiredWord":"receive","dapan":"The project will receive no more subsidy from the government from the end of the month.","giaithich":"receive no more subsidy: không còn nhận được trợ cấp nữa.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 17, 'Câu 17', 17, '{"debai":{"cauHoiGoc":"Brian is a strong contender for the position. (list)"},"originalSentence":"Brian is a strong contender for the position.","requiredWord":"list","dapan":"Brian is on the shortlist for the position.","giaithich":"be on the shortlist: nằm trong danh sách ứng viên rút gọn.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 18, 'Câu 18', 18, '{"debai":{"cauHoiGoc":"She blushed with embarrassment at having made such a stupid mistake. (shamefaced)"},"originalSentence":"She blushed with embarrassment at having made such a stupid mistake.","requiredWord":"shamefaced","dapan":"She was shamefaced at having made such a stupid mistake.","giaithich":"shamefaced (adj): xấu hổ, ngượng ngùng.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 19, 'Câu 19', 19, '{"debai":{"cauHoiGoc":"Your outrageous behaviour has caused problems for the club. (embarrassment)"},"originalSentence":"Your outrageous behaviour has caused problems for the club.","requiredWord":"embarrassment","dapan":"Your outrageous behaviour has caused great embarrassment to the club.","giaithich":"cause embarrassment to sb/sth: gây ra sự bối rối/xấu hổ cho ai/cái gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai12, NULL, 20, 'Câu 20', 20, '{"debai":{"cauHoiGoc":"The writer I really admire won the Nobel Prize for Literature. (admiration)"},"originalSentence":"The writer I really admire won the Nobel Prize for Literature.","requiredWord":"admiration","dapan":"The writer (that) I have great admiration for won the Nobel Prize for Literature.","giaithich":"have admiration for sb: ngưỡng mộ ai.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 13 — X (Writing). Câu viết lại — bộ 2 (1-20)
-- -----------------------------------------------------------------------
SET @Bai13 = '0a160013-0000-4000-8000-000000000013';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai13, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - X. Viết lại câu (bộ 2)', 1,
    @LoaiBaiTap, @LoaiSentenceTransform, @MucDo, @KyNang,
    'Rewrite each sentence so that it has a similar meaning, using the word given. Do not change the word given.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-13','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai13;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai13, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"There wasn''t a single ticket left for the concert so we couldn''t go. (sell-out)"},"originalSentence":"There wasn''t a single ticket left for the concert so we couldn''t go.","requiredWord":"sell-out","dapan":"The concert was a complete sell-out so we couldn''t go.","giaithich":"a sell-out: (buổi diễn) bán hết vé.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 2, 'Câu 2', 2, '{"debai":{"cauHoiGoc":"You have the ability to do really well in your career if you make an effort. (mind)"},"originalSentence":"You have the ability to do really well in your career if you make an effort.","requiredWord":"mind","dapan":"You could do really well in your career if you put your mind to it.","giaithich":"put your mind to something: tập trung/quyết tâm làm gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 3, 'Câu 3', 3, '{"debai":{"cauHoiGoc":"The news of the merger really surprised the staff. (taken)"},"originalSentence":"The news of the merger really surprised the staff.","requiredWord":"taken","dapan":"The staff were taken aback by the news of the merger.","giaithich":"be taken aback by: sững sờ, bất ngờ vì điều gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 4, 'Câu 4', 4, '{"debai":{"cauHoiGoc":"I expected the film to be good, but it wasn''t at all. (live)"},"originalSentence":"I expected the film to be good, but it wasn''t at all.","requiredWord":"live","dapan":"The film didn''t live up to my expectations at all.","giaithich":"live up to expectations: đáp ứng kỳ vọng.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 5, 'Câu 5', 5, '{"debai":{"cauHoiGoc":"A cup of tea is the most refreshing drink of all. (match)"},"originalSentence":"A cup of tea is the most refreshing drink of all.","requiredWord":"match","dapan":"There''s nothing to match a cup of tea as a refreshing drink.","giaithich":"nothing to match something: không gì sánh bằng.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 6, 'Câu 6', 6, '{"debai":{"cauHoiGoc":"Everyone was shocked by the success of the novel. (shock)"},"originalSentence":"Everyone was shocked by the success of the novel.","requiredWord":"shock","dapan":"The success of the novel came as a shock to everyone.","giaithich":"come as a shock to sb: khiến ai bất ngờ/sốc.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 7, 'Câu 7', 7, '{"debai":{"cauHoiGoc":"It was impossible for Roy to keep the appointment. (way)"},"originalSentence":"It was impossible for Roy to keep the appointment.","requiredWord":"way","dapan":"There was no way Roy could keep the appointment.","giaithich":"there''s no way + mệnh đề: không có cách nào để.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 8, 'Câu 8', 8, '{"debai":{"cauHoiGoc":"Please, stop talking because I can''t concentrate on the film. (quiet)"},"originalSentence":"Please, stop talking because I can''t concentrate on the film.","requiredWord":"quiet","dapan":"I wish you would keep quiet as I can''t concentrate on the film.","giaithich":"wish sb would + V: ước ai đó làm gì (thể hiện sự phàn nàn).","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 9, 'Câu 9', 9, '{"debai":{"cauHoiGoc":"Why don''t you show me your stamp collection? (let)"},"originalSentence":"Why don''t you show me your stamp collection?","requiredWord":"let","dapan":"Why don''t you let me see your stamp collection?","giaithich":"let sb see something: cho ai xem cái gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 10, 'Câu 10', 10, '{"debai":{"cauHoiGoc":"You look tired. Why don''t you go to bed early tonight? (better)"},"originalSentence":"You look tired. Why don''t you go to bed early tonight?","requiredWord":"better","dapan":"You''d better go to bed early tonight as you look tired.","giaithich":"You''d better + V nguyên thể: bạn nên làm gì (lời khuyên).","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 11, 'Câu 11', 11, '{"debai":{"cauHoiGoc":"Zoe has a job which makes her feel very stressed. (less)"},"originalSentence":"Zoe has a job which makes her feel very stressed.","requiredWord":"less","dapan":"Zoe has a job which makes her feel nothing less than stressed.","giaithich":"nothing less than: không gì khác ngoài, hoàn toàn là.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 12, 'Câu 12', 12, '{"debai":{"cauHoiGoc":"Meg wants to be left alone because she''s upset. (rather)"},"originalSentence":"Meg wants to be left alone because she''s upset.","requiredWord":"rather","dapan":"Meg would rather be left alone because she''s upset.","giaithich":"would rather + V nguyên thể: thà rằng, muốn hơn.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 13, 'Câu 13', 13, '{"debai":{"cauHoiGoc":"I regret having committed myself to so many private lessons in the evenings. (not)"},"originalSentence":"I regret having committed myself to so many private lessons in the evenings.","requiredWord":"not","dapan":"If only I had not committed myself to so many private lessons in the evenings.","giaithich":"If only + quá khứ hoàn thành: ước gì (điều trái với quá khứ).","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 14, 'Câu 14', 14, '{"debai":{"cauHoiGoc":"He regrets not taking her threats of leaving him seriously. (wishes)"},"originalSentence":"He regrets not taking her threats of leaving him seriously.","requiredWord":"wishes","dapan":"He wishes he had taken her threats of leaving him seriously.","giaithich":"wish + quá khứ hoàn thành: ước một điều trái với quá khứ.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 15, 'Câu 15', 15, '{"debai":{"cauHoiGoc":"I would love to go on a round-the-world trip. (able)"},"originalSentence":"I would love to go on a round-the-world trip.","requiredWord":"able","dapan":"I wish I were able to go on a round-the-world trip.","giaithich":"wish + quá khứ đơn (were able to): ước điều trái với hiện tại.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 16, 'Câu 16', 16, '{"debai":{"cauHoiGoc":"Why didn''t you take the day off work? (better)"},"originalSentence":"Why didn''t you take the day off work?","requiredWord":"better","dapan":"It would have been better if you had taken the day off work.","giaithich":"It would have been better if + quá khứ hoàn thành: câu điều kiện loại 3, tiếc nuối về quá khứ.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 17, 'Câu 17', 17, '{"debai":{"cauHoiGoc":"“You''d better tidy your desk,” he said. (to)"},"originalSentence":"\\"You''d better tidy your desk,\\" he said.","requiredWord":"to","dapan":"He told me to tidy my desk.","giaithich":"tell sb to do something: câu tường thuật mệnh lệnh/lời khuyên.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 18, 'Câu 18', 18, '{"debai":{"cauHoiGoc":"He''d rather eat with friends than eat alone. (prefers)"},"originalSentence":"He''d rather eat with friends than eat alone.","requiredWord":"prefers","dapan":"He prefers eating with friends to eating alone.","giaithich":"prefer V-ing to V-ing: thích làm gì hơn làm gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 19, 'Câu 19', 19, '{"debai":{"cauHoiGoc":"If we don''t leave now, we won''t catch the train. (or)"},"originalSentence":"If we don''t leave now, we won''t catch the train.","requiredWord":"or","dapan":"We''d better leave now or we won''t catch the train.","giaithich":"..., or + mệnh đề: nếu không thì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW()),
(UUID(), @Bai13, NULL, 20, 'Câu 20', 20, '{"debai":{"cauHoiGoc":"It''s time you started learning French. (for)"},"originalSentence":"It''s time you started learning French.","requiredWord":"for","dapan":"It''s time for you to start French lessons.","giaithich":"it''s time for sb to do something: đã đến lúc ai đó làm gì.","loai":"CQ_SENTENCE_TRANSFORM","la_tu_luan":true,"tags":["sentence_transformation"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 14 — X (Writing). Fill in suitable words or phrases (a-r)
-- -----------------------------------------------------------------------
SET @Bai14 = '0a160014-0000-4000-8000-000000000014';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai14, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - X. Fill in suitable words or phrases', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Fill in the blank with a suitable word or phrase to complete each sentence.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-14','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai14;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai14, NULL, 1, 'Câu a', 1, '{"debai":{"doanVanTruoc":"''You''re late again!","doanVanSau":"caught an earlier bus?''"},"dapan":"Why didn''t you","giaithich":"Why didn''t you + V nguyên thể: sao bạn không...","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 2, 'Câu b', 2, '{"debai":{"doanVanTruoc":"If you don''t stop the car at that red light, you","doanVanSau":"the law."},"dapan":"will be breaking","giaithich":"break the law: vi phạm pháp luật.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 3, 'Câu c', 3, '{"debai":{"doanVanTruoc":"I am pleased to say that we''ve always","doanVanSau":"terms with our neighbours."},"dapan":"been on good","giaithich":"be on good terms with sb: có quan hệ tốt với ai.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 4, 'Câu d', 4, '{"debai":{"doanVanTruoc":"When the fire started, Barbara was the first person","doanVanSau":"the alarm."},"dapan":"to raise","giaithich":"to raise/sound the alarm: báo động (chấp nhận cả \\"to sound\\").","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 5, 'Câu e', 5, '{"debai":{"doanVanTruoc":"He explained to the police that he had","doanVanSau":"stolen."},"dapan":"his wallet","giaithich":"have something stolen: bị mất trộm cái gì (cấu trúc bị động với have).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 6, 'Câu f', 6, '{"debai":{"doanVanTruoc":"It''s high","doanVanSau":"effort to look after yourself."},"dapan":"time you made an","giaithich":"It''s high time + S + quá khứ đơn: đã đến lúc nên làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 7, 'Câu g', 7, '{"debai":{"doanVanTruoc":"You just stepped on my foot! Why","doanVanSau":"where you are going?"},"dapan":"can''t you look","giaithich":"Why can''t you look where you''re going?: sao bạn không nhìn đường vậy?","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 8, 'Câu h', 8, '{"debai":{"doanVanTruoc":"All the restaurants were closed so it was","doanVanSau":"well we had taken a packed lunch with us."},"dapan":"just as","giaithich":"it was just as well (that): may mà, thật may vì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 9, 'Câu i', 9, '{"debai":{"doanVanTruoc":"The thief was believed","doanVanSau":"the building through the upstairs window."},"dapan":"to have entered","giaithich":"be believed to have + V3: được cho là đã làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 10, 'Câu j', 10, '{"debai":{"doanVanTruoc":"Despite several warnings, the swimmers didn''t","doanVanSau":"of the danger-flag flying on the beach."},"dapan":"take any notice","giaithich":"take notice of: chú ý đến.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 11, 'Câu k', 11, '{"debai":{"doanVanTruoc":"Mark Spitz is the only person ever","doanVanSau":"seven gold medals at the Olympic Games."},"dapan":"to have won","giaithich":"the only person ever to have + V3: người duy nhất từng làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 12, 'Câu l', 12, '{"debai":{"doanVanTruoc":"I was surprised at","doanVanSau":"many people on the train."},"dapan":"there being so","giaithich":"be surprised at there being + danh từ: ngạc nhiên vì có... (danh động từ sau giới từ).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 13, 'Câu m', 13, '{"debai":{"doanVanTruoc":"What have you been doing? You","doanVanSau":"job ages ago!"},"dapan":"should have finished the","giaithich":"should have + V3: lẽ ra nên làm (nhưng chưa làm) - trách móc.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 14, 'Câu n', 14, '{"debai":{"doanVanTruoc":"Only after I had read the figures a few times","doanVanSau":"what an awful mess the company was in."},"dapan":"did I realise","giaithich":"Only after + mệnh đề -> đảo ngữ: did + S + V.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 15, 'Câu o', 15, '{"debai":{"doanVanTruoc":"","doanVanSau":"the meeting that it was hardly worth hiring such a large hall."},"dapan":"So few people came to","giaithich":"So + adj/adv + that: đến nỗi mà (nhấn mạnh mức độ ít).","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 16, 'Câu p', 16, '{"debai":{"doanVanTruoc":"Members","doanVanSau":"for the conference in April must do so by January 31st at the latest."},"dapan":"wishing to register","giaithich":"wishing to + V (rút gọn mệnh đề quan hệ): những người muốn...","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 17, 'Câu q', 17, '{"debai":{"doanVanTruoc":"If you want to get his support, you''d","doanVanSau":"antagonise him by mentioning the last project he was involved in."},"dapan":"better not","giaithich":"You''d better not + V nguyên thể: bạn không nên làm gì.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW()),
(UUID(), @Bai14, NULL, 18, 'Câu r', 18, '{"debai":{"doanVanTruoc":"\\"Didn''t you have a meal last night?\\" \\"No. By the time I got home, the family","doanVanSau":".\\""},"dapan":"had already eaten","giaithich":"had already + V3: quá khứ hoàn thành, hành động xảy ra trước một mốc trong quá khứ.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["gap_fill"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 15 — XI. Reading - Unreliable Narrators (MCQ 1-3)
-- -----------------------------------------------------------------------
SET @Bai15 = '0a160015-0000-4000-8000-000000000015';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai15, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: Unreliable Narrators (MCQ)', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Read the passage and mark the letter A, B, C, or D to indicate the correct answer to each question.',
    'An unreliable narrator is any narrator that cannot be trusted to convey a story accurately. This device is used in literature to force readers to question the narrator''s truthfulness. In addition, many authors use unreliable narrators to add a sense of realism to a character.\n\nThe use of the unreliable narrator in order to affect the reader''s trust in the tale being told is well illustrated in "The Cask of Amontillado" by Edgar Allen Poe. The narrator, Montresor, tells the story of how he was wronged. Already, his view is tainted with prejudice as he expresses his desire to take revenge. As the story progresses, the reader begins to distrust his account further as the symptoms of his psychological illness are revealed. Thus, the reader must contemplate the character''s tale and make his or her own decisions about what to believe.\n\nAn unreliable narrator can also give a character an added sense of realism. Many authors realize that people do not always tell the truth. They may misinterpret situations, and writers structure their characters accordingly. In the case of Poe''s Montresor, had Poe depicted him as a truthful, reliable narrator despite his mental instability, the representation would not have been realistic. However, Poe chose to tell the story as Montresor would have told it, thereby giving the reader a more comprehensive understanding of his character.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-15','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai15;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai15, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"What can be inferred about unreliable narrators?","luaChon":[{"id":"A","text":"Most readers believe their lies."},{"id":"B","text":"They were first created by Poe."},{"id":"C","text":"They are very clever characters."},{"id":"D","text":"They may be male or female."}]},"dapan":"D","giaithich":"Bài không giới hạn giới tính của người kể chuyện không đáng tin, nên có thể suy ra họ có thể là nam hoặc nữ.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai15, NULL, 2, 'Câu 2', 2, '{"debai":{"cauHoiGoc":"Which of the following can be inferred about Montresor?","luaChon":[{"id":"A","text":"His illness is not known at the beginning of the story."},{"id":"B","text":"It is difficult for readers to interpret his narration."},{"id":"C","text":"Poe was not aware that he was an unreliable narrator."},{"id":"D","text":"He is the hero of the story."}]},"dapan":"A","giaithich":"Bệnh tâm lý của Montresor chỉ dần được hé lộ khi câu chuyện tiến triển (\\"as the symptoms... are revealed\\"), tức là không được biết ngay từ đầu.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai15, NULL, 3, 'Câu 3', 3, '{"debai":{"cauHoiGoc":"What does the author of the passage imply about realism?","luaChon":[{"id":"A","text":"Realism cannot be present in normal characters."},{"id":"B","text":"Readers find complex characters more realistic."},{"id":"C","text":"Montresor''s mental illness is unrealistic."},{"id":"D","text":"Characters that lie are often more realistic."}]},"dapan":"D","giaithich":"Đoạn 3 chỉ ra người kể chuyện không đáng tin (nói dối/sai lệch) khiến nhân vật chân thực hơn.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 16 — XI. Reading - Unreliable Narrators (Summary, ONE WORD ONLY)
-- -----------------------------------------------------------------------
SET @Bai16 = '0a160016-0000-4000-8000-000000000016';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai16, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: Unreliable Narrators (Summary)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Fill in the blanks to complete the summary. Use ONE WORD ONLY for each answer.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-16','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai16;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai16, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"doanVanTruoc":"According to the passage, an unreliable narrator is a literary","doanVanSau":"that is used to challenge the reader''s trust."},"dapan":"device","giaithich":"a literary device: một thủ pháp văn học.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai16, NULL, 2, 'Chỗ trống (2)', 2, '{"debai":{"doanVanTruoc":"Unreliable narrators are also used by authors to add a sense of","doanVanSau":"to a character."},"dapan":"realism","giaithich":"a sense of realism: cảm giác chân thực.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai16, NULL, 3, 'Chỗ trống (3)', 3, '{"debai":{"doanVanTruoc":"The unreliable narrator in this case is Montresor, whose view is","doanVanSau":"with prejudice and a desire for revenge."},"dapan":"tainted","giaithich":"tainted with prejudice: bị vấy bẩn/nhuốm màu bởi định kiến.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai16, NULL, 4, 'Chỗ trống (4)', 4, '{"debai":{"doanVanTruoc":"Readers must","doanVanSau":"whether or not to believe the unreliable narrator, thereby gaining a more comprehensive understanding of the character."},"dapan":"decide","giaithich":"decide whether or not: quyết định có... hay không (chấp nhận cả \\"contemplate\\").","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai16, NULL, 5, 'Chỗ trống (5)', 5, '{"debai":{"doanVanTruoc":"...thereby gaining a more","doanVanSau":"understanding of the character."},"dapan":"comprehensive","giaithich":"a comprehensive understanding: một sự hiểu biết toàn diện.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 17 — XI. Reading - Entrepreneurs (MCQ 1-3)
-- -----------------------------------------------------------------------
SET @Bai17 = '0a160017-0000-4000-8000-000000000017';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai17, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: Entrepreneurs (MCQ)', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Read the passage and mark the letter A, B, C, or D to indicate the correct answer to each question.',
    'An entrepreneur is a person who takes the risk of starting and managing a business venture in order to make a profit. Many new businesses fail—some studies estimate the failure rate as high as seventy-five percent. Nonetheless, experts believe that two things contribute to success in entrepreneurialism: innovation and a willingness to take calculated risks.\n\nInnovation is necessary in new businesses. The goal is to meet an unsatisfied demand. This requires creativity, the driving force behind innovation. Innovation is particularly important for entrepreneurs attempting to break into e-commerce, or businesses that buy and sell over the Internet. The Internet can provide consumers with both convenience and lower prices. Jeff Bezos, the founder of Amazon.com, realized that many consumers wanted books at discounted prices. They did not care where or how they bought them, and in fact, many preferred to have the books delivered to their homes. Bezos, certain that online demand could be strong, started the first major online bookstore, which is now highly successful.\n\nThe ability to take calculated risks is another key component of a new business. Unlike working in an already established business or organization, an entrepreneur enters a territory in which success is not guaranteed. Thus, the entrepreneur is taking a unique financial and personal risk. Debbi Fields, the owner of Mrs. Fields, a highly successful chain of cookie stores, was told to stay out of the business. People said that no one would buy her cookies, since cookies are available in supermarkets everywhere. Nonetheless, she felt there was a strong demand for fresh, hot cookies. At last, she convinced a bank to finance her homemade cookie business concept in the late 1970s. Her risk paid off—her company is worth over 450 million dollars today.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-17','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai17;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai17, NULL, 1, 'Câu 1', 1, '{"debai":{"cauHoiGoc":"Which of the following can be inferred from paragraph 1 about business?","luaChon":[{"id":"A","text":"New businesses require a significant financial investment."},{"id":"B","text":"Entrepreneurs cannot compete with larger businesses."},{"id":"C","text":"Businesses that are not innovative never succeed."},{"id":"D","text":"Only a quarter of all new businesses are successful."}]},"dapan":"D","giaithich":"Tỉ lệ thất bại lên tới 75% -> chỉ khoảng 1/4 số doanh nghiệp mới thành công.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai17, NULL, 2, 'Câu 2', 2, '{"debai":{"cauHoiGoc":"What does the author suggest about the founder of Amazon.com?","luaChon":[{"id":"A","text":"He had great difficulty in opening this business."},{"id":"B","text":"He can interpret what the consumer really wants."},{"id":"C","text":"He worked in a bookstore before starting his business."},{"id":"D","text":"He hopes to move into other areas of e-commerce."}]},"dapan":"B","giaithich":"Bezos nhận ra chính xác điều khách hàng muốn (sách giá rẻ, giao tận nhà) -> ông hiểu được nhu cầu thực sự của người tiêu dùng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai17, NULL, 3, 'Câu 3', 3, '{"debai":{"cauHoiGoc":"According to paragraph 3, what can be inferred about the cookie company?","luaChon":[{"id":"A","text":"It is the most successful cookie company in history."},{"id":"B","text":"It was originally not popular with customers."},{"id":"C","text":"Its success is due mainly to bank financing."},{"id":"D","text":"It would not have succeeded without risk-taking."}]},"dapan":"D","giaithich":"Debbi Fields chấp nhận rủi ro dù bị can ngăn, và \\"her risk paid off\\" -> thành công nhờ dám chấp nhận rủi ro.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 18 — XI. Reading - Entrepreneurs (Summary)
-- -----------------------------------------------------------------------
SET @Bai18 = '0a160018-0000-4000-8000-000000000018';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai18, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: Entrepreneurs (Summary)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Fill in the blanks to complete the summary. Use ONE WORD ONLY for each answer.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-18','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai18;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai18, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"doanVanTruoc":"According to the passage, entrepreneurialism is the launching of a business","doanVanSau":"in order to make money."},"dapan":"venture","giaithich":"a business venture: một hoạt động kinh doanh mạo hiểm.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai18, NULL, 2, 'Chỗ trống (2)', 2, '{"debai":{"doanVanTruoc":"Two factors that can bring about success in new business are","doanVanSau":"and risk-taking."},"dapan":"innovation","giaithich":"innovation: sự đổi mới/sáng tạo.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai18, NULL, 3, 'Chỗ trống (3)', 3, '{"debai":{"doanVanTruoc":"Risk-taking is another necessary","doanVanSau":"of a new business because many entrepreneurs are competing in a new or difficult territory."},"dapan":"component","giaithich":"a necessary component: một thành tố cần thiết.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai18, NULL, 4, 'Chỗ trống (4)', 4, '{"debai":{"doanVanTruoc":"...because many entrepreneurs are competing in a new or difficult","doanVanSau":"."},"dapan":"territory","giaithich":"a difficult territory: một lĩnh vực/thị trường khó khăn (chấp nhận cả \\"market\\").","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai18, NULL, 5, 'Chỗ trống (5)', 5, '{"debai":{"doanVanTruoc":"For example, the owner of a successful cookie chain had to convince a bank to","doanVanSau":"her business concept in order to become successful."},"dapan":"finance","giaithich":"finance a business concept: cấp vốn cho một ý tưởng kinh doanh.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 19 — XI. Reading - The Tower and the Glory (gapped text, 7 câu,
-- 1 câu thừa). InsertSentence.jsx chỉ hỗ trợ cố định 4 lựa chọn A-D nên
-- dùng CQ_TRAC_NGHIEM_1 (MultipleChoice hỗ trợ số lượng lựa chọn bất kỳ)
-- với đủ 8 câu A-H cho mỗi chỗ trống.
-- -----------------------------------------------------------------------
SET @Bai19 = '0a160019-0000-4000-8000-000000000019';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai19, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: The Tower and the Glory', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Seven sentences have been removed from the passage below, marked (1)-(7). Choose from sentences A-H the one which fits each gap. There is one extra sentence which you do not need to use.',
    'Chris Wilson starts at the bottom when he joins a Spanish team making competitive human pyramids. A large man jams his foot in my car and jumps on to my shoulders. He is quickly followed by another only slightly smaller gentleman who grabs my belt and shimmies up me like a pole. Another follows. My face contorts with pain as the fourth tier mounts on to my back and I begin to sway dangerously. (1)\n\n''Castelling'' (making human castles) is a family sport in Catalonia. Groups normally consist of everyone from tiny children, through awkward adolescents and wiry women, to well-built men at the bottom. (2) I had also heard that being overweight and unfit would not count against me. Sure enough, when I turned up for my first training session, I could sense that, for the first time in years, my ever-expanding physique was being appreciatively looked at.\n\nCastelling began almost 200 years ago near Tarragona, just south of Barcelona. Out of nowhere, it seems that people suddenly began forming themselves into human towers. Since then the sport, if you can call it that, has become an expression of Catalan identity, with groups competing to build ever higher and more elegant structures. (3) Once or twice it has managed a six-tier tower. The top teams regularly manage eight or nine. It was my intention to add a little British beef to the group to help them reach the next level in time for the competitions to be held tomorrow in Barcelona on the National Day of Catalonia.\n\nAt first I had thought that I might like to go on top to bask in the glory, but the club''s president soon put me straight. He indicated a spindly little girl who looked as though she had been raised entirely on broccoli, and not much of it at that. It is she who has pride of place on top of the pyramid.\n\n(4) For my first try-out I was given the role of segones mans (second hands), which meant that I supported the wrists of the man who supported the buttocks of the first rank of the pyramid.\n\nOnce I had assumed my position, people began to scramble up me and on to the tower without warning. (5) Still, my hard work must have been appreciated because I was quickly promoted to be primeres mans and support the bottoms of the first level of the pyramid that we were making under the watchful eye of the artistic director.\n\nMy performance in the ''hands'' section had obviously been satisfactory because at the third training session I was called forward and given the very great honour of the President''s Belt.\n\n(6) Being offered this belt, still warm from the very waist of the President, was a clear gesture that me and my bulk had been accepted. Finally, I had made it to the bottom of the pile.\n\nBeing a pillar in a castell is much like being a bass player in a band. You know that everyone in the crowd is cheering for the singer or the lead guitarist, no matter how important the rhythm section. When we take the stage tomorrow, no one in the crowd will know who I am, or even be able to see me down at the bottom. All their cheering will be for the little girl on top. (7) It felt great.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-19','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai19;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai19, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (1).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"F","giaithich":"Câu (F) tổng kết cảm nhận sau đoạn mở đầu miêu tả cảnh bị trèo lên người - \\"làm người đỡ dưới cùng của tháp người không dễ dàng\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 2, 'Chỗ trống (2)', 2, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (2).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"D","giaithich":"Câu (D) giải thích lý do tác giả bị thu hút bởi castelling, dẫn vào câu tiếp theo \\"I had also heard that being overweight and unfit would not count against me.\\"","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 3, 'Chỗ trống (3)', 3, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (3).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"H","giaithich":"Câu (H) giới thiệu đội của tác giả ở Figueres là đội hạng hai, giải thích vì sao đội chỉ đạt tháp 6 tầng trong khi đội mạnh đạt 8-9 tầng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 4, 'Chỗ trống (4)', 4, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (4).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"G","giaithich":"Câu (G) giải thích chiếc đai (belt) mà mỗi casteller quấn quanh eo - liên quan trực tiếp đến vai trò \\"second hands\\" được nhắc ngay sau.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 5, 'Chỗ trống (5)', 5, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (5).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"E","giaithich":"Câu (E) mô tả việc người khác trèo lên nhanh chóng hình thành tháp 3 tầng - khớp với \\"people began to scramble up me... without warning\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 6, 'Chỗ trống (6)', 6, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (6).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"A","giaithich":"Câu (A) nói vị trí tốt nhất tác giả có thể mong đợi là ở dưới cùng, nhưng vinh dự đó cũng phải giành được - dẫn vào việc được trao \\"President''s Belt\\".","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW()),
(UUID(), @Bai19, NULL, 7, 'Chỗ trống (7)', 7, '{"debai":{"cauHoiGoc":"Chọn câu thích hợp nhất cho vị trí (7).","luaChon":[{"id":"A","text":"The best I could hope for was to be at the bottom, but even that honour has to be earned."},{"id":"B","text":"So I knew that everyone at the training session that night would have cheered with good-natured delight if I had done that."},{"id":"C","text":"But that memorable night in Figueres, despite the incredible strain, I held steady and the applause was all for me."},{"id":"D","text":"I had been attracted to castelling because I had been told that it requires almost no skill or co-ordination."},{"id":"E","text":"Within seconds I had assisted in the formation of a three-tier tower without really noticing what was happening."},{"id":"F","text":"It''s not easy being the bottom man of a human pyramid."},{"id":"G","text":"Each casteller is wound into a large strip of material worn around the waist to support the back and to help the other castellers grip when they climb."},{"id":"H","text":"The group I had joined in Figueres, near the French border, is very much a second-division outfit."}]},"dapan":"C","giaithich":"Câu (C) kể lại đêm thi đấu ở Figueres và việc tác giả đứng vững, khớp với câu kết \\"It felt great.\\" Câu (B) là câu thừa không dùng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["gapped_text"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 20 — XI. Reading - Wheels that changed the world (Match 8-22)
-- -----------------------------------------------------------------------
SET @Bai20 = '0a160020-0000-4000-8000-000000000020';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai20, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - XI. Reading: Wheels that changed the world', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'The article has 4 sections, A-D. For each question, choose the section (A, B, C or D) where the information is mentioned. Sections may be used more than once.',
    'Section A:\nThe bicycle was an absolutely extraordinary creation. Inventors had first begun to wrestle with the challenge of coming up with a human-powered vehicle in the 17th century. In 1696, a French doctor used his manservant to power a pedal-driven carriage while the master sat up front and steered. The beginnings of the modern bicycle emerged in 1818 when Karl von Drais, an eccentric German baron, invented what we now know as the hobbyhorse. It was bicycle-shaped with wooden wheels but had no pedals: the rider had to push it forward with his feet. At £8 - equivalent today to £500 - the hobbyhorse could be afforded only by true gentlemen, and it soon became a much sought-after status symbol. But the craze died out after a year following a statement from the London College of Surgeons, which said darkly that the hobbyhorse could cause ''internal injuries''.\n\nSection B:\nBrilliant minds continued to wrestle with the mechanical horse but made slow progress. Even Britain''s top engineer, Isambard Kingdom Brunel, could come up with nothing better than a hobbyhorse that ran on railway tracks. Finally, a Parisian blacksmith called Pierre Michaux added a pair of pedals to a hobbyhorse, and the bicycle was born. The Michaux bicycle had pedals fixed directly to the front wheel, just like a child''s tricycle today. Made largely of iron, it weighed as much as a fridge but was easy to ride and took a man up to five miles with the effort he would use to walk only one. Michaux''s first newspaper advertisement in May 1867 offered ''pedal velocipedes'' for 250 francs.\nAt this price only the wealthy could afford one and a group of 20 young men spent their days showing off their ''steeds'' before fascinated crowds in the Bois de Boulogne. Michaux was soon producing 20 bicycles a day, and decided to organize a women''s race as a stunt to boost his sales further. A racecourse in Bordeaux was roped off, but when the four lady racers made their appearance in short skirts, the crowd of 3,000 burst through the barriers. Nevertheless, the ladies raced off. A contemporary report recorded that Miss Louise took an early lead, but Miss Julie made a ''superhuman effort'', passing her on the home straight and winning by a nose. Within a year, there were 50,000 bicycles in France.\n\nSection C:\nNot to be outdone by their French counterparts, British engineers set about improving bicycle design with wire-spoked wheels and solid rubber tyres. The weight was reduced to a mere 44lb, only twice the weight of a bike today. Gears and chains were still thought too heavy and complex to be fitted to a bicycle, so designers could increase top speed only by increasing the size of the front wheel. Eventually front wheels grew until they were 5ft and the penny farthing was born. Speeds of 20 mph were now possible, but the rider''s seat was directly above the front wheel, which made riding in a skirt impossible, so women were effectively barred from bicycles. To make up for it, manufacturers developed tricycles with low seats. The penny farthing''s biggest drawback was its danger: the high seat was difficult to climb into, and once up there the driver had a long way to fall.\n\nSection D:\nIn 1885, John Starley launched the Rover Safety Bicycle, the first model to adopt what we now think of as the traditional design. The bicycle industry was unimpressed, as it had a chain-driven rear wheel, which added weight, and a low seat, which made male riders look a bit ridiculous. But it turned out to be faster than a penny farthing because it was more aerodynamic. More importantly, the Rover could be ridden in a skirt. At £22, it was more expensive than a penny farthing, but its practicality was just what the public wanted.\nSoon there were half a million bicycles in the UK. Between 1890 and 1900, the bicycle was refined until the basic design became very similar to the feather weights that modern champions ride in the Tour de France. Lightweight steel tubing, the diamond-shaped frame, gears and pneumatic tyres with separate inner tubes all became common. Top speeds of 25 mph could now be reached. At last the cyclist could outrun a galloping horse. The bicycle was found in every walk of life: policemen and postmen had them and several European armies issued them to their soldiers.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-20','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai20;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai20, NULL, 1, 'Câu 8', 1, '{"debai":{"cauHoiGoc":"features that were not added because they were considered problematic","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"C","giaithich":"Section C: gears and chains bị coi là quá nặng và phức tạp nên không được lắp vào xe đạp.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 2, 'Câu 9', 2, '{"debai":{"cauHoiGoc":"a design that is exactly the same as that of current products","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"D","giaithich":"Section D: thiết kế trở nên rất giống với xe đạp của các nhà vô địch hiện đại tại Tour de France.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 3, 'Câu 10', 3, '{"debai":{"cauHoiGoc":"a product that became popular despite its price in comparison with an existing product","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"D","giaithich":"Section D: Rover đắt hơn penny farthing nhưng vẫn được ưa chuộng nhờ tính thực dụng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 4, 'Câu 11', 4, '{"debai":{"cauHoiGoc":"a dramatic reaction to a particular sight","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"B","giaithich":"Section B: đám đông xô đổ hàng rào khi thấy các nữ vận động viên mặc váy ngắn.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 5, 'Câu 12', 5, '{"debai":{"cauHoiGoc":"a design feature that it was felt would not appeal to men","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"D","giaithich":"Section D: yên xe thấp khiến người cưỡi nam trông có phần lố bịch.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 6, 'Câu 13', 6, '{"debai":{"cauHoiGoc":"a warning that affected the appeal of a certain product","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"A","giaithich":"Section A: tuyên bố của Đại học Phẫu thuật London cảnh báo hobbyhorse có thể gây thương tích, khiến trào lưu này suy tàn.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 7, 'Câu 14', 7, '{"debai":{"cauHoiGoc":"a design that required more than one person to operate the vehicle","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"A","giaithich":"Section A: bác sĩ người Pháp dùng người hầu để đạp xe trong khi ông ngồi lái phía trước.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 8, 'Câu 15', 8, '{"debai":{"cauHoiGoc":"an attempt to get publicity","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"B","giaithich":"Section B: Michaux tổ chức cuộc đua nữ như một chiêu quảng bá để tăng doanh số.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 9, 'Câu 16', 9, '{"debai":{"cauHoiGoc":"the possibility of injury because of where the rider sat","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"C","giaithich":"Section C: yên xe penny farthing quá cao, khó leo lên và ngã sẽ rất nguy hiểm.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 10, 'Câu 17', 10, '{"debai":{"cauHoiGoc":"products that were introduced to compensate for a disadvantage of another product","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"C","giaithich":"Section C: xe ba bánh yên thấp được phát triển để bù đắp cho việc phụ nữ bị loại khỏi penny farthing.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 11, 'Câu 18', 11, '{"debai":{"cauHoiGoc":"an aspect of design that limited the number of people who could use a certain product","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"C","giaithich":"Section C: yên xe phía trên bánh trước khiến việc mặc váy để đi xe là không thể, loại phụ nữ khỏi việc sử dụng.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 12, 'Câu 19', 12, '{"debai":{"cauHoiGoc":"a design that some manufacturers felt would not become popular","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"D","giaithich":"Section D: ngành công nghiệp xe đạp ban đầu không ấn tượng với thiết kế Rover.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 13, 'Câu 20', 13, '{"debai":{"cauHoiGoc":"people riding a certain product in order to impress others","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"B","giaithich":"Section B: 20 chàng trai trẻ phô diễn \\"chiến mã\\" của mình trước đám đông ngưỡng mộ.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 14, 'Câu 21', 14, '{"debai":{"cauHoiGoc":"the motivation of one set of people for changing bicycle design","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"C","giaithich":"Section C: kỹ sư Anh cải tiến thiết kế vì không muốn thua kém đối thủ Pháp.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW()),
(UUID(), @Bai20, NULL, 15, 'Câu 22', 15, '{"debai":{"cauHoiGoc":"an account of a remarkable achievement","luaChon":[{"id":"A","text":"Section A"},{"id":"B","text":"Section B"},{"id":"C","text":"Section C"},{"id":"D","text":"Section D"}]},"dapan":"B","giaithich":"Section B: chỉ trong một năm, số xe đạp tại Pháp đã lên tới 50.000 chiếc - một sự tăng trưởng đáng kinh ngạc.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading","matching_information"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 21 — Exercise 1: The National Policy (Canada)
-- -----------------------------------------------------------------------
SET @Bai21 = '0a160021-0000-4000-8000-000000000021';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai21, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 1: The National Policy (Canada)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.',
    'In 1879, the Canadian government enacted the National Policy, an economic programme that sought to safeguard Canadian manufacturers and promote settlement of Canada''s western frontier. A primary goal of the programme''s leading advocate, Prime Minister John Macdonald, was to decrease Canada''s reliance on imported products. To achieve this, he instituted a high tariff on all manufactured goods that were imported. He argued that the tariff would lead to a higher standard of living and greater employment security for Canadians, and it did for those in the manufacturing sectors of the East, where Canada immediately experienced increased production and profits.\n\nHowever the ambition of western settlement was slow to be realised. Despite aggressive immigration campaigns, which tried to lure farmers from abroad with free or cheap land, Canada witnessed a decline in immigration in the 1880s. According to economist Ken Norrie, this shows that the influence of the National Policy on settlement of the West was mediocre. In fact, external factors, such as the development of improved agricultural techniques, and favourable economic conditions globally, were largely responsible. The price of wheat, for instance, quadrupled between 1891 and 1921, and this brought profit-seeking agriculturalists to Canada''s fruitful wheat-growing regions in droves.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-21','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai21;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai21, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"doanVanTruoc":"By using a high tariff, the prime minister increased living standards and job","doanVanSau":"in the eastern part of the country."},"dapan":"security","giaithich":"job security: sự đảm bảo việc làm.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai21, NULL, 2, 'Chỗ trống (2)', 2, '{"debai":{"doanVanTruoc":"Better","doanVanSau":"in agriculture and a good world economy were of greater importance."},"dapan":"techniques","giaithich":"lấy từ \\"the development of improved agricultural techniques\\" trong bài.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 22 — Exercise 2: History of Studs
-- -----------------------------------------------------------------------
SET @Bai22 = '0a160022-0000-4000-8000-000000000022';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai22, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 2: History of Studs', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Choose ONE WORD ONLY from the passage for each answer.',
    'Although attaching studs and spikes to clothing is today associated with the punk and metal subcultures of the 1980s, the practice is nothing new. In fact, studs and spikes have been around for as long as it has been necessary to protect oneself and exude a spirit of aggression. The medieval brigandine, for instance, was a form of armour that consisted of steel plates on top of fabric, and the plates were riveted there by fasteners that resembled the studs used in contemporary fashions. But apart from keeping the steel plates attached, they also helped absorb the shock from heavy blunt weapons and made it more difficult for blades to pierce through. The same idea was applied to the protective clothing put on animals. Hunting dogs, notably, were often put in spiked collars when their ancient Roman owners took them out to capture dangerous game, like lions and bears. This way, if a dog were to get bitten on the neck, the spikes would protect it and likely injure the more savage beast in the process.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-22','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai22;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai22, NULL, 1, 'Chỗ trống (3)', 1, '{"debai":{"doanVanTruoc":"On the type of medieval armour known as the brigandine they fastened steel plates to","doanVanSau":", keeping people safe from injury."},"dapan":"fabric","giaithich":"steel plates on top of fabric: các tấm thép được gắn lên vải.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai22, NULL, 2, 'Chỗ trống (4)', 2, '{"debai":{"doanVanTruoc":"They were also used for intimidation; people in spiked or studded clothes were known to be dangerous because they were","doanVanSau":", so others avoided them."},"dapan":"aggressive","giaithich":"exude a spirit of aggression: toát lên tinh thần hung hãn.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 23 — Exercise 3: Micro-expressions
-- -----------------------------------------------------------------------
SET @Bai23 = '0a160023-0000-4000-8000-000000000023';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai23, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 3: Micro-expressions', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
    'It may be tempting to put on a false face or stretch the truth at times, but it turns out that even the most convincing among us may be incapable of pulling off an act of deception that leaves no one in doubt. This is because muscles in the human face react involuntarily to emotions. The scowls, smirks, and frowns that can betray how a liar truly feels may only flash across his or her face for a brief moment - so brief, in fact, that research psychologist Paul Ekman called these emotional displays ''micro expressions'' - but they do occur, and they are detectable. According to Ekman, there are seven universal micro expressions: disgust, anger, fear, sadness, happiness, surprise, and contempt. When we feel any of these emotions, they are beyond our control for at least one twentieth of a second. Videotaping a person who is providing a false statement and then going through the tape frame by frame can reveal these expressions, even in people who seem very genuine in person. Of course, this may not always be an option. In such cases, keeping an eye out for hand gestures that obscure the face is advisable. People who move their hands toward their eyes or their mouths - the most expressive parts of the face - may be trying to avoid being caught in the split second that micro expressions occur.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-23','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai23;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai23, NULL, 1, 'Chỗ trống (5)', 1, '{"debai":{"doanVanTruoc":"Due to the automatic reactions of our facial","doanVanSau":", when we experience certain emotions, the perfect lie may not be possible."},"dapan":"muscles","giaithich":"muscles in the human face react involuntarily to emotions.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai23, NULL, 2, 'Chỗ trống (6)', 2, '{"debai":{"doanVanTruoc":"...can be revealed by analysing the individual frames of a videotape of someone who is giving a","doanVanSau":"."},"dapan":"false statement","giaithich":"a person who is providing a false statement.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai23, NULL, 3, 'Chỗ trống (7)', 3, '{"debai":{"doanVanTruoc":"In cases where this is not possible, it is a good idea to watch for hand","doanVanSau":"that hide the face."},"dapan":"gestures","giaithich":"hand gestures that obscure the face.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 24 — Exercise 4: Techniques of Bluegill Cuckolds (word list A-G)
-- -----------------------------------------------------------------------
SET @Bai24 = '0a160024-0000-4000-8000-000000000024';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai24, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 4: Techniques of Bluegill Cuckolds', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words, A-G, below. Each word may be used once, more than once, or not at all.',
    'The bluegill is one of the most popular gaming fish in North America and is frequently found in freshwater lakes and ponds. This relatively small fish has been the subject of intense study by wildlife biologists for its unusual mating habits. While similar to other fish in that the male cares for the offspring, the bluegill is unique in that some males use deception and mimicry to inseminate eggs meant for a different, larger male. Around 20 per cent of bluegill males attempt to enter the mating process through trickery before they are fully grown. These fish, known as cuckolds or sneakers, will seek out a large parental male, hide in the weeds adjacent to the male''s grounds, and wait for a school of female fish to pass over. Once a female chooses a partner, she will tilt her body and release roughly 30 eggs. Normally, the resident male would shower these eggs with his seed, but before he has a chance to reach them, the diminutive cuckold will leave his safety zone and dart into the nest of the larger male to inseminate the eggs himself, quickly returning to his point of origin without being caught.\n\nWith this tactic, the cuckold can fertilise as many of the eggs as possible before they settle into the hole, and then use his undersized body to escape undetected. This technique is only available to younger bluegills, however, since the size of adult bluegills precludes the agility required for this operation. Nonetheless, older cuckolds do adopt another method to achieve their goals. An adult cuckold is still smaller than most male bluegills and can easily be mistaken for a female. As they age, the cuckold will acquire a set of shaded areas and stripes on its body that is similar to that on females, which completely disguises them from other males and allows them to easily slip into schools of female fish unnoticed. In this fashion, they wait until a nearby female decides to release her eggs before swooping down and inseminating them. If a good selection is fertilised, then the cuckold has accomplished his reproductive duties.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-24','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('hole','colour','nest','pattern','seed','tail','body')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai24;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai24, NULL, 1, 'Chỗ trống (8)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (8)","doanVan":"Techniques of Bluegill Cuckolds\\n\\nBluegill cuckolds cheat their way into fertilising eggs that are not meant for them. They do this by hiding near another male''s (8) ________ and darting into it at just the right moment. Because a cuckold has a much smaller (9) ________ than most males, it can easily get out of danger quickly. Older cuckolds have another method. They are still not as big as most males, so they swim with female bluegills and wait for one to release its eggs. These cuckolds can avoid being noticed because they take on a (10) ________ that looks like the one on females.","soChoTrong":8},"dapan":"nest","giaithich":"dart into the nest of the larger male.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai24, NULL, 2, 'Chỗ trống (9)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (9)","doanVan":"Techniques of Bluegill Cuckolds\\n\\nBluegill cuckolds cheat their way into fertilising eggs that are not meant for them. They do this by hiding near another male''s (8) ________ and darting into it at just the right moment. Because a cuckold has a much smaller (9) ________ than most males, it can easily get out of danger quickly. Older cuckolds have another method. They are still not as big as most males, so they swim with female bluegills and wait for one to release its eggs. These cuckolds can avoid being noticed because they take on a (10) ________ that looks like the one on females.","soChoTrong":9},"dapan":"body","giaithich":"use his undersized body to escape undetected.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai24, NULL, 3, 'Chỗ trống (10)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (10)","doanVan":"Techniques of Bluegill Cuckolds\\n\\nBluegill cuckolds cheat their way into fertilising eggs that are not meant for them. They do this by hiding near another male''s (8) ________ and darting into it at just the right moment. Because a cuckold has a much smaller (9) ________ than most males, it can easily get out of danger quickly. Older cuckolds have another method. They are still not as big as most males, so they swim with female bluegills and wait for one to release its eggs. These cuckolds can avoid being noticed because they take on a (10) ________ that looks like the one on females.","soChoTrong":10},"dapan":"pattern","giaithich":"acquire a set of shaded areas and stripes... a pattern similar to females.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 25 — Exercise 5: From Menageries to Zoos (word list A-G)
-- -----------------------------------------------------------------------
SET @Bai25 = '0a160025-0000-4000-8000-000000000025';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai25, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 5: From Menageries to Zoos', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words, A-G, below.',
    'Whilst often considered a modern invention, zoos are actually embedded in a history of animal captivity that spans back thousands of years. A discovery during excavations near Hierakonpolis, Egypt, uncovered the remnants of hippos, elephants, baboons and wildcats buried in the city''s cemetery. Dating back to around 3500 B.C., the remnants point to the existence of a menagerie, a private collection of animals kept by the wealthiest members of society to demonstrate power, to intimidate enemies, to entertain rulers and their guests, and even to hunt. Menageries remained popular in Egypt and elsewhere for quite some time. Queen Hatshepsut of Egypt, who ruled around 1500 B.C., kept a menagerie of animals acquired during expeditions to Punt, in present-day Somalia. Around the same time in China, Emperor Wen Wang founded the Garden of Intelligence, which included a huge collection of animals kept on a 1,500-acre property.\n\nMenageries were also a central part of the Aztec culture of central Mexico between the 14th and 16th centuries. When Spanish explorer Hernán Cortés reached the New World in 1520, he wrote about his discovery of a massive collection of animals at Tenochtitlan, the capital of Aztec ruler Montezuma. More than 300 people were assigned to the care of the extensive royal menagerie, reputed to be the largest assortment of animals in history. The complex in which the animals were housed was impressive enough in its own right, with two main houses, a botanical garden and an aquarium. Unfortunately, the facilities and the animals kept within them were subsequently destroyed by the Spanish during an attack. Zoos began to replace menageries in Europe during the 18th century, when the Age of Enlightenment ushered in a new belief in science and reason, which extended to the field of biology. Therefore zoos were created to facilitate the scientific observation of animals in something similar to their natural habitat. They were open to the public, for a fee, to ensure they had the necessary funding. The first of these modern zoos was the Tiergarten Schonbrunn, opened in Vienna, Austria in 1752, inaugurating a new age of zoology and consigning the menagerie to ancient history.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-25','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('environment','army','garden','biology','elite','remains','architecture')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai25;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai25, NULL, 1, 'Chỗ trống (11)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (11)","doanVan":"From Menageries to Zoos\\n\\nAn archaeological dig in the Egyptian city of Hierakonpolis revealed the (11) ________ of many species of animal, which had been buried within the city''s cemetery thousands of years ago. This was evidence of a menagerie, a private collection of exotic creatures. The (12) ________ would use such a collection to show their authority and scare enemies.\\n\\nZoos as we know them today began to appear during the 18th century, when the Enlightenment spread an interest in science throughout Europe, which included (13) ________. These zoos tried to create something like a natural (14) ________ for their animals, so that they could be studied.","soChoTrong":11},"dapan":"remains","giaithich":"the remnants/remains of many species of animal.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai25, NULL, 2, 'Chỗ trống (12)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (12)","doanVan":"From Menageries to Zoos\\n\\nAn archaeological dig in the Egyptian city of Hierakonpolis revealed the (11) ________ of many species of animal, which had been buried within the city''s cemetery thousands of years ago. This was evidence of a menagerie, a private collection of exotic creatures. The (12) ________ would use such a collection to show their authority and scare enemies.\\n\\nZoos as we know them today began to appear during the 18th century, when the Enlightenment spread an interest in science throughout Europe, which included (13) ________. These zoos tried to create something like a natural (14) ________ for their animals, so that they could be studied.","soChoTrong":12},"dapan":"elite","giaithich":"kept by the wealthiest members of society - the elite.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai25, NULL, 3, 'Chỗ trống (13)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (13)","doanVan":"From Menageries to Zoos\\n\\nAn archaeological dig in the Egyptian city of Hierakonpolis revealed the (11) ________ of many species of animal, which had been buried within the city''s cemetery thousands of years ago. This was evidence of a menagerie, a private collection of exotic creatures. The (12) ________ would use such a collection to show their authority and scare enemies.\\n\\nZoos as we know them today began to appear during the 18th century, when the Enlightenment spread an interest in science throughout Europe, which included (13) ________. These zoos tried to create something like a natural (14) ________ for their animals, so that they could be studied.","soChoTrong":13},"dapan":"biology","giaithich":"a new belief in science and reason, which extended to the field of biology.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai25, NULL, 4, 'Chỗ trống (14)', 4, '{"debai":{"cauHoiGoc":"Chỗ trống (14)","doanVan":"From Menageries to Zoos\\n\\nAn archaeological dig in the Egyptian city of Hierakonpolis revealed the (11) ________ of many species of animal, which had been buried within the city''s cemetery thousands of years ago. This was evidence of a menagerie, a private collection of exotic creatures. The (12) ________ would use such a collection to show their authority and scare enemies.\\n\\nZoos as we know them today began to appear during the 18th century, when the Enlightenment spread an interest in science throughout Europe, which included (13) ________. These zoos tried to create something like a natural (14) ________ for their animals, so that they could be studied.","soChoTrong":14},"dapan":"environment","giaithich":"create something like a natural environment/habitat for their animals.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 26 — Exercise 6: Saving the Otter (word list A-H)
-- -----------------------------------------------------------------------
SET @Bai26 = '0a160026-0000-4000-8000-000000000026';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai26, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 6: Saving the Otter', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words, A-H, below.',
    'There are thirteen species of otter, all of which are associated with water, such as rivers, or in the case of the sea otter, coastal areas of the sea. Otters can be distinguished by their elongated body, their stubby arms and legs, and their webbed feet, which allow them to traverse the water with considerable dexterity. They also have the ability to hold their breath underwater for long periods of time, and some otters have been observed staying under the surface for up to five minutes. They can also be distinguished by their fur, which is very dense and has unfortunately made them the target of humans throughout history. The sea otter, which lives in coastal regions of the northern Pacific Ocean, has the thickest fur of any animal. Historically, this made it one of the most lucrative species for hunters and led to a sharp drop in the worldwide population of sea otters, which is only now starting to abate. As the value of its fur increased, demand for this ''soft gold'', as it was called, also grew and brought about a period called the ''Great Hunt''. During this period, which lasted from approximately 1741 to 1911, hunters from Russia and other regions ravaged wild sea otter populations with great intensity.\n\nThe hunting of sea otters only started to decline when the disappearance of large populations made commercial hunting no longer possible. Eventually an international accord was signed in 1911 that imposed a ban on the hunting of sea otters. By that point, it was estimated that only around two thousand sea otters remained in the wild, and most experts believed the species would eventually become extinct. However, conservation efforts during the 20th century contributed to a substantial growth in the sea otter population, and their return to the habitats of the Pacific coast from which they had almost completely disappeared. Nonetheless, sea otters are still considered an endangered species, and are threatened by fishing, disease, and pollution, as well as poaching. Sea otters may represent one of the great success stories of marine conservation, but their recovery is still at risk by human activity, and maintaining that success requires renewed vigilance.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-26','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('glossy','strong','local','thick','marine','global','long','wild')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai26;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai26, NULL, 1, 'Chỗ trống (15)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (15)","doanVan":"Saving the Otter\\n\\nRenowned for the ability to hold its breath for lengthy spells underwater, the otter has unfortunately been the target of hunters because of its (15) ________ fur. Along with their fur, these otters are notable for having short arms and (16) ________ bodies.\\n\\nThe (17) ________ otter population was hunted intensely during the 18th century, a period when their fur was one of the most profitable commodities in the world. However, a ban was instituted in the early 20th century and populations have recovered, in a rare example of a successful (18) ________ conservation effort.","soChoTrong":15},"dapan":"thick","giaithich":"fur which is very dense - thick.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai26, NULL, 2, 'Chỗ trống (16)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (16)","doanVan":"Saving the Otter\\n\\nRenowned for the ability to hold its breath for lengthy spells underwater, the otter has unfortunately been the target of hunters because of its (15) ________ fur. Along with their fur, these otters are notable for having short arms and (16) ________ bodies.\\n\\nThe (17) ________ otter population was hunted intensely during the 18th century, a period when their fur was one of the most profitable commodities in the world. However, a ban was instituted in the early 20th century and populations have recovered, in a rare example of a successful (18) ________ conservation effort.","soChoTrong":16},"dapan":"long","giaithich":"elongated body -> long bodies.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai26, NULL, 3, 'Chỗ trống (17)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (17)","doanVan":"Saving the Otter\\n\\nRenowned for the ability to hold its breath for lengthy spells underwater, the otter has unfortunately been the target of hunters because of its (15) ________ fur. Along with their fur, these otters are notable for having short arms and (16) ________ bodies.\\n\\nThe (17) ________ otter population was hunted intensely during the 18th century, a period when their fur was one of the most profitable commodities in the world. However, a ban was instituted in the early 20th century and populations have recovered, in a rare example of a successful (18) ________ conservation effort.","soChoTrong":17},"dapan":"wild","giaithich":"ravaged wild sea otter populations.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai26, NULL, 4, 'Chỗ trống (18)', 4, '{"debai":{"cauHoiGoc":"Chỗ trống (18)","doanVan":"Saving the Otter\\n\\nRenowned for the ability to hold its breath for lengthy spells underwater, the otter has unfortunately been the target of hunters because of its (15) ________ fur. Along with their fur, these otters are notable for having short arms and (16) ________ bodies.\\n\\nThe (17) ________ otter population was hunted intensely during the 18th century, a period when their fur was one of the most profitable commodities in the world. However, a ban was instituted in the early 20th century and populations have recovered, in a rare example of a successful (18) ________ conservation effort.","soChoTrong":18},"dapan":"global","giaithich":"one of the great success stories of marine conservation - a global effort.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 27 — Exercise 7: Urbanisation and the Steam Engine
-- -----------------------------------------------------------------------
SET @Bai27 = '0a160027-0000-4000-8000-000000000027';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai27, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 7: Urbanisation and the Steam Engine', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Complete the summary below. Choose ONE WORD ONLY from the passage for each answer.',
    'How Steam Power Drove the Industrial Revolution\n\nPrior to the industrialisation and urbanisation that fuelled spectacular growth in Britain''s economy over the course of the 19th century, most work was performed by manual labour and animals, heat was provided by the burning of organic materials, and energy needs were satisfied by watermills. While waterpower offered abundant and cheap energy, its geographical constraints made it inconvenient. The steam engine, however, faced no such limitations. It would not be long before it became the icon of the Industrial Revolution and the driving force behind the fundamental changes that all of Western civilisation would ultimately undergo.\n\nAs commercial enterprises began to equip themselves with steam-driven machines, the manufacturing industry was transformed. Textile machines running on steam power, for example, could spin multiple threads with the turn of a single wheel and coordinate precise movements using levers, cams, and gears. The mining industry also benefitted because, for these machines to effectively produce mechanical power, water had to be heated in a boiler, which required a cheap and reliable fuel source - coal.\n\nIn transport, high horsepower steam engines gave life to ships and locomotives, greatly improving their reliability, precision, and speed. Consequently, urban industrialists were able to deliver tons of finished products to previously unreachable areas in relatively little time, while raw materials from distant British colonies zoomed into the massive and more cost-effective factories that had replaced smaller production plants. These mega factories, although initially built on the outskirts of residential areas, expanded into cities as more than half of the English population, lured by the job opportunities manufacturers were offering, moved away from the countryside. Adjusting to life in cities would prompt eye-opening lifestyle shifts for the majority of British people.\n\nAmong these is that people learned to read, with the literacy rate skyrocketing. Books had previously been a rare and tightly-controlled resource because they were quite time-consuming and expensive to produce, but millions of pages of text could be churned out in a single day thanks to the efficiency of these new machines. With printing presses and literacy, new forms of thought in the fields of politics, philosophy, and science began to spread among the people.\n\nUltimately, the age of the steam engine had drawn to a close by the end of the 19th century, when it was replaced by a new form of power called electricity. Although electricity is a vital part of contemporary existence, it is questionable whether it ever would have been possible without the technological breakthrough - and the social, intellectual, and cultural advances it spurred - that was the steam engine.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-27','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai27;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai27, NULL, 1, 'Chỗ trống (19)', 1, '{"debai":{"doanVanTruoc":"The steam engine allowed manufacturers to bring resources from all around the world into their","doanVanSau":"."},"dapan":"factories","giaithich":"the massive and more cost-effective factories.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai27, NULL, 2, 'Chỗ trống (20)', 2, '{"debai":{"doanVanTruoc":"At first, they were built on the edges of populated areas, but it wasn''t long before they began opening in","doanVanSau":"."},"dapan":"cities","giaithich":"the mega factories... expanded into cities.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai27, NULL, 3, 'Chỗ trống (21)', 3, '{"debai":{"doanVanTruoc":"People began leaving rural jobs to pursue the new opportunities factory work offered. This led to many changes in the","doanVanSau":"of most of the British population."},"dapan":"lifestyle","giaithich":"eye-opening lifestyle shifts for the majority of British people.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 28 — Exercise 8: The Causes of Deforestation (word list A-I)
-- -----------------------------------------------------------------------
SET @Bai28 = '0a160028-0000-4000-8000-000000000028';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai28, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 8: The Causes of Deforestation', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words, A-I, below.',
    'Our Vanishing Rainforests\n\nFound primarily in Latin America but also existing in areas of Asia and Africa, the world''s rainforests are under siege, losing between 46 and 58 thousand square miles every year. These areas of the world are indispensable, not just to the flora and fauna that live there, but also to the Earth itself. This is due to the fact that vegetation keeps pollution levels at bay by absorbing the massive amounts of carbon dioxide humans continually pump into the atmosphere through the burning of fossil fuels. Because trees from the planet''s rainforests are disappearing at an alarming rate, they are less able to perform this vital ecological service, thereby speeding up climate change - and making the global implications associated with it an inevitable reality.\n\nThe factors driving the widespread devastation of the world''s rainforests through deforestation are numerous but all are related to industrial development and population growth. One way rainforest resources are exploited is through unsustainable commercial logging practices. Loggers are only permitted to cut down trees that are fully grown, and are supposed to avoid causing excess damage when doing so. However, massive trees cannot help but tear down numerous other forms of vegetation in the process of collapsing. Cutting down trees also creates holes in the canopy. These holes, which take hundreds of years to revive naturally, will likely remain permanently unfilled as the heavy machinery used to penetrate the forests causes irreversible harm to the soil. Meanwhile, higher global demand for meat products has led to the burning down of vast areas of forests in order to grow soybeans, which is an ingredient for livestock feed. This saps nutrients from the soil, making it only a matter of time before crop yields decrease and more areas are cleared.\n\nAlso causing soil erosion and, by extension, the loss of trees are mining and oil projects. The extraction of gold from the Amazon, for instance, requires high concentrations of mercury, which leaks into the soil and renders it barren. Likewise, since the discovery of oil reserves in the region, there have been a number of oil spills. It is well known that oil contamination changes the properties of earth, meaning that it is unlikely for anything to grow back in affected areas. Moreover, for activities like mining and oil extraction to be possible at all, trees must be cut down to construct roads; it is estimated that for every 40 metres of road that is built, developers sacrifice 600 square kilometres of rainforest. Making matters worse, roads open the rainforests up to illegal loggers, settlers, and land speculators, whose activities also tend to result in large areas of vegetation being removed.\n\nUnfortunately, the nations where rainforests are found are often faced with more immediate problems than preserving trees, like mounting debt and poverty. Receiving financial assistance from wealthy countries does help, but it is somewhat of a ''band-aid'' solution. Only by collectively acknowledging that the future of the planet is of utmost importance can we begin to save what remains of the rainforests.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-28','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('illegal','plants','qualities','mature','unsustainable','balance','common','concentration','earth')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai28;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai28, NULL, 1, 'Chỗ trống (22)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (22)","doanVan":"The Causes of Deforestation\\n\\nOne of the reasons that deforestation persists is that logging is (22) ________, when it is carried out commercially. Logging companies are only allowed to remove (23) ________ trees. However this has a knock-on effect on surrounding (24) ________, which can be damaged as trees collapse.\\n\\nA further threat to the rainforests is the mining of precious metals or fossil fuels, which can have negative effects on the surrounding soil, for example when harmful chemicals are used to mine gold. Similarly, the (25) ________ of soil can be completely transformed by contamination from oil spills.","soChoTrong":22},"dapan":"unsustainable","giaithich":"unsustainable commercial logging practices.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai28, NULL, 2, 'Chỗ trống (23)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (23)","doanVan":"The Causes of Deforestation\\n\\nOne of the reasons that deforestation persists is that logging is (22) ________, when it is carried out commercially. Logging companies are only allowed to remove (23) ________ trees. However this has a knock-on effect on surrounding (24) ________, which can be damaged as trees collapse.\\n\\nA further threat to the rainforests is the mining of precious metals or fossil fuels, which can have negative effects on the surrounding soil, for example when harmful chemicals are used to mine gold. Similarly, the (25) ________ of soil can be completely transformed by contamination from oil spills.","soChoTrong":23},"dapan":"mature","giaithich":"loggers are only permitted to cut down trees that are fully grown - mature trees.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai28, NULL, 3, 'Chỗ trống (24)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (24)","doanVan":"The Causes of Deforestation\\n\\nOne of the reasons that deforestation persists is that logging is (22) ________, when it is carried out commercially. Logging companies are only allowed to remove (23) ________ trees. However this has a knock-on effect on surrounding (24) ________, which can be damaged as trees collapse.\\n\\nA further threat to the rainforests is the mining of precious metals or fossil fuels, which can have negative effects on the surrounding soil, for example when harmful chemicals are used to mine gold. Similarly, the (25) ________ of soil can be completely transformed by contamination from oil spills.","soChoTrong":24},"dapan":"plants","giaithich":"massive trees tear down numerous other forms of vegetation - surrounding plants.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai28, NULL, 4, 'Chỗ trống (25)', 4, '{"debai":{"cauHoiGoc":"Chỗ trống (25)","doanVan":"The Causes of Deforestation\\n\\nOne of the reasons that deforestation persists is that logging is (22) ________, when it is carried out commercially. Logging companies are only allowed to remove (23) ________ trees. However this has a knock-on effect on surrounding (24) ________, which can be damaged as trees collapse.\\n\\nA further threat to the rainforests is the mining of precious metals or fossil fuels, which can have negative effects on the surrounding soil, for example when harmful chemicals are used to mine gold. Similarly, the (25) ________ of soil can be completely transformed by contamination from oil spills.","soChoTrong":25},"dapan":"qualities","giaithich":"oil contamination changes the properties/qualities of earth.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 29 — Exercise 9: Life Before the Erie Canal
-- -----------------------------------------------------------------------
SET @Bai29 = '0a160029-0000-4000-8000-000000000029';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai29, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 9: Life Before the Erie Canal', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.',
    'Shaping America: The Erie Canal\n\nThe Erie Canal, which connects the Great Lakes to the Atlantic Ocean via New York''s Hudson River, was one of the most influential public works projects of its time. First opened in 1825 after eight years of construction, it is credited with dramatically increasing trade, turning New York into a thriving international port, and spurring westward expansion.\n\nThe states surrounding the Great Lakes are home to a wealth of natural resources, which were extremely difficult for colonists living on America''s eastern coast to access in the early 19th century. Likewise, the European goods available in cities like New York were practically unheard of in the nation''s interior. As a railway had not yet been established, the only way of moving supplies back and forth was by horse-drawn wagons - vehicles with a limited capacity for trade goods. In addition, most journeys lasted weeks due to poor road conditions, not to mention the barrier created by the Appalachian Mountains, and cost a significant amount of money given the time and labour each trip entailed. However, once the Erie Canal opened, ships were able to haul up to 50 tonnes of freight from point to point in a matter of days. Because they could carry so much, the quantity of goods that was transported skyrocketed, and the price of certain commodities decreased by as much as 95 per cent. It wasn''t long before hundreds of boats were coming in and out of New York City on a daily basis, making it the busiest port in America.\n\nWith so many goods entering New York City, it made sense for the state to start shipping commodities down along the East Coast, to the West Indies, and across the Atlantic Ocean to Europe. Doing so was very profitable, but the revenue didn''t stop there; shipment tolls were collected on each of the many arriving freights, allowing the state to quickly fill its coffers.\n\nNew York''s ever-growing prosperity, coupled with the fact that travelling there was no longer difficult, saw the population increase from 124,000 to nearly 800,000 within the first few years of the canal''s use. While a great many people moved to New York City, some disembarked at other stops along the canal route, where a number of boom towns had been established.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-29','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai29;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai29, NULL, 1, 'Chỗ trống (26)', 1, '{"debai":{"doanVanTruoc":"There were many","doanVanSau":"in the Great Lakes region."},"dapan":"resources","giaithich":"a wealth of natural resources.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai29, NULL, 2, 'Chỗ trống (27)', 2, '{"debai":{"doanVanTruoc":"However, the only way to transport them to colonists in New York was through the use of","doanVanSau":"."},"dapan":"horse-drawn wagons","giaithich":"the only way of moving supplies back and forth was by horse-drawn wagons.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai29, NULL, 3, 'Chỗ trống (28)', 3, '{"debai":{"doanVanTruoc":"These journeys took a long time and were very difficult. The main","doanVanSau":"was the Appalachian Mountains, and crossing them was both time-consuming and expensive."},"dapan":"barrier","giaithich":"the barrier created by the Appalachian Mountains.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW()),
(UUID(), @Bai29, NULL, 4, 'Chỗ trống (29)', 4, '{"debai":{"doanVanTruoc":"After the canal was built,","doanVanSau":"were able to carry a great amount of cargo to their destinations in a very short time."},"dapan":"ships","giaithich":"ships were able to haul up to 50 tonnes of freight (chấp nhận cả \\"boats\\").","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["summary_completion"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 30 — Exercise 10: What is Dark Matter? (word list A-H)
-- -----------------------------------------------------------------------
SET @Bai30 = '0a160030-0000-4000-8000-000000000030';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai30, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 10: What is Dark Matter?', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words, A-H, below.',
    'Dark Matter\n\nA Curious Observation\nThe existence of invisible matter in the universe was first suggested by Dutch astronomer Jan Hendrik Oort in 1932 when he observed that the stars at the outer edge of the galaxy were moving much faster than they should be given the weak gravitational pull at the ends of galaxies. Oort believed that their speed was being influenced by a material with intense gravitational force, which he called ''dark matter'' because it could not be seen. Substantiating this discovery a year later was Swiss astronomer Fritz Zwicky who, after a similar observation, maintained that hidden masses lay among invisible ones. However, neither claim was accepted by the scientific community because it was unheard of for a substance with mass to be invisible.\n\nAn Invisible Web\nBy the 1950s, technology had progressed enough to confirm that outlying stars actually have the same velocity as the stars at the center of a galaxy. Scientists surmised that galaxies must contain significant amounts of dark matter for this to be possible, so they set about learning as much as they could about the elusive material. Aided by computer-generated models, they speculated that filaments of dark matter comprising up to 85 per cent of the universe''s total mass formed a web and that woven into this web was all the visible matter of the universe. Some have compared dark matter to connective tissue in that its apparent function is to bind the various components of the universe together. In other words, without it, galaxies would simply break apart and float away.\n\nTheories on the Composition of Dark Matter\nBut just what is dark matter made of? Many cosmologists believe that it may be composed of a subatomic particle that has not yet been identified. Meanwhile, some astronomers consider massive compact halo objects, or MACHOs, a possibility. MACHOs are believed to reside in the halos of galaxies but defy detection because of their low luminosities. Other astronomers think that WIMPs, or weakly interacting massive particles, are strong candidates. WIMPs are hypothetical at this point but are a popular choice because scientists believe that they formed shortly after the Big Bang. Being massive, slow-moving, and incapable of emitting light, it is theorised that these particles clumped together to form the structure of the universe. Unsurprisingly, attempts to prove their existence have been determined, and state-of-the-art technologies, such as the Large Hadron Collider, are currently being used to try to produce them.\n\nMapping Dark Matter\nAlthough there remains a lack of solid evidence, support for the theory of dark matter has grown extensively. It is now the consensus among scientists that it does exist and that, despite its inability to produce light, it can be detected. This is due to the fact that it causes light from galaxies to distort, creating luminous optical illusions. Scientists observing these phenomena measure the displacement of light to determine the approximate location of the dark matter. They then chart these positions on maps. While scientists engaged in the search for dark matter often come up empty-handed, they remain optimistic and driven by discoveries like one made by a team in Munich, Germany in which it was possible to detect and map dark matter in a cluster of galaxies about 2.7 billion light years away.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-30','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('light','force','formation','velocity','presence','position','particle','illusion')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai30;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai30, NULL, 1, 'Chỗ trống (30)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (30)","doanVan":"What is Dark Matter?\\n\\nThere are several theories about what comprises dark matter. Some say it is made up of an undiscovered (30) ________, while others think that dense halo objects are more likely candidates. WIMPs are yet another possibility. This is because their (31) ________ may have begun immediately following the Big Bang. The (32) ________ of these particles is something that scientists are currently trying to prove using the Large Hadron Collider. Scientists now believe that even though dark matter produces no (33) ________, it will be possible to detect it somehow. They are studying dark matter''s impact on the light emitted by galaxies to judge its (34) ________ and chart it on a map.","soChoTrong":30},"dapan":"particle","giaithich":"composed of a subatomic particle that has not yet been identified.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai30, NULL, 2, 'Chỗ trống (31)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (31)","doanVan":"What is Dark Matter?\\n\\nThere are several theories about what comprises dark matter. Some say it is made up of an undiscovered (30) ________, while others think that dense halo objects are more likely candidates. WIMPs are yet another possibility. This is because their (31) ________ may have begun immediately following the Big Bang. The (32) ________ of these particles is something that scientists are currently trying to prove using the Large Hadron Collider. Scientists now believe that even though dark matter produces no (33) ________, it will be possible to detect it somehow. They are studying dark matter''s impact on the light emitted by galaxies to judge its (34) ________ and chart it on a map.","soChoTrong":31},"dapan":"formation","giaithich":"scientists believe that they formed shortly after the Big Bang - their formation.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai30, NULL, 3, 'Chỗ trống (32)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (32)","doanVan":"What is Dark Matter?\\n\\nThere are several theories about what comprises dark matter. Some say it is made up of an undiscovered (30) ________, while others think that dense halo objects are more likely candidates. WIMPs are yet another possibility. This is because their (31) ________ may have begun immediately following the Big Bang. The (32) ________ of these particles is something that scientists are currently trying to prove using the Large Hadron Collider. Scientists now believe that even though dark matter produces no (33) ________, it will be possible to detect it somehow. They are studying dark matter''s impact on the light emitted by galaxies to judge its (34) ________ and chart it on a map.","soChoTrong":32},"dapan":"presence","giaithich":"attempts to prove their existence/presence using the Large Hadron Collider.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai30, NULL, 4, 'Chỗ trống (33)', 4, '{"debai":{"cauHoiGoc":"Chỗ trống (33)","doanVan":"What is Dark Matter?\\n\\nThere are several theories about what comprises dark matter. Some say it is made up of an undiscovered (30) ________, while others think that dense halo objects are more likely candidates. WIMPs are yet another possibility. This is because their (31) ________ may have begun immediately following the Big Bang. The (32) ________ of these particles is something that scientists are currently trying to prove using the Large Hadron Collider. Scientists now believe that even though dark matter produces no (33) ________, it will be possible to detect it somehow. They are studying dark matter''s impact on the light emitted by galaxies to judge its (34) ________ and chart it on a map.","soChoTrong":33},"dapan":"light","giaithich":"despite its inability to produce light.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai30, NULL, 5, 'Chỗ trống (34)', 5, '{"debai":{"cauHoiGoc":"Chỗ trống (34)","doanVan":"What is Dark Matter?\\n\\nThere are several theories about what comprises dark matter. Some say it is made up of an undiscovered (30) ________, while others think that dense halo objects are more likely candidates. WIMPs are yet another possibility. This is because their (31) ________ may have begun immediately following the Big Bang. The (32) ________ of these particles is something that scientists are currently trying to prove using the Large Hadron Collider. Scientists now believe that even though dark matter produces no (33) ________, it will be possible to detect it somehow. They are studying dark matter''s impact on the light emitted by galaxies to judge its (34) ________ and chart it on a map.","soChoTrong":34},"dapan":"position","giaithich":"determine the approximate location/position of the dark matter.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 31 — Exercise 11: The Speech Chain (Q1-7, word list A-I)
-- -----------------------------------------------------------------------
SET @Bai31 = '0a160031-0000-4000-8000-000000000031';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai31, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 11: The Speech Chain (Summary)', 1,
    @LoaiBaiTap, @LoaiDienTuDanhSach, @MucDo, @KyNang,
    'Complete the summary using the list of words A-I below.',
    'The Speech Chain\n\nIt is possible to argue that the complexity and versatility of human language systems is what distinguishes us from other animals. Language is however a recent phenomenon in evolutionary terms, having arisen only over the last 200,000 years, and it is one that is grounded in basic biology. This biological basis is largely cognitive; studies of primates show no significant difference between them and humans in their anatomical capacity for speech. It is our cognitive capacity for language, working in conjunction with our physical apparatus for speaking and listening, that therefore distinguishes humanity.\n\nThe neurophysiological process for speaking and understanding is complex and requires multiple organs working in conjunction with our cognitive capacity. This process has been labelled the ''speech chain'' and understanding how it works requires a combination of linguistics, cognitive science, biology and pragmatics, the study of how language is used to communicate. The speech chain describes the process by which a piece of speech is transmitted from the speaker to the listener, breaking it down into multiple stages which reveal the complex interplay of physical and cognitive processes involved.\n\nThe speech chain is useful for researchers who want to understand how the feedback between the brain, sensory nerves and sound waves, as well as the vocal cords and ear, can influence meaning and either enable or disrupt full understanding. Speech science, the experimental study of communication, focuses on the moment when language is a physical rather than mental process. Researchers involved in this field thus study the speech chain to determine how acoustic sounds relate to articulation and how speech sounds can vary in styles and emotions.\n\nThe speech chain itself describes the process which occurs when a message travels from the mind of a speaker to the mind of a listener. The process can be broken down into several stages, each of which occurs in a different part of either the speaker''s or listener''s head. It also occurs on a succession of levels which reflect the complex coordination of linguistic and biological processes that are incorporated into the chain. These levels include the linguistic level, the physiological level and the acoustic level, and an utterance must use all three to be successfully communicated.\n\nThe first step of the speech chain is the encoding of the message as a linguistic concept, which occurs in the brain. In this step the message must be put into a linguistic form and the pronunciation elements must be programmed correctly so that it is coherent. Following this encoding the appropriate instructions of the brain will travel along the motor nerves in the form of impulses before they reach the vocal organs, which include the lungs, vocal cords, tongue and lips. These will then enact the process of speech by collectively creating a sound wave; this noise generating part of the chain is also known as an aeroacoustic process.\n\nThe sound waves travel through the air, toward the listener, where they are picked up by their ears'' hearing mechanisms and are translated into nerve impulses which travel towards their brain. Here they are decoded to establish meaning. The brain activity during this moment reveals recognition of the speaker''s statement and the interpretation of these auditory sensations as pronunciation and meaning - if the message is understood. This establishes a connection between the speaker''s brain and the listener''s brain, which is the ultimate aim of the speech chain and is what enables communication.\n\nThere is one more step in the chain, which is the simultaneous transmission of sound waves to the speaker''s ears from his or her vocal organs. This creates a feedback link which allows the speaker to check the coherence or accuracy of their own statement. This is fundamental to the process of communication since it allows the speaker to compare the quality of their expression with what they intended and make adjustments based on this feedback. The disruption to this feedback loop caused by deafness can have significant detrimental effects on the ability to speak coherently.\n\nOverall this speech chain reveals the basis for speech and establishes a framework for the study of communication. Researchers continue to delve into how exactly the brain encodes meaning, and how the vocal organs are capable of creating sound waves, as well as the effect of feedback on the speech process. It is worth noting that whilst this process describes the cognitive and auditory basis for communication, there is also a very important visual element; facial gestures and bodily motions play a key part in the production of meaning. It is also worth remembering that the process illustrated in the speech chain happens almost instantaneously, or at least at the speed of sound, a fact that underlines the staggering complexity and capability of the human body.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-31','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('framework','coordination','sensation','transmission','aim','expression','articulation','perception','understanding')),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai31;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai31, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":1},"dapan":"understanding","giaithich":"supportive of or disruptive to complete understanding.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 2, 'Chỗ trống (2)', 2, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":2},"dapan":"articulation","giaithich":"how acoustic sounds relate to articulation.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 3, 'Chỗ trống (3)', 3, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":3},"dapan":"coordination","giaithich":"the complex coordination of linguistic and biological processes.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 4, 'Chỗ trống (4)', 4, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":4},"dapan":"aim","giaithich":"the ultimate aim of the speech chain.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 5, 'Chỗ trống (5)', 5, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":5},"dapan":"transmission","giaithich":"the simultaneous transmission of sound waves to the speaker''s ears.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 6, 'Chỗ trống (6)', 6, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":6},"dapan":"expression","giaithich":"compare the quality of their expression with what they intended.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW()),
(UUID(), @Bai31, NULL, 7, 'Chỗ trống (7)', 7, '{"debai":{"cauHoiGoc":"Chỗ trống (7)","doanVan":"Researching the Speech Chain\\n\\nExperts can utilize the speech chain to learn about feedback between the brain and other auditory factors. This feedback can be supportive of or disruptive to complete (1) ________. They can also gain knowledge about the relationship of acoustic sounds to (2) ________. The various stages of the speech chain happen on different levels that indicate the complicated (3) ________ of different processes. The final (4) ________ of the speech chain is to establish a connection between the brain of a speaker and listener. An additional phase involves the (5) ________ of sound between the speaker''s vocal cords and ears. Feedback then lets the speaker make sure that his or her (6) ________ meets the intended quality. Overall, the speech chain is a fundamental aspect of biology which has allowed humankind to develop as a social, communicative species. It is this chain that is behind the foundation of speech, and it sets up the (7) ________ for communication research.","soChoTrong":7},"dapan":"framework","giaithich":"establishes a framework for the study of communication.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 32 — Exercise 11: The Speech Chain (Q8-10, sentence ending)
-- MatchingPairs khong phu hop tot cho "1 goc nhieu lua chon dung chung" nen
-- dung CQ_TRAC_NGHIEM_1 voi du 7 dap an A-G cho moi cau.
-- -----------------------------------------------------------------------
SET @Bai32 = '0a160032-0000-4000-8000-000000000032';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai32, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 11: The Speech Chain (câu 8-10)', 1,
    @LoaiBaiTap, @LoaiTracNghiem, @MucDo, @KyNang,
    'Complete each sentence with the correct ending, A-G, below.',
    NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-32','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai32;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai32, NULL, 1, 'Câu 8', 1, '{"debai":{"cauHoiGoc":"The human differs from other primates because it _____","luaChon":[{"id":"A","text":"depends heavily on communicative feedback."},{"id":"B","text":"uses only the sensory nerves when communicating."},{"id":"C","text":"utilizes a unique anatomical set of speech organs."},{"id":"D","text":"shows the interaction of cognitive and physical processes."},{"id":"E","text":"includes body movements and facial expressions."},{"id":"F","text":"has more than just a physical capacity for speech."},{"id":"G","text":"translates verbal signs into visual symbols."}]},"dapan":"F","giaithich":"Khỉ và người có cấu tạo cơ thể để nói gần như nhau, chính năng lực nhận thức (cognitive capacity) mới là điều tạo nên khác biệt.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai32, NULL, 2, 'Câu 9', 2, '{"debai":{"cauHoiGoc":"The breaking down of speech into stages _____","luaChon":[{"id":"A","text":"depends heavily on communicative feedback."},{"id":"B","text":"uses only the sensory nerves when communicating."},{"id":"C","text":"utilizes a unique anatomical set of speech organs."},{"id":"D","text":"shows the interaction of cognitive and physical processes."},{"id":"E","text":"includes body movements and facial expressions."},{"id":"F","text":"has more than just a physical capacity for speech."},{"id":"G","text":"translates verbal signs into visual symbols."}]},"dapan":"D","giaithich":"Việc chia thành nhiều giai đoạn cho thấy sự tương tác phức tạp giữa quá trình nhận thức và thể chất.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW()),
(UUID(), @Bai32, NULL, 3, 'Câu 10', 3, '{"debai":{"cauHoiGoc":"The visual component in the production of meaning _____","luaChon":[{"id":"A","text":"depends heavily on communicative feedback."},{"id":"B","text":"uses only the sensory nerves when communicating."},{"id":"C","text":"utilizes a unique anatomical set of speech organs."},{"id":"D","text":"shows the interaction of cognitive and physical processes."},{"id":"E","text":"includes body movements and facial expressions."},{"id":"F","text":"has more than just a physical capacity for speech."},{"id":"G","text":"translates verbal signs into visual symbols."}]},"dapan":"E","giaithich":"facial gestures and bodily motions play a key part in the production of meaning.","loai":"CQ_TRAC_NGHIEM_1","la_tu_luan":false,"tags":["reading"]}', NOW());

-- -----------------------------------------------------------------------
-- Section 33 — Exercise 11: The Speech Chain (Q11-13, label diagram)
-- -----------------------------------------------------------------------
SET @Bai33 = '0a160033-0000-4000-8000-000000000033';

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai33, @MaKhoaHoc, @MaNganHangPT16, 'Practice Test 16 - Exercise 11: The Speech Chain (câu 11-13)', 1,
    @LoaiBaiTap, @LoaiDienKhuyet, @MucDo, @KyNang,
    'Label the diagram. Choose NO MORE THAN TWO WORDS from the passage for each answer.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','PT16-33','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
)
ON DUPLICATE KEY UPDATE
    `MaNganHang` = VALUES(`MaNganHang`), `TenBaiTap` = VALUES(`TenBaiTap`),
    `LoaiBaiTap` = VALUES(`LoaiBaiTap`), `LoaiCauHoi` = VALUES(`LoaiCauHoi`),
    `MucDo` = VALUES(`MucDo`), `KyNang` = VALUES(`KyNang`),
    `HuongDanChung` = VALUES(`HuongDanChung`), `NoiDungNguCanhChung` = VALUES(`NoiDungNguCanhChung`),
    `MoTa` = VALUES(`MoTa`), `TrangThai` = 1, `DaXoa` = 0;

DELETE FROM `baitapcauhoi` WHERE `MaBaiTap` = @Bai33;

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai33, NULL, 1, 'Chỗ trống (11)', 1, '{"debai":{"doanVanTruoc":"The instructions from the brain travel along the","doanVanSau":", before reaching the vocal organs."},"dapan":"motor nerves","giaithich":"instructions of the brain will travel along the motor nerves.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["diagram_label"]}', NOW()),
(UUID(), @Bai33, NULL, 2, 'Chỗ trống (12)', 2, '{"debai":{"doanVanTruoc":"The communication travels through the air as","doanVanSau":", before reaching the listener''s ear."},"dapan":"sound waves","giaithich":"the sound waves travel through the air, toward the listener.","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["diagram_label"]}', NOW()),
(UUID(), @Bai33, NULL, 3, 'Chỗ trống (13)', 3, '{"debai":{"doanVanTruoc":"Speakers are able to check their statement''s coherence, in an important","doanVanSau":"."},"dapan":"feedback link","giaithich":"This creates a feedback link which allows the speaker to check the coherence... (chấp nhận cả \\"feedback loop\\").","loai":"CQ_DIEN_KHUYET_TU_NHAP","la_tu_luan":false,"tags":["diagram_label"]}', NOW());

-- ===== END OF SECTIONS MARKER — do not remove, new sections are inserted above this line =====
