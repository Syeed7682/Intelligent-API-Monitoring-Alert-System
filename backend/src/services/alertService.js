import mongoose from 'mongoose';
import crypto from 'crypto';
import { Alert } from '../models/Alert.js';
import { logger } from '../utils/logger.js';

// In-memory alert store used when MongoDB is offline / disconnected
let inMemoryAlerts = [];

const isDbConnected = () => mongoose.connection.readyState === 1;

/**
 * Upsert an alert using event_fingerprint deduplication.
 * - If an active/acknowledged alert with the same fingerprint exists → update it.
 * - If the alert has been resolved → create a fresh one (new incident).
 */
export const upsertAlert = async (alertData) => {
  const { event_fingerprint, api_name, severity, anomalies, raw_event, ...aiFields } = alertData;

  if (!isDbConnected()) {
    // In-memory implementation
    const existing = inMemoryAlerts.find(
      (a) => a.event_fingerprint === event_fingerprint && (a.status === 'active' || a.status === 'acknowledged')
    );

    if (existing) {
      existing.last_seen_at = new Date();
      existing.occurrence_count = (existing.occurrence_count || 1) + 1;
      if (aiFields.ai_generated) {
        existing.title = aiFields.title;
        existing.message = aiFields.message;
        existing.recommendation = aiFields.recommendation;
        existing.possible_causes = aiFields.possible_causes;
        existing.ai_generated = aiFields.ai_generated;
      }
      logger.info({ alertId: existing._id, occurrences: existing.occurrence_count }, 'In-memory alert deduplicated — updated');
      return { alert: existing, isNew: false };
    }

    const newAlert = {
      _id: crypto.randomBytes(12).toString('hex'),
      api_name,
      event_fingerprint,
      severity,
      anomalies,
      raw_event,
      title: aiFields.title || '',
      message: aiFields.message || '',
      recommendation: aiFields.recommendation || '',
      possible_causes: aiFields.possible_causes || [],
      ai_generated: aiFields.ai_generated || false,
      status: 'active',
      occurrence_count: 1,
      created_at: new Date(),
      last_seen_at: new Date(),
    };

    inMemoryAlerts.unshift(newAlert);
    logger.info({ alertId: newAlert._id, api_name, severity }, 'New in-memory alert created');
    return { alert: newAlert, isNew: true };
  }

  // MongoDB implementation
  const existing = await Alert.findOne({
    event_fingerprint,
    status: { $in: ['active', 'acknowledged'] },
  });

  if (existing) {
    existing.last_seen_at = new Date();
    existing.occurrence_count += 1;
    if (aiFields.ai_generated) {
      existing.title = aiFields.title;
      existing.message = aiFields.message;
      existing.recommendation = aiFields.recommendation;
      existing.possible_causes = aiFields.possible_causes;
      existing.ai_generated = aiFields.ai_generated;
    }
    await existing.save();
    logger.info({ alertId: existing._id, occurrences: existing.occurrence_count }, 'Alert deduplicated — updated existing');
    return { alert: existing, isNew: false };
  }

  const newAlert = new Alert({
    api_name,
    event_fingerprint,
    severity,
    anomalies,
    raw_event,
    title: aiFields.title || '',
    message: aiFields.message || '',
    recommendation: aiFields.recommendation || '',
    possible_causes: aiFields.possible_causes || [],
    ai_generated: aiFields.ai_generated || false,
    status: 'active',
  });

  await newAlert.save();
  logger.info({ alertId: newAlert._id, api_name, severity }, 'New alert created');
  return { alert: newAlert, isNew: true };
};

/**
 * Query alerts with filtering and pagination.
 */
export const getAlerts = async ({ status, severity, api_name, page = 1, limit = 20 } = {}) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const skip = (safePage - 1) * safeLimit;

  if (!isDbConnected()) {
    let filtered = [...inMemoryAlerts];
    if (status) filtered = filtered.filter((a) => a.status === status);
    if (severity) filtered = filtered.filter((a) => a.severity === severity);
    if (api_name) {
      const regex = new RegExp(api_name, 'i');
      filtered = filtered.filter((a) => regex.test(a.api_name));
    }

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + safeLimit);

    return {
      data: paginated,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        total_pages: Math.ceil(total / safeLimit),
      },
    };
  }

  const filter = {};
  if (status) filter.status = status;
  if (severity) filter.severity = severity;
  if (api_name) filter.api_name = { $regex: api_name, $options: 'i' };

  const [alerts, total] = await Promise.all([
    Alert.find(filter).sort({ created_at: -1 }).skip(skip).limit(safeLimit).lean(),
    Alert.countDocuments(filter),
  ]);

  return {
    data: alerts,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.ceil(total / safeLimit),
    },
  };
};

/**
 * Get a single alert by ID.
 */
export const getAlertById = async (id) => {
  if (!isDbConnected()) {
    return inMemoryAlerts.find((a) => a._id === id) || null;
  }
  return Alert.findById(id).lean();
};

/**
 * Resolve an alert.
 */
export const resolveAlert = async (id) => {
  if (!isDbConnected()) {
    const alert = inMemoryAlerts.find((a) => a._id === id);
    if (alert) {
      alert.status = 'resolved';
      alert.resolved_at = new Date();
      logger.info({ alertId: id }, 'In-memory alert resolved');
      return alert;
    }
    return null;
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { status: 'resolved', resolved_at: new Date() },
    { new: true }
  ).lean();
  if (alert) logger.info({ alertId: id }, 'Alert resolved');
  return alert;
};

/**
 * Acknowledge an alert.
 */
export const acknowledgeAlert = async (id) => {
  if (!isDbConnected()) {
    const alert = inMemoryAlerts.find((a) => a._id === id);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledged_at = new Date();
      logger.info({ alertId: id }, 'In-memory alert acknowledged');
      return alert;
    }
    return null;
  }

  const alert = await Alert.findByIdAndUpdate(
    id,
    { status: 'acknowledged', acknowledged_at: new Date() },
    { new: true }
  ).lean();
  if (alert) logger.info({ alertId: id }, 'Alert acknowledged');
  return alert;
};

export default { upsertAlert, getAlerts, getAlertById, resolveAlert, acknowledgeAlert };
