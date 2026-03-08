import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '', role: 'distributor', ward: '' });
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    const { data } = await api.get('/api/users');
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/users', form);
      setShowForm(false);
      setForm({ email: '', password: '', name: '', role: 'distributor', ward: '' });
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create user');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await api.delete(`/api/users/${id}`);
    fetchUsers();
  };

  const roleColor = { admin: '#ede9fe', supervisor: '#dbeafe', distributor: '#d1fae5' };
  const roleText = { admin: '#6d28d9', supervisor: '#1d4ed8', distributor: '#065f46' };
  const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box' };

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>User Management</h2>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          + Add User
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Add New User</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Full Name</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Email *</label><input type="email" style={inputStyle} required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Password *</label><input type="password" style={inputStyle} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Role *</label>
              <select style={inputStyle} value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="distributor">Field Distributor</option>
                <option value="supervisor">Supervisor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div><label style={{ fontSize: 12, color: '#374151', display: 'block', marginBottom: 4 }}>Assigned Ward</label><input style={inputStyle} placeholder="e.g. Ward 5" value={form.ward} onChange={e => setForm({ ...form, ward: e.target.value })} /></div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
            <button type="submit" style={{ padding: '8px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Create User</button>
            <button type="button" onClick={() => setShowForm(false)} style={{ padding: '8px 20px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              {['Name', 'Email', 'Role', 'Ward', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#374151', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</td></tr>
            ) : users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}>{u.name || '—'}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{u.email}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 11, background: roleColor[u.role], color: roleText[u.role] }}>{u.role}</span>
                </td>
                <td style={{ padding: '12px 16px', color: '#6b7280' }}>{u.ward || '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button onClick={() => handleDelete(u.id)} style={{ padding: '4px 10px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>Remove</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
