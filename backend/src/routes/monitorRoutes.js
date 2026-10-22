import express from 'express';
import { handleMonitor } from '../controllers/monitorController.js';

const router = express.Router();

/**
 * POST /api/monitor
 * Accept a single event or array of events for monitoring.
 */
router.post('/', handleMonitor);

export default router;
