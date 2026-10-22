import mongoose from 'mongoose';

const anomalySchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'HIGH_LATENCY',
      'CRITICAL_LATENCY',
      'SERVER_ERROR',
      'CLIENT_ERROR',
      'ZERO_RECORDS',
      'INVALID_RESPONSE',
    ],
  },
  description: { type: String, required: true },
  observed_value: mongoose.Schema.Types.Mixed,
  threshold: mongoose.Schema.Types.Mixed,
  detected_at: { type: Date, default: Date.now },
}, { _id: false });

const alertSchema = new mongoose.Schema(
  {
    api_name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    event_fingerprint: {
      type: String,
      required: true,
      index: true,
    },
    severity: {
      type: String,
      required: true,
      enum: ['low', 'medium', 'high', 'critical'],
      index: true,
    },
    anomalies: {
      type: [anomalySchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one anomaly is required',
      },
    },
    // AI-generated fields (validated before storage)
    title: { type: String, default: '' },
    message: { type: String, default: '' },
    recommendation: { type: String, default: '' },
    possible_causes: { type: [String], default: [] },
    ai_generated: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['active', 'acknowledged', 'resolved'],
      default: 'active',
      index: true,
    },

    // Raw event data for auditing
    raw_event: {
      response_time_ms: Number,
      status_code: Number,
      records_returned: Number,
    },

    first_seen_at: { type: Date, default: Date.now },
    last_seen_at: { type: Date, default: Date.now },
    occurrence_count: { type: Number, default: 1, min: 1 },
    resolved_at: { type: Date, default: null },
    acknowledged_at: { type: Date, default: null },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

// Compound index for deduplication queries
alertSchema.index({ event_fingerprint: 1, status: 1 });
alertSchema.index({ api_name: 1, status: 1, severity: 1 });
alertSchema.index({ created_at: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
export default Alert;
