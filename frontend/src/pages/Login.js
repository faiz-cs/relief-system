import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(email, password);
    if (result.success) navigate('/');
    else setError(result.error);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 40, width: 380, boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🛡</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>ReliefOps</h1>
          <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: 14 }}>Digital Relief Distribution System</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              placeholder="admin@example.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 14, boxSizing: 'border-box' }}
              placeholder="••••••••" />
          </div>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
