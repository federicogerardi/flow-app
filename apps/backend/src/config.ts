import { z } from 'zod';

const isDev = process.env.NODE_ENV === 'development';

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: isDev
    ? z.string().url().optional().default('redis://localhost:6379')
    : z.string().url(),
  OPENROUTER_API_KEY: isDev
    ? z.string().optional().default('sk-or-v1-dev-placeholder')
    : z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CSRF_SECRET: z.string().min(16),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

export type Env = z.infer<typeof envSchema>;

export function validateConfig(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.issues.map(
      (i) => `  ${i.path.join('.')}: ${i.message}`
    );
    throw new Error(
      `FATAL: Invalid environment configuration:\n${missing.join('\n')}`
    );
  }

  return result.data;
}
