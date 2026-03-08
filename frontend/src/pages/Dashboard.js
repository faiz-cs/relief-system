import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../lib/api';

const StatCard = ({ label, value, color, icon }) => (
  <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${color}` }}>
    <div style={{ fontSize: 28 }}>{icon}</div>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#1a1a2e', marginTop: 8 }}>{value ?? '—'}</div>
    <div style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>{label}</div>
  </div>
);

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/reports/summary').then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Loading dashboard...</div>;

  const pieData = [
    { name: 'Distributed', value: stats?.distributedTokens || 0 },
    { name: 'Pending', value: stats?.pendingTokens || 0 },
    { name: 'Flagged', value: stats?.flaggedTokens || 0 },
  ];
  const COLORS = ['#34d399', '#60a5fa', '#f87171'];

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Dashboard</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard label="Total Houses" value={stats?.totalHouses} color="#3b82f6" icon="🏠" />
        <StatCard label="Total Tokens" value={stats?.totalTokens} color="#8b5cf6" icon="🎫" />
        <StatCard label="Distributed" value={stats?.distributedTokens} color="#10b981" icon="✅" />
        <StatCard label="Pending" value={stats?.pendingTokens} color="#f59e0b" icon="⏳" />
        <StatCard label="Flagged" value={stats?.flaggedTokens} color="#ef4444" icon="⚠️" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a1a2e' }}>Distribution Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#1a1a2e' }}>Active Events</h3>
          {stats?.events?.length === 0 ? (
            <p style={{ color: '#9ca3af' }}>No events yet</p>
          ) : (
            <div>
              {stats?.events?.slice(0, 5).map(event => (
                <div key={event.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: 13, color: '#374151' }}>{event.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: event.status === 'active' ? '#d1fae5' : '#f3f4f6', color: event.status === 'active' ? '#065f46' : '#6b7280' }}>
                    {event.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
