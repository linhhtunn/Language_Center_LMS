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
    WHERE c.`MaCode` = 'CQ_SAP_XEP_CAU' LIMIT 1);
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
-- BT-DSXDV01 — Sắp xếp câu tạo thành đoạn văn/hội thoại
-- -----------------------------------------------------------------------
SET @BaiTap_1 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_1, @MaKhoaHoc, @MaNganHang, 'Sắp xếp câu tạo thành đoạn văn/hội thoại', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Mark the letter A, B, C or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a meaningful exchange or text in each of the following questions from 1 to 5.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DSXDV01','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_1, NULL, 1, 'Question 1', 1, '{
  "debai": {
    "cauHoiGoc": "Question 1",
    "danhSach": [
      {
        "id": "a",
        "text": "However, despite this growth, Redmond still lacks a hospital, as the nearest one is located over 30 miles away in Longreach."
      },
      {
        "id": "b",
        "text": "Once abundant parks on Oak Street and Richmond Avenue have been replaced by factories, marking a shift towards industrialization."
      },
      {
        "id": "c",
        "text": "The industrial shift has also attracted new businesses, from arcades to shops and factories, boosting the local economy and making Redmond more and more commercially active."
      },
      {
        "id": "d",
        "text": "Redmond has transformed significantly over the past decade."
      },
      {
        "id": "e",
        "text": "This industrial growth has led to a 25% population boom due to an influx of factory workers, resulting in increased traffic congestion."
      }
    ]
  },
  "dapan": [
    "d",
    "b",
    "c",
    "e",
    "a"
  ],
  "giaithich": "[TIẾNG ANH]\\nRedmond has transformed significantly over the past decade. Once abundant parks on Oak Street and Richmond Avenue have been replaced by factories, marking a shift towards industrialization. The industrial shift has also attracted new businesses, from arcades to shops and factories, boosting the local economy and making Redmond more and more commercially active. This industrial growth has led to a 25% population boom due to an influx of factory workers, resulting in increased traffic congestion. However, despite this growth, Redmond still lacks a hospital, as the nearest one is located over 30 miles away in Longreach.\\n\\n[TIẾNG VIỆT]\\nRedmond đã chuyển mình đáng kể trong thập kỷ qua. Những công viên rộng lớn trước đây trên phố Oak và Đại lộ Richmond đã được thay thế bằng những nhà máy, đánh dấu sự dịch chuyển sang hướng công nghiệp hóa. Sự chuyển dịch công nghiệp cũng đã thu hút các doanh nghiệp mới, từ các khu trò chơi điện tử đến các cửa hàng và nhà máy, thúc đẩy nền kinh tế địa phương và khiến Redmond trở nên ngày càng năng động về mặt thương mại hơn. Sự tăng trưởng công nghiệp này đã dẫn đến bùng nổ 25% dân số do sự đổ về của các công nhân nhà máy, dẫn đến tăng ùn tắc giao thông. Tuy nhiên, mặc cho sự tăng trưởng này, Redmond vẫn thiếu một bệnh viện, vì bệnh viện gần nhất ở Longreach cách đó hơn 30 dặm.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 2, 'Question 2', 1, '{
  "debai": {
    "cauHoiGoc": "Question 2",
    "danhSach": [
      {
        "id": "a",
        "text": "Nam: Hi, Mark! Long time no see. You look so good!"
      },
      {
        "id": "b",
        "text": "Nam: Yes, I have. I exercise every morning and eat more healthy food."
      },
      {
        "id": "c",
        "text": "Mark: Hi, Nam! Thanks. You look so fit, too. Have you worked out a lot lately?"
      }
    ]
  },
  "dapan": [
    "a",
    "c",
    "b"
  ],
  "giaithich": "[TIẾNG ANH]\\nNam: Hi, Mark! Long time no see. You look so good!\\nMark: Hi, Nam! Thanks. You look so fit, too. Have you worked out a lot lately?\\nNam: Yes, I have. I exercise every morning and eat more healthy food.\\n\\n[TIẾNG VIỆT]\\nNam: Chào, Mark! Đã lâu không gặp. Bạn trông thật khỏe mạnh!\\nMark: Chào, Nam! Cảm ơn. Bạn cũng trông rất cân đối. Gần đây bạn đã tập luyện rất nhiều đúng không?\\nNam: Đúng vậy. Mình tập thể dục mỗi buổi sáng và ăn nhiều thức ăn lành mạnh.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 3, 'Question 3', 1, '{
  "debai": {
    "cauHoiGoc": "Question 3",
    "danhSach": [
      {
        "id": "a",
        "text": "Alex: Why online classes?"
      },
      {
        "id": "b",
        "text": "Sue: I''m going to try online classes."
      },
      {
        "id": "c",
        "text": "Alex: How are you going to improve your English?"
      },
      {
        "id": "d",
        "text": "Alex: I think online classes are too expensive. I don''t think I''ll try them."
      },
      {
        "id": "e",
        "text": "Sue: They improve our communication skills, and they have flexible schedules."
      }
    ]
  },
  "dapan": [
    "c",
    "b",
    "a",
    "e",
    "d"
  ],
  "giaithich": "[TIẾNG ANH]\\nAlex: How are you going to improve your English?\\nSue: I''m going to try online classes.\\nAlex: Why online classes?\\nSue: They improve our communication skills, and they have flexible schedules.\\nAlex: I think online classes are too expensive. I don''t think I''ll try them.\\n\\n[TIẾNG VIỆT]\\nAlex: Bạn dự định cải thiện tiếng Anh của bạn bằng cách nào?\\nSue: Mình sẽ thử các lớp học trực tuyến.\\nAlex: Tại sao lại là các lớp học trực tuyến?\\nSue: Chúng cải thiện những kỹ năng giao tiếp của chúng ta, và chúng có lịch biểu linh hoạt.\\nAlex: Mình nghĩ các lớp học trực tuyến quá đắt tiền. Mình không nghĩ là mình sẽ thử chúng.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 4, 'Question 4', 1, '{
  "debai": {
    "cauHoiGoc": "Question 4",
    "doanVanTruoc": "Hi Alice,",
    "danhSach": [
      {
        "id": "a",
        "text": "That would be a perfect opportunity for us to escape from the city and breathe in some fresh mountain air!"
      },
      {
        "id": "b",
        "text": "I have been thinking about planning a small, relaxing trip to the mountains this weekend to unwind a bit."
      },
      {
        "id": "c",
        "text": "Let me know if you''re interested in joining; I think it could be a lot of fun!"
      },
      {
        "id": "d",
        "text": "The weather forecast looks absolutely ideal for some hiking and exploring."
      },
      {
        "id": "e",
        "text": "It''s been quite some time since our last outdoor adventure together, don''t you think?"
      }
    ],
    "doanVanSau": "Write back soon,\\nSam"
  },
  "dapan": [
    "b",
    "d",
    "e",
    "a",
    "c"
  ],
  "giaithich": "[TIẾNG ANH]\\nHi Alice,\\nI have been thinking about planning a small, relaxing trip to the mountains this weekend to unwind a bit. The weather forecast looks absolutely ideal for some hiking and exploring. It''s been quite some time since our last outdoor adventure together, don''t you think? That would be a perfect opportunity for us to escape from the city and breathe in some fresh mountain air! Let me know if you''re interested in joining; I think it could be a lot of fun!\\nWrite back soon,\\nSam\\n\\n[TIẾNG VIỆT]\\nChào Alice,\\nTớ đã nghĩ đến việc lên kế hoạch cho một chuyến đi nhỏ, thư giãn lên núi vào cuối tuần này để xả hơi một chút. Dự báo thời tiết trông cực kỳ lý tưởng cho việc đi bộ đường dài và khám phá. Đã khá lâu rồi kể từ chuyến phiêu lưu ngoài trời cuối cùng của chúng ta, cậu không nghĩ vậy sao? Đó sẽ là một cơ hội hoàn hảo để chúng ta trốn khỏi thành phố và hít thở không khí trong lành của núi rừng! Hãy cho tớ biết nếu cậu muốn tham gia nhé; tớ nghĩ nó sẽ rất vui đấy!\\nHồi âm sớm nhé,\\nSam",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 5, 'Question 5', 1, '{
  "debai": {
    "cauHoiGoc": "Question 5",
    "danhSach": [
      {
        "id": "a",
        "text": "While deadlines and flexibility are essential aspects of this job, the occasional office meeting for project updates, for instance, is a small trade-off."
      },
      {
        "id": "b",
        "text": "Working remotely from home fuels my creativity and allows for a more productive environment."
      },
      {
        "id": "c",
        "text": "Indeed, for the past year, I have thrived in this role at a local company, where I craft engaging online content and develop effective strategies."
      },
      {
        "id": "d",
        "text": "My passion for both people and technology naturally led me to a fulfilling career in social media management."
      },
      {
        "id": "e",
        "text": "In conclusion, I am incredibly happy with my current position and the opportunities it provides, as it perfectly combines my interests and skills."
      }
    ]
  },
  "dapan": [
    "d",
    "c",
    "b",
    "a",
    "e"
  ],
  "giaithich": "[TIẾNG ANH]\\nMy passion for both people and technology naturally led me to a fulfilling career in social media management. Indeed, for the past year, I have thrived in this role at a local company, where I craft engaging online content and develop effective strategies. Working remotely from home fuels my creativity and allows for a more productive environment. While deadlines and flexibility are essential aspects of this job, the occasional office meeting for project updates, for instance, is a small trade-off. In conclusion, I am incredibly happy with my current position and the opportunities it provides, as it perfectly combines my interests and skills.\\n\\n[TIẾNG VIỆT]\\nNiềm đam mê của tôi đối với con người và công nghệ đã dẫn tôi một cách tự nhiên đến với một sự nghiệp đầy ý nghĩa trong quản lý truyền thông xã hội. Thực tế, suốt năm qua, tôi đã phát triển mạnh mẽ trong vai trò này tại một công ty địa phương, nơi tôi tạo ra những nội dung trực tuyến hấp dẫn và xây dựng các chiến lược hiệu quả. Làm việc từ xa tại nhà giúp tôi nuôi dưỡng sự sáng tạo và tạo ra môi trường làm việc năng suất hơn. Mặc dù những hạn chót và sự linh hoạt là những yếu tố quan trọng của công việc, nhưng thỉnh thoảng có các cuộc họp văn phòng để cập nhật tiến độ dự án chẳng hạn, chỉ là một sự đánh đổi nhỏ. Tóm lại, tôi thực sự hài lòng với vị trí hiện tại và những cơ hội mà công việc mang lại, vì nó kết hợp hoàn hảo giữa sở thích và kỹ năng của tôi.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DSXDV02 — Sắp xếp câu tạo thành đoạn văn/hội thoại (Bài 2)
