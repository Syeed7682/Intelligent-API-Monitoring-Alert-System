import pino from 'pino';
import { config } from '../config/index.js';

const isDev = config.env === 'development' || config.env === 'test';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  redact: {
    paths: ['*.password', '*.token', '*.apiKey', '*.api_key', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});

export default logger;
