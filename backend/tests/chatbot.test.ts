import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { prisma } from '../src/db.js';
import { signAccessToken } from '../src/middlewares/auth.js';
import { FinalizeAnswer, Find, HasSensitiveContent, Normalize, RelevantGuidance, Suggestions, SystemPrompt } from '../src/modules/chatbot/knowledge.js';
import {
  ChatbotClaudeClient,
  ChatbotException,
  ChatbotGeminiClient,
  ChatbotTimeoutError,
  buildClaudeMessages,
  buildGeminiPayload,
  setChatbotLlmClient,
  type ChatbotHistoryMessage,
  type ChatbotLlmClient,
} from '../src/modules/chatbot/llm.js';
import { _resetChatbotRuntime } from '../src/modules/chatbot/runtime.js';
import express from 'express';
import { errorHandler, notFound } from '../src/middlewares/errorHandler.js';
import chatbotRouter from '../src/modules/chatbot/chatbot.routes.js';
import { dotnetJsonReplacer } from '../src/utils/dotnetCompat.js';

// App rut gon giong createApp() (json, replacer ngay gio .NET, errorHandler) nhung chi gan router chatbot,
// de test khong phu thuoc module khac dang duoc chuyen do.
const app = express();
app.set('json replacer', dotnetJsonReplacer);
app.use(express.json({ limit: '250mb' }));
app.use(chatbotRouter);
app.use(notFound);
app.use(errorHandler);

// Ket qua chuan sinh bang cach chay backend.dll goc (.NET 8, container Linux) - xem fixtures/aiFeedback.golden.json.
const golden = JSON.parse(readFileSync(new URL('./fixtures/aiFeedback.golden.json', import.meta.url), 'utf8'));
const IN = golden.input.chatbot;
const OUT = golden.output.chatbot;

describe('ChatbotKnowledge (doi chieu .NET)', () => {
  it('Normalize + HasSensitiveContent', () => {
    IN.texts.forEach((t: string, i: number) => {
      expect(Normalize(t), t).toBe(OUT.normalize[i]);
      expect(HasSensitiveContent(t), t).toBe(OUT.sensitive[i]);
    });
  });
  it('Find / RelevantGuidance / SystemPrompt / Suggestions theo tung vai tro', () => {
    for (const role of IN.roles) {
      IN.texts.forEach((t: string, i: number) => {
        const r = Find(t, role);
        expect(r == null ? null : { text: r.text, source: r.source, links: r.links ?? null }, `${role}: ${t}`).toEqual(OUT.find[role][i]);
        expect(RelevantGuidance(t, role), `${role}: ${t}`).toBe(OUT.guidance[role][i]);
      });
      expect(SystemPrompt(role, RelevantGuidance(IN.texts[0], role))).toBe(OUT.systemPrompt[role]);
      expect(Suggestions(role)).toEqual(OUT.suggestions[role]);
    }
  });
  it('FinalizeAnswer: an bi mat va cat 2400 ky tu', () => {
    IN.finalize.forEach(([a, k]: [string, string], i: number) => expect(FinalizeAnswer(a, k)).toBe(OUT.finalize[i]));
  });
});

