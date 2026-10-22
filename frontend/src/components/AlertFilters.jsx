import { Search, Filter, RefreshCw } from 'lucide-react';

export default function AlertFilters({ filters, onChange, onRefresh, loading, lastRefresh }) {
  return (
    <div className="glass-card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input
            id="filter-api-name"
            className="input"
            style={{ paddingLeft: '32px' }}
            placeholder="Search by API name…"
            value={filters.api_name}
            onChange={(e) => onChange({ api_name: e.target.value })}
          />
        </div>

        {/* Severity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} color="#475569" />
          <select
            id="filter-severity"
            className="select"
            value={filters.severity}
            onChange={(e) => onChange({ severity: e.target.value })}
          >
            <option value="">All Severities</option>
            <option value="critical">🔴 Critical</option>
            <option value="high">🟠 High</option>
            <option value="medium">🟡 Medium</option>
            <option value="low">🔵 Low</option>
          </select>
        </div>

        {/* Status */}
        <select
          id="filter-status"
          className="select"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
          <option value="">All Statuses</option>
        </select>

        {/* Refresh */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastRefresh && (
            <span style={{ fontSize: '11px', color: '#475569' }}>
              Updated {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          )}
          <button
            id="btn-refresh"
            className="btn btn-ghost"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spinner' : ''} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
