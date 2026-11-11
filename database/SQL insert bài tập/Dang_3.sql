SET NAMES utf8mb4;

-- =======================================================================
-- DẠNG 3 — ĐIỀN TỪ VÀO CHỖ TRỐNG TỪ DANH SÁCH CHO TRƯỚC (CQ_DIEN_TU_DANH_SACH)
--
-- 5 bài: BT-DDTDS01 .. BT-DDTDS05, mỗi bài 6 chỗ trống.
--
-- Cấu trúc mỗi bài:
--   baitap.NoiDungNguCanhChung = đoạn văn có 6 chỗ trống (1)...(6)  — lưu MỘT lần
--   baitap.MoTa.danhSachTu     = word bank dùng chung               — lưu MỘT lần
--   baitapcauhoi               = MỖI CHỖ TRỐNG một dòng, đáp án + giải thích riêng
--
-- Đáp án lưu CHÍNH TỪ (không phải nhãn A/B/C), nên đảo thứ tự word bank
-- không làm sai đáp án.
-- =======================================================================

SET @MaKhoaHoc = (SELECT `MaKhoaHoc` FROM `khoahoc` LIMIT 1);

SET @LoaiCauHoi = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
    JOIN `nhomdanhmuc` n ON n.`MaNhom` = c.`MaNhom` AND n.`MaCode` = 'LOAI_CAU_HOI'
    WHERE c.`MaCode` = 'CQ_DIEN_TU_DANH_SACH' LIMIT 1);
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
-- Ngan hang de chua cac bai tap mau nay. Tao neu chua co, lay lai neu da co,
-- de chay lai script khong sinh ngan hang trung.
-- -----------------------------------------------------------------------
SET @MaNganHang = (SELECT `MaNganHang` FROM `nganhangde`
    WHERE `MaKhoaHoc` = @MaKhoaHoc AND `DaXoa` = 0 LIMIT 1);

INSERT INTO `nganhangde`
    (`MaNganHang`, `MaKhoaHoc`, `MaCode`, `TenNganHang`, `MucDo`, `KyNang`,
     `Unit`, `MoTa`, `TrangThai`, `ThoiGianTao`, `DaXoa`)
SELECT UUID(), @MaKhoaHoc,
       CONCAT('NHD-', UPPER(SUBSTRING(REPLACE(@MaKhoaHoc, '-', ''), 1, 8))),
       CONCAT('Ngân hàng ', k.`TenKhoaHoc`),
       @MucDo, @KyNang, k.`TenKhoaHoc`,
       CONCAT('Ngân hàng đề của ', k.`TenKhoaHoc`),
       'ACTIVE', NOW(), 0
FROM `khoahoc` k
WHERE k.`MaKhoaHoc` = @MaKhoaHoc AND @MaNganHang IS NULL;

SET @MaNganHang = (SELECT `MaNganHang` FROM `nganhangde`
    WHERE `MaKhoaHoc` = @MaKhoaHoc AND `DaXoa` = 0 LIMIT 1);


-- =======================================================================
-- BÀI 1 — BT-DDTDS01 — Developing Urbanization in Remote Areas
-- =======================================================================
SET @Bai1 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai1, @MaKhoaHoc, @MaNganHang,
    'Bài 1 — Điền từ vào chỗ trống: Developing Urbanization in Remote Areas', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Fill in each numbered blank with a suitable word or phrase from the word bank. Each item is used only once.',
    'Developing Urbanization in Remote Areas!\n\nUrbanization in faraway places presents exciting opportunities for growth. (1) __________ may underestimate the potential of these regions, but with strategic (2) __________, they can flourish.\n\nCommunities must turn to sustainable practices that enhance both living (3) __________ and economic prospects.\n\nInvesting in essential infrastructure, such as roads and schools, is crucial for accessibility. Green energy solutions and affordable housing are vital (4) __________ that can significantly improve quality of life.\n\n(5) __________ should we overlook the importance of engaging local residents in the planning process.\n\nThe number of initiatives (6) __________ urbanization is increasing, showcasing a commitment to transforming remote areas into thriving communities.\n\n(Adapted from Friends Global)',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDTDS01','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('focused on','Others','At no time','conditions','items','planning')),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai1, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","soChoTrong":1},"dapan":"Others","giaithich":"Others là đại từ mang nghĩa \\"những người khác\\", có thể đứng độc lập làm chủ ngữ trong câu.\\nCâu này cần một chủ ngữ chỉ người nên Others là đáp án phù hợp.\\nAnother chỉ \\"một người/cái khác\\" nên không phù hợp.\\nOther phải đi kèm với danh từ (other people, other regions...).\\nThe other dùng để chỉ người hoặc vật còn lại trong một nhóm xác định.\\n\\n[DỊCH CÂU]\\nNhững người khác có thể đánh giá thấp tiềm năng của các khu vực này, nhưng với quy hoạch chiến lược, chúng có thể phát triển mạnh.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW()),
