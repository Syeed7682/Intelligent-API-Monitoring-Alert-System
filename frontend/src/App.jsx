import { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header.jsx';
import StatsCards from './components/StatsCards.jsx';
import AlertFilters from './components/AlertFilters.jsx';
import AlertTable from './components/AlertTable.jsx';
import AlertDetailPanel from './components/AlertDetailPanel.jsx';
import SubmitPanel from './components/SubmitPanel.jsx';
import { ResponseTimeChart, AnomalyDistributionChart } from './components/Charts.jsx';
import { getAlerts, resolveAlert, acknowledgeAlert, getHealth } from './api/client.js';

const REFRESH_INTERVAL_MS = 30000;

export default function App() {
  const [alerts, setAlerts] = useState([]);
  const [allActiveAlerts, setAllActiveAlerts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({ status: 'active', severity: '', api_name: '' });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [healthStatus, setHealthStatus] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [error, setError] = useState('');
  const refreshTimer = useRef(null);

  const fetchAlerts = useCallback(async (currentFilters = filters) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (currentFilters.status) params.status = currentFilters.status;
      if (currentFilters.severity) params.severity = currentFilters.severity;
      if (currentFilters.api_name) params.api_name = currentFilters.api_name;
      params.limit = 50;

      const res = await getAlerts(params);
      setAlerts(res.data || []);
      setPagination(res.pagination || {});
      setLastRefresh(Date.now());
    } catch (err) {
      setError(err.message || 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, []);

  // Also fetch all active alerts for charts (no filters)
  const fetchAllActive = useCallback(async () => {
    try {
      const res = await getAlerts({ status: '', limit: 100 });
      setAllActiveAlerts(res.data || []);
    } catch {
      // silently ignore chart data failure
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const h = await getHealth();
      setHealthStatus(h);
    } catch {
      setHealthStatus({ status: 'degraded', database: { connected: false } });
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAlerts(filters);
    fetchAllActive();
    fetchHealth();
  }, []);

  // Auto-refresh
  useEffect(() => {
    refreshTimer.current = setInterval(() => {
      fetchAlerts(filters);
      fetchAllActive();
      fetchHealth();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(refreshTimer.current);
  }, [filters, fetchAlerts, fetchAllActive, fetchHealth]);

  const handleFilterChange = (update) => {
    const newFilters = { ...filters, ...update };
    setFilters(newFilters);
    fetchAlerts(newFilters);
  };

  const handleRefresh = () => {
    fetchAlerts(filters);
    fetchAllActive();
    fetchHealth();
  };

  const handleResolve = async (id) => {
    setActionLoading(id);
    try {
      await resolveAlert(id);
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() } : a));
      if (selectedAlert?._id === id) {
        setSelectedAlert((prev) => ({ ...prev, status: 'resolved' }));
      }
      fetchAllActive();
    } catch (err) {
      setError('Failed to resolve alert');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcknowledge = async (id) => {
    setActionLoading(id);
    try {
      await acknowledgeAlert(id);
      setAlerts((prev) => prev.map((a) => a._id === id ? { ...a, status: 'acknowledged' } : a));
      if (selectedAlert?._id === id) {
        setSelectedAlert((prev) => ({ ...prev, status: 'acknowledged' }));
      }
    } catch (err) {
      setError('Failed to acknowledge alert');
    } finally {
      setActionLoading(null);
    }
  };

  // Stats calculation
  const stats = {
    activeAlerts: allActiveAlerts.filter((a) => a.status === 'active').length,
    criticalAlerts: allActiveAlerts.filter((a) => a.severity === 'critical' && a.status !== 'resolved').length,
    healthyApis: Math.max(0, new Set(allActiveAlerts.map((a) => a.api_name)).size === 0 ? '—' : 'N/A'),
    totalAlerts: pagination.total || 0,
  };
  // Healthy APIs = unique APIs seen - unique APIs with active alerts
  const apisWithAlerts = new Set(allActiveAlerts.filter(a => a.status === 'active').map(a => a.api_name));
  stats.healthyApis = '—'; // Can't determine without knowing all monitored APIs
  if (allActiveAlerts.length > 0) {
    const totalApisSeen = new Set(allActiveAlerts.map(a => a.api_name)).size;
    stats.healthyApis = Math.max(0, totalApisSeen - apisWithAlerts.size);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d14' }}>
      <Header healthStatus={healthStatus} />

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px' }}>
        {/* Error Banner */}
        {error && (
          <div style={{
            marginBottom: 16, padding: '12px 16px',
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 8, color: '#f87171', fontSize: '13px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Overview Cards */}
        <div style={{ marginBottom: 24 }}>
          <StatsCards stats={stats} loading={loading} />
        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <ResponseTimeChart alerts={allActiveAlerts} />
          <AnomalyDistributionChart alerts={allActiveAlerts} />
        </div>

        {/* Submit Panel */}
        <div style={{ marginBottom: 24 }}>
          <SubmitPanel onSuccess={() => { fetchAlerts(filters); fetchAllActive(); }} />
        </div>

        {/* Filters */}
        <div style={{ marginBottom: 16 }}>
          <AlertFilters
            filters={filters}
            onChange={handleFilterChange}
            onRefresh={handleRefresh}
            loading={loading}
            lastRefresh={lastRefresh}
          />
        </div>

        {/* Alert Table */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9' }}>
              Alerts
              {pagination.total > 0 && (
                <span style={{ marginLeft: 8, fontSize: '12px', color: '#475569', fontWeight: 400 }}>
                  ({pagination.total} total)
                </span>
              )}
            </h2>
          </div>
          <AlertTable
            alerts={alerts}
            loading={loading}
            onSelect={setSelectedAlert}
            onResolve={handleResolve}
            onAcknowledge={handleAcknowledge}
            actionLoading={actionLoading}
          />
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid #1e2a40', marginTop: 24 }}>
          <p style={{ fontSize: '11px', color: '#334155' }}>
            API Monitor Dashboard · Auto-refreshes every 30s · All timestamps in local time
          </p>
        </div>
      </main>

      {/* Detail Panel */}
      {selectedAlert && (
        <AlertDetailPanel
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onResolve={async (id) => { await handleResolve(id); }}
          onAcknowledge={async (id) => { await handleAcknowledge(id); }}
          loading={actionLoading === selectedAlert._id}
        />
      )}
    </div>
  );
}
