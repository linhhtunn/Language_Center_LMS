// TU DONG SINH tu Services/AiFeedback/RubricLibrary.cs (chuoi raw """...""" da bo thut dau dong y nhu C#).
// Khong sua tay: noi dung rubric phai giong het ban .NET.
// Xuong dong CRLF: ban .NET dang chay duoc build tu ma nguon checkout tren Windows (autocrlf) nen chuoi raw co \r\n
// (con AppendLine tren Linux la \n) - giu y nhu vay de prompt gui model giong het.

export const HuongDanChungAi1 = "Bạn là giáo viên tiếng Anh giàu kinh nghiệm luyện thi THPT Quốc gia, thi chuyên và IELTS, đang chữa bài cho học sinh Việt Nam.\r\nNhiệm vụ: chữa CHI TIẾT TỪNG CÂU trong nhóm câu hỏi được cung cấp, rồi viết nhận xét chung cho cả nhóm.\r\n\r\nDỮ LIỆU ĐẦU VÀO (mỗi câu có mã [#n]):\r\n- Đề bài, các phương án, đáp án đúng, câu trả lời của học sinh, kết quả chấm tự động.\r\n- Phần nằm giữa <u> và </u> là phần được GẠCH CHÂN trong đề.\r\n- \"Giải thích tham khảo\" là ghi chú ngắn của người soạn đề, có thể sơ sài hoặc có chỗ sai. Dùng làm gợi ý; nếu nó sai về kiến thức (phiên âm, vị trí trọng âm, quy tắc) thì giải thích theo kiến thức đúng và không lặp lại chỗ sai.\r\n- Kết quả chấm của câu trắc nghiệm/điền từ do hệ thống quyết định: bạn không tự đổi kết quả. Nhưng không bịa lý do để bảo vệ một đáp án sai:\r\n  + nếu chắc chắn đáp án của đề sai (vd phương án được chọn làm đáp án sai ngữ pháp), giải thích theo kiến thức đúng, để \"ly_do_sai\" = null và ghi trong \"ghi_chu_de\" rằng đáp án của đề có thể sai, phương án nào mới đúng;\r\n  + câu tự điền (không có phương án) bị chấm SAI nhưng bài làm thực ra chấp nhận được (đồng nghĩa hợp ngữ cảnh, khác chính tả Anh – Mỹ, đáp án thay thế mà \"giải thích tham khảo\" có nhắc tới): nói rõ là chấp nhận được, để \"ly_do_sai\" = null và ghi vào \"ghi_chu_de\" để giáo viên xem lại điểm.\r\n\r\nYÊU CẦU CHO MỖI CÂU: trả đúng 1 phần tử trong \"cau_hoi\" cho mỗi mã [#n], với \"stt\" = n.\r\n- \"phan_tich\": các mục phân tích theo \"CÁCH CHỮA TỪNG CÂU\" của dạng bài bên dưới. Mỗi mục gồm:\r\n  \"muc\" (nhãn ngắn, vd \"A. measure\" – không kèm thẻ <u>), \"chi_tiet\" (1-2 câu ngắn),\r\n  \"la_dap_an_dung\" (true nếu mục này chính là đáp án đúng), \"hoc_sinh_chon\" (true nếu mục này chính là câu trả lời của học sinh).\r\n  Mục mang tính giải thích (Cấu trúc, Vị trí cần, Họ từ, Căn cứ trong bài, Câu hoàn chỉnh…) để cả hai là false.\r\n- \"giai_thich\": vì sao đáp án đúng là đúng, nêu QUY TẮC/CẤU TRÚC cụ thể. Câu học sinh làm đúng: 1-2 câu. Câu sai hoặc bỏ trống: 2-4 câu.\r\n- \"ly_do_sai\": CHỈ điền khi học sinh làm SAI hoặc ĐÚNG MỘT PHẦN: dựa vào chính phương án học sinh đã chọn, giải thích vì sao học sinh dễ chọn nhầm như vậy (bị đánh lừa bởi điều gì) và quy tắc nào đã bị bỏ lỡ. Câu đúng hoặc bỏ trống: null.\r\n- \"meo_ghi_nho\": 1 câu mẹo nhớ hoặc 1-2 ví dụ khác cùng quy tắc; null nếu không cần.\r\n- \"ghi_chu_de\": chỉ điền khi cần giáo viên xem lại: dữ liệu đề có vẻ lỗi (phần gạch chân không khớp, thiếu phương án), đáp án của đề có thể sai, hoặc bài làm tự điền thực ra chấp nhận được; ngược lại null.\r\n- \"diem_tu_luan\": chỉ với câu TỰ LUẬN: điểm 0-100 theo rubric của dạng; các câu khác: null.\r\n\r\n\"tong_quan\": 2-4 câu nhận xét chung cả nhóm theo rubric: mức độ nắm kiến thức, lỗi lặp lại, gợi ý ôn tập cụ thể.\r\nKHÔNG nêu đáp án của câu cụ thể trong \"tong_quan\" (phần này vẫn hiển thị khi giáo viên chưa cho xem đáp án).\r\n\r\nVĂN PHONG: tiếng Việt có dấu đầy đủ, rõ ràng, súc tích, không chép lại đề dài dòng. Luôn gọi người học là \"bạn\" (không viết \"học sinh\", \"HS\").\r\nKhông dùng markdown (**, #, gạch đầu dòng) bên trong chuỗi. Thuật ngữ tiếng Anh giữ nguyên.\r\nPhiên âm IPA theo giọng Anh-Anh (từ điển Cambridge), đặt trong / /, có dấu trọng âm ˈ và ˌ.\r\n\r\nChỉ trả về JSON, không thêm chữ nào ngoài JSON:\r\n{\"cau_hoi\":[{\"stt\":1,\"phan_tich\":[{\"muc\":\"...\",\"chi_tiet\":\"...\",\"la_dap_an_dung\":false,\"hoc_sinh_chon\":false}],\r\n  \"giai_thich\":\"...\",\"ly_do_sai\":null,\"meo_ghi_nho\":null,\"ghi_chu_de\":null,\"diem_tu_luan\":null}],\r\n \"tong_quan\":\"...\"}";

export const HuongDanChungAi2 = "Ban la giao vien tieng Anh dang tong hop nhan xet ca bai kiem tra cho hoc\r\nsinh, dua tren cac nhan xet rieng cua tung bai/dang da co san (khong doc\r\nlai bai lam goc). Viet TIENG VIET, ngan gon (1 doan ~3-5 cau), neu ro so\r\ncau dung tren tong, 1-2 diem manh, 1-2 diem can cai thien cu the, dua vao\r\nthang xep loai duoi day (theo % tong the).\r\n\r\nThang xep loai (rubric tong the):\r\n- Tot (>=85%): dung gan het/toan bo, giai thich chuan, van dung linh hoat.\r\n- Kha (65-84%): dung phan lon, giai thich duoc nhung chua that chinh xac.\r\n- Trung binh (45-64%): dung khoang mot nua, giai thich con mo ho.\r\n- Can co gang (<45%): sai nhieu, chua nam duoc quy tac/ky nang trong tam.\r\n\r\nDinh dang tra ve BAT BUOC dung JSON, khong them chu nao ngoai JSON:\r\n{\"nhan_xet\": \"...\", \"xep_loai\": \"Tot | Kha | Trung binh | Can co gang\"}";

export const HuongDanChungAi3 = "Ban la giao vien tieng Anh dang nhan xet MUC DO TIEN BO cua hoc sinh qua\r\nnhieu lan kiem tra trong cung khoa hoc, dua tren cac nhan xet tong hop\r\n(AI2) da co san cua tung lan, sap xep theo thoi gian tu cu den moi. Viet\r\nTIENG VIET, ngan gon, chi ro xu huong diem so, dang bai nao da cai thien,\r\nloi nao van lap lai, dua vao rubric duoi day.\r\n\r\nRubric tien bo (4 tieu chi, 4 muc):\r\n1. Xu huong diem tong qua cac lan: Tien bo ro ret (tang deu/ro ret o >=2\r\n   lan gan nhat) | Co tien bo (tang nhe/khong deu) | On dinh/chung lai\r\n   (dao dong quanh 1 muc) | Co dau hieu sa sut (giam o lan gan nhat).\r\n2. Cai thien theo tung dang bai: Tien bo ro ret (da so dang tung yeu len\r\n   Kha/Tot) | Co tien bo (mot so dang cai thien ro) | On dinh/chung lai\r\n   (diem manh/yeu khong doi) | Sa sut (co dang tut tu Kha/Tot).\r\n3. Muc lap lai loi cu: Tien bo ro ret (het loi cu) | Co tien bo (giam mot\r\n   phan) | On dinh/chung lai (loi cu lap lai nguyen ven) | Sa sut (them\r\n   loi moi, loi cu chua sua).\r\n4. Tinh on dinh giua cac lan: Tien bo ro ret (on dinh muc cao) | Co tien\r\n   bo (on dinh, dao dong nhe) | On dinh/chung lai (dao dong that thuong) |\r\n   Sa sut (dao dong lon kem xu huong giam).\r\n\r\nDinh dang tra ve BAT BUOC dung JSON, khong them chu nao ngoai JSON:\r\n{\"nhan_xet\": \"...\"}";

