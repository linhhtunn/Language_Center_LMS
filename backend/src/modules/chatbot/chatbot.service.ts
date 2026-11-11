// Chuyen tu Services/Chatbot/ChatbotService.cs.
import { createHash, randomUUID } from 'node:crypto';
import { prisma } from '../../db.js';
import { isChatbotBlocked } from '../../shared/chatbotExamGuard.js';
import { Find, HasSensitiveContent, Normalize, Roles, type ChatbotLink, type ChatbotReply } from './knowledge.js';
import { ChatbotException, ChatbotTimeoutError, chatbotSettings, getChatbotLlmClient } from './llm.js';
import * as runtime from './runtime.js';

export interface ChatbotThreadDto {
  id: string;
  title: string;
  createdAtUtc: Date | string;
  updatedAtUtc: Date | string;
}

export interface ChatbotMessageDto {
  id: string;
  role: string;
  content: string;
  source: string;
  createdAtUtc: Date | string;
}

interface MessageRow {
  Id: string;
  ThreadId: string;
  RequestId: string;
  Role: string;
  Content: string;
  Source: string;
  CreatedAtUtc: Date;
}

// EF dich `x.DaXoa != true` thanh (DaXoa IS NULL OR DaXoa = 0); Prisma `not` bo qua NULL nen phai ghi ro.
const nt = (f: string) => ({ OR: [{ [f]: null }, { [f]: false }] });
const nf = (f: string) => ({ OR: [{ [f]: null }, { [f]: true }] });

const rateLimit = () => new ChatbotException(429, 'CHATBOT_RATE_LIMIT', 'Bạn gửi hơi nhanh. Vui lòng chờ khoảng một phút rồi tiếp tục nhé.');
const busy = () => new ChatbotException(409, 'CHATBOT_BUSY', 'Mình đang xử lý câu hỏi trước. Bạn đợi phản hồi rồi tiếp tục nhé.');
/**
 * DateTime.UtcNow (Kind=Utc) vua tao trong bo nho -> System.Text.Json ghi kem "Z" va bo so 0 thua o phan le giay;
 * doc lai tu DB (Kind=Unspecified) thi khong co Z (replacer chung cua app lo phan nay).
 */
export const utcJson = (d: Date) => d.toISOString().replace(/0+Z$/, 'Z').replace(/\.Z$/, 'Z');

/** Tin nhan vua tao trong request nay (ngay gio dang UTC). */
const freshDto = (x: MessageRow): ChatbotMessageDto => ({ ...dto(x), createdAtUtc: utcJson(x.CreatedAtUtc) });

const dto = (x: MessageRow): ChatbotMessageDto => ({ id: x.Id, role: x.Role, content: x.Content, source: x.Source, createdAtUtc: x.CreatedAtUtc });

export async function ensureAccess(userId: string, role: string, checkExam = true): Promise<void> {
  const allowed =
    Roles.includes(role) &&
    (await prisma.nguoidung.count({ where: { MaNguoiDung: userId, AND: [nt("DaXoa"), nf("TrangThai")] } })) > 0 &&
    (await prisma.nguoidungvaitro.count({
      where: {
        MaNguoiDung: userId,
        AND: [nt("DaXoa"), nf("TrangThai")],
        vaitro: { TenVaiTro: role, AND: [nt("DaXoa"), nf("TrangThai")] },
      },
    })) > 0;
  if (!allowed) throw new ChatbotException(403, 'CHATBOT_NOT_ALLOWED', 'Tài khoản không có quyền sử dụng trợ lý.');
  if (checkExam && role === 'Hoc_Sinh' && (await isChatbotBlocked(userId)))
    throw new ChatbotException(409, 'CHATBOT_EXAM_ACTIVE', 'Trợ lý tạm dừng trong lúc làm bài. Bạn hãy nộp bài hoặc chờ hết thời gian làm bài rồi quay lại nhé. ✍️');
}

export async function list(userId: string, skip: number): Promise<ChatbotThreadDto[]> {
  const rows = await prisma.chatbot_threads.findMany({
    where: { UserId: userId },
    orderBy: [{ UpdatedAtUtc: 'desc' }, { Id: 'asc' }],
    skip: Math.max(skip, 0),
    take: 30,
  });
  return rows.map((x) => ({ id: x.Id, title: x.Title, createdAtUtc: x.CreatedAtUtc, updatedAtUtc: x.UpdatedAtUtc }));
}