describe('Chatbot LLM clients (gia lap HTTP)', () => {
  const saved = { ...config.ai };
  afterAll(() => Object.assign(config.ai, saved));
  const history: ChatbotHistoryMessage[] = [
    { Role: 'assistant', Content: 'Tin dau la assistant -> bo' },
    { Role: 'user', Content: 'Mật khẩu của tôi là 123' }, // nhay cam -> bo
    { Role: 'user', Content: 'x'.repeat(700) },
    { Role: 'assistant', Content: 'Trả lời' },
  ];

  it('Claude: bo tin nhay cam, bat dau bang luot user, cat 600 ky tu', () => {
    expect(buildClaudeMessages(history, 'Q')).toEqual([
      { role: 'user', content: 'x'.repeat(600) },
      { role: 'assistant', content: 'Trả lời' },
      { role: 'user', content: 'Q' },
    ]);
  });

  it('Claude: request (model, max_tokens 4096, effort low, khong retry) va loi API -> 503', async () => {
    config.ai.anthropicApiKey = 'k-test';
    const bodies: any[] = [];
    let n = 0;
    const fakeFetch = (async (_u: unknown, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      n++;
      if (n === 1)
        return new Response(
          JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'x', content: [{ type: 'text', text: '  Câu trả lời  ' }], stop_reason: 'end_turn', usage: { input_tokens: 3, output_tokens: 4 } }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        );
      return new Response('{"type":"error","error":{"type":"overloaded_error","message":"x"}}', { status: 529, headers: { 'content-type': 'application/json' } });
    }) as typeof fetch;
    const client = new ChatbotClaudeClient(fakeFetch);
    const r = await client.generate('Hoc_Sinh', history, 'Giải thích thì hiện tại đơn');
    expect(r).toEqual({ text: 'Câu trả lời', inputTokens: 3, outputTokens: 4 });
    expect(bodies[0]).toEqual({
      model: config.ai.claudeModel,
      max_tokens: 4096,
      system: SystemPrompt('Hoc_Sinh', RelevantGuidance('Giải thích thì hiện tại đơn', 'Hoc_Sinh')),
      messages: buildClaudeMessages(history, 'Giải thích thì hiện tại đơn'),
      output_config: { effort: 'low' },
    });
    await expect(client.generate('Hoc_Sinh', [], 'q')).rejects.toMatchObject({ status: 503, code: 'CHATBOT_AI_UNAVAILABLE' });
    expect(n).toBe(2); // maxRetries = 0
  });

  it('Gemini: payload REST, thinkingLevel low cho gemini-3, bo phan thought', async () => {
    config.ai.geminiApiKey = 'g-test';
    config.ai.geminiModel = 'gemini-3.8-flash';
    const p = buildGeminiPayload('gemini-3.8-flash', 'Admin', history, 'Q');
    expect(p.generationConfig).toEqual({ maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: 'low' } });
    expect(p.contents).toEqual([
      { role: 'model', parts: [{ text: 'Tin dau la assistant -> bo' }] },
      { role: 'user', parts: [{ text: 'x'.repeat(600) }] },
      { role: 'model', parts: [{ text: 'Trả lời' }] },
      { role: 'user', parts: [{ text: 'Q' }] },
    ]);
    expect(buildGeminiPayload('gemini-2.5-flash', 'Admin', [], 'Q').generationConfig).toEqual({ maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } });
    let url = '';
    const client = new ChatbotGeminiClient((async (u: string) => {
      url = u;
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'nghĩ', thought: true }, { text: 'OK' }] } }], usageMetadata: { promptTokenCount: 5, totalTokenCount: 9 } }));
    }) as unknown as typeof fetch);
    expect(await client.generate('Admin', [], 'Q')).toEqual({ text: 'OK', inputTokens: 5, outputTokens: 4 });
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent');
    const bad = new ChatbotGeminiClient((async () => new Response('x', { status: 429 })) as unknown as typeof fetch);
    await expect(bad.generate('Admin', [], 'Q')).rejects.toMatchObject({ status: 503, code: 'CHATBOT_AI_UNAVAILABLE' });
  });
});

// ---------------- HTTP + database ----------------

const tag = `TEST_AI_${Date.now().toString(36)}`;
const users = {
  gv: { id: randomUUID(), role: 'Giao_Vien', roleId: 2 },
  hs: { id: randomUUID(), role: 'Hoc_Sinh', roleId: 3 },
  nr: { id: randomUUID(), role: 'Hoc_Sinh', roleId: 3 }, // khong co vai tro trong DB
};
const tokens: Record<string, string> = {};
const H = (k: keyof typeof users) => ({ Authorization: `Bearer ${tokens[k]}` });

const llmCalls: { role: string; history: ChatbotHistoryMessage[]; question: string }[] = [];
let llmImpl: (q: string) => Promise<string> = async (q) => `AI trả lời: ${q}`;
const mockLlm: ChatbotLlmClient = {
  async generate(role, history, question) {
    llmCalls.push({ role, history: history.map((h) => ({ Role: h.Role, Content: h.Content })), question });
    return { text: await llmImpl(question), inputTokens: 1, outputTokens: 1 };
  },
};

beforeAll(async () => {
  for (const [k, u] of Object.entries(users)) {
    await prisma.nguoidung.create({ data: { MaNguoiDung: u.id, LoaiTaiKhoan: u.roleId, TenDangNhap: `${tag}_${k}`, MatKhauHash: 'x', HoTen: `${tag}_${k}` } });
    if (k !== 'nr') await prisma.nguoidungvaitro.create({ data: { MaNguoiDung: u.id, MaVaiTro: u.roleId } });
    tokens[k] = signAccessToken({ userId: u.id, email: `${tag}_${k}@test.local`, role: u.role, fullName: k, profileId: null });
  }
  setChatbotLlmClient(mockLlm);
});