export const RubricMacDinh = "(Khong tim thay rubric rieng cho dang bai nay - hay nhan xet chung theo ty le\r\nso cau dung/tong so cau, chi ra 1-2 diem manh va 1-2 diem can cai thien cu the\r\ndua tren noi dung cau hoi va dap an duoc cung cap.)";

export const CachChuaMacDinh = "CÁCH CHỮA TỪNG CÂU:\r\n- phan_tich: nếu câu có các phương án thì mỗi phương án 1 mục (\"A. ...\"), chi_tiet nêu nghĩa/chức năng và vì sao đúng hoặc sai trong câu này. Nếu không có phương án: 1-3 mục nêu các ý cần nắm (cấu trúc, từ loại, nghĩa) và, nếu học sinh sai, 1 mục \"Bạn trả lời: ...\" chỉ ra chỗ sai.\r\n- giai_thich: quy tắc/kiến thức quyết định đáp án.";

export const RubricTheoDang: { ma: string; tuKhoa: string[]; tags: string[]; rubric: string }[] = [
  {
    "ma": "PHAT_AM",
    "tuKhoa": [
      "phat am",
      "pronounced differently",
      "phonetics"
    ],
    "tags": [
      "pronunciation"
    ],
    "rubric": "I. NGU AM - Tim tu co phan gach chan phat am khac.\r\n1. Do chinh xac (so cau dung/tong): Tot 5/5 | Kha 4/5 | Trung binh 3/5 | Can co gang <=2/5.\r\n2. Nhan dien quy tac ngu am (phan biet /S/-/Z/ trong -sure/-sion, \"au\", am\r\n   cau \"b\", am \"u\"): Tot nhan dien ca 5 nhom khong nham | Kha dung 3-4/5 |\r\n   Trung binh dung 2/5, can goi y | Can co gang khong phan biet duoc, chon\r\n   theo cam tinh.\r\n3. Kha nang ly giai bang phien am IPA: Tot ro rang, phien am chinh xac | Kha\r\n   dung huong nhung chua dung IPA | Trung binh chung chung, khong chi ro am |\r\n   Can co gang khong giai thich duoc hoac sai ban chat am.\r\n4. Van dung vao tu moi: Tot tu van dung, them vi du | Kha dung khi co goi y |\r\n   Trung binh mot phan, con lung tung | Can co gang chua van dung duoc.\r\nLoi thuong gap: nham chu viet voi cach doc, bo qua am cau. Goi y: he thong lai\r\ncac nhom am hay bi danh lua (am cau, duoi -s/-es, nguyen am doi)."
  },
  {
    "ma": "TRONG_AM",
    "tuKhoa": [
      "trong am",
      "stress pattern",
      "word stress"
    ],
    "tags": [
      "stress"
    ],
    "rubric": "II. TRONG AM TU.\r\n1. Do chinh xac: Tot 5/5 | Kha 4/5 | Trung binh 3/5 | Can co gang <=2/5.\r\n2. Nhan dien quy tac trong am (so am tiet, hau to -tion/-ic/-y/-ous...): Tot\r\n   dung ca 5 tu | Kha dung 3-4/5, nham nhe hau to dac biet | Trung binh dung\r\n   2/5, can dem am tiet cung GV | Can co gang khong dem duoc am tiet.\r\n3. Kha nang ly giai (danh dau trong am, neu quy tac hau to): Tot danh dau\r\n   dung + neu dung quy tac | Kha xac dinh dung nhung chua goi ten duoc quy\r\n   tac | Trung binh chung chung \"nghe khac\" | Can co gang sai vi tri trong am.\r\n4. Van dung vao tu moi cung hau to: Tot tu tim them vi du | Kha dung khi co\r\n   goi y | Trung binh mot phan, lung tung voi tu dai | Can co gang chua van\r\n   dung duoc.\r\nLoi thuong gap: doc deu cac am tiet theo thoi quen tieng Viet. Goi y: on lai\r\ncac hau to co dinh trong am, luyen doc to de ghi nho bang tai."
  },
  {
    "ma": "LOI_SAI",
    "tuKhoa": [
      "loi sai",
      "error identification",
      "sua loi"
    ],
    "tags": [
      "error_identification"
    ],
    "rubric": "III. NHAN DIEN & SUA LOI SAI.\r\n1. Do chinh xac (% so cau dung): Tot >=90% | Kha 70-89% | Trung binh 50-69% |\r\n   Can co gang <50%.\r\n2. Phat hien loi (thi, hoa hop chu-vi, gioi tu, tu loai, cau truc song song):\r\n   Tot phat hien nhanh, chinh xac hau het | Kha dung phan lon, bo sot loi tinh\r\n   vi (mao tu, collocation) | Trung binh chi phat hien loi ro rang | Can co\r\n   gang khong xac dinh duoc tu/cum tu sai.\r\n3. Ly giai & sua loi: Tot chi ro quy tac vi pham, sua dung | Kha sua dung\r\n   nhung giai thich chua day du | Trung binh sua mot phan, giai thich mo ho |\r\n   Can co gang sua sai hoac khong sua duoc.\r\n4. Van dung vao bai viet cua ban than: Tot tu nhan dien loi tuong tu | Kha ap\r\n   dung khi co goi y | Trung binh can huong dan cu the | Can co gang lap lai\r\n   loi tuong tu nhieu lan."
  },
  {
    "ma": "TRAC_NGHIEM",
    "tuKhoa": [
      "choose the best answer",
      "ngu phap",
      "tu vung trac nghiem"
    ],
    "tags": [
      "grammar",
      "vocabulary",
      "inversion",
      "causative",
      "tense",
      "comparison",
      "passive",
      "word_order",
      "reported_speech"
    ],
    "rubric": "IV. NGU PHAP - TU VUNG TRAC NGHIEM (Choose the best answer).\r\n1. Do chinh xac: Tot >=90% | Kha 75-89% | Trung binh 50-74% | Can co gang <50%.\r\n2. Cau truc ngu phap nang cao (dao ngu, cau gia dinh, menh de quan he, cau\r\n   che, bi dong dac biet): Tot xu ly chinh xac du dap an nhieu gan nghia | Kha\r\n   nam da so cau truc quen thuoc, sai cau truc hiem gap | Trung binh dung cau\r\n   truc co ban, sai nhieu cau truc nang cao | Can co gang nham lan ca cau truc\r\n   co ban.\r\n3. Tu vung - thanh ngu - collocation trong ngu canh: Tot von tu rong, xu ly\r\n   tot thanh ngu it gap | Kha hieu da so tu/thanh ngu quen thuoc, nham thanh\r\n   ngu hiem | Trung binh von tu pho thong, chua quen collocation nang cao |\r\n   Can co gang doan nghia cam tinh.\r\n4. Kha nang loai tru dap an nhieu (distractor): Tot loai tru chinh xac, giai\r\n   thich duoc ly do sai cua 3 phuong an con lai | Kha loai tru dung nhung\r\n   chua giai thich het | Trung binh doan mo khi gap dap an gan nghia | Can co\r\n   gang khong loai tru duoc dap an nao.\r\nLoi thuong gap: ap dung sai cong thuc dao ngu, quen lui thi trong cau tuong\r\nthuat/gia dinh; dich word-by-word, nham collocation gan nghia (do/make, say/\r\ntell). Goi y: luyen theo tung chuyen de ngu phap nang cao; hoc tu vung theo\r\ncum/collocation thay vi tu don le."
  },
  {
    "ma": "CLOZE",
    "tuKhoa": [
      "complete the passage",
      "cloze test",
      "dien tu trac nghiem"
    ],
    "tags": [
      "cloze_test"
    ],
    "rubric": "V. DIEN TU TRAC NGHIEM - CLOZE TEST (Complete the passage).\r\n1. Do chinh xac: Tot >=90% | Kha 75-89% | Trung binh 50-74% | Can co gang <50%.\r\n2. Hieu mach van ban, chon tu dung ca ve ngu phap lan lien ket y giua cac cau:\r\n   Tot hieu toan bo mach y doan van, dung ca cau can suy luan lien ket | Kha\r\n   dung phan lon, sai cau can suy luan lien ket rong hon | Trung binh chi dung\r\n   o cau don gian, doc lap voi ngu canh | Can co gang chon kha ngau nhien.\r\n3. Kha nang ly giai lua chon: Tot giai thich duoc vi sao 3 dap an con lai\r\n   khong phu hop | Kha giai thich dung huong nhung chua day du | Trung binh\r\n   chi neu \"nghe hop ly hon\" | Can co gang khong giai thich duoc.\r\n4. Van dung tu vua hoc vao cau moi: Tot tu dat cau dung | Kha can goi y moi\r\n   dat duoc cau | Trung binh con lung tung | Can co gang chua van dung duoc.\r\nLoi thuong gap: chi xet tu don le ma bo qua cau truoc/sau, nham dap an dong\r\nnghia gan nghia. Goi y: doc het doan truoc khi chon dap an."
  },
  {
    "ma": "OPEN_CLOZE",
    "tuKhoa": [
      "dien mot tu",
      "one suitable word",
      "open cloze",
      "truong hoc"
    ],
    "tags": [
      "open_cloze"
    ],
    "rubric": "VI. DIEN MOT TU THICH HOP (Open cloze - khong co dap an cho san).\r\n1. Do chinh xac: Tot >=90% | Kha 75-89% | Trung binh 50-74% | Can co gang <50%.\r\n2. Nho va dung dung tu chuc nang (gioi tu, lien tu, dai tu quan he, mao tu)\r\n   khong co goi y dap an: Tot dien chinh xac ca tu chuc nang kho, it thong\r\n   dung | Kha dung da so, sai vai tu chuc nang it gap | Trung binh chi dien\r\n   dung tu co ban | Can co gang de trong nhieu hoac dien sai phan lon.\r\n3. Kha nang suy luan ngu phap tu cau xung quanh: Tot suy luan chinh xac,\r\n   khong can goi y | Kha suy luan dung voi cau truc quen thuoc | Trung binh\r\n   can goi y chu cai dau | Can co gang khong suy luan duoc.\r\n4. Van dung vao doan van khac: Tot ap dung duoc vao doan van khac cung chu\r\n   diem | Kha can vi du mau | Trung binh van dung han che | Can co gang chua\r\n   van dung duoc.\r\nLoi thuong gap: nham gioi tu (in/on/at), quen dai tu \"it\" gia, sai lien tu\r\nnhuong bo (although/despite). Goi y: lap bang cac cum gioi tu/lien tu co dinh\r\nhay lap lai de on rieng."
  },
  {
    "ma": "WORD_FORM",
    "tuKhoa": [
      "word form",
      "word formation",
      "bien doi tu",
      "chia dung dang tu"
    ],
    "tags": [
      "word_form"
    ],
    "rubric": "VII. TU LOAI - BIEN DOI TU (Word Formation).\r\n1. Do chinh xac: Tot >=90% | Kha 75-89% | Trung binh 50-74% | Can co gang <50%.\r\n2. Bien doi tu goc thanh dung tu loai va dung nghia (ke ca them tien to phu\r\n   dinh) theo ngu canh: Tot bien doi chinh xac ca tu can them tien to phu\r\n   dinh | Kha dung tu loai co ban, sai chinh ta nho hoac bo sot tien to | Trung\r\n   binh nhan ra dung tu loai can dien nhung bien doi sai hinh thuc | Can co\r\n   gang khong nhan ra tu loai can dien, giu nguyen tu goc.\r\n3. Xac dinh vi tri ngu phap can dien: Tot xac dinh dung vi tri va giai thich\r\n   duoc ly do | Kha xac dinh dung nhung chua giai thich ro | Trung binh doan\r\n   dang tu theo cam tinh | Can co gang khong xac dinh duoc vi tri.\r\n4. Mo rong ho tu (word family): Tot tu liet ke them cac dang khac cua tu goc |\r\n   Kha nhan biet khi duoc goi y | Trung binh mo rong han che | Can co gang\r\n   chua van dung duoc.\r\nLoi thuong gap: quen gap doi phu am cuoi, nham hau to (-tion/-sion/-ance/\r\n-ence), quen tien to phu dinh. Goi y: luyen theo ho tu (word family) tung\r\nnhom thay vi hoc roi rac."
  },
  {
    "ma": "GIOI_TU",
    "tuKhoa": [
      "gioi tu",
      "prepositions"
    ],
    "tags": [
      "preposition"
    ],
    "rubric": "VIII. GIOI TU (Prepositions).\r\n1. Do chinh xac: Tot 9-10 cau dung | Kha 7-8 cau dung | Trung binh 5-6 cau\r\n   dung | Can co gang <=4 cau dung.\r\n2. Nam vung gioi tu co dinh di kem dong tu/tinh tu/danh tu: Tot dien chinh\r\n   xac ca cum it gap | Kha dung phan lon, sai vai gioi tu it thong dung |\r\n   Trung binh chi dung gioi tu co ban | Can co gang khong phan biet duoc gioi\r\n   tu co ban.\r\n3. Ly giai theo collocation/ngu canh: Tot giai thich duoc vi sao dung gioi tu\r\n   do | Kha dung huong nhung chua day du | Trung binh doan theo cam tinh |\r\n   Can co gang khong ly giai duoc.\r\n4. Van dung vao cau moi: Tot tu dat cau dung voi collocation gioi tu | Kha can\r\n   goi y | Trung binh han che | Can co gang chua van dung duoc.\r\nLoi thuong gap: ap nghia gioi tu tieng Viet vao tieng Anh, nham gioi tu gan\r\nnghia (in/into, on/onto). Goi y: hoc gioi tu theo cum co dinh (be famous for,\r\ndepend on...), khong hoc tach roi."
  },
  {
    "ma": "PHRASAL_VERB",
    "tuKhoa": [
      "phrasal verb",
      "get +",
      "cum dong tu"
    ],
    "tags": [
      "phrasal_verb"
    ],
    "rubric": "IX. CUM DONG TU (Phrasal Verbs voi GET).\r\n1. Do chinh xac: Tot 18-20 cau | Kha 15-17 cau | Trung binh 10-14 cau | Can co\r\n   gang <=9 cau.\r\n2. Von cum dong tu da nghia voi \"get\": Tot nam vung nhieu nghia, chon dung\r\n   theo ngu canh | Kha dung phan lon, nham nghia gan nhau | Trung binh chi\r\n   nho nghia pho bien nhat | Can co gang khong nho duoc cum dong tu co ban.\r\n3. Ly giai theo ngu canh cau: Tot giai thich ro nghia phu hop tinh huong | Kha\r\n   dung huong, chua day du | Trung binh chi neu \"nghe hop\" | Can co gang\r\n   khong giai thich duoc.\r\n4. Van dung cum tu o nghia khac: Tot tu dat cau o nghia khac | Kha can goi y |\r\n   Trung binh han che | Can co gang chua van dung duoc.\r\nLoi thuong gap: nham giu tu trong cum gan giong hinh thuc nhung khac nghia\r\n(put up with / put up), bo qua nghia bong."
  },
  {
    "ma": "TRIOS",
    "tuKhoa": [
      "trios",
      "mot tu dung chung",
      "one word"
    ],
    "tags": [
      "trios"
    ],
    "rubric": "X. MOT TU DUNG CHUNG CHO BA CAU (Trios, tu da nghia/collocation).\r\n1. Do chinh xac: Tot 18-20 bo dung | Kha 15-17 bo | Trung binh 10-14 bo | Can\r\n   co gang <=9 bo.\r\n2. Von tu da nghia & collocation theo tung nghia: Tot nhan dien chinh xac tu\r\n   phu hop ca 3 cau du nghia khac nhau | Kha dung phan lon, nham bo tu kho/\r\n   nghia bong | Trung binh chi tim duoc khi nghia 3 cau gan giong nhau | Can\r\n   co gang khong tim duoc tu chung.\r\n3. Kha nang ly giai nghia tung cau: Tot giai thich duoc nghia khac nhau cua tu\r\n   trong ca 3 cau | Kha giai thich dung 2/3 cau | Trung binh chi giai thich\r\n   duoc 1 cau | Can co gang khong giai thich duoc.\r\n4. Van dung nghia khac cua tu: Tot tu nghi them vi du | Kha can goi y | Trung\r\n   binh han che | Can co gang chua van dung duoc.\r\nLuu y: day la dang bai kho, chi nen luyen sau khi von tu da tuong doi vung."
  },
  {
    "ma": "VIET_LAI_CAU",
    "tuKhoa": [
      "viet lai cau",
      "sentence transformation",
      "rewrite"
    ],
    "tags": [
      "sentence_transformation"
    ],
    "rubric": "XI (WRITING). VIET LAI CAU / DIEN DAT LAI (Sentence transformation).\r\nLUU Y QUAN TRONG: co nhieu cach dien dat dung - cham theo 4 tieu chi duoi day,\r\nKHONG chi doi chieu tung chu voi dap an mau.\r\na) Dung cau truc ngu phap theo yeu cau de (bi dong, dao ngu, cau dieu kien,\r\n   menh de...): Tot dung cau truc yeu cau, khong loi | Kha dung cau truc\r\n   chinh, con 1-2 loi nho | Trung binh dung huong nhung thieu/sai thanh phan\r\n   bat buoc (thieu \"to\", sai thi phu) | Can co gang khong nhan dien duoc cau\r\n   truc can dung.\r\nb) Bao toan nghia goc cua cau: Tot giu nguyen ven nghia va sac thai | Kha giu\r\n   duoc nghia chinh, lech nhe sac thai | Trung binh nghia bi thay doi mot\r\n   phan | Can co gang nghia khac han hoac trai nghia.\r\nc) Dung dung tu/cau truc cho san, khong thay doi tu goi y: Tot dung chinh xac\r\n   tu cho san (dung dang, dung vi tri) | Kha dung dung tu nhung vi tri/dang\r\n   chua toi uu | Trung binh co dung tu cho san nhung chia sai dang/thi | Can\r\n   co gang khong dung tu cho san hoac dung sai muc dich.\r\nd) Chinh ta - ngu phap - do tu nhien cua cau viet lai: Tot cau tu nhien, khong\r\n   loi | Kha dung ngu phap, doi cho con dich sat | Trung binh con vai loi nho\r\n   khong can tro hieu nghia | Can co gang nhieu loi khien cau kho hieu.\r\nLoi thuong gap: quen doi thi khi doi cau truc, dich word-by-word, thua/thieu\r\ngioi tu sau khi bien doi cau, quen \"s\" ngoi thu 3."
  },
  {
    "ma": "HOI_THOAI",
    "tuKhoa": [
      "hoi thoai",
      "suitable words or phrases",
      "idiom"
    ],
    "tags": [
      "gap_fill",
      "idiom"
    ],
    "rubric": "XII. DIEN TU/CUM TU THICH HOP VAO CAU HOI THOAI.\r\n1. Do chinh xac: Tot 16-18 cau dung | Kha 13-15 | Trung binh 9-12 | Can co\r\n   gang <=8.\r\n2. Von thanh ngu & cum tu co dinh trong giao tiep: Tot nho va dien chinh xac\r\n   thanh ngu/cum tu phu hop ngu canh | Kha dung phan lon, nham thanh ngu gan\r\n   nghia | Trung binh chi dien dung cum tu co ban | Can co gang khong nho\r\n   duoc thanh ngu/cum tu can thiet.\r\n3. Ly giai theo ngu canh hoi thoai: Tot giai thich duoc vi sao cum tu do phu\r\n   hop tinh huong | Kha dung huong | Trung binh chi doan theo cam tinh | Can\r\n   co gang khong ly giai duoc.\r\n4. Van dung vao giao tiep thuc te: Tot tu tao hoi thoai co su dung cum tu vua\r\n   hoc | Kha can goi y | Trung binh han che | Can co gang chua van dung duoc."
  },
  {
    "ma": "DOC_HIEU",
    "tuKhoa": [
      "doc hieu",
      "reading",
      "matching",
      "gapped text",
      "summary",
      "unreliable",
      "entrepreneur",
      "tower",
      "glory",
      "wheels",
      "dark matter",
      "speech chain"
    ],
    "tags": [
      "reading",
      "summary_completion",
      "gapped_text",
      "matching_information",
      "diagram_label",
      "word_bank"
    ],
    "rubric": "XIII-XVI. DOC HIEU (MCQ/True-False-Not Given, suy luan, noi tieu de, hoan\r\nthanh tom tat/so do, gapped-text, ghep thong tin voi doan van).\r\na) Doc hieu y chinh & chi tiet: Tot xac dinh chinh xac, phan biet ro \"Sai\" va\r\n   \"Khong co thong tin\", khong bi danh lua boi cau nhieu dien dat lai gan\r\n   giong bai doc | Kha dung phan lon, nham \"Sai\" va \"Khong co thong tin\" |\r\n   Trung binh dung cau hoi chi tiet ro rang, sai cau can tong hop nhieu doan |\r\n   Can co gang tra loi cam tinh, chua dinh vi duoc thong tin.\r\nb) Suy luan & doan nghia tu trong ngu canh: Tot suy luan chinh xac y ngam\r\n   dinh, doan dung nghia tu moi | Kha doan dung nghia co ban, kho voi suy\r\n   luan sau | Trung binh chi hieu nghia den | Can co gang khong doan duoc\r\n   nghia tu moi.\r\nc) Ky nang lam dang bai dac thu (noi tieu de, tom tat, ghep cau, gapped-text,\r\n   so do, scanning tim thong tin, nhan dien paraphrase): Tot xu ly thanh thao\r\n   moi dang bai, quan ly tot thoi gian | Kha lam tot dang quen thuoc, cham/\r\n   nham o gapped-text hoac ghep thong tin doan dai | Trung binh chi lam tot\r\n   MCQ don gian, lung tung voi dang can doc toan bai | Can co gang chua co\r\n   chien luoc lam bai, lam ngau nhien.\r\nLoi thuong gap: chon dap an co tu trung bai doc nhung sai nghia (distractor),\r\nnham FALSE/NOT GIVEN, viet qua so tu cho phep (NO MORE THAN TWO WORDS). Goi\r\ny: luyen tach rieng tung dang bai truoc khi ghep thanh de hoan chinh."
  },
  {
    "ma": "NGHE",
    "tuKhoa": [
      "listening",
      "nghe hieu",
      "bai nghe",
      "luyen nghe"
    ],
    "tags": [
      "listening"
    ],
    "rubric": "NGHE HIEU (Listening) - chi ap dung khi co file am thanh that.\r\na) Nghe chi tiet - dien tu/so lieu: Tot bat chinh xac tu khoa, so lieu, chinh\r\n   ta ten rieng | Kha nghe dung y chinh, sai chinh ta nho | Trung binh chi bat\r\n   duoc tu khoa don gian | Can co gang khong theo kip bai nghe.\r\nb) Nghe dinh vi khong gian (ban do/so do): Tot theo doi chinh xac tu chi\r\n   phuong huong | Kha dinh vi dung phan lon | Trung binh chi dinh vi duoc vi\r\n   tri dau/cuoi ro rang | Can co gang khong ket noi duoc ngon ngu chi phuong\r\n   huong voi hinh ve.\r\nc) Nghe hieu y chinh - thai do - chuc nang giao tiep: Tot nhan dien chinh xac\r\n   thai do/muc dich du khong co tu khoa truc tiep | Kha nhan dien dung y\r\n   chinh, kho khi can suy luan thai do | Trung binh chi hieu khi thong tin noi\r\n   truc tiep | Can co gang chua nam duoc y chinh."
  }
];

