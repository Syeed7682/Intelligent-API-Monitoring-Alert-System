import { validateBatch } from '../src/validators/monitorValidator.js';

describe('Monitor Validator', () => {
  const validEvent = {
    api_name: 'TestAPI',
    response_time_ms: 500,
    status_code: 200,
    records_returned: 10,
  };

  test('validates a correct event', () => {
    const { valid, invalid } = validateBatch([validEvent]);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  test('rejects missing api_name', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, api_name: undefined }]);
    expect(valid).toHaveLength(0);
    expect(invalid[0].errors.some(e => e.field === 'api_name')).toBe(true);
  });

  test('rejects empty api_name', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, api_name: '' }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects negative response_time_ms', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, response_time_ms: -100 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects non-finite response_time_ms (Infinity)', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, response_time_ms: Infinity }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects status_code below 100', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, status_code: 99 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects status_code above 599', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, status_code: 600 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects non-integer status_code', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, status_code: 200.5 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects negative records_returned', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, records_returned: -1 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects non-integer records_returned', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, records_returned: 5.5 }]);
    expect(invalid).toHaveLength(1);
  });

  test('rejects missing required fields', () => {
    const { valid, invalid } = validateBatch([{}]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].errors.length).toBeGreaterThan(0);
  });

  test('handles batch with mixed valid and invalid items', () => {
    const batch = [
      validEvent,
      { ...validEvent, api_name: '' },
      { ...validEvent, response_time_ms: -50 },
      validEvent,
    ];
    const { valid, invalid } = validateBatch(batch);
    expect(valid).toHaveLength(2);
    expect(invalid).toHaveLength(2);
  });

  test('wraps single object in array', () => {
    const { valid, invalid } = validateBatch(validEvent);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  test('accepts zero records_returned (valid field value)', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, records_returned: 0 }]);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  test('accepts records_returned as string number — rejects due to type', () => {
    const { valid, invalid } = validateBatch([{ ...validEvent, records_returned: '10' }]);
    // Zod strict typing: string is not a number
    expect(invalid).toHaveLength(1);
  });
});
