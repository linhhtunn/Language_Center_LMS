// Chuyen tu Services/Chatbot/ChatbotClaudeClient.cs + ChatbotGeminiClient.cs.
// Tach rieng khoi client cham bai: ngu canh/dau ra nho, khong JSON schema, KHONG tu thu lai (ton phi).
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';
import { FinalizeAnswer, HasSensitiveContent, RelevantGuidance, SystemPrompt } from './knowledge.js';

export interface ChatbotHistoryMessage {
  Role: string;
  Content: string;
}

export interface ChatbotGeneration {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface ChatbotLlmClient {
  generate(role: string, history: ChatbotHistoryMessage[], question: string, signal?: AbortSignal): Promise<ChatbotGeneration>;
}

export class ChatbotException extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

/** Loi het thoi gian cho nha cung cap (thay OperationCanceledException khong do client huy). */
export class ChatbotTimeoutError extends Error {}

function intEnv(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

// Cau hinh "Chatbot:*" cua ban .NET (appsettings + docker compose) -> bien moi truong.
export const chatbotSettings = {
  dailyAiRequestsPerUser: () => clamp(intEnv('CHATBOT_DAILY_AI_REQUESTS_PER_USER', 20), 1, 100),
  dailyAiRequestsTotal: () => clamp(intEnv('CHATBOT_DAILY_AI_REQUESTS_TOTAL', 200), 1, 10000),
  timeoutSeconds: () => clamp(intEnv('CHATBOT_TIMEOUT_SECONDS', 35), 5, 60),
  maxOutputTokens: () => clamp(intEnv('CHATBOT_MAX_OUTPUT_TOKENS', 1024), 256, 1536),
  claudeMaxTokens: () => clamp(intEnv('CHATBOT_CLAUDE_MAX_TOKENS', 4096), 1024, 8192),
};

const notReady = () =>
  new ChatbotException(503, 'CHATBOT_AI_UNAVAILABLE', 'Trợ lý AI chưa sẵn sàng. Bạn vẫn có thể chọn các câu hỏi hướng dẫn có sẵn.');
const busy = () =>
  new ChatbotException(503, 'CHATBOT_AI_UNAVAILABLE', 'AI đang bận hoặc hết hạn mức. Bạn thử lại sau hoặc chọn câu hỏi hướng dẫn có sẵn nhé.');

const cut600 = (s: string) => s.slice(0, Math.min(600, s.length));

/** Lich su da loc gui cho Claude (bo tin nhay cam, phai bat dau bang luot user). */
export function buildClaudeMessages(history: ChatbotHistoryMessage[], question: string): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];
  for (const message of history.slice(-6)) {
    if (HasSensitiveContent(message.Content)) continue;
    const isAssistant = message.Role === 'assistant';
    if (isAssistant && messages.length === 0) continue;
    messages.push({ role: isAssistant ? 'assistant' : 'user', content: cut600(message.Content) });
  }
  messages.push({ role: 'user', content: question });
  return messages;
}

export class ChatbotClaudeClient implements ChatbotLlmClient {
  /** fetchImpl chi dung trong test (gia lap API, khong goi that). */
  constructor(private readonly fetchImpl?: typeof fetch) {}

  async generate(role: string, history: ChatbotHistoryMessage[], question: string, signal?: AbortSignal): Promise<ChatbotGeneration> {
    const key = config.ai.anthropicApiKey;
    const model = process.env.CHATBOT_CLAUDE_MODEL || config.ai.claudeModel;
    if (!key?.trim() || !model?.trim()) throw notReady();

    const client = new Anthropic({ apiKey: key, maxRetries: 0, timeout: chatbotSettings.timeoutSeconds() * 1000, ...(this.fetchImpl ? { fetch: this.fetchImpl } : {}) });
    let response: Anthropic.Message;
    try {
      response = await client.messages.create(
        {
          model,
          // Thinking luon bat voi model Claude hien tai va tinh vao max_tokens, nen de du cho.
          max_tokens: chatbotSettings.claudeMaxTokens(),
          system: SystemPrompt(role, RelevantGuidance(question, role)),
          messages: buildClaudeMessages(history, question),
          output_config: { effort: 'low' },
        },
        { signal },
      );
    } catch (err) {
      if (err instanceof Anthropic.APIConnectionTimeoutError) throw new ChatbotTimeoutError();
      if (err instanceof Anthropic.APIError && err.status !== undefined) {
        // Khong ghi body/prompt/key vao log.
        console.warn(`Chatbot provider error ${err.constructor.name}`);
        throw busy();
      }
      throw err;
    }

    const answer0 = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((t) => t.text)
      .join('')
      .trim();
    if (response.stop_reason === 'refusal' || !answer0)
      throw new ChatbotException(503, 'CHATBOT_AI_EMPTY', 'Mình chưa thể trả lời câu này. Bạn thử diễn đạt lại ngắn gọn nhé.');
    const answer = FinalizeAnswer(answer0, key);
    const input = response.usage.input_tokens;
    const output = response.usage.output_tokens;
    console.info(`Chatbot AI usage: input=${input}, outputAndThinking=${output}`);
    return { text: answer, inputTokens: input, outputTokens: output };
  }
}

