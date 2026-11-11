// Chuyen tu Services/AiFeedback/ILocalLlmClient.cs + ClaudeLlmClient.cs + GeminiLlmClient.cs.
// (OllamaLlmClient khong dung nua -> khong chuyen.)
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config.js';

export interface LlmClient {
  /**
   * responseSchema: schema JSON dang OpenAPI ma Gemini dung (type "OBJECT"/"STRING"..., "nullable") ep model tra
   * dung cau truc. Client khong ho tro thi bo qua, chi dua vao mo ta dinh dang trong prompt.
   */
  generate(systemPrompt: string, userPrompt: string, signal?: AbortSignal, responseSchema?: Record<string, unknown> | null): Promise<string>;
}

function intEnv(name: string): number | undefined {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : undefined;
}

// Muc "Claude"/"Gemini"/"AiFeedback" cua appsettings.json ban .NET -> bien moi truong (cung gia tri mac dinh).
export const aiSettings = {
  claudeMaxTokens: () => intEnv('CLAUDE_MAX_TOKENS') ?? 64000,
  claudeTimeoutSeconds: () => intEnv('CLAUDE_TIMEOUT_SECONDS') ?? 600,
  claudeMaxRetries: () => intEnv('CLAUDE_MAX_RETRIES') ?? 3,
  // Claude:Effort (tuy chon, mac dinh khong gui). Khong dat ten CLAUDE_EFFORT vi de trung bien cua cong cu khac.
  claudeEffort: () => process.env.CLAUDE_OUTPUT_EFFORT?.trim().toLowerCase() || null,
  geminiTimeoutSeconds: () => intEnv('GEMINI_TIMEOUT_SECONDS') ?? 180,
  geminiMaxRetries: () => intEnv('GEMINI_MAX_RETRIES') ?? 3,
  geminiTemperature: (): number | null => {
    const v = process.env.GEMINI_TEMPERATURE?.trim();
    if (!v) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  },
  geminiThinkingLevel: () => process.env.GEMINI_THINKING_LEVEL?.trim() || null,
  ai1SoNhomSongSong: () => Math.max(1, intEnv('AI_FEEDBACK_AI1_SO_NHOM_SONG_SONG') ?? 4),
};

// ---------------- Claude ----------------

/**
 * Doi schema OpenAPI cua Gemini (type viet hoa, "nullable", "propertyOrdering") sang JSON Schema chuan ma
 * structured outputs cua Claude yeu cau (type viet thuong, additionalProperties: false cho moi object).
 */
export function ChuyenSchema(nguon: Record<string, unknown>): Record<string, unknown> {
  const dich: Record<string, unknown> = {};
  const nullable = nguon['nullable'] === true;
  for (const [ten, giaTri] of Object.entries(nguon)) {
    switch (ten) {
      case 'nullable':
      case 'propertyOrdering':
        break;
      case 'type':
        dich['type'] = String(giaTri).toLowerCase();
        break;
      case 'properties': {
        const props: Record<string, unknown> = {};
        for (const [tenProp, schemaProp] of Object.entries(giaTri as Record<string, Record<string, unknown>>)) props[tenProp] = ChuyenSchema(schemaProp);
        dich['properties'] = props;
        break;
      }
      case 'items':
        dich['items'] = ChuyenSchema(giaTri as Record<string, unknown>);
        break;
      default:
        dich[ten] = structuredClone(giaTri);
    }
  }
  if (dich['type'] === 'object') dich['additionalProperties'] = false;
  if (nullable) return { anyOf: [dich, { type: 'null' }] };
  return dich;
}

interface KetQuaStream {
  text: string;
  stopReason: string | null;
  inputTokens: number;
  outputTokens: number;
}

export function taoThamSoClaude(model: string, systemPrompt: string, userPrompt: string, responseSchema: Record<string, unknown> | null) {
  const effort = aiSettings.claudeEffort();
  const allowed = ['low', 'medium', 'high', 'xhigh', 'max'];
  if (effort != null && !allowed.includes(effort)) throw new Error(`Claude:Effort khong hop le: ${effort}`);
  const format = responseSchema == null ? null : { type: 'json_schema' as const, schema: ChuyenSchema(responseSchema) };
  // Chi gan truong nao co gia tri, de khong gui "null" len API.
  const outputConfig: Anthropic.OutputConfig | undefined =
    effort || format ? { ...(effort ? { effort: effort as Anthropic.OutputConfig['effort'] } : {}), ...(format ? { format } : {}) } : undefined;
  return {
    model,
    max_tokens: aiSettings.claudeMaxTokens(),
    system: systemPrompt,
    messages: [{ role: 'user' as const, content: userPrompt }],
    ...(outputConfig ? { output_config: outputConfig } : {}),
  };
}

