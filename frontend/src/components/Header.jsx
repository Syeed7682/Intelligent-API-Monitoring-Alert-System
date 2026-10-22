import { Activity, Wifi, WifiOff } from 'lucide-react';

export default function Header({ healthStatus }) {
  const isConnected = healthStatus?.database?.connected;
  const isHealthy = healthStatus?.status === 'healthy';

  return (
    <header style={{
      borderBottom: '1px solid #1e2a40',
      background: 'rgba(10,13,20,0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity size={18} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: 800, color: '#f1f5f9' }}>
              API <span className="gradient-text">Monitor</span>
            </h1>
            <p style={{ fontSize: '10px', color: '#475569', marginTop: -2 }}>Intelligent Alert System</p>
          </div>
        </div>

        {/* Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div id="db-status" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {isConnected
              ? <Wifi size={14} color="#22c55e" />
              : <WifiOff size={14} color="#ef4444" />
            }
            <span style={{ fontSize: '12px', color: isConnected ? '#4ade80' : '#f87171' }}>
              {healthStatus ? (isConnected ? 'DB Connected' : 'DB Offline') : 'Checking…'}
            </span>
          </div>

          <div style={{
            padding: '4px 12px', borderRadius: 6,
            background: isHealthy ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${isHealthy ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}>
            <span style={{ fontSize: '11px', fontWeight: 600, color: isHealthy ? '#4ade80' : '#f87171' }}>
              {healthStatus ? (isHealthy ? '● HEALTHY' : '● DEGRADED') : '● LOADING'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
