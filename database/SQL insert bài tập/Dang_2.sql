SET NAMES utf8mb4;

-- =======================================================================
-- MO HINH NGAN HANG DE:
--   baitap (LaMauNganHang = 1) = MOT BAI TAP trong ngan hang
--     - HuongDanChung       : huong dan chung
--     - NoiDungNguCanhChung : BAI DOC dung chung (luu DUNG MOT LAN)
--     - LoaiCauHoi          : dang cau hoi cua ca bai
--     - MoTa                : JSON envelope chua ma bai tap + ghi chu
--   baitapcauhoi = MOI CAU CON mot dong, NoiDung la JSON rieng cua cau do
-- =======================================================================

SET @MaKhoaHoc = (SELECT `MaKhoaHoc` FROM `khoahoc` LIMIT 1);

SET @LoaiCauHoi = (SELECT c.`MaChiTiet` FROM `chitietdanhmuc` c
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

-- -----------------------------------------------------------------------
-- BT-DNGTU02 — Nối ghép tương ứng (Matching) - Mystery Shopper
-- -----------------------------------------------------------------------
SET @BaiTap_1 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_1, @MaKhoaHoc, @MaNganHang, 'Nối ghép tương ứng (Matching) - Mystery Shopper', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Match each option in the left column with a corresponding option in the right column.', 'I am in a supermarket, doing my best to look like any other shopper browsing the shelves. My opinion on this trip is to buy something I fancy from the bakery, which means I''ll have to interact with the person at the counter. I''m hoping to pass off the handwritten notes I''m carrying as a shopping list, because no one must know why I am here. I have to keep my identity secret because I am a mystery shopper.(I)

My job involves visiting five to ten different stores a day and scoring them on, among other things, their appearance and cleanliness. (II). With the €20 I am given to spend at each store, I purchase the obligatory item that enables me to assess the service I receive at the checkout. (III). Adding the value of my purchase to the €225 I make in a typical day of eight hours of visits and two hours filing reports, I earn more than enough to live on. (IV).

However, assignments paying as well as mine are becoming few and far between due to the soaring demand in my line of work. Retailers increasingly need to maintain standards so as to offer consumers a quality shopping experience and keep them from turning to the internet. However, to date, there are more than half a million mystery shoppers registered in the UK, making competition for jobs very fierce. Today it isn''t only other shoppers I hide my identity from; even my friends and family don''t know who I work for.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DNGTU02','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_1, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the most appropriate summary sentences for each paragraph.",
    "danhSachTrai": [
      {
        "id": "p1",
        "text": "Paragraph 1"
      },
      {
        "id": "p2",
        "text": "Paragraph 2"
      },
      {
        "id": "p3",
        "text": "Paragraph 3"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "The writer describes his daily duties, including evaluating stores, making purchases, writing reports, and earning a good income."
      },
      {
        "id": "b",
        "text": "The writer explains that although retailers increasingly need mystery shoppers, growing competition has made it much harder to find well-paid assignments."
      },
      {
        "id": "c",
        "text": "The writer introduces himself as a mystery shopper who must keep his identity secret while pretending to be an ordinary customer."
      }
    ]
  },
  "dapan": {
    "p1": "c",
    "p2": "a",
    "p3": "b"
  },
  "giaithich": "[TIẾNG VIỆT]\\nĐoạn 1: Tác giả tự giới thiệu mình là một người mua hàng bí mật, phải giữ kín danh tính của mình trong khi giả vờ là một khách hàng bình thường.\\nĐoạn 2: Tác giả mô tả các nhiệm vụ hàng ngày của mình, bao gồm đánh giá các cửa hàng, mua hàng, viết báo cáo và kiếm được một khoản thu nhập khá.\\nĐoạn 3: Tác giả giải thích rằng mặc dù các nhà bán lẻ ngày càng cần nhiều người mua hàng bí mật, nhưng sự cạnh tranh ngày càng tăng đã khiến việc tìm kiếm các nhiệm vụ được trả lương cao trở nên khó khăn hơn nhiều.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the equivalent phrase from the left and right columns.",
    "danhSachTrai": [
      {
        "id": "t1",
        "text": "pass off"
      },
      {
        "id": "t2",
        "text": "Them"
      },
      {
        "id": "t3",
        "text": "Soaring"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "Rising"
      },
      {
        "id": "b",
        "text": "Pretend"
      },
      {
        "id": "c",
        "text": "The stores"
      }
    ]
  },
  "dapan": {
    "t1": "b",
    "t2": "c",
    "t3": "a"
  },
  "giaithich": "[TIẾNG ANH & TIẾNG VIỆT]\\n- pass something off as something: vờ cái gì là cái gì = pretend. I''m hoping to pass off the handwritten notes I''m carrying as a shopping list... (Tôi đang hi vọng sẽ vờ như những ghi chú viết tay mà tôi đang cầm là danh sách mua sắm...)\\n- Them = The stores. My job involves visiting five to ten different stores a day and scoring them on... (Công việc của tôi bao gồm ghé năm đến mười cửa hàng khác nhau một ngày và chấm điểm họ...)\\n- soaring (adj): tăng vọt = rising (adj): tăng. However, assignments paying as well as mine are becoming few and far between due to the soaring demand... (Tuy nhiên, những công việc được trả lương cao như công việc của tôi đang ngày càng ít đi do nhu cầu ngày càng tăng cao.)",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "Match the sentences from the left column with the sentences from the right column.",
    "danhSachTrai": [
      {
        "id": "s1",
        "text": "I have to keep my identity secret because I am a mystery shopper. (I)"
      },
      {
        "id": "s2",
        "text": "My job involves visiting five to ten different stores a day and scoring them on, among other things, their appearance and cleanliness. (II)"
      },
      {
        "id": "s3",
        "text": "With the €20 I am given to spend at each store, I purchase the obligatory item that enables me to assess the service I receive at the checkout. (III)"
      },
      {
        "id": "s4",
        "text": "Adding the value of my purchase to the €225 I make in a typical day of eight hours of visits and two hours filing reports, I earn more than enough to live on. (IV)"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "The job provides a comfortable income."
      },
      {
        "id": "b",
        "text": "A required purchase is used to assess customer service."
      },
      {
        "id": "c",
        "text": "Mystery shoppers must remain anonymous."
      },
      {
        "id": "d",
        "text": "The job involves evaluating several stores each day."
      }
    ]
  },
  "dapan": {
    "s1": "c",
    "s2": "d",
    "s3": "b",
    "s4": "a"
  },
  "giaithich": "[TIẾNG VIỆT]\\n1. Tôi phải giữ kín danh tính của mình vì tôi là một người mua hàng bí mật -> Người mua hàng bí mật phải giữ kín danh tính.\\n2. Công việc của tôi bao gồm việc ghé thăm từ năm đến mười cửa hàng khác nhau mỗi ngày và chấm điểm chúng... -> Công việc này bao gồm việc đánh giá nhiều cửa hàng mỗi ngày.\\n3. Với 20 euro được cấp để chi tiêu tại mỗi cửa hàng, tôi mua món hàng bắt buộc để đánh giá chất lượng dịch vụ... -> Việc mua hàng bắt buộc được sử dụng để đánh giá dịch vụ khách hàng.\\n4. Cộng thêm giá trị món đồ tôi mua vào số tiền 225 euro tôi kiếm được... tôi kiếm được nhiều hơn mức đủ sống -> Công việc này mang lại thu nhập thoải mái.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DNGTU03 — Nối ghép tương ứng (Matching) - Naming Traditions
