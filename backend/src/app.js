import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import { config } from './config/index.js';
import { requestLogger } from './middleware/requestLogger.js';
import { errorHandler } from './middleware/errorHandler.js';

import monitorRoutes from './routes/monitorRoutes.js';
import alertRoutes from './routes/alertRoutes.js';
import healthRoutes from './routes/healthRoutes.js';

const app = express();

// Security & parsing middleware
app.use(cors({
  origin: config.cors.origin,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: config.batch.maxBodySize }));
app.use(express.urlencoded({ extended: false, limit: config.batch.maxBodySize }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' },
});
app.use('/api/', limiter);

// Request logging
app.use(requestLogger);

// Routes
app.use('/health', healthRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/monitor', monitorRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/alerts', alertRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// Global error handler (must be last)
app.use(errorHandler);

export default app;
