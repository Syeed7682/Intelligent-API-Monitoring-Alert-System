import express from 'express';
import { getConnectionStatus } from '../config/database.js';

const router = express.Router();

/**
 * GET /health
 * Returns service health and DB connectivity. Does NOT expose secrets.
 */
router.get('/', (req, res) => {
  const db = getConnectionStatus();
  const status = db.isConnected ? 'healthy' : 'degraded';

  res.status(db.isConnected ? 200 : 503).json({
    status,
    service: 'api-monitor-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    database: {
      status: db.state,
      connected: db.isConnected,
    },
  });
});

export default router;
