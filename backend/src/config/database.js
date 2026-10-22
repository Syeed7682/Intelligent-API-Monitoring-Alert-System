import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

mongoose.set('bufferCommands', false);
let isConnected = false;

export const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
    });
    isConnected = true;
    logger.info({ host: conn.connection.host }, 'MongoDB connected');
  } catch (err) {
    logger.error({ err: err.message }, 'MongoDB connection failed');
    throw err;
  }
};

export const disconnectDB = async () => {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
  logger.info('MongoDB disconnected');
};

export const getConnectionStatus = () => {
  const state = mongoose.connection.readyState;
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return { state: states[state] || 'unknown', isConnected: state === 1 };
};

export default connectDB;
