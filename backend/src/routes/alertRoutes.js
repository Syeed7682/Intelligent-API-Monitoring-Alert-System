import express from 'express';
import {
  handleGetAlerts,
  handleGetAlertById,
  handleResolveAlert,
  handleAcknowledgeAlert,
  handleSendAlertEmail,
} from '../controllers/alertController.js';

const router = express.Router();

/**
 * GET /api/alerts
 * Query params: status, severity, api_name, page, limit
 */
router.get('/', handleGetAlerts);

/**
 * GET /api/alerts/:id
 */
router.get('/:id', handleGetAlertById);

/**
 * PATCH /api/alerts/:id/resolve
 */
router.patch('/:id/resolve', handleResolveAlert);

/**
 * PATCH /api/alerts/:id/acknowledge
 */
router.patch('/:id/acknowledge', handleAcknowledgeAlert);

/**
 * POST /api/alerts/:id/email
 * Send anomaly report via email (Requirement 7.4)
 */
router.post('/:id/email', handleSendAlertEmail);

export default router;