(UUID(), @Bai1, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","soChoTrong":2},"dapan":"planning","giaithich":"Cụm từ cố định strategic planning có nghĩa là quy hoạch/lập kế hoạch chiến lược.\\nĐây là collocation rất phổ biến khi nói về phát triển đô thị hoặc phát triển kinh tế.\\nInvestment, development và decision đều không kết hợp tự nhiên với strategic trong ngữ cảnh này.\\n\\n[DỊCH CÂU]\\nNhững người khác có thể đánh giá thấp tiềm năng của các khu vực này, nhưng với quy hoạch chiến lược, chúng có thể phát triển mạnh.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW()),
(UUID(), @Bai1, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","soChoTrong":3},"dapan":"conditions","giaithich":"Cụm từ cố định là living conditions (điều kiện sống).\\nĐây là collocation thường gặp trong các bài đọc về xã hội, môi trường và kinh tế.\\nArrangement, area và environment đều không tạo thành cụm từ tự nhiên với living trong ngữ cảnh này.\\n\\n[DỊCH CÂU]\\nCác cộng đồng cần chuyển sang các biện pháp bền vững nhằm cải thiện cả điều kiện sống và triển vọng kinh tế.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW()),
(UUID(), @Bai1, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","soChoTrong":4},"dapan":"items","giaithich":"Trong câu này, items được dùng với nghĩa là những yếu tố hoặc thành phần quan trọng.\\nHai đối tượng được nhắc đến là green energy solutions và affordable housing, vì vậy cần một danh từ chỉ các yếu tố.\\nAmounts, numbers và portions đều không phù hợp về nghĩa.\\n\\n[DỊCH CÂU]\\nCác giải pháp năng lượng xanh và nhà ở giá cả phải chăng là những yếu tố quan trọng có thể cải thiện đáng kể chất lượng cuộc sống.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW()),
(UUID(), @Bai1, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","soChoTrong":5},"dapan":"At no time","giaithich":"At no time có nghĩa là không bao giờ.\\nKhi cụm này đứng đầu câu sẽ sử dụng đảo ngữ.\\nCấu trúc: At no time + trợ động từ + chủ ngữ + động từ nguyên mẫu.\\nVì vậy câu đúng là: At no time should we overlook...\\nIrrespective of, on account of và with regard to đều không tạo được cấu trúc đảo ngữ này.\\n\\n[DỊCH CÂU]\\nChúng ta không bao giờ nên xem nhẹ tầm quan trọng của việc thu hút người dân địa phương tham gia vào quá trình lập kế hoạch.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW()),
(UUID(), @Bai1, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","soChoTrong":6},"dapan":"focused on","giaithich":"Focused on có nghĩa là tập trung vào.\\nCụm initiatives focused on urbanization là mệnh đề rút gọn của: initiatives which are focused on urbanization.\\nTurned off (tắt), got away (thoát khỏi) và went into (bắt đầu đi vào) đều không phù hợp với ngữ cảnh.\\n\\n[DỊCH CÂU]\\nSố lượng các sáng kiến tập trung vào đô thị hóa đang ngày càng tăng, cho thấy cam kết biến các khu vực xa xôi thành những cộng đồng phát triển thịnh vượng.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","urbanization"]}', NOW());


-- =======================================================================
-- BÀI 2 — BT-DDTDS02 — Experience the Wonders of Chinese Culture
-- =======================================================================
SET @Bai2 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai2, @MaKhoaHoc, @MaNganHang,
    'Bài 2 — Điền từ vào chỗ trống: Experience the Wonders of Chinese Culture', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Fill in each numbered blank with a suitable word or phrase from the word bank. Each item is used only once.',
    'Experience the Wonders of Chinese Culture!\n\nJoin us for an extraordinary celebration of Chinese culture at our annual festival! This vibrant event showcases the rich heritage of China through traditional performances, art exhibits, and authentic cuisine. Having captivated audiences in previous years, we invite you to immerse yourself in this unique experience.\n\nTo learn about ancient customs and (1) __________ is an opportunity not to be missed.\n\nEngage with skilled artisans, participate (2) __________ calligraphy workshops, and savor delicious dishes (3) __________ centuries of tradition.\n\nOur mission is (4) __________ understanding and appreciation of Chinese cultural heritage.\n\nDon''t miss the chance to connect with diverse communities and (5) __________ lasting memories.\n\nCome and discover the beauty of Chinese (6) __________ in every form—together, let''s celebrate the spirit of unity and diversity!\n\n(Adapted from Bright)',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDTDS02','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('create','modern innovations','culture','to promote','reflecting','in')),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai2, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","soChoTrong":1},"dapan":"modern innovations","giaithich":"Modern là tính từ, dùng để bổ nghĩa cho danh từ innovations.\\nInnovations là danh từ đếm được số nhiều, phù hợp với ngữ cảnh nói về nhiều đổi mới hiện đại.\\nInnovations modern sai trật tự từ vì trong tiếng Anh, tính từ đứng trước danh từ.\\nModernly innovations sai vì modernly là trạng từ, không dùng để bổ nghĩa cho danh từ.\\nModern innovation là danh từ số ít nên không phù hợp với ý nghĩa của câu.\\n\\n[DỊCH CÂU]\\nTìm hiểu về những phong tục cổ xưa và những đổi mới hiện đại là một cơ hội không thể bỏ lỡ.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW()),
