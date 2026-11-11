// Chuyen tu Services/Chatbot/ChatbotKnowledge.cs (phan xu ly). Du lieu FAQ o knowledge.data.ts,
// system prompt o knowledge.prompt.ts (deu chep nguyen van tu ban .NET).
import { Articles, Roles, type ChatbotReply, type ChatbotSuggestion } from './knowledge.data.js';

export { Articles, Roles };
export type { ChatbotArticle, ChatbotLink, ChatbotReply, ChatbotSuggestion } from './knowledge.data.js';
export { SystemPrompt } from './knowledge.prompt.js';

/** Giong Normalize cua C#: thuong hoa, d/đ, bo dau (NonSpacingMark), con lai [a-z0-9] cach nhau 1 khoang trang. */
export function Normalize(text: string): string {
  const decomposed = text.toLowerCase().replaceAll('đ', 'd').normalize('NFD');
  const clean = decomposed.replace(/\p{Mn}/gu, '');
  return clean.normalize('NFC').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function Suggestions(role: string): ChatbotSuggestion[] {
  const prefix = role === 'Admin' ? 'admin-' : role === 'Giao_Vien' ? 'teacher-' : role === 'Hoc_Sinh' ? 'student-' : 'parent-';
  return Articles.filter((x) => x.roles.includes(role) && (x.id.startsWith(prefix) || x.id === 'study-plan'))
    .slice(0, 5)
    .map((x) => ({ id: x.id, question: x.question }));
}

export function Find(question: string, role: string): ChatbotReply | null {
  const n = Normalize(question);
  if (['chao', 'xin chao', 'hello', 'hi', 'hey', 'alo'].includes(n))
    return { text: 'Xin chào! 👋 Mình sẵn sàng hỗ trợ bạn sử dụng hệ thống và học tiếng Anh. Bạn chọn một gợi ý hoặc nhập câu hỏi nhé. Chúc bạn một ngày học tập, làm việc thật tốt!', source: 'faq' };
  if (['cam on', 'thanks', 'thank you', 'cam on ban', 'tam biet', 'bye'].includes(n))
    return { text: 'Rất vui được đồng hành cùng bạn! 🌷 Khi cần, bạn cứ quay lại cuộc trò chuyện này nhé. Chúc bạn một ngày thật tốt!', source: 'faq' };
  const exact = Articles.find((x) => Normalize(x.question) === n && x.roles.includes(role));
  let article = exact;
  if (!article) {
    const padded = ' ' + n + ' ';
    let best: { a: (typeof Articles)[number]; score: number } | null = null;
    for (const a of Articles) {
      if (!a.roles.includes(role)) continue;
      const score = Math.max(0, ...a.keywords.filter((k) => padded.includes(' ' + k + ' ')).map((k) => k.length));
      // OrderByDescending on dinh: bai dau tien co diem cao nhat thang.
      if (score > 0 && (!best || score > best.score)) best = { a, score };
    }
    article = best?.a;
  }
  return article ? { text: article.answer, source: 'faq', links: article.path == null ? null : [{ label: 'Mở chức năng', path: article.path }] } : null;
}

// \w, \d, \b cua .NET la Unicode: \w = [\p{L}\p{Mn}\p{Nd}\p{Pc}], \d = \p{Nd}.
const W = '[\\p{L}\\p{Mn}\\p{Nd}\\p{Pc}]';
const B = `(?:(?<=${W})(?!${W})|(?<!${W})(?=${W}))`;
const SENSITIVE_RE = new RegExp(
  `AIza[${W.slice(1, -1)}-]{20,}|sk-ant-[${W.slice(1, -1)}-]{20,}|[${W.slice(1, -1)}.+-]+@[${W.slice(1, -1)}.-]+\\.[a-z]{2,}|${B}(?:\\+?84|0)[\\p{Nd} .-]{8,14}${B}`,
  'iu',
);
const SENSITIVE_WORDS = ['api key', 'apikey', 'mat khau', 'password', 'connectionstring', 'chuoi ket noi', 'jwt secret', 'system prompt', 'system instruction', 'prompt he thong', 'loi nhac he thong', 'database', 'co so du lieu', 'so dien thoai', 'dia chi nha', 'cccd', 'can cuoc', 'thong tin ca nhan', 'danh sach email', 'ignore previous', 'bo qua chi dan', 'bo qua huong dan', 'bo qua quy tac'];

export function HasSensitiveContent(text: string): boolean {
  const n = Normalize(text);
  return SENSITIVE_RE.test(text) || SENSITIVE_WORDS.some((w) => n.includes(w));
}

/** Toi da 3 bai FAQ co chung tu voi cau hoi, dua cho model lam can cu. */
export function RelevantGuidance(question: string, role: string): string {
  const words = new Set(Normalize(question).split(' ').filter((x) => x.length > 3));
  return Articles.filter((x) => x.roles.includes(role))
    .map((a) => ({ a, score: Normalize(a.question).split(' ').filter((w) => words.has(w)).length }))
    .filter((x) => x.score > 0)
    .sort((x, y) => y.score - x.score) // Array.sort on dinh nhu OrderByDescending
    .slice(0, 3)
    .map((x) => x.a.question + '\n' + x.a.answer)
    .join('\n');
}

/** Hau xu ly cau tra loi cua AI: an bi mat/du lieu rieng tu va cat do dai. */
export function FinalizeAnswer(answer: string, apiKey: string): string {
  if (answer.includes(apiKey) || HasSensitiveContent(answer))
    answer = 'Mình không cung cấp thông tin hệ thống hoặc dữ liệu riêng tư. Bạn có thể hỏi cách sử dụng chức năng hoặc kiến thức tiếng Anh nhé. 🛡️';
  if (answer.length > 2400) answer = answer.slice(0, 2400) + '…\nBạn có thể hỏi tiếp phần cần làm rõ.';
  return answer;
}
