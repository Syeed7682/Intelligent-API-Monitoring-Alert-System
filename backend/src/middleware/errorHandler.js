import { logger } from '../utils/logger.js';

/**
 * Global error handling middleware.
 * Returns consistent error responses without exposing internal stack traces in production.
 */
export const errorHandler = (err, req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development';

  logger.error({
    err: {
      message: err.message,
      name: err.name,
      ...(isDev && { stack: err.stack }),
    },
    method: req.method,
    url: req.url,
  }, 'Unhandled error');

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Mongoose cast errors (bad ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: 'Invalid ID format',
    });
  }

  // JSON parse errors
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON in request body',
    });
  }

  // Payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request body too large',
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  return res.status(statusCode).json({
    success: false,
    error: isDev ? err.message : 'Internal server error',
  });
};

export default errorHandler;