(UUID(), @Bai2, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","soChoTrong":2},"dapan":"in","giaithich":"Cụm cố định: participate in + danh từ = tham gia vào...\\nĐây là collocation phổ biến trong tiếng Anh.\\nCác giới từ at, from và about không đi với động từ participate.\\n\\n[DỊCH CÂU]\\nHãy giao lưu với những nghệ nhân lành nghề, tham gia các buổi hội thảo thư pháp và thưởng thức những món ăn ngon...","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW()),
(UUID(), @Bai2, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","soChoTrong":3},"dapan":"reflecting","giaithich":"Reflecting là dạng V-ing dùng để rút gọn mệnh đề quan hệ chủ động.\\nCâu đầy đủ là: delicious dishes which reflect centuries of tradition.\\nKhi rút gọn mệnh đề quan hệ chủ động, ta lược bỏ đại từ quan hệ và chuyển động từ sang V-ing.\\nReflected mang nghĩa bị động nên không phù hợp.\\nThat reflects và which reflects đúng ngữ pháp nhưng không đúng yêu cầu của dạng rút gọn.\\n\\n[DỊCH CÂU]\\n...và thưởng thức những món ăn ngon thể hiện truyền thống hàng thế kỷ.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW()),
(UUID(), @Bai2, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","soChoTrong":4},"dapan":"to promote","giaithich":"Cấu trúc: One''s mission is to + V.\\nOur mission is to promote...\\nSau động từ is dùng động từ nguyên mẫu có to để diễn tả mục đích hoặc sứ mệnh.\\nTo promoting, promoting và to be promoted đều không phù hợp với cấu trúc này.\\n\\n[DỊCH CÂU]\\nSứ mệnh của chúng tôi là thúc đẩy sự hiểu biết và trân trọng di sản văn hóa Trung Hoa.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW()),
(UUID(), @Bai2, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","soChoTrong":5},"dapan":"create","giaithich":"Cụm từ cố định: create lasting memories = tạo nên những kỷ niệm đáng nhớ.\\nĐây là collocation thường gặp trong các bài viết về du lịch và sự kiện.\\nBring, do và make không kết hợp tự nhiên với lasting memories trong ngữ cảnh này.\\n\\n[DỊCH CÂU]\\nĐừng bỏ lỡ cơ hội kết nối với nhiều cộng đồng khác nhau và tạo nên những kỷ niệm đáng nhớ.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW()),
(UUID(), @Bai2, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","soChoTrong":6},"dapan":"culture","giaithich":"Sau tính từ Chinese cần một danh từ.\\nCulture là danh từ mang nghĩa văn hóa, phù hợp với ngữ cảnh.\\nCultural là tính từ.\\nCulturally là trạng từ.\\nCultures là danh từ số nhiều nhưng không phù hợp vì câu đang nói về nền văn hóa Trung Hoa nói chung.\\n\\n[DỊCH CÂU]\\nHãy đến và khám phá vẻ đẹp của văn hóa Trung Hoa dưới mọi hình thức — cùng nhau tôn vinh tinh thần đoàn kết và sự đa dạng!","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","chinese_culture"]}', NOW());


-- =======================================================================
-- BÀI 3 — BT-DDTDS03 — Solo Female Travelers Club / Global Greeter Network
-- =======================================================================
SET @Bai3 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai3, @MaKhoaHoc, @MaNganHang,
    'Bài 3 — Điền từ vào chỗ trống: Global Greeter Network', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Fill in each numbered blank with a suitable word or phrase from the word bank. Each item is used only once.',
    'Solo Female Travelers Club – Global Greeter Network\n\nLooking to enhance your travel experience with a local perspective? Join the Global Greeter Network, a service (1) __________ to connect travelers with friendly locals eager to (2) __________ you around.\n\nWhether you''re (3) __________ in a guided tour, a scenic walk, or simply being dropped (4) __________ at a spot of interest, this program offering flexible options allows you to explore new destinations without the hassle of finding transportation.\n\nPerfect for solo female travelers wanting (5) __________ locals and like-minded explorers, the Global Greeter Network provides access to exclusive travel groups. Share experiences, make friends, and discover hidden gems.\n\nThis service is designed for those eager to experience (6) __________ in a safe, comfortable way.\n\n(Adapted from Solo Female Travelers)',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDTDS03','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('interested','off','show','authentic local culture','to meet','designed')),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai3, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","soChoTrong":1},"dapan":"designed","giaithich":"Designed là dạng V3/V-ed dùng để rút gọn mệnh đề quan hệ bị động.\\nCâu đầy đủ là: a service which/that is designed to connect travelers...\\nKhi rút gọn mệnh đề quan hệ bị động, ta lược bỏ which/that và is, giữ lại V3/V-ed.\\nWas designed sai vì không thể dùng một mệnh đề độc lập sau dấu phẩy.\\nDesign sai dạng từ.\\nThat designed thiếu động từ be.\\n\\n[DỊCH CÂU]\\nHãy tham gia Global Greeter Network, một dịch vụ được thiết kế để kết nối du khách với những người dân địa phương thân thiện.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW()),
