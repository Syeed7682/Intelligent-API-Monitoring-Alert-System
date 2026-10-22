import { Eye, CheckSquare, CheckCircle, ChevronRight } from 'lucide-react';
import { SEVERITY_COLORS, STATUS_LABELS, ANOMALY_LABELS, formatMs, timeAgo } from '../utils/constants.js';

function SeverityBadge({ severity }) {
  const cfg = SEVERITY_COLORS[severity] || SEVERITY_COLORS.low;
  return <span className={`badge ${cfg.badge}`}>{severity}</span>;
}

function StatusBadge({ status }) {
  const cfg = STATUS_LABELS[status] || {};
  return <span className={`badge ${cfg.badge}`}>{cfg.label || status}</span>;
}

function EmptyState() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#475569' }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎉</div>
      <p style={{ fontSize: '16px', fontWeight: 600, color: '#64748b' }}>No alerts found</p>
      <p style={{ fontSize: '13px', marginTop: '6px' }}>All APIs are healthy, or adjust your filters.</p>
    </div>
  );
}

function LoadingRow() {
  return (
    <tr>
      <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#475569' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <div className="spinner" style={{ width: 20, height: 20, border: '2px solid #1e2a40', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
          Loading alerts…
        </div>
      </td>
    </tr>
  );
}

export default function AlertTable({ alerts, loading, onSelect, onResolve, onAcknowledge, actionLoading }) {
  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2a40' }}>
              {['API Name', 'Severity', 'Status', 'Anomalies', 'Resp. Time', 'Detected', 'Actions'].map((h) => (
                <th key={h} style={{
                  padding: '12px 16px', textAlign: 'left',
                  fontSize: '11px', fontWeight: 600, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  whiteSpace: 'nowrap',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <LoadingRow />}
            {!loading && alerts.length === 0 && (
              <tr><td colSpan={7}><EmptyState /></td></tr>
            )}
            {!loading && alerts.map((alert) => (
              <AlertRow
                key={alert._id}
                alert={alert}
                onSelect={onSelect}
                onResolve={onResolve}
                onAcknowledge={onAcknowledge}
                actionLoading={actionLoading}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertRow({ alert, onSelect, onResolve, onAcknowledge, actionLoading }) {
  const isBusy = actionLoading === alert._id;
  const severity = alert.severity || 'low';
  const dot = SEVERITY_COLORS[severity]?.dot || '#94a3b8';

  return (
    <tr
      className="table-row-hover fade-in-up"
      style={{ borderBottom: '1px solid rgba(30,42,64,0.5)', transition: 'background 0.15s' }}
    >
      {/* API Name */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="status-dot pulse-critical" style={{ background: dot, display: alert.severity === 'critical' ? 'inline-block' : 'none' }} />
          <span className="status-dot" style={{ background: dot, display: alert.severity !== 'critical' ? 'inline-block' : 'none' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{alert.api_name}</span>
        </div>
        {alert.occurrence_count > 1 && (
          <span style={{ fontSize: '10px', color: '#475569', marginLeft: '18px' }}>×{alert.occurrence_count} occurrences</span>
        )}
      </td>

      {/* Severity */}
      <td style={{ padding: '14px 16px' }}>
        <SeverityBadge severity={severity} />
      </td>

      {/* Status */}
      <td style={{ padding: '14px 16px' }}>
        <StatusBadge status={alert.status} />
      </td>

      {/* Anomalies */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {(alert.anomalies || []).slice(0, 2).map((a, i) => (
            <span key={i} style={{
              fontSize: '10px', background: '#0f1420', border: '1px solid #1e2a40',
              borderRadius: '4px', padding: '2px 6px', color: '#94a3b8',
            }}>
              {ANOMALY_LABELS[a.type] || a.type}
            </span>
          ))}
          {(alert.anomalies || []).length > 2 && (
            <span style={{ fontSize: '10px', color: '#475569' }}>+{alert.anomalies.length - 2}</span>
          )}
        </div>
      </td>

      {/* Response Time */}
      <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px' }}>
        {formatMs(alert.raw_event?.response_time_ms)}
      </td>

      {/* Detected */}
      <td style={{ padding: '14px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
        {timeAgo(alert.first_seen_at)}
      </td>

      {/* Actions */}
      <td style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <button
            id={`btn-view-${alert._id}`}
            className="btn btn-ghost"
            style={{ padding: '5px 10px', fontSize: '12px' }}
            onClick={() => onSelect(alert)}
            title="View details"
          >
            <Eye size={12} /> View
          </button>

          {alert.status === 'active' && (
            <button
              id={`btn-ack-${alert._id}`}
              className="btn btn-warning"
              style={{ padding: '5px 10px', fontSize: '12px' }}
              onClick={() => onAcknowledge(alert._id)}
              disabled={isBusy}
              title="Acknowledge alert"
            >
              <CheckSquare size={12} />
            </button>
          )}

          {alert.status !== 'resolved' && (
            <button
              id={`btn-resolve-${alert._id}`}
              className="btn btn-success"
              style={{ padding: '5px 10px', fontSize: '12px' }}
              onClick={() => onResolve(alert._id)}
              disabled={isBusy}
              title="Resolve alert"
            >
              <CheckCircle size={12} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
