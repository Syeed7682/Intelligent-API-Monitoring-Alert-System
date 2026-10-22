import { useState } from 'react';
import { X, Bot, AlertTriangle, Lightbulb, CheckCircle, CheckSquare, ExternalLink, Mail } from 'lucide-react';
import { SEVERITY_COLORS, STATUS_LABELS, ANOMALY_LABELS, formatMs, formatDate } from '../utils/constants.js';
import { sendAlertEmail } from '../api/client.js';

export default function AlertDetailPanel({ alert, onClose, onResolve, onAcknowledge, loading }) {
  const [emailStatus, setEmailStatus] = useState('');
  if (!alert) return null;

  const handleSendEmail = async () => {
    try {
      setEmailStatus('sending');
      await sendAlertEmail(alert._id, 'oncall-team@example.com');
      setEmailStatus('sent');
      setTimeout(() => setEmailStatus(''), 4000);
    } catch {
      setEmailStatus('error');
      setTimeout(() => setEmailStatus(''), 4000);
    }
  };

  const severity = alert.severity || 'low';
  const sev = SEVERITY_COLORS[severity];
  const status = STATUS_LABELS[alert.status] || {};

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-card fade-in-up"
        style={{
          width: '100%', maxWidth: '680px', maxHeight: '88vh',
          overflowY: 'auto', padding: '28px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <span className={`badge ${sev.badge}`}>{severity}</span>
              <span className={`badge ${status.badge}`}>{status.label}</span>
              {alert.ai_generated && (
                <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)' }}>
                  <Bot size={10} /> AI Generated
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#f1f5f9', marginBottom: 4 }}>
              {alert.title || `Alert: ${alert.api_name}`}
            </h2>
            <p style={{ fontSize: '12px', color: '#475569' }}>
              API: <strong style={{ color: '#94a3b8' }}>{alert.api_name}</strong>
              {' · '}First seen: {formatDate(alert.first_seen_at)}
              {alert.occurrence_count > 1 && ` · ${alert.occurrence_count} occurrences`}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} id="btn-close-detail">
            <X size={16} />
          </button>
        </div>

        {/* AI Message */}
        {alert.message && (
          <Section icon={<AlertTriangle size={14} color="#f97316" />} title="What Happened" accent="#f97316">
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>{alert.message}</p>
          </Section>
        )}

        {/* Recommendation */}
        {alert.recommendation && (
          <Section icon={<Lightbulb size={14} color="#3b82f6" />} title="Recommended Action" accent="#3b82f6">
            <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: 1.7 }}>{alert.recommendation}</p>
          </Section>
        )}

        {/* Possible Causes */}
        {alert.possible_causes?.length > 0 && (
          <Section icon={<ExternalLink size={14} color="#8b5cf6" />} title="Possible Causes" accent="#8b5cf6">
            <ul style={{ paddingLeft: 0, listStyle: 'none' }}>
              {alert.possible_causes.map((c, i) => (
                <li key={i} style={{ fontSize: '13px', color: '#94a3b8', marginBottom: 6, display: 'flex', gap: 8 }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 700 }}>•</span> {c}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Detected Anomalies */}
        <Section icon={<AlertTriangle size={14} color="#ef4444" />} title="Detected Anomalies" accent="#ef4444">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(alert.anomalies || []).map((a, i) => (
              <div key={i} style={{
                background: '#0f1420', border: '1px solid #1e2a40',
                borderRadius: 8, padding: '10px 14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                    {ANOMALY_LABELS[a.type] || a.type}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: '#64748b' }}>{a.description}</p>
                {a.observed_value != null && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 16 }}>
                    <Kv label="Observed" value={a.type.includes('LATENCY') ? formatMs(a.observed_value) : String(a.observed_value)} />
                    {a.threshold != null && (
                      <Kv label="Threshold" value={a.type.includes('LATENCY') ? formatMs(a.threshold) : String(a.threshold)} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Section>

        {/* Raw Event Data */}
        {alert.raw_event && (
          <Section icon={null} title="Event Snapshot" accent="#334155">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <Kv label="Response Time" value={formatMs(alert.raw_event.response_time_ms)} />
              <Kv label="HTTP Status" value={String(alert.raw_event.status_code)} />
              <Kv label="Records Returned" value={String(alert.raw_event.records_returned)} />
            </div>
          </Section>
        )}

        {/* Actions */}
        {alert.status !== 'resolved' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 20, borderTop: '1px solid #1e2a40' }}>
            {alert.status === 'active' && (
              <button
                id="btn-detail-ack"
                className="btn btn-warning"
                onClick={() => onAcknowledge(alert._id)}
                disabled={loading}
              >
                <CheckSquare size={14} />
                Acknowledge
              </button>
            )}
            <button
              id="btn-detail-resolve"
              className="btn btn-success"
              onClick={() => onResolve(alert._id)}
              disabled={loading}
            >
              <CheckCircle size={14} />
              Mark Resolved
            </button>
            <button
              id="btn-detail-email"
              className="btn btn-ghost"
              onClick={handleSendEmail}
              disabled={emailStatus === 'sending'}
              style={{
                borderColor: emailStatus === 'sent' ? '#22c55e' : undefined,
                color: emailStatus === 'sent' ? '#4ade80' : undefined,
              }}
            >
              <Mail size={14} />
              {emailStatus === 'sending' ? 'Sending…' : emailStatus === 'sent' ? '✓ Email Dispatched' : 'Email Report'}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, accent, children }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {icon}
        <h3 style={{ fontSize: '12px', fontWeight: 700, color: accent || '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function Kv({ label, value }) {
  return (
    <div>
      <p style={{ fontSize: '10px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>{label}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8' }}>{value}</p>
    </div>
  );
}
