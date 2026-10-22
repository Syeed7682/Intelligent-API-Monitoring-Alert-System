import { getAlerts, getAlertById, resolveAlert, acknowledgeAlert } from '../services/alertService.js';

export const handleGetAlerts = async (req, res, next) => {
  try {
    const { status, severity, api_name, page, limit } = req.query;

    // Validate query params
    const allowedStatuses = ['active', 'acknowledged', 'resolved'];
    const allowedSeverities = ['low', 'medium', 'high', 'critical'];

    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    if (severity && !allowedSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        error: `Invalid severity. Must be one of: ${allowedSeverities.join(', ')}`,
      });
    }

    const result = await getAlerts({
      status: status || 'active',
      severity,
      api_name,
      page: page || 1,
      limit: limit || 20,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

export const handleGetAlertById = async (req, res, next) => {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    return res.status(200).json({ success: true, data: alert });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid alert ID format' });
    }
    next(err);
  }
};

export const handleResolveAlert = async (req, res, next) => {
  try {
    const alert = await resolveAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    return res.status(200).json({ success: true, data: alert, message: 'Alert resolved successfully' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid alert ID format' });
    }
    next(err);
  }
};

export const handleAcknowledgeAlert = async (req, res, next) => {
  try {
    const alert = await acknowledgeAlert(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    return res.status(200).json({ success: true, data: alert, message: 'Alert acknowledged successfully' });
  } catch (err) {
    if (err.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid alert ID format' });
    }
    next(err);
  }
};

import { sendAnomalyEmail } from '../services/emailService.js';

export const handleSendAlertEmail = async (req, res, next) => {
  try {
    const alert = await getAlertById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, error: 'Alert not found' });
    }
    const recipient = req.body.email || 'oncall-team@example.com';
    const emailResult = await sendAnomalyEmail(alert, recipient);
    return res.status(200).json({
      success: true,
      message: `Anomaly report email dispatched to ${recipient}`,
      data: emailResult,
    });
  } catch (err) {
    next(err);
  }
};

export default {
  handleGetAlerts,
  handleGetAlertById,
  handleResolveAlert,
  handleAcknowledgeAlert,
  handleSendAlertEmail,
};