-- -----------------------------------------------------------------------
SET @BaiTap_2 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_2, @MaKhoaHoc, @MaNganHang, 'Sắp xếp câu tạo thành đoạn văn/hội thoại (Bài 2)', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Mark the letter A, B, C, or D on your answer sheet to indicate the best arrangement of utterances or sentences to make a meaningful exchange or text in each of the following Questions.', NULL,
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DSXDV02','description',NULL,'status','APPROVED'),
    1, 1, 0, NOW()
);

INSERT INTO `baitapcauhoi` (`MaCauHoiDe`, `MaBaiTap`, `MaCauHoi`, `ThuTu`, `SoCau`, `DiemCuaCau`, `NoiDung`, `ThoiGianTao`) VALUES
(UUID(), @BaiTap_2, NULL, 1, 'Question 1', 1, '{
  "debai": {
    "cauHoiGoc": "Question 1",
    "doanVanTruoc": "Dear Pat,",
    "danhSach": [
      {
        "id": "a",
        "text": "Can I see you there ? Please write to me soon."
      },
      {
        "id": "b",
        "text": "I am writing to tell you that I arrived here three weeks ago."
      },
      {
        "id": "c",
        "text": "I am studying at a language school in Brighton. The students come from many different countries."
      },
      {
        "id": "d",
        "text": "Also, I have made a lot of new friends."
      },
      {
        "id": "e",
        "text": "I want to visit London next week because I am going back to my country on Monday."
      }
    ],
    "doanVanSau": "With best wishes"
  },
  "dapan": [
    "b",
    "c",
    "d",
    "e",
    "a"
  ],
  "giaithich": "[TIẾNG ANH]\\nDear Pat,\\nI am writing to tell you that I arrived here three weeks ago. I am studying at a language school in Brighton. The students come from many different countries. Also, I have made a lot of new friends. I want to visit London next week because I am going back to my country on Monday. Can I see you there? Please write to me soon.\\nWith best wishes.\\n\\n[TIẾNG VIỆT]\\nGửi Pat,\\nMình viết thư cho bạn để thông báo rằng mình đã đến đây ba tuần rồi. Mình đang học ở một trường ngôn ngữ tại Brighton. Học sinh ở đây đến từ nhiều quốc gia khác nhau. Ngoài ra, mình đã kết bạn được rất nhiều. Mình muốn thăm London vào tuần tới vì mình sẽ về nước vào thứ Hai. Mình có thể gặp bạn ở đó không? Hãy viết thư cho mình sớm nhé.\\nChúc bạn mọi điều tốt đẹp.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 2, 'Question 2', 1, '{
  "debai": {
    "cauHoiGoc": "Question 2",
    "danhSach": [
      {
        "id": "a",
        "text": "Olivia: I really hope so. I''ll check the weather now. If it''s good, we can plan for Saturday."
      },
      {
        "id": "b",
        "text": "Noah: Perfect! I''m really looking forward to our upcoming trip."
      },
      {
        "id": "c",
        "text": "Olivia: Do you think they would join us? It''d be more fun with them."
      },
      {
        "id": "d",
        "text": "Olivia: Hey Noah, have you thought about hiking at Silver Peak this weekend?"
      },
      {
        "id": "e",
        "text": "Noah: That sounds amazing! Let''s invite Ava and Lucas to come along."
      }
    ]
  },
  "dapan": [
    "d",
    "e",
    "c",
    "a",
    "b"
  ],
  "giaithich": "[TIẾNG ANH]\\nOlivia: Hey Noah, have you thought about hiking at Silver Peak this weekend?\\nNoah: That sounds amazing! Let''s invite Ava and Lucas to come along.\\nOlivia: Do you think they would join us? It''d be more fun with them.\\nOlivia: I really hope so. I''ll check the weather now. If it''s good, we can plan for Saturday.\\nNoah: Perfect! I''m really looking forward to our upcoming trip.\\n\\n[TIẾNG VIỆT]\\nOlivia: Này Noah, bạn đã nghĩ đến việc leo núi ở Silver Peak vào cuối tuần này chưa?\\nNoah: Nghe thật tuyệt vời! Chúng ta mời Ava và Lucas cùng đi nhé.\\nOlivia: Bạn nghĩ họ sẽ tham gia cùng chúng ta chứ? Sẽ vui hơn nếu có họ.\\nOlivia: Mình thật sự hy vọng vậy. Mình sẽ kiểm tra thời tiết ngay bây giờ. Nếu thời tiết tốt, chúng ta có thể lên kế hoạch cho thứ Bảy.\\nNoah: Thật tuyệt! Mình rất mong chờ chuyến đi sắp tới của chúng ta.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 3, 'Question 3', 1, '{
  "debai": {
    "cauHoiGoc": "Question 3",
    "danhSach": [
      {
        "id": "a",
        "text": "To achieve this, I always set clear goals and create projects to accomplish each one at the beginning of each week."
      },
      {
        "id": "b",
        "text": "Time management has been one of the most valuable skills I''ve developed over the years."
      },
      {
        "id": "c",
        "text": "By breaking down larger projects into smaller tasks, I make steady progress without feeling overwhelmed."
      },
      {
        "id": "d",
        "text": "This practice has significantly improved my productivity and allowed me to balance work and personal commitments effectively."
      },
      {
        "id": "e",
        "text": "Moreover, I use tools like to-do lists and digital calendars to stay on track and avoid missing important deadlines."
      }
    ]
  },
  "dapan": [
    "b",
    "a",
    "c",
    "e",
    "d"
  ],
  "giaithich": "[TIẾNG ANH]\\nTime management has been one of the most valuable skills I''ve developed over the years. To achieve this, I always set clear goals and create projects to accomplish each one at the beginning of each week. By breaking down larger projects into smaller tasks, I make steady progress without feeling overwhelmed. Moreover, I use tools like to-do lists and digital calendars to stay on track and avoid missing important deadlines. This practice has significantly improved my productivity and allowed me to balance work and personal commitments effectively.\\n\\n[TIẾNG VIỆT]\\nQuản lý thời gian là một trong những kỹ năng quý giá nhất mà tôi đã phát triển trong suốt những năm qua. Để đạt được điều này, tôi luôn đặt ra các mục tiêu rõ ràng và tạo ra các dự án để hoàn thành từng mục tiêu vào đầu mỗi tuần. Bằng cách chia nhỏ các dự án lớn thành những nhiệm vụ nhỏ, tôi tiến bộ đều đặn mà không cảm thấy bị quá tải. Hơn nữa, tôi sử dụng các công cụ như danh sách công việc và lịch kỹ thuật số để duy trì tiến độ và tránh bỏ lỡ các hạn chót quan trọng. Thực hành này đã cải thiện đáng kể năng suất làm việc của tôi và giúp tôi cân bằng công việc và các cam kết cá nhân một cách hiệu quả.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 4, 'Question 4', 1, '{
  "debai": {
    "cauHoiGoc": "Question 4",
    "danhSach": [
      {
        "id": "a",
        "text": "Nga: Oh, really? What was the argument about?"
      },
      {
        "id": "b",
        "text": "Nga: Hey, Nam. You look sad. What happened?"
      },
      {
        "id": "c",
        "text": "Nam: Yesterday, I argued with my parents."
      }
    ]
  },
  "dapan": [
    "b",
    "c",
    "a"
  ],
  "giaithich": "[TIẾNG ANH]\\nNga: Hey, Nam. You look sad. What happened?\\nNam: Yesterday, I argued with my parents.\\nNga: Oh, really? What was the argument about?\\n\\n[TIẾNG VIỆT]\\nNga: Này Nam, trông bạn buồn thế. Chuyện gì vậy?\\nNam: Hôm qua, tôi đã cãi nhau với bố mẹ.\\nNga: Ôi thật à? Cãi nhau về chuyện gì vậy?",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 5, 'Question 5', 1, '{
  "debai": {
    "cauHoiGoc": "Question 5",
    "danhSach": [
      {
        "id": "a",
        "text": "By experiencing diverse cultures, they gain a broader perspective on global traditions."
      },
      {
        "id": "b",
        "text": "However, there''s also a risk of focusing too much on external influences and neglecting their own cultural roots."
      },
      {
        "id": "c",
        "text": "World festivals, such as Halloween and Christmas, have a significant impact on young Vietnamese people."
      },
      {
        "id": "d",
        "text": "These events not only promote cultural exchange but also encourage creativity and participation in global trends."
      },
      {
        "id": "e",
        "text": "Therefore, it is essential to balance the appreciation of international festivals with the preservation of Vietnamese traditions."
      }
    ]
  },
  "dapan": [
    "c",
    "a",
    "d",
    "b",
    "e"
  ],
  "giaithich": "[TIẾNG ANH]\\nWorld festivals, such as Halloween and Christmas, have a significant impact on young Vietnamese people. By experiencing diverse cultures, they gain a broader perspective on global traditions. These events not only promote cultural exchange but also encourage creativity and participation in global trends. However, there''s also a risk of focusing too much on external influences and neglecting their own cultural roots. Therefore, it is essential to balance the appreciation of international festivals with the preservation of Vietnamese traditions.\\n\\n[TIẾNG VIỆT]\\nCác lễ hội trên thế giới, như Halloween và Giáng Sinh, có ảnh hưởng lớn đến giới trẻ Việt Nam. Bằng cách trải nghiệm các nền văn hóa đa dạng, họ có được cái nhìn rộng mở hơn về các truyền thống toàn cầu. Những sự kiện này không chỉ thúc đẩy trao đổi văn hóa mà còn khuyến khích sự sáng tạo và tham gia vào các xu hướng toàn cầu. Tuy nhiên, cũng có một nguy cơ là sẽ tập trung quá nhiều vào các ảnh hưởng bên ngoài mà bỏ quên gốc rễ văn hóa của chính mình. Vì vậy, điều quan trọng là phải cân bằng việc trân trọng các lễ hội quốc tế với việc bảo tồn các truyền thống Việt Nam.",
  "loai": "CQ_SAP_XEP_CAU",
  "la_tu_luan": false,
  "tags": ["sentence_arrangement"]
}', NOW());
