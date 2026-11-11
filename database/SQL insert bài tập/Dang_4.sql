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
    WHERE c.`MaCode` = 'CQ_TRAC_NGHIEM_1' LIMIT 1);
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
-- BT-DDH01 — Đọc hiểu - A Secret Job
-- -----------------------------------------------------------------------
SET @BaiTap_1 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_1, @MaKhoaHoc, @MaNganHang, 'Đọc hiểu - A Secret Job', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Read the following passage about a secret job and mark the letter A, B, C or D on your answer sheet to indicate the best answer to each of the following questions.', 'I am in a supermarket, doing my best to look like any other shopper browsing the shelves. My opinion on this trip is to buy something I fancy from the bakery, which means I’ll have to interact with the person at the counter. I’m hoping to pass off the handwritten notes I’m carrying as a shopping list, because no one must know why I am here. I have to keep my identity secret because I am a mystery shopper.(I)

My job involves visiting five to ten different stores a day and scoring them on, among other things, their appearance and cleanliness. (II). With the €20 I am given to spend at each store, I purchase the obligatory item that enables me to assess the service I receive at the checkout. (III). Adding the value of my purchase to the €225 I make in a typical day of eight hours of visits and two hours filing reports, I earn more than enough to live on. (IV).

However, assignments paying as well as mine are becoming few and far between due to the soaring demand in my line of work. Retailers increasingly need to maintain standards so as to offer consumers a quality shopping experience and keep them from turning to the internet. However, to date, there are more than half a million mystery shoppers registered in the UK, making competition for jobs very fierce. Today it isn’t only other shoppers I hide my identity from; even my friends and family don’t know who I work for.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDH01','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_1, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "Where in paragraph 2 does the following sentence best fit? \\"This feedback helps retailers improve their services and maintain customer satisfaction\\"",
    "luaChon": [
      {
        "id": "A",
        "text": "(IV)"
      },
      {
        "id": "B",
        "text": "(I)"
      },
      {
        "id": "C",
        "text": "(II)"
      },
      {
        "id": "D",
        "text": "(III)"
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu phù hợp nhất ở vị trí (II) do cụm từ \\"this feedback\\" (phản hồi này) ám chỉ đến hành động \\"scoring them\\" (chấm điểm họ) nằm ở câu liền trước.\\nThông tin: My job involves visiting five to ten different stores a day and scoring them on, among other things, their appearance and cleanliness. This feedback helps retailers improve...",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_1, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is NOT a reason why mystery shopping has become more competitive?",
    "luaChon": [
      {
        "id": "A",
        "text": "There is rising competition due to high demand for mystery shoppers."
      },
      {
        "id": "B",
        "text": "More than half a million mystery shoppers are registered in the UK."
      },
      {
        "id": "C",
        "text": "The number of stores has been declining."
      },
      {
        "id": "D",
        "text": "Retailers are increasingly focused on providing a good shopping experience."
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án C (Số lượng cửa hàng đã và đang giảm) KHÔNG được nhắc đến trong bài.\\nCác ý khác đều có trong đoạn 3:\\n- A: \\"...due to the soaring demand in my line of work.\\"\\n- B: \\"...there are more than half a million mystery shoppers registered in the UK...\\"\\n- D: \\"Retailers increasingly need to maintain standards so as to offer consumers a quality shopping experience...\\"",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_1, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best summarises paragraph 3?",
    "luaChon": [
      {
        "id": "A",
        "text": "The writer talks about how the demand for mystery shoppers has decreased over time."
      },
      {
        "id": "B",
        "text": "The writer describes their relationship with their friends and family."
      },
      {
        "id": "C",
        "text": "The writer explains why mystery shopping has become more competitive and how they keep their job a secret."
      },
      {
        "id": "D",
        "text": "The writer talks about the importance of online shopping for retailers."
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 3 nói về những lý do vì sao công việc này trở nên cạnh tranh (nhu cầu cao, số người đăng ký đông). Đồng thời người làm việc cũng phải giữ bí mật danh tính với bạn bè và gia đình. Do đó, đáp án C bao quát đầy đủ nhất.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_1, NULL, 4, 'Câu 4', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is TRUE according to the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "There are only a few mystery shoppers registered in the UK."
      },
      {
        "id": "B",
        "text": "The writer makes enough money to live comfortably from mystery shopping."
      },
      {
        "id": "C",
        "text": "The writer spends €225 on purchases every day."
      },
      {
        "id": "D",
        "text": "Mystery shoppers usually reveal their identity to the store staff."
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án B đúng. \\nThông tin ở cuối đoạn 2: \\"Adding the value of my purchase to the €225 I make... I earn more than enough to live on.\\" (Cộng giá trị mua hàng vào số tiền 225 euro tôi kiếm được... tôi kiếm được nhiều hơn mức đủ để sống).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_1, NULL, 5, 'Câu 5', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best paraphrases the underlined sentence: \\"Retailers increasingly need to maintain standards so as to offer consumers a quality shopping experience and keep them from turning to the internet\\"?",
    "luaChon": [
      {
        "id": "A",
        "text": "Retailers must uphold high standards to keep customers satisfied and prevent them from shopping online."
      },
      {
        "id": "B",
        "text": "Consumers are turning to the internet because retailers are not maintaining their standards."
      },
      {
        "id": "C",
        "text": "Retailers are focused on improving their online shopping services to attract more customers."
      },
      {
        "id": "D",
        "text": "Retailers have decided to lower their standards due to competition from online stores."
      }
    ]
  },
  "dapan": "A",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu gốc có nghĩa: \\"Các nhà bán lẻ ngày càng cần duy trì những tiêu chuẩn để mang đến trải nghiệm chất lượng và giữ chân khách hàng khỏi việc chuyển sang mua sắm trên internet\\".\\nĐáp án A diễn đạt lại chính xác nhất ý nghĩa này: \\"Các nhà bán lẻ phải giữ vững các tiêu chuẩn cao để khiến khách hàng hài lòng và ngăn họ mua sắm trực tuyến\\".",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_1, NULL, 6, 'Câu 6', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following can be inferred from the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "Mystery shoppers are required to reveal their identities at the end of each visit."
      },
      {
        "id": "B",
        "text": "The job of a mystery shopper is highly predictable and steady."
      },
      {
        "id": "C",
        "text": "The growing competition among mystery shoppers is making it harder to find high-paying assignments."
      },
      {
        "id": "D",
        "text": "Mystery shoppers are paid based on how many stores they visit each day."
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCó thể suy ra từ đoạn 3: \\"However, assignments paying as well as mine are becoming few and far between due to the soaring demand in my line of work.\\" (Những công việc được trả lương cao như của tôi đang ngày càng ít đi do nhu cầu trong lĩnh vực này tăng vọt). Điều này cho thấy sự cạnh tranh đang làm việc tìm kiếm các nhiệm vụ lương cao trở nên khó khăn hơn (Đáp án C).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DDH02 — Đọc hiểu - Naming Traditions
-- -----------------------------------------------------------------------
SET @BaiTap_2 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_2, @MaKhoaHoc, @MaNganHang, 'Đọc hiểu - Naming Traditions', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the best answer to each of the following questions.', 'In many European cultures, names are typically chosen by parents. Parents'' choice for their child''s name may be based on names of relatives or ancestors within their particular family. For example, in Italy, children are traditionally named after their grandparents. The parents generally use the father''s parents'' names first. If they have more children, then they will use the mother''s parents'' names. Similarly, some people in Eastern Europe name their children after relatives who have died. This tradition is seen as a means to protect the child from the Angel of Death.

Traditionally in some Asian countries, a child''s grandfather or a fortune-teller chooses the child''s name. In contrast to the tradition of naming children after relatives, the child''s name is chosen to influence the child''s character. For example, names may be based on a connection to certain elements such as fire, water, earth, wood, or metal. Or the name might include a written character meaning beauty, strength, or kindness.

In certain African cultures, when a child is born plays a large part in determining the child''s name. In Ghana''s Akan culture, the day a child is born determines the child''s name. But each day has different names for boys and girls. For instance, a boy born on Friday is named Kofi, whereas a girl born on the same day is named Afua. Both Kofi and Afua are names meaning "wanderer" or "explorer." Children with these names are seen as travelers.

No matter where the name comes from, a child''s name is the first gift in life. Whether it is chosen according to preference or dictated by tradition, the name reflects something about a child''s culture. For that reason, all names should be treasured and respected.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDH02','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_2, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is NOT mentioned in the passage ?",
    "luaChon": [
      {
        "id": "A",
        "text": "The process of naming varies significantly across cultures."
      },
      {
        "id": "B",
        "text": "Parents in all cultures choose their child''s name."
      },
      {
        "id": "C",
        "text": "Names are chosen on family traditions."
      },
      {
        "id": "D",
        "text": "Some cultures have specific meanings attached to names."
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án B nói rằng bố mẹ ở TẤT CẢ các nền văn hóa đều chọn tên cho con là sai. \\nThông tin ở đoạn 2 viết: \\"Traditionally in some Asian countries, a child’s grandfather or a fortune-teller chooses the child’s name.\\" (Theo truyền thống ở một số nước châu Á, tên của một đứa trẻ thường được ông nội hoặc thầy bói chọn).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_2, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best paraphrases the underlined sentence \\"No matter where the name comes from, a child’s name is the first gift in life.\\"",
    "luaChon": [
      {
        "id": "A",
        "text": "A child''s name is always given by parents."
      },
      {
        "id": "B",
        "text": "Regardless of its origin, a child''s name is an important gift."
      },
      {
        "id": "C",
        "text": "However the name is given, it''s still the child''s event."
      },
      {
        "id": "D",
        "text": "The name a child receives is often not significant."
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu gốc có nghĩa: \\"Bất kể cái tên đến từ đâu, tên của một đứa trẻ là món quà đầu tiên trong đời\\".\\nĐáp án B diễn đạt đúng ý nhất: \\"Bất kể nguồn gốc của nó, tên của đứa trẻ là một món quà quan trọng\\" (Regardless of its origin = No matter where the name comes from).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_2, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "According to the text, which of the following detail is TRUE?",
    "luaChon": [
      {
        "id": "A",
        "text": "Names in African cultures are the same for all children."
      },
      {
        "id": "B",
        "text": "Parents are not involved in the naming process in any culture."
      },
      {
        "id": "C",
        "text": "All cultures choose names based solely on family history."
      },
      {
        "id": "D",
        "text": "In some Asian cultures, names may influence character traits."
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án D đúng. Thông tin ở đoạn 2: \\"...the child’s name is chosen to influence the child’s character.\\" (tên của đứa trẻ được chọn để ảnh hưởng đến tính cách của chúng).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_2, NULL, 4, 'Câu 4', 1, '{
  "debai": {
    "cauHoiGoc": "In which paragraph does the writer mention about the culture in which children are most likely named after their grandparents?",
    "luaChon": [
      {
        "id": "A",
        "text": "Paragraph 1"
      },
      {
        "id": "B",
        "text": "Paragraph 3"
      },
      {
        "id": "C",
        "text": "Paragraph 4"
      },
      {
        "id": "D",
        "text": "Paragraph 2"
      }
    ]
  },
  "dapan": "A",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 1 có viết: \\"For example, in Italy, children are traditionally named after their grandparents.\\" (Ví dụ, ở Ý, trẻ em thường được đặt tên theo tên của ông bà).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_2, NULL, 5, 'Câu 5', 1, '{
  "debai": {
    "cauHoiGoc": "In which paragraph does the writer mention about the relationship between a child’s name and his/her personality?",
    "luaChon": [
      {
        "id": "A",
        "text": "Paragraph 1"
      },
      {
        "id": "B",
        "text": "Paragraph 2"
      },
      {
        "id": "C",
        "text": "Paragraph 4"
      },
      {
        "id": "D",
        "text": "Paragraph 3"
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 2 có viết: \\"...the child’s name is chosen to influence the child’s character.\\" (tên của đứa trẻ được chọn để ảnh hưởng đến tính cách của chúng). Từ \\"character\\" đồng nghĩa với \\"personality\\".",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DDH03 — Đọc hiểu - Green Living
-- -----------------------------------------------------------------------
SET @BaiTap_3 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_3, @MaKhoaHoc, @MaNganHang, 'Đọc hiểu - Green Living', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Read the following passage and mark the letter A, B, C or D on your answer sheet to indicate the best answer to each of the following questions.', 'GREEN LIVING: A PATH TO A SUSTAINABLE FUTURE

In a world grappling with climate change and environmental degradation, green living has emerged as a vital approach to ensure sustainability. Green living involves adopting practices that minimize harm to the environment while promoting a healthy lifestyle. These include reducing waste, conserving energy, and embracing renewable resources.

One key aspect of green living is reducing waste. This can be achieved through recycling, composting, and cutting back on single-use plastics. For example, using reusable water bottles and shopping bags can significantly decrease the amount of plastic waste that pollutes our ecosystems. Moreover, individuals can conserve energy by switching to energy-efficient appliances, unplugging devices when not in use, and maximizing natural light in their homes.

Another crucial element of green living is opting for renewable energy sources like solar and wind power. These alternatives not only reduce greenhouse gas emissions but also lower energy costs over time. Additionally, adopting plant-based diets or reducing meat consumption can lessen the environmental impact of food production, which is a major contributor to deforestation and water pollution.

Communities around the world are recognizing the importance of green living. For instance, cities are promoting cycling and public transport to decrease carbon emissions. Similarly, educational campaigns are raising awareness about sustainable practices. By making small, consistent changes, individuals and societies can contribute to a healthier planet and secure a better future for generations to come.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDH03','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_3, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "In which paragraph does the writer discuss community-level green living initiatives?",
    "luaChon": [
      {
        "id": "A",
        "text": "Paragraph 2"
      },
      {
        "id": "B",
        "text": "Paragraph 1"
      },
      {
        "id": "C",
        "text": "Paragraph 4"
      },
      {
        "id": "D",
        "text": "Paragraph 3"
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 4 nhắc đến các hoạt động sống xanh ở cấp độ cộng đồng: \\"Communities around the world are recognizing the importance of green living. For instance, cities are promoting cycling and public transport...\\"",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_3, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best paraphrases the underlined sentence in paragraph 3? \\"Adopting plant-based diets can lessen the environmental impact of food production.\\"",
    "luaChon": [
      {
        "id": "A",
        "text": "Switching to a plant-based diet will solve environmental problems."
      },
      {
        "id": "B",
        "text": "Plant-based diets completely eliminate pollution."
      },
      {
        "id": "C",
        "text": "Food production is unaffected by plant-based diets."
      },
      {
        "id": "D",
        "text": "Eating more plants can reduce harm caused by food production."
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu gốc mang ý nghĩa: \\"Áp dụng chế độ ăn từ thực vật có thể làm giảm (lessen) tác động môi trường của sản xuất thực phẩm\\".\\nĐáp án D diễn giải lại đúng nhất: Ăn nhiều thực vật hơn có thể giảm thiểu tác hại (reduce harm) do sản xuất thực phẩm gây ra.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_3, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "In which paragraph does the writer mention ways individuals can conserve energy?",
    "luaChon": [
      {
        "id": "A",
        "text": "Paragraph 4"
      },
      {
        "id": "B",
        "text": "Paragraph 3"
      },
      {
        "id": "C",
        "text": "Paragraph 1"
      },
      {
        "id": "D",
        "text": "Paragraph 2"
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 2 liệt kê các cách tiết kiệm năng lượng: \\"...individuals can conserve energy by switching to energy-efficient appliances, unplugging devices when not in use...\\" (cá nhân có thể tiết kiệm năng lượng bằng cách chuyển sang sử dụng các thiết bị tiết kiệm năng lượng...)",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_3, NULL, 4, 'Câu 4', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is TRUE according to the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "Green living is primarily about reducing plastic use."
      },
      {
        "id": "B",
        "text": "Renewable energy helps reduce greenhouse gas emissions."
      },
      {
        "id": "C",
        "text": "Energy-efficient appliances increase electricity use."
      },
      {
        "id": "D",
        "text": "Cycling does not help decrease carbon emissions."
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án B đúng. Đoạn 3 có viết: \\"These alternatives [renewable energy sources] not only reduce greenhouse gas emissions but also lower energy costs...\\" (Những nguồn năng lượng tái tạo này không chỉ làm giảm phát thải khí nhà kính...).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_3, NULL, 5, 'Câu 5', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is NOT mentioned as a practice of green living?",
    "luaChon": [
      {
        "id": "A",
        "text": "using energy-efficient appliances"
      },
      {
        "id": "B",
        "text": "recycling waste"
      },
      {
        "id": "C",
        "text": "installing solar panels"
      },
      {
        "id": "D",
        "text": "buying luxury cars"
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án D (mua xe ô tô hạng sang) hoàn toàn không được nhắc đến trong bài như một biện pháp sống xanh.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DDH04 — Đọc hiểu - Multicultural World
-- -----------------------------------------------------------------------
SET @BaiTap_4 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_4, @MaKhoaHoc, @MaNganHang, 'Đọc hiểu - Multicultural World', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Read the following passage about the urban shift and mark the letter A, B, C or D on your answer sheet to indicate the best answer to each of the following Questions.', 'Multiculturalism is a concept that has existed throughout history, not just in modern times. In today''s interconnected society, multiculturalism has become a defining feature of many countries. It refers to the coexistence of diverse cultural, ethnic, and religious groups within a community. This diversity enriches societies, fostering creativity, innovation, and global understanding. However, living in a multicultural world also presents challenges, such as the need to balance cultural preservation with social integration.

One significant advantage of multiculturalism is the opportunity for cultural exchange. People from different backgrounds can share traditions, cuisine, art, and perspectives, broadening their understanding of the world. For example, international festivals and food markets often showcase the vibrant diversity of a community, promoting appreciation and respect for different cultures. Such exchanges contribute to a richer, more inclusive society.

However, multiculturalism also requires individuals and societies to navigate potential challenges. Misunderstandings, cultural clashes, and prejudice can arise in multicultural settings. For instance, differing values or customs might lead to tensions or conflicts. To address these issues, education and dialogue are essential to resolving cultural misunderstandings. Schools and workplaces can play a critical role by fostering inclusivity and teaching cultural awareness.

Multiculturalism also brings economic benefits. Diverse teams in workplaces often bring unique skills and perspectives, leading to increased creativity and problem-solving abilities. Moreover, tourism thrives in multicultural areas, as visitors are drawn to the rich tapestry of cultures and traditions.

Living in a multicultural world teaches us that diversity is not something to fear but to celebrate. By embracing and learning from our differences, we can build stronger, more harmonious communities. While challenges exist, the benefits of multiculturalism far outweigh the difficulties, making it a vital component of a thriving modern society.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DDH04','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_4, NULL, 1, 'Câu 1', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following is TRUE according to the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "Cultural differences always lead to conflict."
      },
      {
        "id": "B",
        "text": "Schools rarely promote inclusivity."
      },
      {
        "id": "C",
        "text": "Diversity can enhance creativity in workplaces."
      },
      {
        "id": "D",
        "text": "Multiculturalism has no economic benefits."
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án C đúng. Thông tin ở đoạn 4 khẳng định: \\"Diverse teams in workplaces often bring unique skills and perspectives, leading to increased creativity...\\" (Các đội nhóm đa dạng ở nơi làm việc dẫn đến sự sáng tạo được nâng cao).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following can be inferred from the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "Living in a multicultural world requires effort and understanding."
      },
      {
        "id": "B",
        "text": "Cultural preservation is more important than integration."
      },
      {
        "id": "C",
        "text": "Multicultural societies are immune to prejudice."
      },
      {
        "id": "D",
        "text": "Economic benefits are the main reason to embrace multiculturalism."
      }
    ]
  },
  "dapan": "A",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐáp án A là suy luận chính xác. Đoạn 3 nêu rõ: \\"To address these issues, education and dialogue are essential to resolving cultural misunderstandings.\\" Việc cần phải có \\"giáo dục và đối thoại\\" chứng tỏ cần có sự nỗ lực và thấu hiểu (effort and understanding) để sống trong môi trường đa văn hóa.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "According to paragraph 2, which of the following is NOT an example of cultural exchange?",
    "luaChon": [
      {
        "id": "A",
        "text": "sharing cuisine"
      },
      {
        "id": "B",
        "text": "hosting international festivals"
      },
      {
        "id": "C",
        "text": "teaching cultural awareness"
      },
      {
        "id": "D",
        "text": "exploring different traditions"
      }
    ]
  },
  "dapan": "C",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 2 liệt kê các ví dụ về giao lưu văn hóa như: share traditions (chia sẻ truyền thống), cuisine (ẩm thực), international festivals (lễ hội quốc tế). Việc \\"teaching cultural awareness\\" (dạy nhận thức văn hóa) được nhắc đến ở đoạn 3, không nằm trong các ví dụ của đoạn 2.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 4, 'Câu 4', 1, '{
  "debai": {
    "cauHoiGoc": "The word \\"prejudice\\" in paragraph 3 is OPPOSITE in meaning to________.",
    "luaChon": [
      {
        "id": "A",
        "text": "bias"
      },
      {
        "id": "B",
        "text": "fairness"
      },
      {
        "id": "C",
        "text": "ignorance"
      },
      {
        "id": "D",
        "text": "intolerance"
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\n\\"prejudice\\" (định kiến, thành kiến) mang nghĩa tiêu cực, thiên lệch. Trái nghĩa với nó là \\"fairness\\" (sự công bằng, không phân biệt).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 5, 'Câu 5', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best summarises paragraph 2?",
    "luaChon": [
      {
        "id": "A",
        "text": "The benefits of cultural exchange in diverse societies"
      },
      {
        "id": "B",
        "text": "The role of schools in promoting cultural understanding"
      },
      {
        "id": "C",
        "text": "The challenges posed by cultural differences"
      },
      {
        "id": "D",
        "text": "The importance of preserving traditional cultures"
      }
    ]
  },
  "dapan": "A",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐoạn 2 bắt đầu bằng câu: \\"One significant advantage of multiculturalism is the opportunity for cultural exchange.\\" Sau đó nêu ra các ví dụ về lợi ích của sự trao đổi này (mở rộng hiểu biết, phong phú xã hội). Vậy tóm tắt đúng nhất là A: Lợi ích của trao đổi văn hóa.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 6, 'Câu 6', 1, '{
  "debai": {
    "cauHoiGoc": "The word \\"it\\" in paragraph 5 refers to________.",
    "luaChon": [
      {
        "id": "A",
        "text": "learning from differences"
      },
      {
        "id": "B",
        "text": "a thriving society"
      },
      {
        "id": "C",
        "text": "building stronger communities"
      },
      {
        "id": "D",
        "text": "multiculturalism"
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nĐọc câu văn chứa từ này ở cuối bài: \\"...the benefits of multiculturalism far outweigh the difficulties, making it a vital component...\\" (lợi ích của đa văn hóa vượt xa những khó khăn, khiến NÓ trở thành một phần thiết yếu...). \\"It\\" ở đây ám chỉ \\"multiculturalism\\".",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 7, 'Câu 7', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best paraphrases the sentence in bold in paragraph 3? \\"Education and dialogue are essential to resolving cultural misunderstandings.\\"",
    "luaChon": [
      {
        "id": "A",
        "text": "Education alone can eliminate cultural misunderstandings."
      },
      {
        "id": "B",
        "text": "Schools should focus on promoting one culture over others."
      },
      {
        "id": "C",
        "text": "Cultural misunderstandings cannot be resolved through dialogue."
      },
      {
        "id": "D",
        "text": "Open communication and learning are key to overcoming cultural differences."
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu gốc: \\"Giáo dục và đối thoại là yếu tố thiết yếu để giải quyết các hiểu lầm văn hóa\\". \\nĐáp án D diễn đạt sát nhất: \\"Giao tiếp cởi mở (dialogue) và học hỏi (education) là chìa khóa (key = essential) để vượt qua những khác biệt văn hóa\\".",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 8, 'Câu 8', 1, '{
  "debai": {
    "cauHoiGoc": "Which of the following best summarises the passage?",
    "luaChon": [
      {
        "id": "A",
        "text": "Multiculturalism fosters global understanding and economic development, but the inability to fully address cultural clashes and misunderstandings can hinder social cohesion."
      },
      {
        "id": "B",
        "text": "Despite the challenges it presents, multiculturalism ultimately enhances society by fostering cultural exchange, economic growth, and a more harmonious community when managed effectively."
      },
      {
        "id": "C",
        "text": "The coexistence of diverse cultural groups strengthens communities by enhancing creativity and inclusivity, though prejudice and conflict remain persistent obstacles."
      },
      {
        "id": "D",
        "text": "While multiculturalism enriches societies by promoting cultural exchange and economic growth, it also presents challenges that require education and dialogue to ensure social harmony."
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nBài viết đề cập đến khái niệm đa văn hóa, các lợi ích (trao đổi văn hóa, kinh tế), thừa nhận các thách thức nhưng đưa ra cách giải quyết (giáo dục) và kết luận rằng lợi ích vượt trội so với khó khăn. Đáp án B tóm tắt đúng cấu trúc này nhất.",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 9, 'Câu 9', 1, '{
  "debai": {
    "cauHoiGoc": "Where in paragraph 1 does the following sentence best fit? \\"Multiculturalism is a concept that has existed throughout history, not just in modern times.\\"",
    "luaChon": [
      {
        "id": "A",
        "text": "(II)"
      },
      {
        "id": "B",
        "text": "(I)"
      },
      {
        "id": "C",
        "text": "(IV)"
      },
      {
        "id": "D",
        "text": "(III)"
      }
    ]
  },
  "dapan": "B",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\nCâu được cung cấp giới thiệu bối cảnh lịch sử của khái niệm đa văn hóa. Đặt nó ở vị trí (I) (ngay đầu đoạn) là hợp lý nhất để dẫn dắt vào câu tiếp theo: \\"In today''s interconnected society...\\" (Trong xã hội hiện đại ngày nay...).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW()),
(UUID(), @BaiTap_4, NULL, 10, 'Câu 10', 1, '{
  "debai": {
    "cauHoiGoc": "The phrase \\"coexistence of diverse cultural groups\\" in paragraph 1 could be best replaced by_______",
    "luaChon": [
      {
        "id": "A",
        "text": "cultural isolation"
      },
      {
        "id": "B",
        "text": "conflict between communities"
      },
      {
        "id": "C",
        "text": "separation of ethnic groups"
      },
      {
        "id": "D",
        "text": "living together peacefully"
      }
    ]
  },
  "dapan": "D",
  "giaithich": "[GIẢI THÍCH CHI TIẾT]\\n\\"Coexistence\\" có nghĩa là sự cùng tồn tại, chung sống. Do đó \\"coexistence of diverse cultural groups\\" (sự chung sống của các nhóm văn hóa đa dạng) có thể thay thế bằng cụm \\"living together peacefully\\" (sống cùng nhau trong hòa bình).",
  "loai": "CQ_TRAC_NGHIEM_1",
  "la_tu_luan": false,
  "tags": null
}', NOW());
