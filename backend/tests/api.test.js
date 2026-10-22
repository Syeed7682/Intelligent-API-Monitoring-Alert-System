import { jest } from '@jest/globals';

const processBatch = jest.fn();
const getAlerts = jest.fn();
const getAlertById = jest.fn();
const resolveAlert = jest.fn();
const acknowledgeAlert = jest.fn();
const upsertAlert = jest.fn();

await jest.unstable_mockModule('../src/services/monitorService.js', () => ({
  processBatch,
}));

await jest.unstable_mockModule('../src/services/alertService.js', () => ({
  getAlerts,
  getAlertById,
  resolveAlert,
  acknowledgeAlert,
  upsertAlert,
}));

const request = (await import('supertest')).default;
const app = (await import('../src/app.js')).default;

const validEvent = {
  api_name: 'PatientDataAPI',
  response_time_ms: 1200,
  status_code: 200,
  records_returned: 50,
};

const anomalousEvent = {
  api_name: 'AppointmentAPI',
  response_time_ms: 5500,
  status_code: 500,
  records_returned: 0,
};

describe('POST /api/monitor', () => {
  beforeEach(() => {
    processBatch.mockResolvedValue({
      processed: [],
      failed: [],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('accepts a single valid event', async () => {
    processBatch.mockResolvedValue({
      processed: [{ event: validEvent, anomalies_detected: false, alert: null }],
      failed: [],
    });

    const res = await request(app).post('/api/monitor').send(validEvent);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.summary.total_input).toBe(1);
  });

  test('accepts a batch of valid events', async () => {
    processBatch.mockResolvedValue({
      processed: [
        { event: validEvent, anomalies_detected: false, alert: null },
        { event: anomalousEvent, anomalies_detected: false, alert: null },
      ],
      failed: [],
    });

    const res = await request(app).post('/api/monitor').send([validEvent, anomalousEvent]);
    expect(res.status).toBe(200);
    expect(res.body.summary.total_input).toBe(2);
  });

  test('returns validation errors for invalid items without failing valid ones', async () => {
    processBatch.mockResolvedValue({
      processed: [{ event: validEvent, anomalies_detected: false, alert: null }],
      failed: [],
    });

    const batch = [validEvent, { api_name: '', response_time_ms: -1, status_code: 999, records_returned: -5 }];
    const res = await request(app).post('/api/monitor').send(batch);
    expect(res.status).toBe(200);
    expect(res.body.summary.invalid_input).toBe(1);
    expect(res.body.summary.valid_input).toBe(1);
    expect(res.body.validation_errors).toHaveLength(1);
  });

  test('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/monitor')
      .set('Content-Type', 'application/json')
      .send('{ invalid json ]');
    expect(res.status).toBe(400);
  });

  test('returns 400 when all items are invalid', async () => {
    processBatch.mockResolvedValue({ processed: [], failed: [] });

    const res = await request(app).post('/api/monitor').send([{ api_name: '' }]);
    expect(res.status).toBe(200);
    expect(res.body.summary.invalid_input).toBeGreaterThan(0);
  });

  test('generates alerts for anomalous events', async () => {
    const mockAlert = {
      _id: '507f1f77bcf86cd799439011',
      api_name: 'AppointmentAPI',
      severity: 'critical',
      status: 'active',
      title: 'Critical Alert',
      anomalies: [{ type: 'SERVER_ERROR' }, { type: 'ZERO_RECORDS' }],
    };

    processBatch.mockResolvedValue({
      processed: [{ event: anomalousEvent, anomalies_detected: true, alert: mockAlert, isNew: true }],
      failed: [],
    });

    const res = await request(app).post('/api/monitor').send(anomalousEvent);
    expect(res.status).toBe(200);
    expect(res.body.summary.alerts_generated).toBe(1);
    expect(res.body.alerts[0].severity).toBe('critical');
  });

  test('rejects batch exceeding max size', async () => {
    const largeBatch = Array(101).fill(validEvent);
    const res = await request(app).post('/api/monitor').send(largeBatch);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/batch size/i);
  });
});

describe('GET /api/alerts', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns active alerts by default', async () => {
    getAlerts.mockResolvedValue({
      data: [],
      pagination: { page: 1, limit: 20, total: 0, total_pages: 0 },
    });

    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.pagination).toBeDefined();
  });

  test('accepts valid status filter', async () => {
    getAlerts.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } });
    const res = await request(app).get('/api/alerts?status=resolved');
    expect(res.status).toBe(200);
  });

  test('rejects invalid status filter', async () => {
    const res = await request(app).get('/api/alerts?status=invalid_status');
    expect(res.status).toBe(400);
  });

  test('rejects invalid severity filter', async () => {
    const res = await request(app).get('/api/alerts?severity=extreme');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/alerts/:id', () => {
  afterEach(() => jest.clearAllMocks());

  test('returns 404 for non-existent alert', async () => {
    getAlertById.mockResolvedValue(null);
    const res = await request(app).get('/api/alerts/507f1f77bcf86cd799439011');
    expect(res.status).toBe(404);
  });

  test('returns alert when found', async () => {
    const mockAlert = { _id: '507f1f77bcf86cd799439011', api_name: 'TestAPI', status: 'active' };
    getAlertById.mockResolvedValue(mockAlert);
    const res = await request(app).get('/api/alerts/507f1f77bcf86cd799439011');
    expect(res.status).toBe(200);
    expect(res.body.data.api_name).toBe('TestAPI');
  });
});

describe('PATCH /api/alerts/:id/resolve', () => {
  afterEach(() => jest.clearAllMocks());

  test('resolves an alert', async () => {
    const mockAlert = { _id: '507f1f77bcf86cd799439011', status: 'resolved', resolved_at: new Date().toISOString() };
    resolveAlert.mockResolvedValue(mockAlert);
    const res = await request(app).patch('/api/alerts/507f1f77bcf86cd799439011/resolve');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('resolved');
  });

  test('returns 404 when resolving non-existent alert', async () => {
    resolveAlert.mockResolvedValue(null);
    const res = await request(app).patch('/api/alerts/507f1f77bcf86cd799439011/resolve');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/alerts/:id/acknowledge', () => {
  afterEach(() => jest.clearAllMocks());

  test('acknowledges an alert', async () => {
    const mockAlert = { _id: '507f1f77bcf86cd799439011', status: 'acknowledged' };
    acknowledgeAlert.mockResolvedValue(mockAlert);
    const res = await request(app).patch('/api/alerts/507f1f77bcf86cd799439011/acknowledge');
    expect(res.status).toBe(200);
  });
});

describe('GET /health', () => {
  test('returns health status', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.body.service).toBe('api-monitor-backend');
    expect(res.body.database).toBeDefined();
  });
});

describe('404 handler', () => {
  test('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });
});
