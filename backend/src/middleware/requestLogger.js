import { logger } from '../utils/logger.js';

/**
 * Request logging middleware.
 * Logs method, URL, status, and duration.
 * Does NOT log request bodies (which may contain sensitive data).
 */
export const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration_ms: duration,
      ip: req.ip,
    }, 'Request completed');
  });

  next();
};

export default requestLogger;
