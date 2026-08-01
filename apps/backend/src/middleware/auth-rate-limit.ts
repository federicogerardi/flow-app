import rateLimit from 'express-rate-limit';

export function createAuthRateLimiter(windowMs: number, maxAttempts: number) {
  return rateLimit({
    windowMs,
    max: maxAttempts,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many login attempts. Try again later.',
        retryable: true,
      },
    },
  });
}
