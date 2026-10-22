export const SEVERITY_COLORS = {
  critical: { badge: 'badge-critical', dot: '#ef4444', text: 'text-red-400', bg: 'bg-red-500/10' },
  high: { badge: 'badge-high', dot: '#f97316', text: 'text-orange-400', bg: 'bg-orange-500/10' },
  medium: { badge: 'badge-medium', dot: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  low: { badge: 'badge-low', dot: '#3b82f6', text: 'text-blue-400', bg: 'bg-blue-500/10' },
};

export const STATUS_LABELS = {
  active: { badge: 'badge-active', label: 'Active' },
  acknowledged: { badge: 'badge-acknowledged', label: 'Acknowledged' },
  resolved: { badge: 'badge-resolved', label: 'Resolved' },
};

export const ANOMALY_LABELS = {
  CRITICAL_LATENCY: '🔴 Critical Latency',
  HIGH_LATENCY: '🟠 High Latency',
  SERVER_ERROR: '❌ Server Error',
  CLIENT_ERROR: '⚠️ Client Error',
  ZERO_RECORDS: '📭 Zero Records',
  INVALID_RESPONSE: '🚫 Invalid Response',
};

export const formatMs = (ms) => {
  if (ms == null) return '—';
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
    hour12: true,
  }).format(new Date(dateStr));
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
