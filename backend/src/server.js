import 'dotenv/config';
import app from './app.js';
import { connectDB, disconnectDB } from './config/database.js';
import { logger } from './utils/logger.js';
import { config } from './config/index.js';

const start = async () => {
  // Connect to MongoDB
  try {
    await connectDB();
  } catch (err) {
    logger.warn('Starting without MongoDB connection — persistence unavailable');
  }

  const server = app.listen(config.port, () => {
    logger.info({ port: config.port, env: config.env }, 'API Monitor backend started');
  });

  // Graceful shutdown
  const shutdown = async (signal) => {
    logger.info({ signal }, 'Received shutdown signal');
    server.close(async () => {
      await disconnectDB();
      logger.info('Server shut down gracefully');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.fatal({ err: err.message }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason: String(reason) }, 'Unhandled promise rejection');
    process.exit(1);
  });
};

start();
