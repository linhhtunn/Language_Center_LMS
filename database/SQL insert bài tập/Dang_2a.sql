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
-- BT-DNGTU04 — Nối ghép tương ứng - Green Living
-- -----------------------------------------------------------------------
SET @BaiTap_1 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_1, @MaKhoaHoc, @MaNganHang, 'Nối ghép tương ứng - Green Living', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Match each option in the left column with a corresponding option in the right column.', 'GREEN LIVING: A PATH TO A SUSTAINABLE FUTURE

In a world grappling with climate change and environmental degradation, green living has emerged as a vital approach to ensure sustainability. Green living involves adopting practices that minimize harm to the environment while promoting a healthy lifestyle. These include reducing waste, conserving energy, and embracing renewable resources.

One key aspect of green living is reducing waste. This can be achieved through recycling, composting, and cutting back on single-use plastics. For example, using reusable water bottles and shopping bags can significantly decrease the amount of plastic waste that pollutes our ecosystems. Moreover, individuals can conserve energy by switching to energy-efficient appliances, unplugging devices when not in use, and maximizing natural light in their homes.

Another crucial element of green living is opting for renewable energy sources like solar and wind power. These alternatives not only reduce greenhouse gas emissions but also lower energy costs over time. Additionally, adopting plant-based diets or reducing meat consumption can lessen the environmental impact of food production, which is a major contributor to deforestation and water pollution.

Communities around the world are recognizing the importance of green living. For instance, cities are promoting cycling and public transport to decrease carbon emissions. Similarly, educational campaigns are raising awareness about sustainable practices. By making small, consistent changes, individuals and societies can contribute to a healthier planet and secure a better future for generations to come.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DNGTU04','description',NULL,'status','APPROVED'),
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
      },
      {
        "id": "p4",
        "text": "Paragraph 4"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "Reducing waste and conserving energy are essential practices of green living."
      },
      {
        "id": "b",
        "text": "Communities and individuals can build a more sustainable future by adopting green living practices."
      },
      {
        "id": "c",
        "text": "Green living promotes environmentally friendly habits to support a sustainable future."
      },
      {
        "id": "d",
        "text": "Using renewable energy and adopting sustainable eating habits help protect the environment."
      }
    ]
  },
  "dapan": {
    "p1": "c",
    "p2": "a",
    "p3": "d",
    "p4": "b"
  },
  "giaithich": "[TIẾNG VIỆT]\\nĐoạn 1: Lối sống xanh thúc đẩy những thói quen thân thiện với môi trường để hỗ trợ một tương lai bền vững.\\nĐoạn 2: Giảm thiểu rác thải và tiết kiệm năng lượng là những thực hành thiết yếu của lối sống xanh.\\nĐoạn 3: Sử dụng năng lượng tái tạo và áp dụng thói quen ăn uống bền vững giúp bảo vệ môi trường.\\nĐoạn 4: Cộng đồng và cá nhân có thể xây dựng một tương lai bền vững hơn bằng cách áp dụng các thực hành sống xanh.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "environment",
    "vocabulary",
    "synonym",
    "detail",
    "green_living"
  ]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the equivalent phrase from the left and right columns.",
    "danhSachTrai": [
      {
        "id": "t1",
        "text": "Degradation"
      },
      {
        "id": "t2",
        "text": "These"
      },
      {
        "id": "t3",
        "text": "Alternatives"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "substitutes"
      },
      {
        "id": "b",
        "text": "decline"
      },
      {
        "id": "c",
        "text": "practices that minimize harm to the environment"
      }
    ]
  },
  "dapan": {
    "t1": "b",
    "t2": "c",
    "t3": "a"
  },
  "giaithich": "[TIẾNG ANH & TIẾNG VIỆT]\\n- Degradation (suy thoái) = decline (suy giảm).\\n- These = Practices that minimize harm to the environment (Các hành động giảm thiểu tác động xấu đến môi trường).\\n- Alternatives (phương án thay thế) = substitutes (sự thay thế).",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "environment",
    "vocabulary",
    "synonym",
    "detail",
    "green_living"
  ]
}', NOW()),
(UUID(), @BaiTap_1, NULL, 3, 'Match the practices with practical actions.', 1, '{
  "debai": {
    "cauHoiGoc": "Match the practices with practical actions.",
    "danhSachTrai": [
      {
        "id": "a",
        "text": "Reducing waste"
      },
      {
        "id": "b",
        "text": "Conserving energy"
      },
      {
        "id": "c",
        "text": "Embracing renewable resources"
      }
    ],
    "danhSachPhai": [
      {
        "id": "1",
        "text": "Utilize renewable energy sources such as solar and wind energy."
      },
      {
        "id": "2",
        "text": "This can be achieved through recycling, composting, and cutting back on single-use plastics."
      },
      {
        "id": "3",
        "text": "People can switch to energy-efficient appliances, unplug devices when not in use, and make the most of natural light in their homes."
      }
    ]
  },
  "dapan": {
    "a": "2",
    "b": "3",
    "c": "1"
  },
  "giaithich": "[TIẾNG VIỆT]\\n- Giảm thiểu rác thải: Điều này có thể đạt được thông qua việc tái chế, ủ phân và hạn chế sử dụng nhựa dùng một lần.\\n- Tiết kiệm năng lượng: Mọi người có thể chuyển sang sử dụng thiết bị tiết kiệm năng lượng, rút phích cắm khi không sử dụng...\\n- Sử dụng nguồn năng lượng tái tạo: Tận dụng các nguồn năng lượng tái tạo như năng lượng mặt trời và gió.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "environment",
    "vocabulary",
    "synonym",
    "detail",
    "green_living"
  ]
}', NOW());

