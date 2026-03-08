import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', start_date: '', end_date: '', wards: '', items: '' });
  const { user } = useAuth();

  const fetchEvents = async () => {
    const { data } = await api.get('/api/events');
    setEvents(data);
    setLoading(false);
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        ...form,
        wards: form.wards ? form.wards.split(',').map(w => w.trim()) : [],
        items: form.items ? form.items.split(',').map(i => i.trim()) : [],
      };
      const { data } = await api.post('/api/events', payload);
      alert(`✅ Event created! ${data.tokensGenerated} tokens generated.`);
      setShowForm(false);
      fetchEvents();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create event');
    } finally { setCreating(false); }
  };

  const handleClose = async (id) => {
    if (!window.confirm('Close this event? No more distributions will be allowed.')) return;
    await api.patch(`/api/events/${id}/close`);
    fetchEvents();
  };

  const statusColor = { active: '#d1fae5', closed: '#f3f4f6', draft: '#fef3c7' };
  const statusText = { active: '#065f46', closed: '#6b7280', draft: '#92400e' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Relief Events</h2>
        {user?.role === 'admin' && (
          <button onClick={() => setShowForm(!showForm)}
            style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
            + Create Event
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Create New Event</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Event Name *</label><input style={inputStyle} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div style={{ gridColumn: 'span 2' }}><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Description</label><textarea style={{ ...inputStyle, height: 72 }} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Start Date *</label><input style={inputStyle} type="datetime-local" required value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>End Date *</label><input style={inputStyle} type="datetime-local" required value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Wards (comma separated, empty = all)</label><input style={inputStyle} placeholder="Ward 1, Ward 2" value={form.wards} onChange={e => setForm({ ...form, wards: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Relief Items</label><input style={inputStyle} placeholder="Rice 5kg, Oil 1L" value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} /></div>
          </div>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '12px 0 16px' }}>⚠️ Tokens will be auto-generated for all eligible houses immediately after creation.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" disabled={creating} style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, opacity: creating ? 0.7 : 1 }}>
              {creating ? 'Creating & Generating Tokens...' : 'Create Event'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading ? <p style={{ color: '#9ca3af' }}>Loading...</p> :
          events.length === 0 ? <p style={{ color: '#9ca3af' }}>No events yet. Create your first event.</p> :
          events.map(event => (
            <div key={event.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#1a1a2e' }}>{event.name}</h3>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: statusColor[event.status], color: statusText[event.status] }}>{event.status}</span>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280' }}>{event.description || 'No description'}</p>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>
                📅 {new Date(event.start_date).toLocaleDateString()} — {new Date(event.end_date).toLocaleDateString()}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Link to={`/events/${event.id}`} style={{ flex: 1, padding: '7px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, fontSize: 12, textAlign: 'center', textDecoration: 'none', fontWeight: 500 }}>
                  View Details
                </Link>
                {user?.role === 'admin' && event.status === 'active' && (
                  <button onClick={() => handleClose(event.id)} style={{ padding: '7px 12px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    Close
                  </button>
                )}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
