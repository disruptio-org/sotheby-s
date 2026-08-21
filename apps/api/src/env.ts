import { z } from 'zod';

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((value) => (value === undefined ? fallback : value === 'true' || value === '1'));

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  /** Signs the session cookie. Any 32+ character random string. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  /** base64-encoded 32 bytes — `openssl rand -base64 32`. Encrypts provider keys. */
  ENCRYPTION_KEY: z.string().min(1, 'ENCRYPTION_KEY is required'),

  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(12),
  /** Where the browser app is served from; the only allowed CORS origin. */
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),

  /** How many runs may execute at once. */
  RUN_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(2),
  /** Wall-clock ceiling for a single model call. */
  RUN_STEP_TIMEOUT_MS: z.coerce.number().int().min(1000).max(600_000).default(120_000),
  /**
   * Run workflows against a stub instead of a real provider. Useful for demos
   * and for CI, where no API key should exist.
   */
  RUN_SIMULATE: bool(false),

  /* ── Mail ─────────────────────────────────────────────────────────────── */

  /** In development these point at the mail catcher in docker-compose. */
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(1025),
  /** Implicit TLS on connect, as on port 465. STARTTLS is used when offered. */
  SMTP_SECURE: bool(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  /** Envelope sender. In production this domain needs SPF and DKIM records. */
  MAIL_FROM: z.string().default('AI Back Office <nao-responder@sothebysrealty.pt>'),

  /** How long an invitation link stays redeemable. */
  INVITE_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(72),

  /** How long a password reset link stays redeemable. Deliberately short. */
  RESET_TTL_MINUTES: z.coerce.number().int().min(5).max(1440).default(60),

  /** Resets one account may ask for in an hour, before the mail stops going. */
  RESET_MAX_PER_ACCOUNT: z.coerce.number().int().min(1).max(50).default(3),

  /** Reset requests one source address may make in an hour. */
  RESET_MAX_PER_IP: z.coerce.number().int().min(1).max(500).default(10),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