-- -----------------------------------------------------------------------
-- BT-DNGTU05 — Nối ghép tương ứng - Multicultural World
-- -----------------------------------------------------------------------
SET @BaiTap_2 = UUID();

INSERT INTO `baitap` (
    `MaBaiTap`, `MaKhoaHoc`, `MaNganHang`, `TenBaiTap`, `LaMauNganHang`,
    `LoaiBaiTap`, `LoaiCauHoi`, `MucDo`, `KyNang`,
    `HuongDanChung`, `NoiDungNguCanhChung`, `MoTa`,
    `ChoXemDapAnSauNop`, `TrangThai`, `DaXoa`, `ThoiGianTao`
) VALUES (
    @BaiTap_2, @MaKhoaHoc, @MaNganHang, 'Nối ghép tương ứng - Multicultural World', 1,
    @LoaiBaiTap, @LoaiCauHoi, @MucDo, @KyNang,
    'Match each option in the left column with a corresponding option in the right column.', 'LIVING IN A MULTICULTURAL WORLD

(I) In today''s interconnected society, multiculturalism has become a defining feature of many countries. (II) It refers to the coexistence of diverse cultural, ethnic, and religious groups within a community. (III) This diversity enriches societies, fostering creativity, innovation, and global understanding. (IV) However, living in a multicultural world also presents challenges, such as the need to balance cultural preservation with social integration.

One significant advantage of multiculturalism is the opportunity for cultural exchange. People from different backgrounds can share traditions, cuisine, art, and perspectives, broadening their understanding of the world. For example, international festivals and food markets often showcase the vibrant diversity of a community, promoting appreciation and respect for different cultures. Such exchanges contribute to a richer, more inclusive society.

However, multiculturalism also requires individuals and societies to navigate potential challenges. Misunderstandings, cultural clashes, and prejudice can arise in multicultural settings. For instance, differing values or customs might lead to tensions or conflicts. To address these issues, education and dialogue are essential to resolving cultural misunderstandings. Schools and workplaces can play a critical role by fostering inclusivity and teaching cultural awareness.

Multiculturalism also brings economic benefits. Diverse teams in workplaces often bring unique skills and perspectives, leading to increased creativity and problem-solving abilities. Moreover, tourism thrives in multicultural areas, as visitors are drawn to the rich tapestry of cultures and traditions.

Living in a multicultural world teaches us that diversity is not something to fear but to celebrate. By embracing and learning from our differences, we can build stronger, more harmonious communities. While challenges exist, the benefits of multiculturalism far outweigh the difficulties, making it a vital component of a thriving modern society.',
    JSON_OBJECT('schema','ADMIN_ASSIGNMENT_V1','code','BT-DNGTU05','description',NULL,'status','APPROVED'),
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
      },
      {
        "id": "p5",
        "text": "Paragraph 5"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "Multiculturalism strengthens the economy by encouraging creativity, innovation, and tourism."
      },
      {
        "id": "b",
        "text": "Education and open dialogue are essential for overcoming the challenges of multiculturalism."
      },
      {
        "id": "c",
        "text": "Cultural exchange helps people appreciate diversity and build a more inclusive society."
      },
      {
        "id": "d",
        "text": "Embracing diversity creates stronger communities and contributes to a successful modern society."
      },
      {
        "id": "e",
        "text": "Multiculturalism brings both benefits and challenges to modern societies."
      }
    ]
  },
  "dapan": {
    "p1": "e",
    "p2": "c",
    "p3": "b",
    "p4": "a",
    "p5": "d"
  },
  "giaithich": "[TIẾNG VIỆT]\\nĐoạn 1: Đa văn hóa mang lại cả lợi ích và thách thức cho xã hội hiện đại.\\nĐoạn 2: Giao lưu văn hóa giúp mọi người trân trọng sự đa dạng và xây dựng một xã hội hòa nhập hơn.\\nĐoạn 3: Giáo dục và đối thoại cởi mở là thiết yếu để vượt qua những thách thức của chủ nghĩa đa văn hóa.\\nĐoạn 4: Đa văn hóa củng cố nền kinh tế thông qua sáng tạo, đổi mới và du lịch.\\nĐoạn 5: Việc trân trọng sự đa dạng tạo nên những cộng đồng vững mạnh hơn và góp phần vào một xã hội thành công.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "culture",
    "vocabulary",
    "groups",
    "sentence_halves"
  ]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 2, 'Câu 2', 1, '{
  "debai": {
    "cauHoiGoc": "Choose the equivalent phrase from the left and right columns.",
    "danhSachTrai": [
      {
        "id": "t1",
        "text": "cultural groups"
      },
      {
        "id": "t2",
        "text": "ethnic groups"
      },
      {
        "id": "t3",
        "text": "religious groups"
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "faith group"
      },
      {
        "id": "b",
        "text": "heritage group"
      },
      {
        "id": "c",
        "text": "people of the same ancestry"
      }
    ]
  },
  "dapan": {
    "t1": "b",
    "t2": "c",
    "t3": "a"
  },
  "giaithich": "[TIẾNG ANH & TIẾNG VIỆT]\\n- cultural groups (nhóm văn hóa) = heritage group (nhóm di sản)\\n- ethnic groups (nhóm dân tộc) = people of the same ancestry (những người cùng tổ tiên)\\n- religious groups (nhóm tôn giáo) = faith group (nhóm tín ngưỡng)",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "culture",
    "vocabulary",
    "groups",
    "sentence_halves"
  ]
}', NOW()),
(UUID(), @BaiTap_2, NULL, 3, 'Câu 3', 1, '{
  "debai": {
    "cauHoiGoc": "Match the sentence beginnings with the sentence endings.",
    "danhSachTrai": [
      {
        "id": "s1",
        "text": "(I) Multiculturalism has become an important feature of many countries because ________."
      },
      {
        "id": "s2",
        "text": "(II) Multiculturalism refers to ________."
      },
      {
        "id": "s3",
        "text": "(III) Cultural diversity benefits society by ________."
      },
      {
        "id": "s4",
        "text": "(IV) Despite its advantages, multiculturalism also requires societies to ________."
      }
    ],
    "danhSachPhai": [
      {
        "id": "a",
        "text": "balancing cultural identity with social integration."
      },
      {
        "id": "b",
        "text": "encouraging creativity, innovation, and greater global understanding."
      },
      {
        "id": "c",
        "text": "different cultural, ethnic, and religious groups living together in one community."
      },
      {
        "id": "d",
        "text": "people from different backgrounds are increasingly connected."
      }
    ]
  },
  "dapan": {
    "s1": "d",
    "s2": "c",
    "s3": "b",
    "s4": "a"
  },
  "giaithich": "[TIẾNG VIỆT]\\n1 - D: Đa văn hóa trở thành đặc điểm quan trọng vì người dân từ các nền văn hóa khác nhau ngày càng được kết nối.\\n2 - C: Đa văn hóa đề cập đến các nhóm văn hóa, dân tộc và tôn giáo khác nhau cùng chung sống.\\n3 - B: Sự đa dạng văn hóa mang lại lợi ích bằng cách khuyến khích sự sáng tạo, đổi mới và thấu hiểu.\\n4 - A: Mặc dù có lợi ích, đa văn hóa cũng đòi hỏi các xã hội phải cân bằng giữa bản sắc văn hóa và sự hội nhập.",
  "loai": "CQ_NOI_GHEP",
  "la_tu_luan": false,
  "tags": [
    "matching",
    "summary",
    "culture",
    "vocabulary",
    "groups",
    "sentence_halves"
  ]
}', NOW());
