import { useState, useEffect, useRef } from 'react';
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
              {['Owner Name', 'Address', 'Ward', 'Members', 'Phone', 'Ration Card', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
            ) : houses.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No houses found</td></tr>
            ) : houses.map(h => (
              <tr key={h.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}>{h.owner_name}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.address}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 99, fontSize: 11 }}>{h.ward}</span></td>
                <td style={{ padding: '12px 16px' }}>{h.members_count}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.phone || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{h.ration_card_number || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => handleDelete(h.id)} style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
