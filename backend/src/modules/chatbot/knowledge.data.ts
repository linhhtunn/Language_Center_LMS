// Chuyen tu Services/Chatbot/ChatbotKnowledge.cs - bo cau hoi/tra loi co san (FAQ), loc noi dung nhay cam,
// chon huong dan lien quan lam ngu canh cho AI va system prompt cua chatbot.
// Danh sach Articles chep NGUYEN VAN tu ban .NET (khong sua noi dung).

export interface ChatbotArticle {
  id: string;
  roles: string[];
  question: string;
  keywords: string[];
  answer: string;
  path: string | null;
}

export interface ChatbotLink {
  label: string;
  path: string;
}

export interface ChatbotSuggestion {
  id: string;
  question: string;
}

export interface ChatbotReply {
  text: string;
  source: string;
  links?: ChatbotLink[] | null;
}

export const Roles = ['Admin', 'Giao_Vien', 'Hoc_Sinh', 'Phu_Huynh'];

function A(id: string, role: string, q: string, keys: string, answer: string, path: string | null = null): ChatbotArticle {
  return { id, roles: role === '*' ? Roles : role.split('|'), question: q, keywords: keys.split('|'), answer, path };
}

export const Articles: ChatbotArticle[] = [
        A("welcome", "*", "Chatbot có thể giúp gì cho tôi?", "chatbot lam duoc gi|ban giup gi|ban la ai|huong dan su dung chatbot|chatbot co the giup",
            "🤖 Mình hỗ trợ hướng dẫn sử dụng hệ thống và học tiếng Anh.\n1. Chọn câu hỏi gợi ý hoặc nhập câu hỏi cụ thể.\n2. Mở Lịch sử để tiếp tục cuộc trò chuyện cũ.\n3. Khi đang làm bài, trợ lý tạm dừng để bạn tập trung.\nBạn không nên gửi mật khẩu, thông tin riêng tư hay dữ liệu của người khác nhé."),
        A("login", "*", "Tôi gặp lỗi đăng nhập thì làm gì?", "dang nhap|khong vao duoc tai khoan|quen mat khau|khoa tai khoan",
            "🔐 Bạn thử lần lượt:\n1. Kiểm tra email và mật khẩu, phím Caps Lock và khoảng trắng.\n2. Nếu báo thử quá nhiều lần, chờ tối đa 5 phút rồi thử lại một lần.\n3. Nếu quên mật khẩu hoặc tài khoản bị vô hiệu hóa, liên hệ quản trị viên/trung tâm để xác minh và hỗ trợ.\nKhông gửi mật khẩu cho chatbot hoặc người khác."),
        A("privacy", "*", "Lịch sử trò chuyện của tôi có riêng tư không?", "lich su tro chuyen|xoa hoi thoai|bao mat chatbot|rieng tu",
            "🛡️ Lịch sử được lưu theo tài khoản, chỉ tài khoản đó đọc và xóa qua chatbot.\n1. Mở Lịch sử để xem lại.\n2. Chọn cuộc trò chuyện rồi bấm biểu tượng thùng rác để xóa.\n3. Câu hỏi cần AI sẽ được gửi đến dịch vụ AI, cùng một phần ngữ cảnh gần đây đã lọc.\nĐừng nhập thông tin nhạy cảm; AI có thể nhầm, hãy đối chiếu với giáo viên khi cần."),
        A("exam-block", "*", "Vì sao chatbot tắt khi đang làm bài?", "chatbot khi thi|chatbot bi an|chatbot bi tat|dang lam bai|gian lan",
            "✍️ Trợ lý tạm dừng khi học sinh mở bài làm để bảo đảm tính công bằng. Việc chặn áp dụng cả tab khác và lịch sử chat. Sau khi nộp bài thành công hoặc hết thời gian làm bài, bạn có thể hỏi tiếp. Nếu thoát trang mà chưa nộp, thời gian chặn vẫn giữ đến khi hết giờ. Cố gắng tự làm trước nhé!"),
        A("notifications", "*", "Tôi xem thông báo ở đâu?", "xem thong bao|khong nhan thong bao|thong bao moi",
            "🔔 Mở biểu tượng thông báo trong hệ thống để xem nội dung gửi đến bạn. Nếu chưa có thông báo, kiểm tra lại tài khoản/vai trò và tải lại trang. Nội dung theo lớp chỉ xuất hiện khi bạn thuộc đúng lớp hoặc nhóm người nhận."),
        A("messages", "*", "Làm sao liên hệ giáo viên hoặc trung tâm?", "lien he giao vien|nhan tin|gui tin nhan|lien he trung tam",
            "💬 Vào mục Tin nhắn của tài khoản, chọn cuộc hội thoại/người nhận được hệ thống cho phép rồi gửi nội dung. Nêu rõ lớp, bài học và vấn đề cần hỗ trợ. Với việc đổi điểm, sửa chuyên cần hay cấp lại mật khẩu, cần giáo viên hoặc quản trị viên xác minh."),
        A("support", "*", "Trang không tải được dữ liệu thì làm gì?", "khong tai duoc|loi he thong|khong co du lieu|trang trang|loi 500|loi 403",
            "🛠️ Bạn thử:\n1. Kiểm tra kết nối và tải lại trang một lần.\n2. Kiểm tra bộ lọc, lớp/khóa học và tài khoản đang dùng.\n3. Nếu báo không có quyền, liên hệ quản trị viên; không dùng tài khoản người khác.\n4. Nếu vẫn lỗi, gửi tên màn hình và thời điểm xảy ra cho trung tâm, che thông tin riêng tư trong ảnh."),
        A("admin-permissions", "Admin", "Làm sao thiết lập phân quyền?", "phan quyen|vai tro|quyen truy cap",
            "1. Vào Quản lý chức năng, chọn vai trò cần cấu hình.\n2. Kiểm tra quyền xem trang và quyền thao tác riêng như thêm/sửa/xóa.\n3. Lưu thay đổi; người dùng bấm Làm mới quyền hoặc đăng nhập lại.\n🛡️ Chỉ cấp quyền cần thiết và kiểm tra bằng đúng vai trò sau khi thay đổi.", "/admin/functions"),
        A("admin-users", "Admin", "Làm sao tạo tài khoản người dùng?", "tao tai khoan|them nguoi dung|quan ly nguoi dung|khoa nguoi dung",
            "1. Mở Quản lý người dùng → thêm người dùng.\n2. Nhập họ tên, email/tên đăng nhập, mật khẩu và vai trò phù hợp.\n3. Kiểm tra hồ sơ giáo viên/học sinh/phụ huynh và liên kết cần thiết.\n4. Kiểm tra trạng thái hoạt động; cung cấp thông tin đăng nhập qua kênh riêng an toàn.", "/admin/users"),
        A("admin-class", "Admin", "Làm sao tạo lớp và xếp học sinh vào lớp?", "tao lop|them lop|xep hoc sinh|gan hoc sinh|quan ly lop",
            "1. Vào Quản lý lớp học, tạo lớp với tên và sĩ số phù hợp.\n2. Liên kết khóa học, phân công giáo viên theo chức năng hiện có.\n3. Vào Gán học sinh để chọn đúng lớp và học sinh.\n4. Kiểm tra ngày tham gia, trạng thái và sĩ số trước khi lưu.", "/admin/classes"),
        A("admin-schedule", "Admin", "Cách thiết lập lịch học và xử lý trùng lịch?", "xep lich|tao lich|trung lich|lich hoc",
            "📅 Vào Lịch dạy và học.\n1. Chọn lớp, giáo viên, phòng và tiết học.\n2. Kiểm tra khoảng thời gian, ngày bắt đầu/kết thúc.\n3. Xử lý các cảnh báo trùng giáo viên, lớp hoặc phòng trước khi lưu.\nNếu lịch cần đổi, kiểm tra các yêu cầu thay đổi để xử lý đúng lớp.", "/admin/schedules"),
        A("admin-bank", "Admin", "Tạo ngân hàng đề và duyệt bài tập thế nào?", "ngan hang de|duyet bai|nhap cau hoi|tao cau hoi",
            "1. Vào Quản lý bài tập và đề thi → Quản lý ngân hàng đề.\n2. Tạo/chọn ngân hàng, khai báo trình độ, mức độ, kỹ năng và Unit.\n3. Thêm bài tập con, nội dung câu hỏi, đáp án, giải thích và điểm.\n4. Kiểm tra nội dung rồi duyệt. Chỉ bài đã duyệt mới dùng để sinh đề.\n✅ Xem trước để tránh thiếu đáp án hoặc sai dạng câu hỏi.", "/admin/exams"),
        A("admin-generate", "Admin", "Quy tắc sinh đề tự động là gì?", "sinh de|de ngau nhien|cau truc de",
            "1. Chọn ngân hàng đề có dữ liệu đã duyệt.\n2. Chọn dạng bài, số lượng và các tiêu chí trình độ/kỹ năng/mức độ.\n3. Nếu thiếu nguồn phù hợp, bổ sung và duyệt bài hoặc giảm số lượng yêu cầu.\n4. Xem trước đề được sinh, kiểm tra điểm và thời lượng rồi mới giao lớp.\nChatbot không cung cấp đáp án của đề đang thi.", "/admin/exams"),
        A("admin-distribute", "Admin", "Làm sao giao bài tập hoặc đề thi cho lớp?", "giao bai|giao de|han nop|so lan nop",
            "1. Vào Quản lý & giao bài tập/đề thi, chọn bài đã chuẩn bị.\n2. Chọn lớp/người nhận, thời gian mở, hạn nộp và số lần làm được phép.\n3. Kiểm tra tùy chọn cho xem đáp án sau nộp.\n4. Lưu và kiểm tra danh sách đã giao. Học sinh chỉ thấy bài được giao trong phạm vi của mình.", "/admin/exams"),
        A("admin-reports", "Admin", "Tôi xem số liệu tổng quan ở đâu?", "so lieu tong quan|bao cao|thong ke",
            "📊 Vào Báo cáo và thống kê để chọn khoảng thời gian, khóa học/lớp và xem số liệu tương ứng. Bạn cũng có thể hỏi “Tổng quan hệ thống hiện tại” để nhận các số đếm được tài khoản cho phép tra cứu. Chatbot không tự suy ra doanh thu hay điểm trung bình khi chưa có dữ liệu phù hợp.", "/admin/reports"),
        A("admin-course", "Admin", "Cách quản lý khóa học và học phí?", "khoa hoc|hoc phi|hoc phi bao nhieu|thanh toan",
            "Vào Quản lý khóa học để kiểm tra tên, mô tả, giá cơ bản và trạng thái khóa học. Giá cơ bản không đồng nghĩa số tiền thực thu sau ưu đãi/điều chỉnh. Khi xác nhận học phí hoặc hoàn tiền, đối chiếu quy định chính thức và bộ phận phụ trách; chatbot không tạo giao dịch.", "/admin/courses"),
        A("teacher-classes", "Giao_Vien", "Tôi xem các lớp được phân công ở đâu?", "lop cua toi|lop duoc phan cong|danh sach lop|hoc sinh cua lop",
            "Vào Lớp học để xem các lớp được phân công. Chọn một lớp để xem thông tin được cấp quyền. Nếu thiếu lớp, kiểm tra tài khoản và nhờ Admin kiểm tra phân công giáo viên, thời gian tham gia và trạng thái lớp.", "/teacher/classes"),
        A("teacher-exercises", "Giao_Vien", "Tôi quản lý bài tập và đề thi thế nào?", "tao bai|giao bai|bai tap|de thi|sinh de",
            "1. Mở Bài tập/Đề thi hoặc Nội dung học tập của lớp.\n2. Chọn lớp đúng phạm vi phân công và chức năng đang được cấp quyền.\n3. Kiểm tra nội dung, đáp án, thời lượng và điểm trước khi giao.\n4. Với sinh đề, chỉ dùng nguồn đã duyệt và đủ số lượng theo cấu trúc.\nNếu không thấy nút thao tác, nhờ Admin kiểm tra quyền.", "/teacher/exams"),
        A("teacher-score", "Giao_Vien", "Điểm tự động và điểm tự luận được tính thế nào?", "tinh diem|cham diem|tu luan|diem tu dong|nhan xet ai",
            "1. Câu khách quan được đối chiếu đáp án và điểm của từng câu.\n2. Câu tự luận/câu cần đánh giá thủ công có thể ở trạng thái chờ chấm.\n3. Nhận xét AI hỗ trợ phân tích bài làm, không thay thế xác nhận chuyên môn của giáo viên.\n4. Kiểm tra cấu hình đề và kết quả thực tế; không áp một thang điểm chung cho mọi đề.", "/teacher/reports"),
        A("teacher-attendance", "Giao_Vien", "Điểm danh và sửa chuyên cần thế nào?", "diem danh|chuyen can|vang hoc|di muon",
            "1. Mở Điểm danh, chọn lớp và buổi học được phân công.\n2. Kiểm tra danh sách rồi đánh dấu đúng trạng thái từng học sinh.\n3. Ghi chú khi cần và lưu thay đổi.\n4. Nếu thiếu buổi học hoặc không sửa được, liên hệ Admin để kiểm tra lịch và quyền.", "/teacher/attendance"),
        A("teacher-schedule", "Giao_Vien", "Làm sao xem lịch dạy hoặc xin đổi lịch?", "lich day|lich hoc|doi lich|nghi day",
            "📅 Vào Lịch dạy để chọn ngày/tuần và kiểm tra lớp, phòng, tiết học. Dùng chức năng yêu cầu thay đổi lịch nếu có quyền; ghi rõ buổi cần đổi và lý do. Chờ người có thẩm quyền xử lý trước khi thông báo lịch mới cho lớp.", "/teacher/schedule"),
        A("teacher-content", "Giao_Vien", "Tôi đăng tài liệu học tập cho lớp thế nào?", "tai lieu|hoc lieu|noi dung hoc tap|tai file",
            "1. Vào Nội dung học tập, chọn lớp và chương/bài học.\n2. Thêm học liệu theo các định dạng và giới hạn mà màn hình cho phép.\n3. Kiểm tra tệp trước khi tải lên và xem lại sau khi lưu.\n4. Chỉ chia sẻ tài liệu phù hợp, có quyền sử dụng và không chứa thông tin riêng tư.", "/teacher/content"),
        A("student-schedule", "Hoc_Sinh", "Tôi xem lịch học của mình ở đâu?", "lich hoc|gio hoc|phong hoc|hom nay hoc",
            "📅 Vào Lịch học, chọn ngày/tuần để xem lớp, giờ học, phòng và giáo viên. Nếu lịch trống, kiểm tra bộ lọc và nhờ trung tâm kiểm tra việc xếp lớp. Nếu cần nghỉ/đổi buổi, nhắn giáo viên hoặc trung tâm; chatbot không tự đổi lịch.", "/student/schedule"),
        A("student-homework", "Hoc_Sinh", "Tôi bắt đầu và nộp bài tập thế nào?", "lam bai|nop bai|bai tap|han nop|so lan lam",
            "1. Vào danh sách Bài tập/Đề thi, chọn bài được giao.\n2. Đọc hạn nộp, thời lượng và số lượt còn lại trước khi bắt đầu.\n3. Làm bài, kiểm tra các câu đã đánh dấu rồi xác nhận nộp.\n4. Nộp thành công thì xem kết quả; câu tự luận có thể chờ giáo viên chấm.\n✍️ Chatbot tạm dừng trong lúc bạn làm bài. Chúc bạn tự tin!", "/student/homework-list"),
        A("student-result", "Hoc_Sinh", "Tôi xem điểm, đáp án và nhận xét ở đâu?", "xem diem|ket qua|dap an|nhan xet|bao cao|chua co diem",
            "📊 Vào Báo cáo hoặc mở bài đã nộp để xem kết quả gần nhất.\n1. Câu tự luận có thể chờ chấm; nhận xét AI có thể đang xử lý.\n2. Đáp án/giải thích chỉ hiện khi bài được cấu hình cho phép xem.\n3. Nếu thấy điểm chưa đúng, gửi thông tin bài cho giáo viên kiểm tra.\nMỗi lần sửa được một lỗi là một bước tiến nhé!", "/student/reports"),
        A("student-content", "Hoc_Sinh", "Tìm tài liệu và bài học của lớp ở đâu?", "tai lieu|bai hoc|hoc lieu|noi dung hoc tap",
            "Vào Nội dung học tập của bạn, chọn đúng lớp và chương/bài học để mở học liệu. Nếu không có nội dung, có thể lớp chưa có học liệu hoặc bạn chưa được xếp lớp phù hợp. Hãy hỏi giáo viên để được hướng dẫn.", "/student/homework"),
        A("parent-reports", "Phu_Huynh", "Tôi xem điểm và tiến bộ của con thế nào?", "diem cua con|xem diem|bao cao|tien bo|ket qua hoc",
            "1. Vào Báo cáo học tập và chọn hồ sơ con được liên kết với tài khoản.\n2. Xem điểm, nhận xét và khoảng thời gian tương ứng.\n3. Kết quả chờ chấm/AI đang xử lý chưa phải kết quả hoàn chỉnh.\n4. Trao đổi với giáo viên nếu cần xác minh.\n🌱 Động viên sự tiến bộ nhỏ mỗi ngày sẽ giúp con học tự tin hơn.", "/parent/reports"),
        A("parent-attendance", "Phu_Huynh", "Tôi kiểm tra chuyên cần của con ở đâu?", "chuyen can|diem danh|vang hoc|nghi hoc|di muon",
            "Vào Chuyên cần/Điểm danh, chọn đúng con và thời gian để xem trạng thái từng buổi. Nếu thông tin chưa đúng, liên hệ giáo viên hoặc trung tâm kèm ngày/buổi học. Chatbot không tự sửa bản ghi điểm danh.", "/parent/attendance"),
        A("parent-schedule", "Phu_Huynh", "Tôi xem lịch học của con thế nào?", "lich hoc|lich cua con|gio hoc|phong hoc",
            "📅 Vào Lịch học, chọn con được liên kết và ngày/tuần cần xem. Kiểm tra lớp, buổi và phòng học trước khi đưa đón. Chỉ lịch đã được trung tâm cập nhật mới là căn cứ chính thức.", "/parent/schedule"),
        A("parent-link", "Phu_Huynh", "Không thấy hồ sơ của con thì làm gì?", "khong thay con|lien ket con|them con|ho so con",
            "1. Kiểm tra tài khoản phụ huynh đang đăng nhập.\n2. Nhờ trung tâm xác minh và liên kết đúng hồ sơ con.\n3. Tải lại trang sau khi được cập nhật.\n🛡️ Chatbot không tự liên kết học sinh theo tên/email, cũng không cung cấp thông tin trẻ chưa được gắn với tài khoản."),
        A("fees", "Giao_Vien|Hoc_Sinh|Phu_Huynh", "Học phí, nghỉ học và hoàn tiền được quy định thế nào?", "hoc phi|hoan tien|bao luu|quy dinh nghi|quy dinh trung tam",
            "Các mức học phí, bảo lưu, nghỉ học và hoàn tiền tùy khóa học/chính sách trung tâm. Mình chưa có văn bản chính thức để xác nhận con số hoặc điều kiện cụ thể. Bạn hãy liên hệ trung tâm và nêu khóa học/vấn đề cần kiểm tra; không gửi thông tin thanh toán nhạy cảm trong chat."),
        A("present-simple", "*", "Giải thích thì hiện tại đơn", "hien tai don|present simple",
            "📘 Hiện tại đơn dùng cho thói quen và sự thật chung.\n1. Khẳng định: I/You/We/They + V; He/She/It + V-s/es.\n2. Phủ định: do/does not + V nguyên mẫu.\n3. Câu hỏi: Do/Does + chủ ngữ + V?\nVí dụ: She studies English every day. → Does she study English every day?\nBạn thử viết một câu về thói quen của mình nhé!"),
        A("past-simple", "*", "Giải thích thì quá khứ đơn", "qua khu don|past simple",
            "📘 Quá khứ đơn nói về việc đã kết thúc trong quá khứ.\n1. Khẳng định: chủ ngữ + V-ed hoặc dạng quá khứ bất quy tắc.\n2. Phủ định: chủ ngữ + did not + V nguyên mẫu.\n3. Câu hỏi: Did + chủ ngữ + V?\nVí dụ: I visited my friend yesterday. / She went home.\nVới động từ be dùng was/were. Bạn thử đặt một câu với yesterday nhé!"),
        A("present-perfect", "*", "Phân biệt hiện tại hoàn thành và quá khứ đơn", "hien tai hoan thanh|present perfect",
            "1. Hiện tại hoàn thành: have/has + V3; nhấn mạnh trải nghiệm/kết quả liên quan hiện tại, không gắn một thời điểm quá khứ đã kết thúc cụ thể. Ví dụ: I have lost my key.\n2. Quá khứ đơn: nói việc đã xong ở mốc quá khứ. Ví dụ: I lost my key yesterday.\n💡 Gặp yesterday/last week thường nghĩ đến quá khứ đơn, nhưng hãy đọc cả ngữ cảnh."),
        A("vocabulary", "*", "Làm sao nhớ từ vựng lâu hơn?", "hoc tu vung|nho tu vung|on tu vung",
            "🌱 Thử cách này trong 15 phút/ngày:\n1. Chọn 5–8 từ theo một chủ đề, đọc phát âm và nghĩa trong ngữ cảnh.\n2. Viết một câu về chính mình với mỗi từ.\n3. Tự nhớ lại thay vì chỉ nhìn đáp án; ôn sau 1, 3 và 7 ngày.\n4. Dùng lại từ khi nói hoặc viết.\nĐều đặn một chút mỗi ngày sẽ hiệu quả hơn học dồn!"),
        A("study-plan", "*", "Gợi ý kế hoạch tự học tiếng Anh", "ke hoach hoc|lo trinh hoc|tu hoc tieng anh|hoc tieng anh moi ngay",
            "🎯 Lịch 30 phút/ngày để bắt đầu:\n1. 5 phút ôn từ cũ.\n2. 10 phút nghe/đọc đoạn ngắn phù hợp trình độ.\n3. 10 phút viết hoặc nói lại ý chính bằng câu của bạn.\n4. 5 phút ghi một lỗi và sửa.\nDuy trì 5 ngày/tuần và tự đánh giá cuối tuần. Bạn có thể cho biết trình độ và mục tiêu để mình gợi ý sát hơn."),
        A("listening", "*", "Luyện nghe tiếng Anh thế nào?", "luyen nghe|nghe tieng anh|listening",
            "🎧 Chọn đoạn nghe ngắn, vừa sức:\n1. Nghe lần đầu để nắm ý chính.\n2. Nghe lại và ghi từ khóa.\n3. Đối chiếu bản chép lời, tìm chỗ nghe chưa ra.\n4. Nghe rồi nhắc lại từng câu ngắn.\nKhông cần hiểu mọi từ ngay từ đầu; hãy tăng độ khó dần nhé!"),
        A("reading", "*", "Làm bài đọc hiểu hiệu quả hơn thế nào?", "doc hieu|reading|ky nang doc",
            "1. Đọc nhanh tiêu đề và ý chính.\n2. Xem câu hỏi, đánh dấu từ khóa rồi tìm bằng chứng trong bài.\n3. Đọc kỹ câu chứa thông tin và câu trước/sau để tránh hiểu thiếu.\n4. Với từ mới, đoán theo ngữ cảnh trước khi tra từ điển.\n📖 Tập giải thích vì sao chọn đáp án để tự kiểm tra cách hiểu của mình."),
        A("motivation", "*", "Tôi học mãi chưa tiến bộ, nên làm gì?", "mat dong luc|chan hoc|khong tien bo|hoc mai|so sai",
            "🌱 Chậm một chút không có nghĩa là bạn không tiến bộ.\n1. Chọn một mục tiêu nhỏ cho tuần này, như nói được 5 câu về bản thân.\n2. Ghi lại lỗi thường gặp và sửa từng lỗi.\n3. So sánh với bài làm của chính mình trước đây.\n4. Hỏi giáo viên khi bị mắc ở một điểm quá lâu.\nBạn không cần hoàn hảo để bắt đầu. Mình tin sự đều đặn sẽ giúp bạn tốt lên!"),
];