export async function create(userId: string): Promise<ChatbotThreadDto> {
  if (!runtime.allowMessage(userId)) throw rateLimit();
  if ((await prisma.chatbot_threads.count({ where: { UserId: userId } })) >= 200)
    throw new ChatbotException(409, 'CHATBOT_THREAD_LIMIT', 'Bạn đã có 200 hội thoại. Hãy xóa bớt hội thoại cũ trước khi tạo mới.');
  const now = new Date();
  const row = await prisma.chatbot_threads.create({
    data: { Id: randomUUID(), UserId: userId, Title: 'Cuộc trò chuyện mới', CreatedAtUtc: now, UpdatedAtUtc: now },
  });
  return { id: row.Id, title: row.Title, createdAtUtc: utcJson(now), updatedAtUtc: utcJson(now) };
}

async function owned(userId: string, threadId: string) {
  const row = await prisma.chatbot_threads.findFirst({ where: { Id: threadId, UserId: userId } });
  if (!row) throw new ChatbotException(404, 'CHATBOT_THREAD_NOT_FOUND', 'Không tìm thấy cuộc trò chuyện.');
  return row;
}

export async function messages(userId: string, threadId: string): Promise<ChatbotMessageDto[]> {
  await owned(userId, threadId);
  const rows = await prisma.chatbot_messages.findMany({
    where: { ThreadId: threadId },
    orderBy: [{ CreatedAtUtc: 'asc' }, { Id: 'asc' }],
    take: 200,
  });
  return rows.map(dto);
}

export async function remove(userId: string, threadId: string): Promise<void> {
  if (!runtime.tryEnter(userId)) throw busy();
  try {
    const row = await owned(userId, threadId);
    await prisma.chatbot_threads.delete({ where: { Id: row.Id } }); // tin nhan xoa theo ON DELETE CASCADE
  } finally {
    runtime.exit(userId);
  }
}

