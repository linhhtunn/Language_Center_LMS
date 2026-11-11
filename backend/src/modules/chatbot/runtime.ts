// Chuyen tu Services/Chatbot/ChatbotRuntime.cs - dieu phoi ngan han trong 1 tien trinh:
// moi tai khoan chi 1 yeu cau dang xu ly, gioi han 10 tin/phut, cache cau tra loi AI 30 phut
// (cache theo khoa co userId nen khong bao gio dung chung giua cac tai khoan).

interface Entry {
  value: unknown;
  expires: number;
}

/** Thay MemoryCache(SizeLimit = 5000): moi muc co Size = 1, day thi bo qua muc moi (nhu MemoryCache). */
class SizedCache {
  private readonly map = new Map<string, Entry>();
  constructor(private readonly sizeLimit: number) {}

  get<T>(key: string): T | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    if (e.expires <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return e.value as T;
  }

  set(key: string, value: unknown, ttlMs: number): void {
    if (!this.map.has(key) && this.map.size >= this.sizeLimit) {
      const t = Date.now();
      for (const [k, e] of this.map) if (e.expires <= t) this.map.delete(k);
      if (this.map.size >= this.sizeLimit) return;
    }
    this.map.set(key, { value, expires: Date.now() + ttlMs });
  }

  clear(): void {
    this.map.clear();
  }
}

/** SemaphoreSlim(1, 1) */
class Mutex {
  private tail: Promise<void> = Promise.resolve();
  async run<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((r) => (release = r));
    await prev;
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

const cache = new SizedCache(5000);
const activeUsers = new Set<string>();
export const budgetLock = new Mutex();

export function tryEnter(userId: string): boolean {
  if (activeUsers.has(userId)) return false;
  activeUsers.add(userId);
  return true;
}

export function exit(userId: string): void {
  activeUsers.delete(userId);
}

export function allowMessage(userId: string): boolean {
  const key = 'rate:' + userId;
  const now = Date.now();
  const hits = (cache.get<number[]>(key) ?? []).filter((t) => t >= now - 60_000);
  if (hits.length >= 10) return false;
  hits.push(now);
  cache.set(key, hits, 60_000);
  return true;
}

export function cached(key: string): string | undefined {
  return cache.get<string>('reply:' + key);
}

export function cacheReply(key: string, value: string): void {
  cache.set('reply:' + key, value, 30 * 60_000);
}

/** Chi dung trong test: xoa trang thai rate limit/cache/khoa. */
export function _resetChatbotRuntime(): void {
  cache.clear();
  activeUsers.clear();
}