afterAll(async () => {
  setChatbotLlmClient(null);
  const ids = Object.values(users).map((u) => u.id);
  await prisma.chatbot_threads.deleteMany({ where: { UserId: { in: ids } } });
  await prisma.chatbot_ai_usage.deleteMany({ where: { UserId: { in: ids } } });
  await prisma.chatbot_exam_sessions.deleteMany({ where: { UserId: { in: ids } } });
  await prisma.nguoidungvaitro.deleteMany({ where: { MaNguoiDung: { in: ids } } });
  await prisma.nguoidung.deleteMany({ where: { MaNguoiDung: { in: ids } } });
});

beforeEach(() => {
  _resetChatbotRuntime();
  llmCalls.length = 0;
  llmImpl = async (q) => `AI trả lời: ${q}`;
});

afterEach(() => {
  delete process.env.CHATBOT_DAILY_AI_REQUESTS_PER_USER;
  delete process.env.CHATBOT_DAILY_AI_REQUESTS_TOTAL;
});

async function newThread(k: keyof typeof users): Promise<string> {
  const r = await request(app).post('/api/Chatbot/threads').set(H(k));
  expect(r.status).toBe(200);
  return r.body.data.id;
}
const send = (k: keyof typeof users, th: string, message: unknown, requestId: unknown = randomUUID()) =>
  request(app).post(`/api/Chatbot/threads/${th}/messages`).set(H(k)).send({ requestId, message });