-- -----------------------------------------------------------------------
SET @BaiTap_2 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_2, @MaKhoaHoc, @MaNganHang, 'Nối ghép tương ứng (Matching) - Naming Traditions', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Match each option in the left column with a corresponding option in the right column.', 'In many European cultures, names are typically chosen by parents. Parents'' choice for their child''s name may be based on names of relatives or ancestors within their particular family. For example, in Italy, children are traditionally named after their grandparents. The parents generally use the father''s parents'' names first. If they have more children, then they will use the mother''s parents'' names. Similarly, some people in Eastern Europe name their children after relatives who have died. This tradition is seen as a means to protect the child from the Angel of Death.

Traditionally in some Asian countries, a child''s grandfather or a fortune-teller chooses the child''s name. In contrast to the tradition of naming children after relatives, the child''s name is chosen to influence the child''s character. For example, names may be based on a connection to certain elements such as fire, water, earth, wood, or metal. Or the name might include a written character meaning beauty, strength, or kindness.

In certain African cultures, when a child is born plays a large part in determining the child''s name. In Ghana''s Akan culture, the day a child is born determines the child''s name. But each day has different names for boys and girls. For instance, a boy born on Friday is named Kofi, whereas a girl born on the same day is named Afua. Both Kofi and Afua are names meaning "wanderer" or "explorer." Children with these names are seen as travelers.