export class ClaudeLlmClient implements LlmClient {
  /** fetchImpl chi dung trong test (gia lap API, khong goi that). */
  constructor(private readonly fetchImpl?: typeof fetch) {}

  async generate(systemPrompt: string, userPrompt: string, signal?: AbortSignal, responseSchema: Record<string, unknown> | null = null): Promise<string> {
    const apiKey = config.ai.anthropicApiKey;
    const model = config.ai.claudeModel;
    if (!apiKey?.trim())
      throw new Error(
        'Chua cau hinh Claude:ApiKey - chay "dotnet user-secrets set Claude:ApiKey <key>" trong thu muc backend, hoac dat bien moi truong Claude__ApiKey.',
      );
    if (!model?.trim()) throw new Error('Chua cau hinh Claude:Model trong appsettings.json (vd "claude-opus-5-5").');

    // SDK tu thu lai 429/5xx/mat ket noi (maxRetries lan).
    const client = new Anthropic({ apiKey, maxRetries: aiSettings.claudeMaxRetries(), timeout: aiSettings.claudeTimeoutSeconds() * 1000, ...(this.fetchImpl ? { fetch: this.fetchImpl } : {}) });
    let ketQua: KetQuaStream;
    try {
      ketQua = await goiStream(client, taoThamSoClaude(model, systemPrompt, userPrompt, responseSchema), signal);
    } catch (err) {
      if (err instanceof Anthropic.BadRequestError && responseSchema != null) {
        // Schema bi tu choi: goi lai 1 lan khong kem schema, van con mo ta dinh dang JSON trong prompt.
        console.warn('Claude tu choi JSON schema, goi lai khong kem schema.', err.message);
        ketQua = await goiStream(client, taoThamSoClaude(model, systemPrompt, userPrompt, null), signal);
      } else throw err;
    }
    console.info(`Claude ${model}: prompt ${ketQua.inputTokens} token, tra loi ${ketQua.outputTokens} token.`);
    return docNoiDungClaude(ketQua);
  }
}

/** Goi dang streaming: nhom nhieu cau can dau ra rat dai, request thuong voi max_tokens lon de bi timeout. */
async function goiStream(client: Anthropic, thamSo: ReturnType<typeof taoThamSoClaude>, signal?: AbortSignal): Promise<KetQuaStream> {
  let text = '';
  let stopReason: string | null = null;
  let input = 0;
  let output = 0;
  const stream = await client.messages.create({ ...thamSo, stream: true }, { signal });
  for await (const su of stream) {
    if (su.type === 'message_start') input = su.message.usage.input_tokens;
    else if (su.type === 'content_block_delta' && su.delta.type === 'text_delta') text += su.delta.text;
    else if (su.type === 'message_delta') {
      stopReason = su.delta.stop_reason ?? null;
      output = su.usage.output_tokens;
    }
  }
  return { text, stopReason, inputTokens: input, outputTokens: output };
}

export function docNoiDungClaude(ketQua: KetQuaStream): string {
  const stop = ketQua.stopReason?.replaceAll('_', '').toLowerCase();
  if (stop === 'refusal') throw new Error('Claude tu choi tra loi yeu cau nay (stop_reason: refusal).');
  if (ketQua.text.length === 0) throw new Error(`Claude tra ve noi dung rong (stop_reason: ${ketQua.stopReason ?? ''}).`);
  if (stop === 'maxtokens') throw new Error('Claude bi cat ngang vi vuot Claude:MaxTokens - tang gia tri nay trong cau hinh.');
  return ketQua.text;
}

// ---------------- Gemini ----------------

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export function taoPayloadGemini(systemPrompt: string, userPrompt: string, responseSchema: Record<string, unknown> | null) {
  const generationConfig: Record<string, unknown> = { responseMimeType: 'application/json' };
  if (responseSchema != null) generationConfig.responseSchema = structuredClone(responseSchema);
  const temperature = aiSettings.geminiTemperature();
  if (temperature != null) generationConfig.temperature = temperature;
  const thinkingLevel = aiSettings.geminiThinkingLevel();
  if (thinkingLevel) generationConfig.thinkingConfig = { thinkingLevel };
  return {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    generationConfig,
  };
}

const coTheThuLai = (status: number) => status === 429 || status === 500 || status === 503;

/** Uu tien header Retry-After (so giay), roi den "retryDelay": "17s" trong body; khong co thi lui 5s, 10s, 20s... */
export function layThoiGianChoThuLaiMs(retryAfter: string | null, body: string, attempt: number): number {
  if (retryAfter != null && /^\s*\d+\s*$/.test(retryAfter)) return Number(retryAfter) * 1000;
  const m = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body);
  if (m) return (Math.ceil(Number(m[1])) + 1) * 1000;
  return 5 * Math.pow(2, attempt) * 1000;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(signal.reason)), { once: true });
  });

