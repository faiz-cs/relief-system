import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

export default function EventDetail() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/api/events/${id}`),
      api.get(`/api/tokens/event/${id}`)
    ]).then(([evRes, tokRes]) => {
      setEvent(evRes.data);
      setTokens(tokRes.data);
    }).finally(() => setLoading(false));
  }, [id]);

  const handleExportCSV = () => window.open(`${process.env.REACT_APP_API_URL}/api/reports/export/csv/${id}`, '_blank');
  const handleExportPDF = () => window.open(`${process.env.REACT_APP_API_URL}/api/reports/export/pdf/${id}`, '_blank');

  const filtered = tokens.filter(t => {
    if (filter === 'distributed') return t.status === 'distributed';
    if (filter === 'pending') return t.status === 'pending';
    if (filter === 'flagged') return t.is_flagged;
    return true;
  });

  if (loading) return <div style={{ padding: 40, color: '#6b7280' }}>Loading...</div>;
  if (!event) return <div style={{ padding: 40, color: '#dc2626' }}>Event not found</div>;

  const statPill = (label, value, color) => (
    <div style={{ background: color, borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: 32 }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{event.name}</h2>
        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>{event.description}</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {statPill('Total', event.stats?.total, '#f0f9ff')}
          {statPill('Distributed', event.stats?.distributed, '#f0fdf4')}
          {statPill('Pending', event.stats?.pending, '#fffbeb')}
          {statPill('Flagged', event.stats?.flagged, '#fef2f2')}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'distributed', 'pending', 'flagged'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '6px 14px', background: filter === f ? '#3b82f6' : '#f3f4f6', color: filter === f ? '#fff' : '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, textTransform: 'capitalize' }}>
              {f}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} style={{ padding: '7px 14px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>⬇ CSV</button>
          <button onClick={handleExportPDF} style={{ padding: '7px 14px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>⬇ PDF</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Token Code', 'Owner', 'Ward', 'Status', 'Distributed At', 'Flags'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>No tokens found</td></tr>
            ) : filtered.map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #f3f4f6', background: t.is_flagged ? '#fff7ed' : 'white' }}>
                <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 11 }}>{t.token_code}</td>
                <td style={{ padding: '10px 16px' }}>{t.houses?.owner_name}</td>
                <td style={{ padding: '10px 16px' }}>{t.houses?.ward}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: t.status === 'distributed' ? '#d1fae5' : '#fef3c7', color: t.status === 'distributed' ? '#065f46' : '#92400e' }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: '#6b7280', fontSize: 12 }}>{t.distributed_at ? new Date(t.distributed_at).toLocaleString() : '—'}</td>
                <td style={{ padding: '10px 16px' }}>
                  {t.is_flagged ? <span style={{ color: '#dc2626', fontSize: 12 }}>⚠ {t.fraud_flags?.length} flag(s)</span> : <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