No matter where the name comes from, a child''s name is the first gift in life. Whether it is chosen according to preference or dictated by tradition, the name reflects something about a child''s culture. For that reason, all names should be treasured and respected.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DNGTU03','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_2, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the most appropriate summary sentences for each paragraph.",
    "danhSachTrai": [
      {
        "id": "p1",
        "text": "Paragraph 1"
      },
      {
        "id": "p2",
        "text": "Paragraph 2"
      },
      {
        "id": "p3",
        "text": "Paragraph 3"
      },
      {
        "id": "p4",
        "text": "Paragraph 4"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "A child''s name reflects cultural traditions and should always be valued and respected."
      },
      {
        "id": "b",
        "text": "In certain African cultures, a child''s name is determined by the day on which he or she is born."
      },
      {
        "id": "c",
        "text": "In some Asian cultures, children''s names are carefully chosen to shape their personality and future."
      },
      {
        "id": "d",
        "text": "In many European cultures, children are traditionally named after their relatives or ancestors."
      }
    ]
  },
  "dapan": {
    "p1": "d",
    "p2": "c",
    "p3": "b",
    "p4": "a"
  },
  "giaithich": "[TIẾNG VIỆT]\\nĐoạn 1: Trong nhiều nền văn hóa châu Âu, trẻ em thường được đặt tên theo người thân hoặc tổ tiên.\\nĐoạn 2: Ở một số nền văn hóa châu Á, tên của trẻ em được chọn cẩn thận để định hình tính cách và tương lai của chúng.\\nĐoạn 3: Trong một số nền văn hóa châu Phi, tên của trẻ em được xác định bởi ngày mà chúng sinh ra.\\nĐoạn 4: Tên của một đứa trẻ phản ánh truyền thống văn hóa và luôn cần được trân trọng, tôn trọng.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the equivalent phrase from the left and right columns.",
    "danhSachTrai": [
      {
        "id": "t1",
        "text": "Protect"
      },
      {
        "id": "t2",
        "text": "Treasured"
      },
      {
        "id": "t3",
        "text": "It"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "valued"
      },
      {
        "id": "b",
        "text": "The child''s name"
      },
      {
        "id": "c",
        "text": "defend"
      }
    ]
  },
  "dapan": {
    "t1": "c",
    "t2": "a",
    "t3": "b"
  },
  "giaithich": "[TIẾNG ANH & TIẾNG VIỆT]\\n- protect (v): bảo vệ = defend (v): phòng thủ, bảo vệ. This tradition is seen as a means to protect the child...\\n- treasure (v): trân trọng = value (v): coi trọng, trân trọng. For that reason, all names should be treasured and respected.\\n- It = The child''s name. No matter where the name comes from, a child''s name is the first gift in life. Whether it is chosen according to preference...",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "Match the naming traditions (A–D) with the cultures or regions (1–4).",
    "danhSachTrai": [
      {
        "id": "A",
        "text": "Children are often named after their grandparents or other relatives."
      },
      {
        "id": "B",
        "text": "A grandfather or a fortune-teller chooses a name that is believed to influence the child''s character."
      },
      {
        "id": "C",
        "text": "A child''s name is determined by the day of the week on which he or she is born."
      },
      {
        "id": "D",
        "text": "Children may be named after deceased relatives to protect them from the Angel of Death."
      }
    ],
    "danhSachPhai": [
      {
        "id": "1",
        "text": "Some Asian countries"
      },
      {
        "id": "2",
        "text": "Italy"
      },
      {
        "id": "3",
        "text": "Ghana (Akan culture)"
      },
      {
        "id": "4",
        "text": "Some Eastern European countries"
      }
    ]
  },
  "dapan": {
    "A": "2",
    "B": "1",
    "C": "3",
    "D": "4"
  },
  "giaithich": "[TIẾNG VIỆT]\\nA - Italy: Trẻ em thường được đặt tên theo tên ông bà (đoạn 1).\\nB - Asian countries: Theo truyền thống ở một số nước châu Á, tên của đứa trẻ do ông nội hoặc thầy bói chọn để ảnh hưởng đến tính cách (đoạn 2).\\nC - Ghana (Akan culture): Tên của một đứa trẻ được xác định bởi ngày trong tuần mà chúng sinh ra (đoạn 3).\\nD - Eastern European: Đặt tên cho con theo tên của người thân đã qua đời để bảo vệ đứa trẻ khỏi Thiên thần Báo tử (đoạn 1).",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "reading_comprehension",
    "summary",
    "vocabulary",
    "synonym",
    "detail"
  ]
}', NOW());
