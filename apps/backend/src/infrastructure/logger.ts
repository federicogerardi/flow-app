import pino from 'pino';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';

const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  name: 'flow-app',
  level: process.env.LOG_LEVEL ?? (isProduction ? 'info' : 'debug'),
  redact: {
    paths: [
      'password',
      'passwordHash',
      'token',
      'accessToken',
      'refreshToken',
      'apiKey',
      'secret',
      'authorization',
      'cookie',
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'authHeaderValue',
    ],
    censor: '[REDACTED]',
    remove: false,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }),
  base: {
    env: process.env.NODE_ENV ?? 'development',
    version: process.env.npm_package_version,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (_req, res) => {
    const id = randomUUID();
    res.setHeader('X-Request-Id', id);
    return id;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    // Silence 304 cache hits and periodic polling noise
    if (res.statusCode === 304) return 'silent';
    return 'info';
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} → ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} → ${res.statusCode} (${err?.message ?? 'unknown'})`,
  autoLogging: {
    ignore: (req) => {
      if (req.url === '/health') return true;
      return false;
    },
  },
  serializers: {
    req: () => undefined,         // drop full request object
    res: () => undefined,         // drop full response object
  },
});