export async function send(
  userId: string,
  role: string,
  threadId: string,
  request: { requestId: string; message: string },
  signal?: AbortSignal,
): Promise<{ messages: ChatbotMessageDto[]; links: ChatbotLink[] }> {
  const question = request.message.trim();
  if (question.length < 1 || question.length > 1200 || request.requestId === '00000000-0000-0000-0000-000000000000')
    throw new ChatbotException(400, 'CHATBOT_INVALID_INPUT', 'Nhập câu hỏi từ 1 đến 1.200 ký tự.');
  if (!runtime.tryEnter(userId)) throw busy();
  try {
    await ensureAccess(userId, role);
    const thread = await owned(userId, threadId);
    const previous = await prisma.chatbot_messages.findMany({ where: { ThreadId: threadId, RequestId: request.requestId } });
    if (previous.length > 0) {
      const users = previous.filter((x) => x.Role === 'user');
      if (users.length !== 1) throw new Error('Sequence contains no matching element'); // .Single() cua C#
      if (users[0].Content !== question)
        throw new ChatbotException(409, 'CHATBOT_REQUEST_CONFLICT', 'Mã gửi tin đã được sử dụng. Hãy gửi câu hỏi mới.');
      return { messages: [...previous].sort((a, b) => a.CreatedAtUtc.getTime() - b.CreatedAtUtc.getTime()).map(dto), links: [] };
    }
    if (!runtime.allowMessage(userId)) throw rateLimit();
    if ((await prisma.chatbot_messages.count({ where: { ThreadId: threadId } })) >= 200)
      throw new ChatbotException(409, 'CHATBOT_MESSAGE_LIMIT', 'Hội thoại đã đủ 100 lượt hỏi đáp. Bạn tạo cuộc trò chuyện mới để tiếp tục nhé.');

    let reply: ChatbotReply | null = Find(question, role);
    // Du lieu van hanh tinh san khong bao gio roi server de gui cho LLM.
    if (isSummary(question)) reply = await summary(userId, role);
    reply ??= HasSensitiveContent(question)
      ? {
          text: '🛡️ Mình không tiếp nhận hay cung cấp bí mật hệ thống và thông tin riêng tư của người khác. Bạn đừng gửi mật khẩu, API key, số điện thoại hoặc email trong chat. Hãy hỏi cách sử dụng chức năng hoặc kiến thức tiếng Anh nhé.',
          source: 'safety',
        }
      : null;

    if (reply == null) {
      const history = (
        await prisma.chatbot_messages.findMany({ where: { ThreadId: threadId }, orderBy: { CreatedAtUtc: 'desc' }, take: 6 })
      ).reverse();
      // Convert.ToHexString -> HEX chu HOA; Guid.ToString() -> chu thuong.
      const cacheKey = createHash('sha256')
        .update(userId.toLowerCase() + '|' + role + '|' + history.map((x) => x.Role + ':' + x.Content).join('|') + '|' + question, 'utf8')
        .digest('hex')
        .toUpperCase();
      const hit = runtime.cached(cacheKey);
      if (hit != null) reply = { text: hit, source: 'cache' };
      else {
        await reserveAi(userId);
        try {
          const generated = await getChatbotLlmClient().generate(role, history, question, signal);
          reply = { text: generated.text, source: 'ai' };
          runtime.cacheReply(cacheKey, generated.text);
        } catch (err) {
          if (err instanceof ChatbotException) throw err;
          if (err instanceof ChatbotTimeoutError)
            throw new ChatbotException(503, 'CHATBOT_AI_TIMEOUT', 'AI phản hồi chậm. Bạn thử lại sau hoặc chọn câu hỏi hướng dẫn có sẵn nhé.');
          if (signal?.aborted) throw err;
          console.warn(`Chatbot provider failed (${(err as Error)?.constructor?.name ?? 'Error'})`);
          throw new ChatbotException(503, 'CHATBOT_AI_UNAVAILABLE', 'AI tạm thời chưa sẵn sàng. Các câu hỏi hướng dẫn có sẵn vẫn dùng được.');
        }
      }
    }
    // Co the bai kiem tra vua bat dau o tab khac trong luc AI dang tra loi.
    await ensureAccess(userId, role);
    const now = new Date();
    const userMessage: MessageRow = { Id: randomUUID(), ThreadId: threadId, RequestId: request.requestId, Role: 'user', Content: question, Source: 'user', CreatedAtUtc: now };
    const botMessage: MessageRow = {
      Id: randomUUID(),
      ThreadId: threadId,
      RequestId: request.requestId,
      Role: 'assistant',
      Content: reply.text,
      Source: reply.source,
      CreatedAtUtc: new Date(now.getTime() + 1),
    };
    const isFirst = (await prisma.chatbot_messages.count({ where: { ThreadId: threadId } })) === 0;
    // Ca 2 tin nhan + cap nhat hoi thoai ghi trong 1 transaction (nhu SaveChangesAsync).
    await prisma.$transaction([
      prisma.chatbot_messages.createMany({ data: [userMessage, botMessage] }),
      prisma.chatbot_threads.update({
        where: { Id: thread.Id },
        data: { UpdatedAtUtc: now, ...(isFirst ? { Title: question.slice(0, Math.min(100, question.length)) } : {}) },
      }),
    ]);
    return { messages: [freshDto(userMessage), freshDto(botMessage)], links: reply.links ?? [] };
  } finally {
    runtime.exit(userId);
  }
}

async function reserveAi(userId: string): Promise<void> {
  await runtime.budgetLock.run(async () => {
    const now = new Date();
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const usage = await prisma.chatbot_ai_usage.findUnique({ where: { UserId_DayUtc: { UserId: userId, DayUtc: day } } });
    const userLimit = chatbotSettings.dailyAiRequestsPerUser();
    const totalLimit = chatbotSettings.dailyAiRequestsTotal();
    const total = (await prisma.chatbot_ai_usage.aggregate({ where: { DayUtc: day }, _sum: { Requests: true } }))._sum.Requests ?? 0;
    if ((usage?.Requests ?? 0) >= userLimit || total >= totalLimit)
      throw new ChatbotException(429, 'CHATBOT_DAILY_LIMIT', 'Đã đạt lượt hỏi AI hôm nay. Bạn vẫn có thể dùng các câu hỏi hướng dẫn có sẵn và quay lại hỏi AI vào ngày mai. 🌱');
    // Giu cho truoc khi goi nha cung cap, tinh ca lan goi loi/bi huy.
    if (!usage) await prisma.chatbot_ai_usage.create({ data: { UserId: userId, DayUtc: day, Requests: 1 } });
    else await prisma.chatbot_ai_usage.update({ where: { UserId_DayUtc: { UserId: userId, DayUtc: day } }, data: { Requests: usage.Requests + 1 } });
  });
}

const SUMMARY_QUESTIONS = ['tong quan he thong hien tai', 'so lieu he thong hien tai', 'tong quan cua toi', 'tinh hinh hoc tap cua toi', 'tinh hinh hoc tap cua con', 'thong ke cua toi'];
export function isSummary(question: string): boolean {
  return SUMMARY_QUESTIONS.includes(Normalize(question));
}