(UUID(), @Bai3, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","soChoTrong":2},"dapan":"show","giaithich":"Cụm động từ cố định: show somebody around = dẫn ai đi tham quan, đưa ai đi xem một nơi.\\nSau eager to dùng động từ nguyên mẫu nên ta có: eager to show you around.\\nSee, go và look không tạo thành cụm động từ đúng trong ngữ cảnh này.\\n\\n[DỊCH CÂU]\\n...kết nối du khách với những người dân địa phương thân thiện luôn sẵn sàng dẫn bạn đi tham quan.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW()),
(UUID(), @Bai3, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","soChoTrong":3},"dapan":"interested","giaithich":"Cấu trúc cố định: be interested in + danh từ/V-ing = quan tâm, hứng thú với...\\nInteresting dùng để miêu tả sự vật gây hứng thú, không dùng để diễn tả cảm xúc của người.\\nInterest là danh từ.\\nInterestingly là trạng từ.\\n\\n[DỊCH CÂU]\\nDù bạn quan tâm đến một chuyến tham quan có hướng dẫn, một chuyến đi bộ ngắm cảnh...","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW()),
(UUID(), @Bai3, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","soChoTrong":4},"dapan":"off","giaithich":"Cụm động từ: drop somebody off = đưa ai đến và thả xuống một địa điểm.\\nTrong câu dùng dạng bị động: be dropped off at a spot of interest.\\nCác giới từ to, about và on không tạo thành cụm động từ đúng.\\n\\n[DỊCH CÂU]\\n...hay đơn giản là được đưa đến một địa điểm tham quan.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW()),
(UUID(), @Bai3, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","soChoTrong":5},"dapan":"to meet","giaithich":"Cấu trúc: want to do something = muốn làm gì.\\nTrong câu: solo female travelers wanting to meet locals...\\nSau want luôn dùng to + động từ nguyên mẫu.\\nMeeting và meet không đúng cấu trúc.\\n\\n[DỊCH CÂU]\\nHoàn hảo cho những nữ du khách đi một mình muốn gặp gỡ người dân địa phương và những người có cùng sở thích khám phá.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW()),
(UUID(), @Bai3, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","soChoTrong":6},"dapan":"authentic local culture","giaithich":"Thứ tự tính từ đúng là: authentic (đích thực) + local (địa phương) + culture (danh từ).\\nTrong tiếng Anh, nhiều tính từ có thể cùng đứng trước một danh từ theo trật tự tự nhiên.\\nCulture authentic local, authentic culture local và local authentic culture đều sai trật tự từ.\\n\\n[DỊCH CÂU]\\nDịch vụ này được thiết kế dành cho những người mong muốn trải nghiệm văn hóa địa phương đích thực một cách an toàn và thoải mái.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","travel"]}', NOW());


-- =======================================================================
-- BÀI 4 — BT-DDTDS04 — Explore Cultural Diversity
-- =======================================================================
SET @Bai4 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai4, @MaKhoaHoc, @MaNganHang,
    'Bài 4 — Điền từ vào chỗ trống: Explore Cultural Diversity', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Fill in each numbered blank with a suitable word or phrase from the word bank. Each item is used only once.',
    'EXPLORE CULTURAL DIVERSITY\n\nCulture is the heart of every society, reflecting traditions, values, and creativity. By understanding different cultures, we enrich our perspectives and build connections with (1) __________. Whether through art, language, or celebrations, culture (2) __________ our identities and offers a window into the lives of others.\n\nWhy Embrace Cultural Diversity?\n\nCelebrate Differences: Every culture has unique traditions, from festivals and dances to foods and clothing. (3) __________ experiencing these, we gain a deeper appreciation of our global community.\n\nLanguage as a Key: Learning even a few words in another language can open (4) __________ to new friendships and understanding.\n\nArt & Music: Cultural (5) __________ in music, paintings, and performances are windows into a community''s history and values.\n\nGet Involved!\n- Attend local cultural festivals.\n- Try traditional cuisines from around the world.\n- (6) __________ art and films from different countries.\n\nCelebrating culture brings us closer together.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDTDS04','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('By means of','Engage with','expressions','others','doors','shapes')),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai4, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","soChoTrong":1},"dapan":"others","giaithich":"Others là đại từ mang nghĩa \\"những người khác\\", có thể đứng độc lập sau giới từ with.\\nCụm đúng là: build connections with others = xây dựng các mối quan hệ với người khác.\\nOther phải đi kèm danh từ (other people).\\nAnother chỉ một người hoặc một vật khác.\\nThe other dùng để chỉ người hoặc vật còn lại trong một nhóm xác định.\\n\\n[DỊCH CÂU]\\nBằng cách hiểu các nền văn hóa khác nhau, chúng ta làm phong phú thêm góc nhìn của mình và xây dựng các mối quan hệ với những người khác.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW()),
(UUID(), @Bai4, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","soChoTrong":2},"dapan":"shapes","giaithich":"Shape mang nghĩa định hình, tạo nên.\\nCụm diễn đạt tự nhiên: Culture shapes our identities.\\nForms, creates và establishes đều không diễn đạt chính xác ý nghĩa \\"định hình bản sắc\\".\\n\\n[DỊCH CÂU]\\nDù thông qua nghệ thuật, ngôn ngữ hay các lễ hội, văn hóa định hình bản sắc của chúng ta và mở ra cánh cửa để hiểu thêm về cuộc sống của người khác.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW()),
(UUID(), @Bai4, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","soChoTrong":3},"dapan":"By means of","giaithich":"By means of + V-ing có nghĩa là bằng cách, thông qua.\\nTrong câu: By means of experiencing these...\\nIn case of = trong trường hợp.\\nIn view of = xét đến, bởi vì.\\nOn behalf of = thay mặt cho.\\nCác cụm trên đều không phù hợp với ngữ cảnh.\\n\\n[DỊCH CÂU]\\nThông qua việc trải nghiệm những điều này, chúng ta sẽ thêm trân trọng cộng đồng toàn cầu.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW()),
(UUID(), @Bai4, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","soChoTrong":4},"dapan":"doors","giaithich":"Thành ngữ: open doors to = mở ra cơ hội cho.\\nĐây là cách diễn đạt rất phổ biến trong tiếng Anh.\\nWindows, gates và curtains không tạo thành thành ngữ này.\\n\\n[DỊCH CÂU]\\nHọc chỉ vài từ trong một ngôn ngữ khác cũng có thể mở ra cánh cửa đến với những tình bạn mới và sự thấu hiểu.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW()),
(UUID(), @Bai4, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","soChoTrong":5},"dapan":"expressions","giaithich":"Cultural expressions là collocation phổ biến, có nghĩa là các hình thức biểu đạt văn hóa.\\nDepression = sự trầm cảm.\\nImpressions = ấn tượng.\\nCompression = sự nén.\\nChỉ expressions phù hợp với ngữ cảnh nghệ thuật và văn hóa.\\n\\n[DỊCH CÂU]\\nNhững hình thức biểu đạt văn hóa trong âm nhạc, hội họa và các buổi biểu diễn là cánh cửa giúp chúng ta hiểu hơn về lịch sử và giá trị của một cộng đồng.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW()),
(UUID(), @Bai4, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","soChoTrong":6},"dapan":"Engage with","giaithich":"Engage with có nghĩa là tham gia, tương tác, tiếp cận.\\nTrong ngữ cảnh này: Engage with art and films...\\nContribute to = đóng góp vào.\\nCommit to = cam kết với.\\nShare with = chia sẻ với.\\nChỉ engage with phù hợp với ý nghĩa khuyến khích người đọc trải nghiệm nghệ thuật và phim ảnh.\\n\\n[DỊCH CÂU]\\nHãy trải nghiệm và tương tác với nghệ thuật và phim ảnh đến từ nhiều quốc gia khác nhau.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","cultural_diversity"]}', NOW());


-- =======================================================================
-- BÀI 5 — BT-DDTDS05 — Eco-Friendly Transportation
-- =======================================================================
SET @Bai5 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @Bai5, @MaKhoaHoc, @MaNganHang,
    'Bài 5 — Điền từ vào chỗ trống: Eco-Friendly Transportation', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Fill in each numbered blank with a suitable word or phrase from the word bank. Each item is used only once.',
    'Eco-Friendly Transportation\nChoose a Greener Way to Travel!\n\nLooking to reduce your carbon footprint? By making small adjustments to your daily commute, you can make a positive impact on the environment.\n\nWhy It Matters\nThe transport sector is responsible for nearly 30% of global carbon emissions. Switching to (1) __________ forms of transportation, like biking or public transit, can make a difference. Imagine if everyone (2) __________ their car use just one day per week—our air would be much cleaner!\n\nHow You Can Help\n- Bike or Walk whenever possible, especially for short trips.\n- Use Public Transit to avoid the emissions of individual cars. Public transit produces far less pollution per (3) __________.\n- Consider Carpooling with friends or coworkers. (4) __________ driving alone, sharing a ride reduces emissions and traffic.\n\nTogether, these changes reduce the (5) __________ of pollution and help create a healthier planet for all. By choosing more eco-friendly options, we can significantly lower the (6) __________ of emissions released into the atmosphere.\n\n(Adapted from WWF, Global Stewards)',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDTDS05','description',NULL,'status','APPROVED',
        'danhSachTu', JSON_ARRAY('rate','passenger','Instead of','amount','other','cuts down')),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @Bai5, NULL, 1, 'Chỗ trống (1)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (1)","soChoTrong":1},"dapan":"other","giaithich":"Other + danh từ số nhiều có nghĩa là những... khác.\\nTrong câu: other forms of transportation = các hình thức/phương tiện giao thông khác.\\nOthers là đại từ nên không đứng trước danh từ forms.\\nAnother chỉ đi với danh từ số ít.\\nThe others dùng để chỉ phần còn lại của một nhóm đã xác định.\\n\\n[DỊCH CÂU]\\nViệc chuyển sang các hình thức giao thông khác, như đi xe đạp hoặc sử dụng phương tiện công cộng, có thể tạo ra sự khác biệt.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW()),
(UUID(), @Bai5, NULL, 2, 'Chỗ trống (2)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (2)","soChoTrong":2},"dapan":"cuts down","giaithich":"Cụm động từ: cut down (on) something = cắt giảm, giảm bớt.\\nTrong ngữ cảnh này, câu muốn nói đến việc giảm việc sử dụng ô tô.\\nPut off = hoãn.\\nTake out = mang ra ngoài.\\nGive up = từ bỏ hoàn toàn.\\nCut down phù hợp nhất với ý nghĩa \\"giảm bớt\\".\\n\\n[DỊCH CÂU]\\nHãy tưởng tượng nếu mọi người giảm bớt việc sử dụng ô tô chỉ một ngày mỗi tuần thì không khí sẽ sạch hơn rất nhiều.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW()),
(UUID(), @Bai5, NULL, 3, 'Chỗ trống (3)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (3)","soChoTrong":3},"dapan":"passenger","giaithich":"Cụm diễn đạt quen thuộc: pollution per passenger = lượng ô nhiễm trên mỗi hành khách.\\nĐây là cách so sánh hiệu quả môi trường của phương tiện giao thông.\\nDistance, ticket và route đều không phù hợp về nghĩa.\\n\\n[DỊCH CÂU]\\nPhương tiện công cộng tạo ra lượng ô nhiễm thấp hơn nhiều trên mỗi hành khách.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW()),
(UUID(), @Bai5, NULL, 4, 'Chỗ trống (4)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (4)","soChoTrong":4},"dapan":"Instead of","giaithich":"Instead of + V-ing/N = thay vì...\\nTrong câu: Instead of driving alone...\\nDue to = do, bởi vì.\\nIn addition to = ngoài ra, thêm vào.\\nRegarding = liên quan đến.\\nChỉ Instead of phù hợp với ý nghĩa đối lập trong câu.\\n\\n[DỊCH CÂU]\\nThay vì lái xe một mình, việc đi chung xe giúp giảm khí thải và ùn tắc giao thông.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW()),
(UUID(), @Bai5, NULL, 5, 'Chỗ trống (5)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (5)","soChoTrong":5},"dapan":"amount","giaithich":"Pollution là danh từ không đếm được.\\nCấu trúc: the amount of + danh từ không đếm được.\\nNumber chỉ dùng với danh từ đếm được số nhiều.\\nLevel và supply không diễn đạt đúng ý trong ngữ cảnh này.\\n\\n[DỊCH CÂU]\\nNhững thay đổi này giúp giảm lượng ô nhiễm và góp phần tạo nên một hành tinh khỏe mạnh hơn.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW()),
(UUID(), @Bai5, NULL, 6, 'Chỗ trống (6)', 1, '{"debai":{"cauHoiGoc":"Chỗ trống (6)","soChoTrong":6},"dapan":"rate","giaithich":"Rate có nghĩa là tỷ lệ, mức độ.\\nCụm: the rate of emissions.\\nĐây là cách diễn đạt phổ biến khi nói về tốc độ hoặc tỷ lệ phát thải.\\nDemand = nhu cầu.\\nStandard = tiêu chuẩn.\\nQuantity = số lượng.\\nCác từ này không phù hợp với ngữ cảnh.\\n\\n[DỊCH CÂU]\\nBằng cách lựa chọn các phương tiện thân thiện với môi trường hơn, chúng ta có thể giảm đáng kể tỷ lệ khí thải được thải vào bầu khí quyển.","loai":"CQ_DIEN_TU_DANH_SACH","la_tu_luan":false,"tags":["cloze_test","word_bank","environment"]}', NOW());
