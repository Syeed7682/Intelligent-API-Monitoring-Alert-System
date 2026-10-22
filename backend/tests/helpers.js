/**
 * Test helper: create valid mock event objects
 */
export const mockEvent = (overrides = {}) => ({
  api_name: 'TestAPI',
  response_time_ms: 500,
  status_code: 200,
  records_returned: 10,
  ...overrides,
});

/**
 * Mock AI alert service to avoid real OpenAI calls in tests
 */
export const mockAIAlert = {
  title: 'Test Alert Title',
  message: 'Test alert message describing the anomaly.',
  recommendation: 'Check the logs and verify service health.',
  possible_causes: ['High load', 'Network issue'],
  ai_generated: false,
};
