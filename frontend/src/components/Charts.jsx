import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

const COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  CRITICAL_LATENCY: '#ef4444',
  HIGH_LATENCY: '#f97316',
  SERVER_ERROR: '#dc2626',
  CLIENT_ERROR: '#ea580c',
  ZERO_RECORDS: '#ca8a04',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#141927', border: '1px solid #1e2a40', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: '13px', fontWeight: 600, color: p.color }}>
          {p.name}: {p.value}
          {p.name.toLowerCase().includes('time') ? 'ms' : ''}
        </p>
      ))}
    </div>
  );
}

export function ResponseTimeChart({ alerts }) {
  // Build last-20-alerts timeline
  const data = [...alerts]
    .filter((a) => a.raw_event?.response_time_ms != null)
    .slice(0, 20)
    .reverse()
    .map((a, i) => ({
      name: a.api_name.replace('API', ''),
      'Response Time': a.raw_event.response_time_ms,
      Threshold: 3000,
    }));

  if (data.length === 0) {
    return <ChartEmpty label="No response time data available" />;
  }

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
        Response Time Trend
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e2a40" />
          <XAxis dataKey="name" tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#475569', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px', color: '#64748b' }} />
          <Line type="monotone" dataKey="Response Time" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
          <Line type="monotone" dataKey="Threshold" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AnomalyDistributionChart({ alerts }) {
  const counts = {};
  alerts.forEach((a) => {
    (a.anomalies || []).forEach((anomaly) => {
      counts[anomaly.type] = (counts[anomaly.type] || 0) + 1;
    });
  });

  const data = Object.entries(counts).map(([type, count]) => ({
    name: type.replace(/_/g, ' '),
    value: count,
    color: COLORS[type] || '#64748b',
  }));

  if (data.length === 0) {
    return <ChartEmpty label="No anomaly data available" />;
  }

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '13px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
        Anomaly Distribution
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <ResponsiveContainer width="50%" height={200}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ background: '#141927', border: '1px solid #1e2a40', borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1 }}>
          {data.map((d, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: '#94a3b8', flex: 1 }}>{d.name}</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: d.color }}>{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChartEmpty({ label }) {
  return (
    <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
      <p style={{ color: '#475569', fontSize: '13px' }}>{label}</p>
    </div>
  );
}
