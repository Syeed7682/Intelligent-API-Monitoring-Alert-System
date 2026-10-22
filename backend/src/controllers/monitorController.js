import { validateBatch } from '../validators/monitorValidator.js';
import { processBatch } from '../services/monitorService.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export const handleMonitor = async (req, res, next) => {
  try {
    const body = req.body;

    if (!body || (typeof body !== 'object' && !Array.isArray(body))) {
      return res.status(400).json({
        success: false,
        error: 'Request body must be a JSON object or array',
      });
    }

    const rawItems = Array.isArray(body) ? body : [body];

    // Enforce batch size limit
    if (rawItems.length > config.batch.maxSize) {
      return res.status(400).json({
        success: false,
        error: `Batch size exceeds maximum of ${config.batch.maxSize} events`,
      });
    }

    const { valid, invalid } = validateBatch(rawItems);

    logger.info(
      { total: rawItems.length, valid: valid.length, invalid: invalid.length },
      'Monitor batch received'
    );

    // Process valid events
    const { processed, failed } = await processBatch(valid);

    const alerts = processed
      .filter((r) => r.anomalies_detected && r.alert)
      .map((r) => ({
        id: r.alert._id,
        api_name: r.alert.api_name,
        severity: r.alert.severity,
        status: r.alert.status,
        is_new: r.isNew,
        title: r.alert.title,
        anomaly_count: r.alert.anomalies?.length || 0,
      }));

    return res.status(200).json({
      success: true,
      summary: {
        total_input: rawItems.length,
        valid_input: valid.length,
        invalid_input: invalid.length,
        processed: processed.length,
        processing_failures: failed.length,
        alerts_generated: alerts.length,
        healthy_responses: processed.filter((r) => !r.anomalies_detected).length,
      },
      alerts,
      validation_errors: invalid,
      processing_errors: failed.map((f) => ({ index: f.index, api_name: f.event?.api_name, error: f.error })),
    });
  } catch (err) {
    next(err);
  }
};

export default { handleMonitor };
