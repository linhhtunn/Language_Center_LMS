import 'dotenv/config';

// Luon chay theo gio UTC (giong container .NET cu): Prisma doc DATETIME cua MySQL nhu gio UTC,
// nen dat TZ=UTC thi "gio luu trong DB" = "gio hien thi", khong bi lech 7 tieng tren may Windows.
process.env.TZ = 'UTC';

// Doc toan bo cau hinh tu bien moi truong (file .env khi chay dev, docker compose khi chay that).
// Thay cho appsettings.json + IConfiguration ben .NET.

const isProduction = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Thieu bien moi truong ${name} (xem backend/.env.example).`);
  return value;
}

function intOr(name: string, fallback: number): number {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}

const jwtSecret = process.env.JWT_SECRET?.trim() || (isProduction ? '' : 'dev-only-secret-khong-dung-cho-production-123456');
if (isProduction && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET phai dai it nhat 32 ky tu tren production (vd: openssl rand -base64 48).');
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
if (isProduction && allowedOrigins.length === 0) {
  throw new Error('Thieu ALLOWED_ORIGINS tren production (vd https://app.tenmien.com).');
}

export const config = {
  isProduction,
  port: intOr('PORT', 8080),
  databaseUrl: required('DATABASE_URL'),
  allowedOrigins,
  // Sau Caddy/nginx thi bat de lay IP that cua khach (thay ReverseProxy__TrustForwardedHeaders).
  trustProxy: process.env.TRUST_PROXY === 'true',
  enableSwagger: process.env.ENABLE_SWAGGER === 'true' || !isProduction,
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  jwt: {
    secret: jwtSecret,
    issuer: process.env.JWT_ISSUER ?? 'LanguageCenterLMS',
    audience: process.env.JWT_AUDIENCE ?? 'LanguageCenterLMSFrontend',
    accessTokenMinutes: intOr('JWT_ACCESS_TOKEN_MINUTES', 15),
    refreshTokenDays: intOr('JWT_REFRESH_TOKEN_DAYS', 7),
  },
  ai: {
    provider: (process.env.AI_PROVIDER ?? 'Claude') as 'Claude' | 'Gemini',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    claudeModel: process.env.CLAUDE_MODEL ?? 'claude-opus-5-5',
    geminiApiKey: process.env.GEMINI_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.8-flash',
  },
};