export const GoiKienThucTheoDang: Record<string, string> = {
  "PHAT_AM": "PHAT_AM",
  "TRONG_AM": "TRONG_AM",
  "LOI_SAI": "LOI_SAI",
  "TRAC_NGHIEM": "NGU_PHAP",
  "CLOZE": "TU_VUNG",
  "OPEN_CLOZE": "OPEN_CLOZE",
  "WORD_FORM": "WORD_FORM",
  "GIOI_TU": "GIOI_TU",
  "PHRASAL_VERB": "PHRASAL_VERB",
  "TRIOS": "TRIOS",
  "VIET_LAI_CAU": "VIET_LAI_CAU",
  "HOI_THOAI": "DIEN_CUM_TU",
  "DOC_HIEU": "DOC_HIEU",
  "NGHE": "NGHE"
};
export const GoiKienThucTheoTag: Record<string, string> = {
  "pronunciation": "PHAT_AM",
  "stress": "TRONG_AM",
  "error_identification": "LOI_SAI",
  "grammar": "NGU_PHAP",
  "inversion": "DAO_NGU",
  "causative": "CAU_KHIEN",
  "tense": "THI",
  "comparison": "SO_SANH",
  "passive": "BI_DONG",
  "word_order": "TRAT_TU_TU",
  "reported_speech": "TUONG_THUAT",
  "conditional": "DIEU_KIEN",
  "relative_clause": "MENH_DE_QUAN_HE",
  "vocabulary": "TU_VUNG",
  "idiom": "THANH_NGU",
  "phrasal_verb": "PHRASAL_VERB",
  "preposition": "GIOI_TU",
  "word_form": "WORD_FORM",
  "open_cloze": "OPEN_CLOZE",
  "trios": "TRIOS",
  "sentence_transformation": "VIET_LAI_CAU",
  "gap_fill": "DIEN_CUM_TU",
  "reading": "DOC_HIEU",
  "summary_completion": "DOC_HIEU",
  "gapped_text": "DOC_HIEU",
  "matching_information": "DOC_HIEU",
  "diagram_label": "DOC_HIEU",
  "word_bank": "DOC_HIEU",
  "listening": "NGHE"
};
export const CachChuaTheoDang: Record<string, string> = {
  "PHAT_AM": "CÁCH CHỮA TỪNG CÂU (Phát âm):\r\n- phan_tich: mỗi phương án 1 mục. muc = \"A. measure\" (từ gốc, không kèm thẻ <u>). chi_tiet = phiên âm IPA cả từ + âm của phần gạch chân, vd \"/ˈmeʒ.ər/ – phần gạch chân 's' đọc /ʒ/\".\r\n- giai_thich: quy tắc phát âm quyết định đáp án (đuôi -sure/-sion, âm câm, từ mượn, nguyên âm đôi...).\r\n- ly_do_sai: thường do nhìn mặt chữ giống nhau rồi đoán cách đọc giống nhau, quên quy tắc, không biết âm câm; chỉ ra đúng quy tắc bị bỏ lỡ.",
  "TRONG_AM": "CÁCH CHỮA TỪNG CÂU (Trọng âm):\r\n- phan_tich: mỗi phương án 1 mục. muc = \"A. multimedia\". chi_tiet = phiên âm IPA có dấu ˈ (và ˌ nếu có) + vị trí trọng âm, vd \"/ˌmʌl.tiˈmiː.di.ə/ – trọng âm âm tiết 3\".\r\n- giai_thich: quy tắc trọng âm quyết định đáp án (hậu tố, từ loại, số âm tiết); nếu đáp án là từ ngoại lệ thì nói rõ.\r\n- ly_do_sai: đoán học sinh nhầm ở đâu (đếm sai âm tiết, áp sai quy tắc hậu tố, đọc theo thói quen) và chỉ ra quy tắc đúng.",
  "LOI_SAI": "CÁCH CHỮA TỪNG CÂU (Tìm lỗi sai):\r\n- phan_tich: mỗi phần được đánh dấu 1 mục (\"A. <cụm từ>\"). Mục sai: chi_tiet = \"Sai → sửa thành ...\" + lý do ngắn; mục đúng: vì sao đúng (1 câu).\r\n- giai_thich: quy tắc ngữ pháp bị vi phạm (thì, hoà hợp chủ ngữ – động từ, từ loại, giới từ, cấu trúc song song...), kèm câu đã sửa hoàn chỉnh.",
  "TRAC_NGHIEM": "CÁCH CHỮA TỪNG CÂU (Ngữ pháp – từ vựng trắc nghiệm):\r\n- phan_tich: mỗi phương án 1 mục: muc = \"A. <phương án>\", chi_tiet = nghĩa/chức năng ngữ pháp và vì sao đúng hoặc sai trong câu này.\r\n- giai_thich: cấu trúc/collocation/thành ngữ quyết định đáp án; nếu là cấu trúc thì ghi công thức (vd \"Not until + mệnh đề + trợ động từ + S + V\"); dịch nghĩa câu hoàn chỉnh.\r\n- ly_do_sai: vì sao phương án học sinh chọn trông hợp lý nhưng sai (gần nghĩa, sai collocation, sai thì, dịch word-by-word...).",
  "CLOZE": "CÁCH CHỮA TỪNG CÂU (Điền từ vào đoạn văn):\r\n- phan_tich: mỗi phương án (hoặc từ trong danh sách cho sẵn mà học sinh đã chọn) 1 mục: nghĩa + vì sao hợp hoặc không hợp; trích cụm từ ngay trước/sau chỗ trống làm căn cứ.\r\n- giai_thich: căn cứ ngữ pháp (từ loại, collocation, giới từ đi kèm) và căn cứ nghĩa trong đoạn văn.",
  "OPEN_CLOZE": "CÁCH CHỮA TỪNG CÂU (Điền một từ, không có phương án):\r\n- phan_tich: mục \"Câu hoàn chỉnh\" = câu đã điền đáp án, đặt từ cần điền trong [ ]; mục \"Từ loại/chức năng\" = vì sao vị trí này cần từ đó (giới từ, liên từ, đại từ quan hệ, mạo từ...); nếu học sinh điền sai: thêm mục \"Bạn điền: <từ>\" chỉ ra vì sao không hợp.\r\n- giai_thich: dấu hiệu trong câu giúp suy ra đáp án.",
  "WORD_FORM": "CÁCH CHỮA TỪNG CÂU (Biến đổi từ):\r\n- phan_tich: mục \"Vị trí cần\" = từ loại cần điền và dấu hiệu nhận biết (vd sau \"are often\" cần quá khứ phân từ); mục \"Họ từ <từ gốc>\" = các dạng n/v/adj/adv liên quan kèm nghĩa; nếu học sinh sai: mục \"Bạn điền: <từ>\" chỉ ra sai ở đâu (từ loại, chính tả, thiếu tiền tố phủ định, thiếu số nhiều...).\r\n- giai_thich: vì sao chọn dạng từ này (từ loại + nghĩa phù hợp ngữ cảnh, khẳng định hay phủ định).",
  "GIOI_TU": "CÁCH CHỮA TỪNG CÂU (Giới từ):\r\n- phan_tich: mục \"Cụm cố định\" = collocation đầy đủ chứa đáp án + nghĩa; nếu học sinh sai: mục \"Bạn điền: <giới từ>\" = giới từ đó thường đi với gì/mang nghĩa gì.\r\n- giai_thich: vì sao dùng giới từ này trong ngữ cảnh câu.",
  "PHRASAL_VERB": "CÁCH CHỮA TỪNG CÂU (Cụm động từ):\r\n- phan_tich: mục cho đáp án = phrasal verb + nghĩa trong câu này; nếu học sinh sai: mục cho phương án học sinh chọn = nghĩa thật của nó; có thể thêm 1 phrasal verb dễ nhầm.\r\n- giai_thich: dấu hiệu ngữ cảnh cho thấy nghĩa cần dùng.",
  "TRIOS": "CÁCH CHỮA TỪNG CÂU (Một từ dùng chung cho 3 câu):\r\n- phan_tich: đúng 3 mục, mỗi câu 1 mục: muc = \"Câu 1\"/\"Câu 2\"/\"Câu 3\", chi_tiet = cụm từ chứa đáp án + nghĩa trong câu đó (vd \"on the point of + V-ing: sắp sửa\").\r\n- giai_thich: điểm chung giữa các nghĩa của từ; nếu học sinh sai, từ học sinh điền hợp với câu nào và không hợp với câu nào.",
  "VIET_LAI_CAU": "CÁCH CHỮA TỪNG CÂU (Viết lại câu – câu tự luận):\r\n- phan_tich: mục \"Cấu trúc cần dùng\" = công thức; mục \"Bài làm của bạn\" = nhận xét từng phần (giữ nghĩa, cấu trúc, dùng từ cho sẵn, chính tả – ngữ pháp); mục \"Đáp án tham khảo\" = câu mẫu.\r\n- diem_tu_luan: BẮT BUỘC với câu tự luận, 0-100 theo 4 tiêu chí a-d ở trên. Câu đúng cấu trúc, giữ nguyên nghĩa và dùng đúng từ cho sẵn thì được 100, dù khác câu mẫu về chữ. Bỏ trống thì 0.\r\n- ly_do_sai: chỗ làm mất điểm và cách sửa.",
  "HOI_THOAI": "CÁCH CHỮA TỪNG CÂU (Điền từ/cụm từ hoàn thành câu, kể cả câu hội thoại):\r\n- phan_tich: mục \"Cấu trúc\" = công thức hoặc cụm cố định cần dùng + nghĩa; mục \"Câu hoàn chỉnh\" = câu đã điền đáp án, đặt phần cần điền trong [ ]; nếu học sinh sai: mục \"Bạn điền: ...\" chỉ ra sai ở đâu (thiếu/thừa từ, sai thì, sai dạng động từ, sai cụm cố định).\r\n- giai_thich: dấu hiệu ở phần trước và sau chỗ trống cho thấy cần cấu trúc này.",
  "DOC_HIEU": "CÁCH CHỮA TỪNG CÂU (Đọc hiểu):\r\n- phan_tich: mục \"Căn cứ trong bài\" = trích nguyên văn câu/cụm trong đoạn văn chứng minh đáp án (đặt trong ngoặc kép). Câu có phương án: thêm mỗi phương án 1 mục, phương án sai nêu vì sao sai (không có thông tin, sai chi tiết, bẫy dùng từ trùng bài đọc, quá khái quát). Câu điền từ/tóm tắt (kể cả chọn từ trong danh sách cho sẵn): thêm mục \"Bạn điền: ...\" nếu học sinh sai, nêu vì sao không hợp (nghĩa, từ loại, số từ).\r\n- giai_thich: cách câu hỏi diễn đạt lại (paraphrase) thông tin trong bài.",
  "NGHE": "CÁCH CHỮA TỪNG CÂU (Nghe):\r\n- phan_tich: mục \"Thông tin cần nghe\" = từ khoá/số liệu cần bắt; nếu có lời thoại trong dữ liệu đề thì trích câu chứa đáp án; nếu học sinh sai: mục \"Bạn trả lời: ...\" chỉ ra chỗ nhầm (nghe nhầm âm, sai chính tả, bẫy thông tin bị sửa lại).\r\n- giai_thich: vì sao đáp án đúng."
};
export const KienThucNen: Record<string, string> = {
  "PHAT_AM": "[Phát âm]\r\n- Đuôi -ed: /ɪd/ sau /t/, /d/; /t/ sau âm vô thanh /p, k, f, s, ʃ, tʃ, θ/; /d/ sau các âm còn lại. Tính từ đọc /ɪd/: naked, wicked, beloved, sacred, crooked, ragged, learned (adj), aged (adj), blessed (adj).\r\n- Đuôi -s/-es: /ɪz/ sau /s, z, ʃ, ʒ, tʃ, dʒ/; /s/ sau /p, t, k, f, θ/; /z/ sau các âm còn lại.\r\n- -sion, -sure: sau nguyên âm thường đọc /ʒ/ (vision, measure); -ssion, -ssure và -sion sau phụ âm l, n thường đọc /ʃ/ (permission, pressure, mansion, tension).\r\n- Âm câm: b sau m hoặc trước t (climb, bomb, debt, doubt); k trước n (know); w trước r (write); h trong hour, honest, honour, heir; t trong castle, listen, whistle, fasten; g trước n (sign, foreign); l trong calm, half, walk, should; p trong psychology, receipt.\r\n- ch: /tʃ/ (chair), /k/ (chemistry, character, stomach), /ʃ/ (machine, chef, brochure). gh: /f/ (laugh, cough, enough) hoặc câm (high, daughter).\r\n- Đuôi -ual: /ʒu/ (visual, casual, usual), /tʃu/ (actual, factual), /dʒu/ (gradual, individual); qu thường đọc /kw/ (equal, quality).",
  "TRONG_AM": "[Trọng âm]\r\n- Từ 2 âm tiết: động từ thường nhấn âm 2 (begin, relax); danh từ, tính từ thường nhấn âm 1 (table, happy).\r\n- Hậu tố tự nhận trọng âm: -ee, -eer, -ese, -ique, -esque, -oo, -oon (employee, engineer, Vietnamese, unique).\r\n- Trọng âm rơi vào âm tiết ngay trước hậu tố: -tion, -sion, -ic, -ical, -ity, -ial, -ian, -ious, -eous, -ient, -ience, -iar (education, economic, ability).\r\n- Trọng âm rơi vào âm tiết thứ 3 tính từ cuối lên: -ate (từ từ 3 âm tiết), -cy, -ty, -phy, -gy, -ify (communicate, democracy, photography, geography, identify).\r\n- Hậu tố thường không làm đổi trọng âm của từ gốc: -ment, -ness, -ful, -less, -er/-or, -ly, -ing, -ed, -able (environment, enjoyable).\r\n- Tiền tố thường không nhận trọng âm: un-, im-, in-, dis-, re-, en-, ex- (imprison, endanger).",
  "LOI_SAI": "[Tìm lỗi sai – các nhóm lỗi hay gặp]\r\n- Hoà hợp chủ ngữ – động từ: xác định đúng chủ ngữ chính (bỏ qua cụm giới từ chen giữa); each/every/either/neither + động từ số ít; danh từ không đếm được (information, advice, equipment, furniture, news) + động từ số ít; a number of + danh từ số nhiều + động từ số nhiều, the number of + danh từ + động từ số ít.\r\n- Thì: dấu hiệu thời gian (since/for → thì hoàn thành; ago, yesterday, in + năm đã qua → quá khứ đơn; by + mốc tương lai → tương lai hoàn thành) và sự phối thì giữa các mệnh đề.\r\n- Từ loại: tính từ bổ nghĩa danh từ và đứng sau động từ liên kết (be, seem, look, feel, become); trạng từ bổ nghĩa động từ, tính từ, trạng từ khác.\r\n- Cấu trúc song song: các thành phần nối bằng and/or/but, both … and, either … or, not only … but also phải cùng dạng.\r\n- Đại từ và đại từ quan hệ phải hợp số, ngôi và chức năng với từ được thay thế.\r\n- Mạo từ; giới từ đi kèm; so sánh (không dùng more + -er, so sánh hơn đi với than); từ thừa (return back, repeat again); cặp từ dễ nhầm (economic/economical, affect/effect, rise/raise, lie/lay).",
  "NGU_PHAP": "[Ngữ pháp trắc nghiệm – cách làm và cấu trúc hay gặp]\r\n- Cách làm: xác định câu kiểm tra điều gì (cấu trúc, thì, dạng động từ, từ nối, collocation hay nghĩa); loại phương án sai ngữ pháp trước, rồi chọn theo nghĩa và ngữ cảnh.\r\n- Modal + have V3: should/ought to have V3 = lẽ ra nên làm (nhưng đã không làm); shouldn't/oughtn't to have V3 = lẽ ra không nên làm (nhưng đã làm); must have V3 = chắc hẳn đã; can't/couldn't have V3 = không thể nào đã; may/might/could have V3 = có lẽ đã; needn't have V3 = lẽ ra không cần làm (nhưng đã làm). Sau should, must, can không có \"to\"; ought luôn đi với \"to\".\r\n- Câu ước: wish/if only + quá khứ đơn (trái hiện tại, be dùng were); + quá khứ hoàn thành (trái quá khứ); + would V (mong người khác hoặc sự việc thay đổi, thường để phàn nàn).\r\n- Nhượng bộ: although/though/even though + mệnh đề; despite/in spite of + danh từ/V-ing/the fact that + mệnh đề; however/no matter how + tính từ/trạng từ + S + V; whatever/no matter what (+ danh từ) + S + V; tính từ/trạng từ + as/though + S + V (Tired as she was, …).\r\n- Từ nối: consequently/therefore/as a result (kết quả); however/nevertheless/even so (tương phản, thường đứng đầu câu mới); otherwise (nếu không thì); while/whereas là liên từ nối hai mệnh đề, còn meanwhile/at the same time là trạng từ.\r\n- Cấu trúc cố định hay gặp: there's no point (in) V-ing; there's no need to V; there's no alternative but to V; it's no wonder (that) + mệnh đề; it remains to be seen whether …; be to V = theo kế hoạch đã định (was/were to V có thể là kế hoạch không thành).\r\n- Dạng động từ theo sau: V-ing sau giới từ và sau avoid, enjoy, mind, deny, admit, consider, can't help, look forward to; to V sau decide, hope, refuse, manage, afford, tend; remember/forget/stop/try/regret + to V khác nghĩa với + V-ing; suggest V-ing hoặc suggest (to sb) that S (should) V – không có \"suggest sb to V\"; apologise (to sb) for V-ing; inform sb that/of sth.\r\n- Giả định: It is essential/important/vital that + S + V nguyên thể; insist/recommend/demand that + S + (should) V nguyên thể.\r\n- Đồng vị ngữ: cụm danh từ đặt giữa hai dấu phẩy để giải thích cho danh từ đứng trước, không phải mệnh đề có động từ chia.",
  "DAO_NGU": "[Đảo ngữ: trợ động từ + S + V]\r\n- Trạng từ phủ định/hạn chế đứng đầu câu: Never, Rarely, Seldom, Little, Hardly ever, Not once + trợ động từ + S + V.\r\n- Hardly/Scarcely/Barely + had + S + V3 + when + quá khứ đơn; No sooner + had + S + V3 + than + quá khứ đơn (vừa mới … thì …).\r\n- Only after/when/if/by/then + cụm từ hoặc mệnh đề, + trợ động từ + S + V: đảo ở MỆNH ĐỀ CHÍNH, vế đi với Only giữ trật tự thường.\r\n- Not until + mốc/mệnh đề + trợ động từ + S + V; tương đương It was not until … that + S + V (không đảo).\r\n- Under no circumstances/On no account/In no way/At no time + trợ động từ + S + V; các cụm này đã mang nghĩa phủ định nên không thêm \"not\".\r\n- Not only + trợ động từ + S + V, but (S) also …\r\n- So + tính từ/trạng từ + trợ động từ + S + V + that …; Such + be + danh từ + that …\r\n- Đảo ngữ thay cho if: Should + S + V (loại 1); Were + S + to V / Were + S … (loại 2); Had + S + V3 (loại 3).\r\n- Trợ động từ theo thì: hiện tại đơn do/does, quá khứ đơn did (động từ chính về nguyên thể), thì hoàn thành have/has/had, động từ khuyết thiếu giữ nguyên.",
  "CAU_KHIEN": "[Câu cầu khiến]\r\n- Chủ động: have sb V (nguyên thể); get sb to V; make sb V (bắt ai làm, không có \"to\"); let sb V; force/oblige/compel sb to V.\r\n- Bị động: have/get sth V3 – nhờ/thuê làm việc gì, hoặc gặp chuyện không mong muốn (have one's bag stolen); có thể thêm người nhận: have sth V3 to sb.\r\n- Thể bị động của make là be made to V (có \"to\").\r\n- get sth V3 còn mang nghĩa tự làm được việc gì (get the work done = làm xong được việc).",
  "THI": "[Thì động từ]\r\n- Tương lai hoàn thành will have V3: hoàn thành hoặc kéo dài (for …) đến một mốc tương lai (by …, next …, by the time + hiện tại đơn).\r\n- Tương lai tiếp diễn will be V-ing: đang diễn ra tại một thời điểm tương lai, hoặc việc sẽ diễn ra theo kế hoạch/lẽ thường.\r\n- Tương lai trong quá khứ: was/were going to V, would V (nhìn từ một thời điểm trong quá khứ).\r\n- Quá khứ hoàn thành had V3: xảy ra trước một hành động/mốc trong quá khứ (by the time + quá khứ đơn, before, after, already).\r\n- Hiện tại hoàn thành: since, for, so far, already, yet, recently, ever, never; không dùng với mốc quá khứ xác định (ago, yesterday, in 2010).\r\n- Động từ chỉ trạng thái (know, believe, understand, belong, own, seem, want, love …) thường không chia tiếp diễn, kể cả ở thì hoàn thành tiếp diễn.",
  "SO_SANH": "[So sánh]\r\n- So sánh hơn: adj-er/more + adj + than; so sánh nhất: the + adj-est/the most + adj (+ of/in …).\r\n- Nhấn mạnh so sánh hơn: much/far/a lot/even/slightly + so sánh hơn; so sánh kép: the + so sánh hơn …, the + so sánh hơn …\r\n- So sánh bằng: as + adj/adv + as; phủ định not as/so … as; kém xa: nowhere near/not nearly as … as.\r\n- Tránh lặp lại danh từ đã nói: that of (số ít), those of (số nhiều).\r\n- Hai vế so sánh phải cùng loại (so khối lượng với khối lượng, không so khối lượng với con người).",
  "BI_DONG": "[Câu bị động]\r\n- be + V3 chia theo thì: is/was done, has/had been done, will be done, is/was being done; modal + be V3; modal + have been V3.\r\n- Bị động tường thuật: It is said/believed/thought that + mệnh đề ↔ S + is said/believed/thought + to V (cùng thời điểm) / to have V3 (xảy ra trước).\r\n- Chủ ngữ là đối tượng chịu tác động thì dùng bị động; động từ nội động (happen, occur, appear, arrive, disappear) không có bị động.",
  "TRAT_TU_TU": "[Trật tự từ]\r\n- Cụm danh từ: mạo từ + (trạng từ) + tính từ/phân từ + danh từ (a highly respected writer).\r\n- Trật tự tính từ: ý kiến – kích cỡ – tuổi – hình dạng – màu sắc – nguồn gốc – chất liệu – mục đích + danh từ.\r\n- Câu hỏi gián tiếp và mệnh đề danh từ giữ trật tự S + V (không đảo trợ động từ).\r\n- however/no matter how + tính từ/trạng từ + S + V; enough đứng sau tính từ/trạng từ nhưng đứng trước danh từ.",
  "TUONG_THUAT": "[Câu tường thuật]\r\n- Câu hỏi Yes/No: ask (sb) if/whether + S + V; câu hỏi Wh-: ask (sb) + từ để hỏi + S + V; không đảo trợ động từ, không có dấu hỏi.\r\n- Lùi thì: hiện tại → quá khứ; quá khứ và hiện tại hoàn thành → quá khứ hoàn thành; will → would; can → could; may → might; would, could, should, might, ought to giữ nguyên.\r\n- Mệnh lệnh, lời khuyên, yêu cầu: tell/ask/advise/order/warn sb (not) to V.\r\n- Lời mời, gợi ý: invite sb to V; ask if sb would like …; suggest V-ing / suggest (that) S (should) V.\r\n- Đổi đại từ và trạng từ: now → then, today → that day, tomorrow → the next/following day, here → there, this → that.",
  "DIEU_KIEN": "[Câu điều kiện]\r\n- Loại 1: If + hiện tại đơn, will/can/may + V. Loại 2: If + quá khứ đơn (be → were), would/could + V. Loại 3: If + had V3, would/could have V3. Hỗn hợp: If + had V3, would + V (kết quả ở hiện tại).\r\n- Unless = if … not; provided/providing (that), as long as, on condition that = miễn là; otherwise/or (else) = nếu không thì; but for/without + danh từ = nếu không có.\r\n- Đảo ngữ: Should + S + V; Were + S + to V; Had + S + V3.",
  "MENH_DE_QUAN_HE": "[Mệnh đề quan hệ]\r\n- who (người, làm chủ ngữ), whom (người, làm tân ngữ), which (vật), whose + danh từ (sở hữu), where/when/why; that thay who/which trong mệnh đề xác định, không dùng sau dấu phẩy hoặc sau giới từ.\r\n- Giới từ + which/whom (the town in which she grew up).\r\n- Rút gọn: V-ing (nghĩa chủ động), V3 (nghĩa bị động), to V (sau the first/last/only, so sánh nhất: the first woman to climb …).",
  "TU_VUNG": "[Từ vựng – collocation và từ dễ nhầm]\r\n- Xét các từ đứng sát chỗ trống: collocation động từ + danh từ (make a decision, do research, pay attention to), tính từ/trạng từ đi kèm (heavy rain, highly likely, bitterly disappointed), giới từ phụ thuộc (depend on, interested in, aware of), cấu trúc theo sau (be able to V, be capable of V-ing, find oneself V-ing).\r\n- Cặp từ dễ nhầm: make/do; say/tell/speak/talk (tell a story/the truth; speak a language; say something); able/capable/possible (it is possible to V, chủ ngữ không phải người); accurate/exact/precise; reaction/response; cause/make/create/produce; rise (nội động từ)/raise (ngoại động từ); lie/lay; affect (v)/effect (n); economic/economical; sensible/sensitive; remember/remind.\r\n- Từ nối giữa các câu: however/nevertheless/even so (tương phản), consequently/therefore/as a result (kết quả), otherwise (nếu không thì), instead (thay vào đó), perhaps (có lẽ), moreover/furthermore (thêm ý).\r\n- Chọn theo nghĩa của cả đoạn: đọc câu trước và sau chỗ trống, xác định ý đang được phát triển và giọng văn.",
  "THANH_NGU": "[Thành ngữ]\r\n- Thành ngữ có hình thức cố định: không thay từ, không đổi số ít/số nhiều; nghĩa bóng khác nghĩa đen.\r\n- Phương án gây nhiễu thường là thành ngữ có thật nhưng khác nghĩa, hoặc ghép sai từ của một thành ngữ thật; khi chữa, nêu nghĩa của thành ngữ đúng và của các thành ngữ gây nhiễu có thật.\r\n- Xác định sắc thái câu cần (vui/buồn, khen/chê, gấp gáp/bình tĩnh) rồi đối chiếu với nghĩa bóng.",
  "OPEN_CLOZE": "[Điền một từ]\r\n- Suy ra từ loại còn thiếu từ ngữ pháp của câu: trước danh từ cần mạo từ/từ hạn định/tính từ sở hữu; sau động từ, tính từ, danh từ thường là giới từ phụ thuộc; nối hai mệnh đề cần liên từ hoặc đại từ quan hệ; trước V3 của câu bị động cần be, của thì hoàn thành cần have.\r\n- Nhóm từ hay được kiểm tra: mạo từ (a/an/the); đại từ (one/ones thay cho danh từ, it/there làm chủ ngữ giả, tính từ sở hữu); lượng từ (other/another/others, few/little, much/many); giới từ phụ thuộc; liên từ và từ nối (once, unless, although, while, then); đại từ quan hệ và từ để hỏi (who, which, whose, what); trợ động từ (be, have, do); tiểu từ của phrasal verb; từ dùng trong so sánh (than, as, so, such).\r\n- Kiểm tra chủ ngữ số ít/số nhiều để chọn đại từ và động từ phù hợp (its/their, is/are).",
  "WORD_FORM": "[Biến đổi từ]\r\n- Xác định vị trí: sau mạo từ, tính từ sở hữu, giới từ, tính từ → danh từ; trước danh từ hoặc sau be/seem/become/look → tính từ; bổ nghĩa động từ, tính từ hoặc cả câu → trạng từ; sau trợ động từ, động từ khuyết thiếu, to → động từ. Kiểm tra thêm số ít/số nhiều, thì, chủ động/bị động (V3 dùng như tính từ).\r\n- Hậu tố danh từ: -tion/-sion/-ation, -ment, -ness, -ity, -ance/-ence, -ship, -hood, -ism, -age, -ure, -al (arrival); chỉ người: -er/-or, -ist, -ant/-ent, -ee, -ian.\r\n- Hậu tố tính từ: -ful/-less, -ous/-ious/-uous, -ive/-ative, -able/-ible, -al/-ial/-ical, -ic, -ary/-ory, -ant/-ent, -y; -ed (người cảm thấy/bị tác động) khác -ing (gây ra cảm giác).\r\n- Tạo động từ: hậu tố -ize/-ise, -ify, -en, -ate; tiền tố en-/em- (enlarge, empower), be- (befriend), out- (outnumber).\r\n- Tiền tố đổi nghĩa: un-, in-/im-/il-/ir- (im- trước b, m, p; il- trước l; ir- trước r), dis-, non- (phủ định); mis- (sai); de- (bỏ đi, làm giảm); over-/under- (quá mức/chưa đủ); out- (vượt hơn); re- (lại); counter-, anti- (chống).\r\n- Danh từ ghép tạo từ cụm động từ, viết liền hoặc có gạch nối: breakdown, outcome, take-off, check-in.\r\n- Chính tả: y → i trước hậu tố (happy → happiness); bỏ e câm trước hậu tố bắt đầu bằng nguyên âm (believe → believable); gấp đôi phụ âm cuối khi cần (begin → beginning). Phân biệt economic/economical, historic/historical. Chính tả Anh và Mỹ (favour/favor, -ise/-ize) đều chấp nhận được.\r\n- Luôn đối chiếu nghĩa của cả câu: ngữ cảnh phủ định hoặc tiêu cực thì cân nhắc tiền tố phủ định, không chỉ dựa vào từ loại.",
  "GIOI_TU": "[Giới từ]\r\n- Tìm từ chi phối giới từ: động từ (insist on, consist of, approve of), tính từ (proud of, keen on, aware of, famous for), danh từ (reason for, solution to, increase in), hoặc cụm cố định (on purpose, by mistake, at risk, in advance).\r\n- Thời gian: at (giờ), on (ngày, thứ), in (tháng, năm, buổi); for + khoảng thời gian; during + sự kiện/giai đoạn; throughout (suốt cả); since + mốc; by (không muộn hơn); until (cho đến khi).\r\n- Nơi chốn, chuyển động: in/on/at; to (hướng đến), into (vào bên trong; biến thành), onto, out of (ra khỏi; làm từ chất liệu gì), up/down (lên/xuống), through (xuyên qua; hoàn toàn), among (giữa nhiều đối tượng)/between (giữa hai).\r\n- Cách thức, phương tiện, trạng thái: by (phương tiện; by + V-ing), with (công cụ; cùng với), in (trạng thái, cảm xúc: in a hurry, in tears).\r\n- Chỗ trống có thể là tiểu từ của phrasal verb (give in, set off, turn down); khi đó giải thích nghĩa của cả cụm.",
  "PHRASAL_VERB": "[Cụm động từ]\r\n- Nghĩa thường gặp của tiểu từ: up (tăng, hoàn tất, xuất hiện), down (giảm, ghi lại, làm buồn), out (ra ngoài, biến mất, hết, ngất), off (rời đi, huỷ, hết tác dụng, gửi đi), over (vượt qua, hồi phục, xem xét), through (xuyên qua, hoàn tất, liên lạc được), on (tiếp tục, tiến triển, hoà hợp), away (rời xa, thoát), across (truyền đạt; tình cờ gặp; tạo ấn tượng), round/around (vòng qua, lan truyền, thuyết phục), by (xoay xở), after (giống; chăm sóc).\r\n- Một cụm có thể nhiều nghĩa tuỳ tân ngữ và ngữ cảnh; cụm 3 từ có giới từ cố định ở cuối (look forward to, come up with, catch up with, run out of).\r\n- Cụm với get thường gặp: get about/around (đi lại được; tin tức lan ra), get across (truyền đạt cho người khác hiểu), get ahead (thành công, tiến lên), get along/on with (hoà hợp với), get on (tiến triển), get on with (tiếp tục làm), get at (ám chỉ; chỉ trích ai), get away with (làm sai mà không bị phạt), get by (xoay xở đủ sống), get sb down (làm ai chán nản), get down to (bắt tay vào việc), get off with (thoát với hình phạt nhẹ), get sth off (gửi đi), get out of (trốn tránh việc gì), get over (vượt qua, nguôi ngoai), get round (thuyết phục ai; tin tức lan truyền), get round to (cuối cùng cũng có thời gian làm), get through (gọi điện được; vượt qua), get up to (làm trò gì, thường là nghịch ngợm).",
  "TRIOS": "[Một từ cho ba câu]\r\n- Từ cần điền phải hợp với CẢ BA câu cả về nghĩa lẫn ngữ pháp; nếu đáp án là động từ thì dạng chia (thì, V-ing, V3) phải đúng ở cả ba câu.\r\n- Bắt đầu từ câu có manh mối mạnh nhất – thành ngữ, cụm cố định, phrasal verb, collocation chặt – rồi thử từ tìm được với hai câu còn lại.\r\n- Đáp án thường là từ ngắn, thông dụng nhưng nhiều nghĩa (nghĩa đen, nghĩa bóng, nghĩa trong thành ngữ); nghĩa ở ba câu có thể khác xa nhau.\r\n- Khi học sinh điền sai: chỉ ra từ đó hợp được với câu nào và vì sao không hợp với câu còn lại.",
  "VIET_LAI_CAU": "[Viết lại câu với từ cho sẵn]\r\n- Yêu cầu: giữ nguyên nghĩa câu gốc; bắt buộc dùng từ cho sẵn và thường không được đổi dạng từ đó; câu mới đúng ngữ pháp, tự nhiên; thường phải đổi cấu trúc chứ không chỉ thay một từ đồng nghĩa.\r\n- Ước, tiếc, lời khuyên, sở thích: regret/I'm sorry → wish/if only + quá khứ hoàn thành (hoặc quá khứ đơn cho hiện tại); It's (high) time + S + quá khứ đơn / It's time for sb to V; had better (not) + V; would rather + V (than V) / would rather + S + quá khứ đơn; prefer V-ing to V-ing.\r\n- Đảo ngữ: On no account/Under no circumstances/Not until/Hardly … when/No sooner … than/Only when … + trợ động từ + S + V.\r\n- Nhấn mạnh: It was … that …; What … is/was …; It was with great + danh từ + that …\r\n- Danh từ hoá (động từ/tính từ → danh từ + collocation): decide → make a decision; be interested → take an interest in; succeed → be a success; be similar → bear a resemblance to.\r\n- Cụm cố định, thành ngữ thay cho cách nói thông thường (be on the verge of, take sth for granted, make allowances for, at sb's expense); chọn cụm có chứa đúng từ cho sẵn.\r\n- Biến đổi ngữ pháp khác: chủ động ↔ bị động (kể cả bị động tường thuật), trực tiếp ↔ gián tiếp, điều kiện (unless, otherwise, or), so sánh (nowhere near as … as, no + so sánh hơn + than).\r\n- Chấm điểm: có nhiều cách viết đúng; câu khác chữ so với câu mẫu nhưng giữ nghĩa, đúng cấu trúc và dùng đúng từ cho sẵn vẫn đạt điểm tối đa. Trừ điểm theo mức: sai hoặc thiếu cấu trúc chính, đổi nghĩa, không dùng hoặc đổi dạng từ cho sẵn, lỗi chính tả – ngữ pháp nhỏ.",
  "DIEN_CUM_TU": "[Điền cụm từ hoàn thành câu]\r\n- Đáp án thường là cụm 2–5 từ theo một cấu trúc ngữ pháp hoặc cụm cố định; phải khớp với phần trước và sau chỗ trống về thì, dạng động từ, số ít/số nhiều, mạo từ.\r\n- Cấu trúc hay gặp: It's (high/about) time + S + quá khứ đơn; be said/believed/thought + to V / to have V3; the first/last/only (+ danh từ) + to V / to have V3; should/shouldn't have V3 (trách móc); had better (not) + V; have sth V3; Only after/when … + trợ động từ + S + V; So + tính từ/trạng từ/few/little … that …; giới từ + V-ing (kể cả \"there being\"); rút gọn mệnh đề quan hệ bằng V-ing/V3; by the time + quá khứ đơn → quá khứ hoàn thành; Why didn't you/Why can't you … (trách móc).\r\n- Collocation và cụm cố định: động từ + danh từ (make progress, pay attention to, keep in touch with).\r\n- Nhiều chỗ trống chấp nhận hơn một cách điền: nếu bài làm đúng ngữ pháp, đúng nghĩa nhưng khác đáp án mẫu thì xử lý như câu tự điền chấp nhận được.",
  "DOC_HIEU": "[Đọc hiểu]\r\n- Câu hỏi suy luận (infer/imply/suggest): đáp án không nằm nguyên văn trong bài mà rút ra từ thông tin trong bài; loại phương án quá khái quát (all, always, never, most), đúng một nửa, hoặc dùng lại từ của bài nhưng sai ý.\r\n- Câu hỏi chi tiết: tìm từ khoá dễ định vị (tên riêng, số liệu, thuật ngữ), đọc kỹ câu chứa thông tin rồi đối chiếu cách diễn đạt lại.\r\n- Hoàn thành tóm tắt/câu/sơ đồ bằng từ trong bài: dùng đúng từ trong bài, đúng giới hạn số từ, từ điền phải hợp ngữ pháp (từ loại, số ít/số nhiều, mạo từ a/an trước chỗ trống); thông tin thường theo thứ tự bài đọc.\r\n- Tóm tắt có danh sách từ cho sẵn: xác định từ loại cần điền trước, rồi chọn theo nghĩa của bài; danh sách có từ gây nhiễu cùng chủ đề hoặc cùng từ loại, đáp án có thể là từ đồng nghĩa với từ trong bài.\r\n- Ghép thông tin với đoạn: một đoạn có thể được chọn nhiều lần; thông tin trong câu hỏi thường được diễn đạt lại hoàn toàn.\r\n- Điền câu vào đoạn (gapped text): dựa vào liên kết – đại từ (it, this, they), từ nối (however, so, also), từ lặp lại hoặc đồng nghĩa ở câu trước và sau chỗ trống; thường có một câu thừa.\r\n- True/False/Not Given: True = bài nói đúng như vậy; False = bài nói ngược lại; Not Given = bài không đề cập hoặc không đủ thông tin để kết luận.\r\n- Ghép nửa câu (sentence endings): ghép theo cả nghĩa lẫn ngữ pháp; phần đúng là cách diễn đạt lại ý trong bài.",
  "NGHE": "[Nghe]\r\n- Bẫy thường gặp: người nói sửa lại thông tin (actually, sorry, I mean, no wait); số dễ nghe nhầm (13/30, 15/50); tên riêng được đánh vần; danh từ số nhiều; giới hạn số từ.\r\n- Câu hỏi thường diễn đạt khác với lời nói (paraphrase), không chờ nghe đúng từ khoá trong câu hỏi.\r\n- Bản đồ/sơ đồ: theo dõi từ chỉ phương hướng (opposite, next to, on the corner of, at the end of, turn left/right, go past)."
};