describe('Chatbot API', () => {
  it('status: goi y theo vai tro + thong bao', async () => {
    const r = await request(app).get('/api/Chatbot/status').set(H('gv'));
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ success: true, code: 'SUCCESS', message: 'Thành công' });
    expect(r.body.data).toEqual({
      available: true,
      suggestions: [{ id: 'summary', question: 'Tổng quan của tôi' }, ...OUT.suggestions.Giao_Vien],
      role: 'Giao_Vien',
      notice: 'Lịch sử lưu riêng theo tài khoản. Không gửi thông tin nhạy cảm. Câu hỏi cần AI được gửi đến dịch vụ AI; hãy kiểm tra lại khi cần.',
    });
  });

  it('khong co vai tro trong DB -> 403 CHATBOT_NOT_ALLOWED; chua dang nhap -> 401', async () => {
    const r = await request(app).get('/api/Chatbot/threads').set(H('nr'));
    expect(r.status).toBe(403);
    expect(r.body).toMatchObject({ success: false, code: 'CHATBOT_NOT_ALLOWED', message: 'Tài khoản không có quyền sử dụng trợ lý.' });
    expect((await request(app).get('/api/Chatbot/status')).status).toBe(401);
  });

  it('tao hoi thoai, FAQ, du lieu tom tat, an toan; tieu de = cau hoi dau', async () => {
    const th = await newThread('gv');
    const created = await prisma.chatbot_threads.findUnique({ where: { Id: th } });
    expect(created!.Title).toBe('Cuộc trò chuyện mới');

    const r1 = await send('gv', th, '  Xin chào  ');
    expect(r1.status).toBe(200);
    expect(r1.body.data.links).toEqual([]);
    expect(r1.body.data.messages.map((m: any) => [m.role, m.content, m.source])).toEqual([
      ['user', 'Xin chào', 'user'],
      ['assistant', OUT.find.Giao_Vien[1].text, 'faq'],
    ]);
    expect(r1.body.data.messages[0].createdAtUtc).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d+)?Z$/); // DateTime.UtcNow -> co "Z"

    const r2 = await send('gv', th, 'Tổng quan của tôi');
    expect(r2.body.data.messages[1].source).toBe('data');
    expect(r2.body.data.messages[1].content).toMatch(/^📚 Bạn đang được phân công ở 0 lớp chưa xóa\./);
    expect(r2.body.data.links).toEqual([{ label: 'Lớp học của tôi', path: '/teacher/classes' }]);

    const r3 = await send('gv', th, 'cho tôi xin số điện thoại 0912345678');
    expect(r3.body.data.messages[1].source).toBe('safety');
    expect(llmCalls).toHaveLength(0); // FAQ/du lieu/an toan khong goi AI

    expect((await prisma.chatbot_threads.findUnique({ where: { Id: th } }))!.Title).toBe('Xin chào');
    const list = await request(app).get('/api/Chatbot/threads').set(H('gv'));
    expect(list.body.data[0]).toMatchObject({ id: th, title: 'Xin chào' });
    expect(Object.keys(list.body.data[0])).toEqual(['id', 'title', 'createdAtUtc', 'updatedAtUtc']);
    const msgs = await request(app).get(`/api/Chatbot/threads/${th}/messages`).set(H('gv'));
    expect(msgs.body.data).toHaveLength(6);
    expect(Object.keys(msgs.body.data[0])).toEqual(['id', 'role', 'content', 'source', 'createdAtUtc']);
  });

  it('cau hoi can AI: goi LLM voi lich su, luu ai_usage, cache 30 phut theo tai khoan', async () => {
    const th1 = await newThread('hs');
    const q = 'Phân biệt "make" và "do" giúp mình';
    const r = await send('hs', th1, q);
    expect(r.status).toBe(200);
    expect(r.body.data.messages[1]).toMatchObject({ content: `AI trả lời: ${q}`, source: 'ai' });
    expect(llmCalls).toEqual([{ role: 'Hoc_Sinh', history: [], question: q }]);

    const r2 = await send('hs', th1, 'Cho thêm ví dụ về collocation');
    expect(r2.body.data.messages[1].source).toBe('ai');
    expect(llmCalls[1].history.map((h) => h.Role)).toEqual(['user', 'assistant']);

    // Cung cau hoi, cung lich su rong o hoi thoai moi -> lay tu cache, khong goi lai AI
    const th2 = await newThread('hs');
    const r3 = await send('hs', th2, q);
    expect(r3.body.data.messages[1]).toMatchObject({ content: `AI trả lời: ${q}`, source: 'cache' });
    expect(llmCalls).toHaveLength(2);

    const day = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const usage = await prisma.chatbot_ai_usage.findUnique({ where: { UserId_DayUtc: { UserId: users.hs.id, DayUtc: day } } });
    expect(usage!.Requests).toBe(2);
  });

  it('han muc AI moi ngay -> 429 CHATBOT_DAILY_LIMIT + Retry-After: 60 (van dung FAQ duoc)', async () => {
    process.env.CHATBOT_DAILY_AI_REQUESTS_PER_USER = '2'; // hs da dung 2 luot o test truoc
    const th = await newThread('hs');
    const r = await send('hs', th, 'Một câu hỏi AI hoàn toàn mới');
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBe('60');
    expect(r.body).toMatchObject({ success: false, code: 'CHATBOT_DAILY_LIMIT', errorCode: 'CHATBOT_DAILY_LIMIT', data: null });
    expect(r.body.message).toBe('Đã đạt lượt hỏi AI hôm nay. Bạn vẫn có thể dùng các câu hỏi hướng dẫn có sẵn và quay lại hỏi AI vào ngày mai. 🌱');
    expect(llmCalls).toHaveLength(0);
    expect((await send('hs', th, 'Xin chào')).status).toBe(200);
    // khong ghi tin nhan khi bi tu choi
    expect(await prisma.chatbot_messages.count({ where: { ThreadId: th } })).toBe(2);
  });

  it('loi AI: timeout -> 503 CHATBOT_AI_TIMEOUT, loi khac -> 503 CHATBOT_AI_UNAVAILABLE (luot van bi tinh)', async () => {
    const th = await newThread('gv');
    llmImpl = async () => {
      throw new ChatbotTimeoutError();
    };
    const r1 = await send('gv', th, 'Câu hỏi khiến AI chậm');
    expect(r1.status).toBe(503);
    expect(r1.body).toMatchObject({ code: 'CHATBOT_AI_TIMEOUT', message: 'AI phản hồi chậm. Bạn thử lại sau hoặc chọn câu hỏi hướng dẫn có sẵn nhé.' });
    llmImpl = async () => {
      throw new Error('boom');
    };
    const r2 = await send('gv', th, 'Câu hỏi khiến AI lỗi');
    expect(r2.body).toMatchObject({ code: 'CHATBOT_AI_UNAVAILABLE', message: 'AI tạm thời chưa sẵn sàng. Các câu hỏi hướng dẫn có sẵn vẫn dùng được.' });
    llmImpl = async () => {
      throw new ChatbotException(503, 'CHATBOT_AI_EMPTY', 'Mình chưa thể trả lời câu này. Bạn thử diễn đạt lại ngắn gọn nhé.');
    };
    expect((await send('gv', th, 'Câu hỏi rỗng')).body.code).toBe('CHATBOT_AI_EMPTY');
    expect(await prisma.chatbot_messages.count({ where: { ThreadId: th } })).toBe(0);
  });

  it('requestId lap lai: tra lai tin cu; noi dung khac -> 409 CHATBOT_REQUEST_CONFLICT', async () => {
    const th = await newThread('gv');
    const rid = randomUUID();
    const a = await send('gv', th, 'Xin chào', rid);
    const b = await send('gv', th, 'Xin chào', rid);
    expect(b.status).toBe(200);
    expect(b.body.data.messages.map((m: any) => m.id)).toEqual(a.body.data.messages.map((m: any) => m.id));
    const c = await send('gv', th, 'Câu khác', rid);
    expect(c.status).toBe(409);
    expect(c.body.code).toBe('CHATBOT_REQUEST_CONFLICT');
  });

  it('khoa khi dang lam bai: 409 CHATBOT_EXAM_ACTIVE (tru status), mo lai khi het phien', async () => {
    const th = await newThread('hs');
    await prisma.chatbot_exam_sessions.create({ data: { UserId: users.hs.id, AssignmentId: randomUUID(), ExpiresAtUtc: new Date(Date.now() + 10 * 60_000) } });
    const st = await request(app).get('/api/Chatbot/status').set(H('hs'));
    expect(st.status).toBe(200);
    expect(st.body.data.available).toBe(false);
    for (const r of [
      await request(app).get('/api/Chatbot/threads').set(H('hs')),
      await request(app).post('/api/Chatbot/threads').set(H('hs')),
      await request(app).get(`/api/Chatbot/threads/${th}/messages`).set(H('hs')),
      await send('hs', th, 'Xin chào'),
      await request(app).delete(`/api/Chatbot/threads/${th}`).set(H('hs')),
    ]) {
      expect(r.status).toBe(409);
      expect(r.body).toMatchObject({ code: 'CHATBOT_EXAM_ACTIVE', message: 'Trợ lý tạm dừng trong lúc làm bài. Bạn hãy nộp bài hoặc chờ hết thời gian làm bài rồi quay lại nhé. ✍️' });
    }
    // Phien thi het han -> mo khoa
    await prisma.chatbot_exam_sessions.updateMany({ where: { UserId: users.hs.id }, data: { ExpiresAtUtc: new Date(Date.now() - 1000) } });
    expect((await request(app).get('/api/Chatbot/threads').set(H('hs'))).status).toBe(200);
  });

  it('gioi han 10 tin/phut -> 429 CHATBOT_RATE_LIMIT', async () => {
    const th = await newThread('gv'); // 1
    for (let i = 0; i < 9; i++) expect((await send('gv', th, 'Xin chào')).status).toBe(200);
    const r = await send('gv', th, 'Xin chào');
    expect(r.status).toBe(429);
    expect(r.headers['retry-after']).toBe('60');
    expect(r.body.code).toBe('CHATBOT_RATE_LIMIT');
  });

  it('validation giong ASP.NET', async () => {
    const th = await newThread('gv');
    const p = `/api/Chatbot/threads/${th}/messages`;
    const empty = await request(app).post(p).set(H('gv')).send({});
    expect(empty.status).toBe(400);
    expect(empty.body.errors).toEqual({ Message: ['The Message field is required.', 'The field Message must be a string with a minimum length of 1 and a maximum length of 1200.'] });
    const num = await request(app).post(p).set(H('gv')).send({ message: 5 });
    expect(num.body.errors).toEqual({
      request: ['The request field is required.'],
      '$.message': ['The JSON value could not be converted to System.String. Path: $.message | LineNumber: 0 | BytePositionInLine: 12.'],
    });
    const noRid = await request(app).post(p).set(H('gv')).send({ message: 'hi' });
    expect(noRid.status).toBe(400);
    expect(noRid.body).toMatchObject({ code: 'CHATBOT_INVALID_INPUT', message: 'Nhập câu hỏi từ 1 đến 1.200 ký tự.' });
    expect((await request(app).post(p).set(H('gv')).set('Content-Type', 'text/plain').send('hi')).status).toBe(415);
    expect((await request(app).get('/api/Chatbot/threads?skip=abc').set(H('gv'))).body.errors).toEqual({ skip: ["The value 'abc' is not valid."] });
    expect((await request(app).get('/api/Chatbot/threads/abc/messages').set(H('gv'))).status).toBe(404);
    expect((await request(app).post(p).set(H('gv')).send({ requestId: randomUUID(), message: 'a'.repeat(9000) })).status).toBe(500); // RequestSizeLimit(8192)
  });

  it('xoa hoi thoai: chi chu so huu, xoa ca tin nhan', async () => {
    const th = await newThread('gv');
    await send('gv', th, 'Xin chào');
    const other = await request(app).delete(`/api/Chatbot/threads/${th}`).set(H('hs'));
    expect(other.status).toBe(404);
    expect(other.body.code).toBe('CHATBOT_THREAD_NOT_FOUND');
    const r = await request(app).delete(`/api/Chatbot/threads/${th}`).set(H('gv'));
    expect(r.status).toBe(200);
    expect(r.body.data).toEqual({ deleted: true });
    expect(await prisma.chatbot_messages.count({ where: { ThreadId: th } })).toBe(0);
  });
});