async function summary(userId: string, role: string): Promise<ChatbotReply> {
  if (role === 'Admin') {
    // Join nguoidungvaitro -> vaitroquyen -> quyen (khong loc DaXoa cua quyen, giong ban .NET).
    const permitted = (
      await prisma.$queryRaw<{ TenQuyen: string }[]>`
        SELECT p.TenQuyen FROM nguoidungvaitro u
        JOIN vaitroquyen r ON u.MaVaiTro = r.MaVaiTro
        JOIN quyen p ON r.MaQuyen = p.MaQuyen
        WHERE u.MaNguoiDung = ${userId} AND (u.DaXoa IS NULL OR u.DaXoa <> 1) AND (u.TrangThai IS NULL OR u.TrangThai <> 0)
          AND (r.DaXoa IS NULL OR r.DaXoa <> 1)`
    ).map((x) => x.TenQuyen);
    const lines: string[] = [];
    if (permitted.includes('PAGE_ADMIN_USERS_VIEW'))
      lines.push(`Người dùng hoạt động: ${await prisma.nguoidung.count({ where: { AND: [nt("DaXoa"), nf("TrangThai")] } })}.`);
    if (permitted.includes('PAGE_ADMIN_CLASSES_VIEW'))
      lines.push(`Lớp học hoạt động: ${await prisma.lophoc.count({ where: { AND: [nt("DaXoa"), nf("TrangThai")] } })}.`);
    if (permitted.includes('ASSIGNMENTS_ADMIN_VIEW')) {
      lines.push(`Ngân hàng đề chưa xóa: ${await prisma.nganhangde.count({ where: { DaXoa: false } })}.`);
      lines.push(`Bài tập/đề đã tạo chưa xóa: ${await prisma.baitap.count({ where: { LaMauNganHang: false, ...nt("DaXoa") } })}.`);
    }
    return {
      text: lines.length === 0 ? 'Tài khoản hiện chưa có quyền xem các số liệu này.' : '📊 Số liệu tại thời điểm tra cứu:\n' + lines.map((x, i) => `${i + 1}. ${x}`).join('\n'),
      source: 'data',
    };
  }
  if (role === 'Giao_Vien') {
    const rows = await prisma.giangvienlophoc.findMany({
      where: {
        AND: [nt("DaXoa"), nf("TrangThai")],
        giangvien: { MaNguoiDung: userId, ...nt("DaXoa") },
        lophoc: { ...nt("DaXoa") },
      },
      select: { MaLopHoc: true },
      distinct: ['MaLopHoc'],
    });
    return {
      text: `📚 Bạn đang được phân công ở ${rows.length} lớp chưa xóa. Mở Lớp học hoặc Báo cáo để xem chi tiết đúng phạm vi được cấp quyền.`,
      source: 'data',
      links: [{ label: 'Lớp học của tôi', path: '/teacher/classes' }],
    };
  }
  const ids =
    role === 'Hoc_Sinh'
      ? (await prisma.hocsinh.findMany({ where: { MaNguoiDung: userId, ...nt("DaXoa") }, select: { MaHocSinh: true } })).map((x) => x.MaHocSinh)
      : (
          await prisma.phuhuynhhocsinh.findMany({
            where: {
              AND: [nt("DaXoa"), nf("TrangThai")],
              phuhuynh: { MaNguoiDung: userId, ...nt("DaXoa") },
              hocsinh: { ...nt("DaXoa") },
            },
            select: { MaHocSinh: true },
          })
        ).map((x) => x.MaHocSinh);
  const submissions = await prisma.nopbai.count({ where: { MaHocSinh: { in: ids }, ...nt("DaXoa"), ThoiGianNop: { not: null } } });
  const attendance = await prisma.diemdanh.count({ where: { MaHocSinh: { in: ids }, ...nt("DaXoa") } });
  const prefix = role === 'Phu_Huynh' ? `Chỉ tính ${ids.length} hồ sơ con đang được liên kết với bạn.` : 'Chỉ tính hồ sơ học sinh của bạn.';
  return {
    text: `📊 ${prefix}\n1. Lượt bài đã nộp: ${submissions}.\n2. Bản ghi điểm danh: ${attendance} (không đồng nghĩa số buổi có mặt).\n3. Mở Báo cáo/Chuyên cần để xem chi tiết từng bài, từng buổi.`,
    source: 'data',
    links: [{ label: 'Xem báo cáo', path: role === 'Hoc_Sinh' ? '/student/reports' : '/parent/reports' }],
  };
}
