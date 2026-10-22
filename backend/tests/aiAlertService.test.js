import { jest } from '@jest/globals';

const mockCreate = jest.fn();

await jest.unstable_mockModule('openai', () => ({
  default: class MockOpenAI {
    constructor() {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }
  },
}));

const { generateAIAlert, buildFallbackAlert } = await import('../src/services/aiAlertService.js');
const { mockEvent } = await import('./helpers.js');
const { config } = await import('../src/config/index.js');

describe('AI Alert Service', () => {
  const event = mockEvent({ api_name: 'TestAPI', response_time_ms: 6000, status_code: 500 });
  const anomalies = [
    { type: 'CRITICAL_LATENCY', description: 'Response time 6000ms exceeds critical threshold' },
    { type: 'SERVER_ERROR', description: 'Server error with HTTP status 500' },
  ];

  describe('buildFallbackAlert', () => {
    test('returns deterministic fallback with ai_generated=false', () => {
      const result = buildFallbackAlert(event, anomalies);
      expect(result.ai_generated).toBe(false);
      expect(result.title).toContain('TestAPI');
      expect(result.message).toBeTruthy();
      expect(result.recommendation).toBeTruthy();
      expect(Array.isArray(result.possible_causes)).toBe(true);
    });

    test('fallback includes anomaly type info in possible_causes', () => {
      const result = buildFallbackAlert(event, anomalies);
      expect(result.possible_causes.some(c => c.includes('CRITICAL_LATENCY') || c.includes('SERVER_ERROR'))).toBe(true);
    });
  });

  describe('generateAIAlert', () => {
    beforeEach(() => {
      // Ensure no API key so we get fallback
      config.openai.apiKey = '';
      process.env.OPENAI_API_KEY = '';
    });

    test('returns fallback when no API key configured', async () => {
      const result = await generateAIAlert(event, anomalies);
      expect(result.ai_generated).toBe(false);
      expect(result.title).toBeTruthy();
    });

    test('fallback has all required fields', async () => {
      const result = await generateAIAlert(event, anomalies);
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('recommendation');
      expect(result).toHaveProperty('possible_causes');
      expect(result).toHaveProperty('ai_generated');
    });
  });
});
