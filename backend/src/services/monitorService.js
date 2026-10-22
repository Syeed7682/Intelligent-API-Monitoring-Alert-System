import { detectAnomalies } from './anomalyDetector.js';
import { generateAIAlert } from './aiAlertService.js';
import { upsertAlert } from './alertService.js';
import { logger } from '../utils/logger.js';

/**
 * Process a single validated monitoring event:
 * 1. Detect anomalies (deterministic)
 * 2. Generate AI alert explanation (with fallback)
 * 3. Persist / deduplicate in DB
 */
export const processEvent = async (event) => {
  const detection = detectAnomalies(event);

  if (!detection) {
    logger.debug({ api_name: event.api_name }, 'No anomalies detected');
    return { event, anomalies_detected: false, alert: null };
  }

  const { anomalies, severity, fingerprint } = detection;

  // Generate AI explanation (or fallback)
  const aiResult = await generateAIAlert(event, anomalies);

  // Persist / deduplicate
  const { alert, isNew } = await upsertAlert({
    api_name: event.api_name,
    event_fingerprint: fingerprint,
    severity,
    anomalies,
    raw_event: {
      response_time_ms: event.response_time_ms,
      status_code: event.status_code,
      records_returned: event.records_returned,
    },
    title: aiResult.title,
    message: aiResult.message,
    recommendation: aiResult.recommendation,
    possible_causes: aiResult.possible_causes,
    ai_generated: aiResult.ai_generated,
  });

  return { event, anomalies_detected: true, alert, isNew };
};

/**
 * Process a batch of validated events, independently.
 * Failures in one event do NOT affect others.
 */
export const processBatch = async (events) => {
  const results = await Promise.allSettled(events.map((ev) => processEvent(ev)));

  const processed = [];
  const failed = [];

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      processed.push(result.value);
    } else {
      failed.push({ index: i, event: events[i], error: result.reason?.message || 'Unknown error' });
      logger.error({ index: i, api_name: events[i]?.api_name, error: result.reason?.message }, 'Event processing failed');
    }
  });

  return { processed, failed };
};

export default { processEvent, processBatch };