export class GeminiLlmClient implements LlmClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
    private readonly delay: (ms: number, signal?: AbortSignal) => Promise<void> = sleep,
  ) {}

  async generate(systemPrompt: string, userPrompt: string, signal?: AbortSignal, responseSchema: Record<string, unknown> | null = null): Promise<string> {
    const apiKey = config.ai.geminiApiKey;
    const model = config.ai.geminiModel;
    const timeoutSeconds = aiSettings.geminiTimeoutSeconds();
    const maxRetries = aiSettings.geminiMaxRetries();
    if (!apiKey?.trim())
      throw new Error(
        'Chua cau hinh Gemini:ApiKey - chay "dotnet user-secrets set Gemini:ApiKey <key>" trong thu muc backend, hoac dat bien moi truong Gemini__ApiKey.',
      );
    if (!model?.trim()) throw new Error('Chua cau hinh Gemini:Model trong appsettings.json (vd "gemini-3.8-flash").');

    let dungSchema = responseSchema != null;
    for (let attempt = 0; ; attempt++) {
      const payloadJson = JSON.stringify(taoPayloadGemini(systemPrompt, userPrompt, dungSchema ? responseSchema! : null));
      const timeout = AbortSignal.timeout(timeoutSeconds * 1000);
      let status: number;
      let body: string;
      let retryAfter: string | null;
      try {
        const response = await this.fetchImpl(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'x-goog-api-key': apiKey },
          body: payloadJson,
          signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
        status = response.status;
        retryAfter = response.headers.get('retry-after');
        body = await response.text();
      } catch (err) {
        if (timeout.aborted && !signal?.aborted)
          throw new Error(`The request was canceled due to the configured HttpClient.Timeout of ${timeoutSeconds} seconds elapsing.`);
        throw err;
      }

      if (status >= 200 && status < 300) {
        ghiLogSoToken(body, model);
        return docNoiDungGemini(body);
      }

      // Schema bi tu choi: goi lai 1 lan khong kem schema, van con mo ta dinh dang JSON trong prompt.
      if (status === 400 && dungSchema) {
        console.warn(`Gemini tu choi responseSchema, goi lai khong kem schema. Body: ${body}`);
        dungSchema = false;
        attempt--;
        continue;
      }

      if (attempt < maxRetries && coTheThuLai(status)) {
        const delay = layThoiGianChoThuLaiMs(retryAfter, body, attempt);
        console.warn(`Gemini tra ve ${status}, thu lai lan ${attempt + 1}/${maxRetries} sau ${delay / 1000}s.`);
        await this.delay(delay, signal);
        continue;
      }

      console.warn(`Gemini tra ve loi. Status: ${status}. Body: ${body}`);
      throw new Error(`Gemini tra ve loi ${status}: ${body}`);
    }
  }
}

function ghiLogSoToken(body: string, model: string) {
  try {
    const usage = JSON.parse(body)?.usageMetadata;
    if (!usage) return;
    const doc = (ten: string) => (Number.isInteger(usage[ten]) ? usage[ten] : 0);
    console.info(`Gemini ${model}: prompt ${doc('promptTokenCount')} token, tra loi ${doc('candidatesTokenCount')} token, suy nghi ${doc('thoughtsTokenCount')} token.`);
  } catch {
    // Chi la log phu.
  }
}

/** Ghep text cua candidates[0].content.parts (bo qua phan "thought"). */
export function docNoiDungGemini(body: string): string {
  const root = JSON.parse(body);
  const candidates = root?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    const reason = root?.promptFeedback?.blockReason;
    const blockReason = root?.promptFeedback && reason !== undefined ? reason : 'khong ro';
    throw new Error(`Gemini khong tra ve ket qua (blockReason: ${blockReason ?? ''}).`);
  }
  const candidate = candidates[0];
  let text = '';
  const parts = candidate?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const laThought = part?.thought === true;
      if (!laThought && part && typeof part === 'object' && 'text' in part) text += part.text ?? '';
    }
  }
  if (text.length === 0) {
    const finishReason = candidate && typeof candidate === 'object' && 'finishReason' in candidate ? candidate.finishReason : 'khong ro';
    throw new Error(`Gemini tra ve noi dung rong (finishReason: ${finishReason ?? ''}).`);
  }
  return text;
}

// "AiProvider": Claude tru khi ghi Gemini (khong phan biet hoa thuong) - nhu Program.cs.
let client: LlmClient | null = null;
export function getLlmClient(): LlmClient {
  client ??= String(config.ai.provider).toLowerCase() === 'gemini' ? new GeminiLlmClient() : new ClaudeLlmClient();
  return client;
}

/** Thay client (test dung client gia, khong goi API that). null = quay ve mac dinh. */
export function setLlmClient(c: LlmClient | null): void {
  client = c;
}
