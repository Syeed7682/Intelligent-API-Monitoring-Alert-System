import crypto from 'crypto';
import { config } from '../config/index.js';

const { highLatencyMs, criticalLatencyMs } = config.thresholds;

/**
 * Determine severity from anomaly types (deterministic — never from AI).
 */
const determineSeverity = (anomalyTypes) => {
  if (anomalyTypes.includes('CRITICAL_LATENCY') || anomalyTypes.includes('SERVER_ERROR')) return 'critical';
  if (anomalyTypes.includes('HIGH_LATENCY') || anomalyTypes.includes('CLIENT_ERROR')) return 'high';
  if (anomalyTypes.includes('ZERO_RECORDS')) return 'medium';
  return 'low';
};

/**
 * Generate a stable fingerprint for an event based on api_name + anomaly types.
 * Two events on the same API with the same anomaly types produce the same fingerprint
 * so they can be deduplicated in the database.
 */
export const generateFingerprint = (apiName, anomalyTypes) => {
  const sorted = [...anomalyTypes].sort().join(':');
  return crypto
    .createHash('sha256')
    .update(`${apiName}|${sorted}`)
    .digest('hex')
    .slice(0, 32);
};

/**
 * Run deterministic anomaly detection rules against a validated event.
 * Returns { anomalies, severity, fingerprint } or null if no anomalies found.
 */
export const detectAnomalies = (event) => {
  const { api_name, response_time_ms, status_code, records_returned } = event;
  const anomalies = [];

  // Rule 1 & 2: Latency checks (critical takes precedence)
  if (response_time_ms > criticalLatencyMs) {
    anomalies.push({
      type: 'CRITICAL_LATENCY',
      description: `Response time ${response_time_ms}ms exceeds critical threshold of ${criticalLatencyMs}ms`,
      observed_value: response_time_ms,
      threshold: criticalLatencyMs,
      detected_at: new Date(),
    });
  } else if (response_time_ms > highLatencyMs) {
    anomalies.push({
      type: 'HIGH_LATENCY',
      description: `Response time ${response_time_ms}ms exceeds high-latency threshold of ${highLatencyMs}ms`,
      observed_value: response_time_ms,
      threshold: highLatencyMs,
      detected_at: new Date(),
    });
  }

  // Rule 3: Server errors (5xx)
  if (status_code >= 500 && status_code <= 599) {
    anomalies.push({
      type: 'SERVER_ERROR',
      description: `Server error with HTTP status ${status_code}`,
      observed_value: status_code,
      threshold: null,
      detected_at: new Date(),
    });
  }
  // Rule 4: Client errors (4xx)
  else if (status_code >= 400 && status_code <= 499) {
    anomalies.push({
      type: 'CLIENT_ERROR',
      description: `Client error with HTTP status ${status_code}`,
      observed_value: status_code,
      threshold: null,
      detected_at: new Date(),
    });
  }

  // Rule 5: Zero records
  if (records_returned === 0) {
    anomalies.push({
      type: 'ZERO_RECORDS',
      description: 'API returned zero records — may indicate a data pipeline issue',
      observed_value: 0,
      threshold: null,
      detected_at: new Date(),
    });
  }

  if (anomalies.length === 0) return null;

  const anomalyTypes = anomalies.map((a) => a.type);
  const severity = determineSeverity(anomalyTypes);
  const fingerprint = generateFingerprint(api_name, anomalyTypes);

  return { anomalies, severity, fingerprint };
};

export default { detectAnomalies, generateFingerprint };
