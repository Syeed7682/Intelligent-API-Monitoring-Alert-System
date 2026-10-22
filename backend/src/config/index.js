import 'dotenv/config';

const getEnvInt = (key, fallback) => {
  const val = parseInt(process.env[key], 10);
  return isNaN(val) ? fallback : val;
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: getEnvInt('PORT', 3001),

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/api_monitor',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    timeoutMs: getEnvInt('OPENAI_TIMEOUT_MS', 30000),
    maxRetries: getEnvInt('OPENAI_MAX_RETRIES', 2),
  },

  thresholds: {
    highLatencyMs: getEnvInt('HIGH_LATENCY_THRESHOLD_MS', 3000),
    criticalLatencyMs: getEnvInt('CRITICAL_LATENCY_THRESHOLD_MS', 5000),
  },

  rateLimit: {
    windowMs: getEnvInt('RATE_LIMIT_WINDOW_MS', 900000),
    max: getEnvInt('RATE_LIMIT_MAX', 100),
  },

  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  batch: {
    maxSize: getEnvInt('MAX_BATCH_SIZE', 100),
    maxBodySize: process.env.MAX_REQUEST_BODY_SIZE || '1mb',
  },
};

export default config;
