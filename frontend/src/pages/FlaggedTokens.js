import { useState, useEffect } from 'react';
import api from '../lib/api';

export default function FlaggedTokens() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [note, setNote] = useState('');

  const fetchFlagged = async () => {
    const { data } = await api.get('/api/tokens/flagged/all');
    setTokens(data);
    setLoading(false);
  };

  useEffect(() => { fetchFlagged(); }, []);

  const handleResolve = async (id) => {
    if (!note.trim()) { alert('Please add a resolution note'); return; }
    await api.patch(`/api/tokens/${id}/resolve`, { resolution_note: note });
    setResolving(null);
    setNote('');
    fetchFlagged();
  };

  const severityColor = { HIGH: '#fef2f2', MEDIUM: '#fffbeb' };
  const severityText = { HIGH: '#dc2626', MEDIUM: '#d97706' };

  return (
    <div style={{ padding: 32 }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>Flagged Tokens</h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: '#6b7280' }}>Tokens flagged by the fraud detection system. Review and resolve each case.</p>

      {loading ? <p style={{ color: '#9ca3af' }}>Loading...</p> :
        tokens.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <p style={{ color: '#10b981', fontWeight: 600 }}>No flagged tokens</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {tokens.map(token => (
              <div key={token.id} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #f59e0b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <code style={{ fontSize: 12, color: '#6b7280', background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>{token.token_code}</code>
                    <p style={{ margin: '6px 0 2px', fontWeight: 600, color: '#1a1a2e' }}>{token.houses?.owner_name}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>Ward: {token.houses?.ward} | Event: {token.events?.name}</p>
                  </div>
                  <button onClick={() => setResolving(resolving === token.id ? null : token.id)}
                    style={{ padding: '6px 14px', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                    {resolving === token.id ? 'Cancel' : 'Resolve'}
                  </button>
                </div>

                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {token.fraud_flags?.map((flag, i) => (
                    <div key={i} style={{ background: severityColor[flag.severity] || '#f9fafb', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: severityText[flag.severity] || '#374151' }}>[{flag.severity}] {flag.rule}</span>
                      <span style={{ color: '#6b7280', marginLeft: 8 }}>{flag.message}</span>
                    </div>
                  ))}
                </div>

                {resolving === token.id && (
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <input value={note} onChange={e => setNote(e.target.value)} placeholder="Resolution note (required)..."
                      style={{ flex: 1, padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13 }} />
                    <button onClick={() => handleResolve(token.id)}
                      style={{ padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                      Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      }
    </div>
  );
}
