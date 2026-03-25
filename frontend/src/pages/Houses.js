import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../lib/api';

export default function Houses() {
  const [houses, setHouses] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [ward, setWard] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ owner_name: '', address: '', ward: '', members_count: 1, phone: '', email: '', ration_card_number: '' });
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileRef = useRef();

  // QR Modal state
  const [qrModal, setQrModal] = useState(null); // { house, tokens }
  const [qrLoading, setQrLoading] = useState(false);
  const [qrRefreshing, setQrRefreshing] = useState(false);

  const fetchHouses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (ward) params.set('ward', ward);
      const { data } = await api.get(`/api/houses?${params}`);
      setHouses(data.data);
      setTotal(data.count);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchHouses(); }, [search, ward]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/api/houses', form);
    setShowForm(false);
    setForm({ owner_name: '', address: '', ward: '', members_count: 1, phone: '', email: '', ration_card_number: '' });
    fetchHouses();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this house?')) return;
    await api.delete(`/api/houses/${id}`);
    fetchHouses();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/api/houses/import/csv', formData);
      setImportResult(data);
      fetchHouses();
    } catch (err) {
      alert('Import failed');
    } finally { setImporting(false); }
  };

  // ── View QR: fetch all tokens for a house ──────────────────────────────
  const handleViewQR = async (house, isRefresh = false) => {
    if (isRefresh) setQrRefreshing(true);
    else setQrLoading(true);

    try {
      const { data } = await api.get(`/api/houses/${house.id}/tokens`);
      if (isRefresh) {
        setQrModal(prev => ({ ...prev, tokens: data }));
      } else {
        if (!data || data.length === 0) {
          alert('No tokens found for this household. Create an event first to generate tokens.');
          return;
        }
        setQrModal({ house, tokens: data });
      }
    } catch (err) {
      alert('Failed to load tokens');
    } finally {
      setQrLoading(false);
      setQrRefreshing(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'distributed') return { bg: '#f0fdf4', color: '#15803d', border: '#86efac' };
    if (status === 'flagged')     return { bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' };
    return                               { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' };
  };

  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Houses ({total})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => fileRef.current.click()} disabled={importing}
            style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            {importing ? 'Importing...' : '📂 Import CSV'}
          </button>
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            + Add House
          </button>
        </div>
      </div>

      {importResult && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13 }}>
          ✅ Imported {importResult.inserted} houses. Skipped {importResult.skipped}.
          <button onClick={() => setImportResult(null)} style={{ marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#374151' }}>×</button>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Add New House</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Owner Name *</label><input style={inputStyle} required value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Ward *</label><input style={inputStyle} required value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Email <span style={{color:'#9ca3af'}}>(for OTP portal)</span></label><input type="email" style={inputStyle} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Address *</label><input style={inputStyle} required value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Members</label><input style={inputStyle} type="number" min="1" value={form.members_count} onChange={e => setForm({ ...form, members_count: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Ration Card No.</label><input style={inputStyle} value={form.ration_card_number} onChange={e => setForm({ ...form, ration_card_number: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Save</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, display: 'flex', gap: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <input placeholder="Search by owner name..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: 280 }} />
        <input placeholder="Filter by ward..." value={ward} onChange={e => setWard(e.target.value)} style={{ ...inputStyle, width: 160 }} />
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Owner Name', 'Address', 'Ward', 'Members', 'Phone', 'Email', 'Ration Card', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
            ) : houses.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No houses found</td></tr>
            ) : houses.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{h.owner_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.address}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>{h.ward}</span></td>
                <td style={{ padding: '12px 16px' }}>{h.members_count}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.phone || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.email || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.ration_card_number || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => handleViewQR(h)} disabled={qrLoading}
                      style={{ padding: '4px 10px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                      🔍 View QR
                    </button>
                    <button onClick={() => handleDelete(h.id)}
                      style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── QR Modal ─────────────────────────────────────────────────── */}
      {qrModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget) setQrModal(null); }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 680, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>🏠 {qrModal.house.owner_name}</h3>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                  Ward {qrModal.house.ward} • {qrModal.house.address} • {qrModal.house.phone || 'No phone'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleViewQR(qrModal.house, true)} disabled={qrRefreshing}
                  style={{ padding: '6px 12px', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500 }}>
                  {qrRefreshing ? '⟳ Refreshing...' : '🔄 Refresh Status'}
                </button>
                <button onClick={() => setQrModal(null)}
                  style={{ padding: '6px 12px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Info banner */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 12, color: '#1d4ed8' }}>
              💡 Click <strong>Refresh Status</strong> to see the latest collection status. If a household lost their phone, use this panel to show their QR code on screen.
            </div>

            {/* Tokens */}
            {qrModal.tokens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                <p style={{ margin: 0, fontSize: 14 }}>No tokens found for this household.</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>Create an event and tokens will be generated automatically.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {qrModal.tokens.map((token) => {
                  const sc = statusColor(token.status);
                  return (
                    <div key={token.id} style={{ border: `1px solid ${sc.border}`, borderRadius: 12, padding: 16, background: sc.bg }}>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

                        {/* QR Code */}
                        <div style={{ flexShrink: 0, textAlign: 'center' }}>
                          {token.qr_code ? (
                            <img src={token.qr_code} alt="QR Code"
                              style={{ width: 130, height: 130, border: '3px solid #fff', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                       filter: token.status === 'distributed' ? 'grayscale(60%)' : 'none',
                                       opacity: token.status === 'distributed' ? 0.7 : 1 }} />
                          ) : (
                            <div style={{ width: 130, height: 130, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>No QR</div>
                          )}
                          {/* Status badge overlaid */}
                          <div style={{ marginTop: 6, display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: sc.border, color: sc.color }}>
                            {token.status === 'distributed' ? '✓ Collected' : token.status === 'flagged' ? '⚠ Flagged' : '⏳ Pending'}
                          </div>
                        </div>

                        {/* Token Details */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', marginBottom: 8 }}>
                            {token.events?.name || 'Unknown Event'}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
                            📅 {token.events?.start_date} — {token.events?.end_date}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                            🎫 Token: <span style={{ fontFamily: 'monospace', color: '#374151' }}>{token.token_code}</span>
                          </div>

                          {token.status === 'distributed' && (
                            <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#374151', border: '1px solid #d1fae5' }}>
                              ✅ <strong>Already collected</strong>
                              {token.distributed_at && <span style={{ color: '#6b7280' }}> on {new Date(token.distributed_at).toLocaleString()}</span>}
                            </div>
                          )}

                          {token.status === 'pending' && (
                            <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#374151', border: '1px solid #bfdbfe' }}>
                              ⏳ <strong>Not yet collected</strong> — show this QR to the distributor
                            </div>
                          )}

                          {token.status === 'flagged' && (
                            <div style={{ background: '#fff', borderRadius: 6, padding: '8px 10px', fontSize: 12, color: '#dc2626', border: '1px solid #fca5a5' }}>
                              ⚠️ <strong>Flagged</strong> — contact supervisor for review
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p style={{ margin: '20px 0 0', fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              Admin view — for cases where household lost phone or has no device access
            </p>
          </div>
        </div>
      )}
    </div>
  );
}