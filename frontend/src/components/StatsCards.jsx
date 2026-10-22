import { AlertTriangle, CheckCircle, Clock, Activity } from 'lucide-react';

export default function StatsCards({ stats, loading }) {
  const cards = [
    {
      id: 'active-alerts',
      label: 'Active Alerts',
      value: loading ? '—' : stats.activeAlerts,
      icon: AlertTriangle,
      color: '#ef4444',
      bg: 'rgba(239,68,68,0.1)',
      glow: 'glow-critical',
      desc: 'requiring attention',
    },
    {
      id: 'critical-alerts',
      label: 'Critical Alerts',
      value: loading ? '—' : stats.criticalAlerts,
      icon: Activity,
      color: '#f97316',
      bg: 'rgba(249,115,22,0.1)',
      glow: 'glow-high',
      desc: 'highest severity',
    },
    {
      id: 'healthy-apis',
      label: 'Healthy APIs',
      value: loading ? '—' : stats.healthyApis,
      icon: CheckCircle,
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.1)',
      desc: 'no active alerts',
    },
    {
      id: 'total-events',
      label: 'Total Alerts',
      value: loading ? '—' : stats.totalAlerts,
      icon: Clock,
      color: '#3b82f6',
      bg: 'rgba(59,130,246,0.1)',
      glow: 'glow-blue',
      desc: 'all time',
    },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div
            key={card.id}
            id={card.id}
            className={`glass-card ${card.glow || ''} fade-in-up`}
            style={{ padding: '20px 24px', transition: 'transform 0.2s, box-shadow 0.2s' }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-2px)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '12px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {card.label}
                </p>
                <p style={{ fontSize: '36px', fontWeight: 800, color: card.color, lineHeight: 1 }}>
                  {card.value}
                </p>
                <p style={{ fontSize: '11px', color: '#475569', marginTop: '6px' }}>{card.desc}</p>
              </div>
              <div style={{ padding: '10px', borderRadius: '10px', background: card.bg }}>
                <Icon size={22} color={card.color} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