/** Payload REST generateContent cua Gemini (tach ra de test). */
export function buildGeminiPayload(model: string, role: string, history: ChatbotHistoryMessage[], question: string) {
  const guidance = RelevantGuidance(question, role);
  const contents: unknown[] = [];
  for (const message of history.slice(-6)) {
    if (HasSensitiveContent(message.Content)) continue;
    contents.push({ role: message.Role === 'assistant' ? 'model' : 'user', parts: [{ text: cut600(message.Content) }] });
  }
  contents.push({ role: 'user', parts: [{ text: question }] });
  const generationConfig: Record<string, unknown> = { maxOutputTokens: chatbotSettings.maxOutputTokens() };
  const lower = model.toLowerCase();
  if (lower.startsWith('gemini-3')) generationConfig.thinkingConfig = { thinkingLevel: 'low' };
  else if (lower.startsWith('gemini-2.5') && !model.includes('pro')) generationConfig.thinkingConfig = { thinkingBudget: 0 };
  return {
    systemInstruction: { parts: [{ text: SystemPrompt(role, guidance) }] },
    contents,
    generationConfig,
  };
}

export class ChatbotGeminiClient implements ChatbotLlmClient {
  constructor(private readonly fetchImpl: typeof fetch = fetch) {}

  async generate(role: string, history: ChatbotHistoryMessage[], question: string, signal?: AbortSignal): Promise<ChatbotGeneration> {
    const key = config.ai.geminiApiKey;
    const model = process.env.CHATBOT_MODEL || config.ai.geminiModel;
    if (!key?.trim() || !model?.trim()) throw notReady();
    if (!/^[a-zA-Z0-9._-]+$/.test(model)) throw new Error('Invalid chatbot model configuration.');

    const payload = buildGeminiPayload(model, role, history, question);
    const timeout = AbortSignal.timeout(chatbotSettings.timeoutSeconds() * 1000);
    const linked = signal ? AbortSignal.any([signal, timeout]) : timeout;
    let root: any;
    try {
      const response = await this.fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify(payload),
        signal: linked,
      });
      if (!response.ok) {
        console.warn(`Chatbot provider status ${response.status}`);
        throw busy();
      }
      root = await response.json();
    } catch (err) {
      if (timeout.aborted && !signal?.aborted) throw new ChatbotTimeoutError();
      throw err;
    }
    const parts = root?.candidates?.[0]?.content?.parts;
    if (!Array.isArray(root?.candidates) || root.candidates.length === 0 || !root.candidates[0]?.content || parts === undefined)
      throw new ChatbotException(503, 'CHATBOT_AI_EMPTY', 'Mình chưa thể trả lời câu này. Bạn thử diễn đạt lại ngắn gọn nhé.');
    const answer0 = (parts as any[])
      .filter((x) => x?.thought !== true && x && 'text' in x)
      .map((x) => x.text ?? '')
      .join('')
      .trim();
    if (!answer0) throw new ChatbotException(503, 'CHATBOT_AI_EMPTY', 'Mình chưa thể trả lời câu này. Bạn thử diễn đạt lại nhé.');
    const answer = FinalizeAnswer(answer0, key);
    let input = 0;
    let output = 0;
    const usage = root.usageMetadata;
    if (usage) {
      if (typeof usage.promptTokenCount === 'number') input = usage.promptTokenCount;
      if (typeof usage.totalTokenCount === 'number') output = Math.max(0, usage.totalTokenCount - input);
    }
    console.info(`Chatbot AI usage: input=${input}, outputAndThinking=${output}`);
    return { text: answer, inputTokens: input, outputTokens: output };
  }
}

// "AiProvider": Claude tru khi ghi Gemini (khong phan biet hoa thuong) - nhu Program.cs.
let client: ChatbotLlmClient | null = null;
export function getChatbotLlmClient(): ChatbotLlmClient {
  client ??= String(config.ai.provider).toLowerCase() === 'gemini' ? new ChatbotGeminiClient() : new ChatbotClaudeClient();
  return client;
}

/** Thay client (dung trong test de khong goi API that). Truyen null de quay ve mac dinh. */
export function setChatbotLlmClient(c: ChatbotLlmClient | null): void {
  client = c;
}
