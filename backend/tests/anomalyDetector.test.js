import { detectAnomalies, generateFingerprint } from '../src/services/anomalyDetector.js';
import { mockEvent } from './helpers.js';

describe('Anomaly Detector', () => {
  describe('detectAnomalies', () => {
    test('returns null for healthy response', () => {
      const result = detectAnomalies(mockEvent());
      expect(result).toBeNull();
    });

    test('detects HIGH_LATENCY when response_time > 3000ms', () => {
      const result = detectAnomalies(mockEvent({ response_time_ms: 3500 }));
      expect(result).not.toBeNull();
      expect(result.anomalies.some(a => a.type === 'HIGH_LATENCY')).toBe(true);
      expect(result.severity).toBe('high');
    });

    test('detects CRITICAL_LATENCY when response_time > 5000ms (not HIGH_LATENCY)', () => {
      const result = detectAnomalies(mockEvent({ response_time_ms: 6000 }));
      expect(result).not.toBeNull();
      const types = result.anomalies.map(a => a.type);
      expect(types).toContain('CRITICAL_LATENCY');
      expect(types).not.toContain('HIGH_LATENCY');
      expect(result.severity).toBe('critical');
    });

    test('detects SERVER_ERROR for 500 status', () => {
      const result = detectAnomalies(mockEvent({ status_code: 500 }));
      expect(result).not.toBeNull();
      expect(result.anomalies.some(a => a.type === 'SERVER_ERROR')).toBe(true);
      expect(result.severity).toBe('critical');
    });

    test('detects SERVER_ERROR for 503 status', () => {
      const result = detectAnomalies(mockEvent({ status_code: 503 }));
      expect(result.anomalies.some(a => a.type === 'SERVER_ERROR')).toBe(true);
    });

    test('detects CLIENT_ERROR for 404 status', () => {
      const result = detectAnomalies(mockEvent({ status_code: 404 }));
      expect(result).not.toBeNull();
      expect(result.anomalies.some(a => a.type === 'CLIENT_ERROR')).toBe(true);
      expect(result.severity).toBe('high');
    });

    test('detects CLIENT_ERROR for 400 status', () => {
      const result = detectAnomalies(mockEvent({ status_code: 400 }));
      expect(result.anomalies.some(a => a.type === 'CLIENT_ERROR')).toBe(true);
    });

    test('detects ZERO_RECORDS when records_returned is 0', () => {
      const result = detectAnomalies(mockEvent({ records_returned: 0 }));
      expect(result).not.toBeNull();
      expect(result.anomalies.some(a => a.type === 'ZERO_RECORDS')).toBe(true);
      expect(result.severity).toBe('medium');
    });

    test('detects multiple anomalies in one event', () => {
      const result = detectAnomalies(mockEvent({
        response_time_ms: 6000,
        status_code: 503,
        records_returned: 0,
      }));
      expect(result).not.toBeNull();
      const types = result.anomalies.map(a => a.type);
      expect(types).toContain('CRITICAL_LATENCY');
      expect(types).toContain('SERVER_ERROR');
      expect(types).toContain('ZERO_RECORDS');
      expect(result.severity).toBe('critical');
    });

    test('does not flag 200 with normal latency and records', () => {
      const result = detectAnomalies(mockEvent({ status_code: 200, response_time_ms: 100, records_returned: 5 }));
      expect(result).toBeNull();
    });

    test('boundary: exactly 3000ms is NOT high latency', () => {
      const result = detectAnomalies(mockEvent({ response_time_ms: 3000 }));
      expect(result).toBeNull();
    });

    test('boundary: 3001ms IS high latency', () => {
      const result = detectAnomalies(mockEvent({ response_time_ms: 3001 }));
      expect(result).not.toBeNull();
      expect(result.anomalies.some(a => a.type === 'HIGH_LATENCY')).toBe(true);
    });
  });

  describe('generateFingerprint', () => {
    test('same api_name and anomaly types produce identical fingerprint', () => {
      const fp1 = generateFingerprint('TestAPI', ['HIGH_LATENCY', 'ZERO_RECORDS']);
      const fp2 = generateFingerprint('TestAPI', ['ZERO_RECORDS', 'HIGH_LATENCY']);
      expect(fp1).toBe(fp2);
    });

    test('different api names produce different fingerprints', () => {
      const fp1 = generateFingerprint('API_A', ['HIGH_LATENCY']);
      const fp2 = generateFingerprint('API_B', ['HIGH_LATENCY']);
      expect(fp1).not.toBe(fp2);
    });

    test('different anomaly types produce different fingerprints', () => {
      const fp1 = generateFingerprint('API_A', ['HIGH_LATENCY']);
      const fp2 = generateFingerprint('API_A', ['SERVER_ERROR']);
      expect(fp1).not.toBe(fp2);
    });

    test('fingerprint is a 32-char hex string', () => {
      const fp = generateFingerprint('TestAPI', ['HIGH_LATENCY']);
      expect(fp).toMatch(/^[a-f0-9]{32}$/);
    });
  });
});
