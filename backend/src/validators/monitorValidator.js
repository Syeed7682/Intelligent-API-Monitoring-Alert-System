import { z } from 'zod';

export const monitorEventSchema = z.object({
  api_name: z
    .string({ required_error: 'api_name is required' })
    .trim()
    .min(1, 'api_name must not be empty')
    .max(255, 'api_name must not exceed 255 characters'),

  response_time_ms: z
    .number({ required_error: 'response_time_ms is required', invalid_type_error: 'response_time_ms must be a number' })
    .finite('response_time_ms must be a finite number')
    .nonnegative('response_time_ms must be non-negative'),

  status_code: z
    .number({ required_error: 'status_code is required', invalid_type_error: 'status_code must be a number' })
    .int('status_code must be an integer')
    .min(100, 'status_code must be a valid HTTP status code (100-599)')
    .max(599, 'status_code must be a valid HTTP status code (100-599)'),

  records_returned: z
    .number({ required_error: 'records_returned is required', invalid_type_error: 'records_returned must be a number' })
    .int('records_returned must be an integer')
    .nonnegative('records_returned must be non-negative'),
});

export const monitorBatchSchema = z.array(monitorEventSchema).min(1, 'Batch must contain at least one event');

/**
 * Validate a single event or batch of events.
 * Returns { valid: [...], invalid: [...] } for batch processing.
 * Invalid items do NOT fail valid ones.
 */
export const validateBatch = (rawItems) => {
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];
  const valid = [];
  const invalid = [];

  items.forEach((item, index) => {
    const result = monitorEventSchema.safeParse(item);
    if (result.success) {
      valid.push(result.data);
    } else {
      invalid.push({
        index,
        input: item,
        errors: result.error.errors.map((e) => ({
          field: e.path.join('.') || 'unknown',
          message: e.message,
        })),
      });
    }
  });

  return { valid, invalid };
};

export default { monitorEventSchema, monitorBatchSchema, validateBatch };
