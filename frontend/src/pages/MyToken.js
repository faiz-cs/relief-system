import { useState } from 'react';
import api from '../lib/api';

const STEPS = { PHONE: 'PHONE', OTP: 'OTP', TOKENS: 'TOKENS' };

// ─── Styles ───────────────────────────────────────────────────────────────────
const card = {
  background: '#fff',
  borderRadius: 16,
  padding: 32,
  width: '100%',
  maxWidth: 420,
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const btn = (color = '#2563eb') => ({
  width: '100%',
  padding: '13px',
  background: color,
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
  marginTop: 8,
});

const input = {
  width: '100%',
  padding: '12px 14px',
  border: '1.5px solid #e5e7eb',
  borderRadius: 10,
  fontSize: 15,
  boxSizing: 'border-box',
  outline: 'none',
  transition: 'border-color 0.2s',
};

const errBox = {
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 8,
  padding: '10px 14px',
  color: '#dc2626',
  fontSize: 13,
  marginTop: 12,
};

// ─── Step 1: Phone Entry ──────────────────────────────────────────────────────
function PhoneStep({ onNext }) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/portal/request-otp', { phone });
      onNext({ phone, maskedEmail: data.maskedEmail, devOtp: data.devOtp });
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={card}>
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>🏠</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Get Your Relief Token</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>Enter the phone number registered at your household</p>
      </div>

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          Registered Phone Number
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g. 9876543210"
          required
          style={input}
        />
        {error && <div style={errBox}>{error}</div>}
        <button type="submit" disabled={loading} style={btn()}>
          {loading ? 'Sending OTP...' : 'Send OTP →'}
        </button>
      </form>

      <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#9ca3af' }}>
        Phone not registered? Contact your ward office.
      </p>
    </div>
  );
}

// ─── Step 2: OTP Verification ─────────────────────────────────────────────────
function OTPStep({ phone, maskedEmail, devOtp, onNext, onBack }) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/api/portal/verify-otp', { phone, otp });
      onNext(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.post('/api/portal/request-otp', { phone });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={card}>
      <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: 13, padding: 0, marginBottom: 20 }}>
        ← Back
      </button>

      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }}>📧</div>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111827' }}>Enter OTP</h2>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6b7280' }}>
          A 6-digit OTP was sent to <strong>{maskedEmail}</strong>
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>Valid for 5 minutes</p>
      </div>

      {/* Dev mode helper */}
      {devOtp && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#166534', textAlign: 'center' }}>
          🧪 <strong>Dev Mode OTP: {devOtp}</strong>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
          6-Digit OTP
        </label>
        <input
          type="text"
          value={otp}
          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          required
          maxLength={6}
          style={{ ...input, fontSize: 24, letterSpacing: 12, textAlign: 'center', fontWeight: 700 }}
        />
        {error && <div style={errBox}>{error}</div>}
        <button type="submit" disabled={loading || otp.length !== 6} style={{ ...btn(), opacity: otp.length !== 6 ? 0.6 : 1 }}>
          {loading ? 'Verifying...' : 'Verify OTP →'}
        </button>
      </form>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        {resent
          ? <p style={{ fontSize: 13, color: '#10b981' }}>✅ OTP resent successfully</p>
          : <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontSize: 13 }}>
              {resending ? 'Resending...' : "Didn't receive OTP? Resend"}
            </button>
        }
      </div>
    </div>
  );
}

// ─── Step 3: Token Display ────────────────────────────────────────────────────
function TokensStep({ ownerName, tokens, onReset }) {
  const [selected, setSelected] = useState(0);

  const activeTokens = tokens.filter(t => t.events?.status === 'active');
  const pastTokens = tokens.filter(t => t.events?.status !== 'active');
  const displayTokens = activeTokens.length > 0 ? activeTokens : tokens;
  const token = displayTokens[selected];

  const statusColor = token?.status === 'distributed' ? '#dcfce7' : '#fef3c7';
  const statusTextColor = token?.status === 'distributed' ? '#166534' : '#92400e';
  const statusLabel = token?.status === 'distributed' ? '✅ Already Collected' : '⏳ Pending Collection';

  return (
    <div style={{ ...card, maxWidth: 480 }}>
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>👋</div>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111827' }}>Hello, {ownerName}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
          {activeTokens.length > 0
            ? `You have ${activeTokens.length} active relief token(s)`
            : 'No active relief events at the moment'}
        </p>
      </div>

      {tokens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
          <p>No tokens found for your household yet.</p>
          <p style={{ fontSize: 12 }}>Check back when a relief event is announced.</p>
        </div>
      ) : (
        <>
          {/* Event selector if multiple tokens */}
          {displayTokens.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
              {displayTokens.map((t, i) => (
                <button key={t.id} onClick={() => setSelected(i)}
                  style={{ padding: '6px 14px', borderRadius: 99, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12, fontWeight: 600,
                    background: selected === i ? '#2563eb' : '#f3f4f6', color: selected === i ? '#fff' : '#374151' }}>
                  {t.events?.name}
                </button>
              ))}
            </div>
          )}

          {token && (
            <div>
              {/* Event Info */}
              <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: 15, marginBottom: 4 }}>{token.events?.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  📅 {new Date(token.events?.start_date).toLocaleDateString('en-IN')} — {new Date(token.events?.end_date).toLocaleDateString('en-IN')}
                </div>
                {token.events?.items?.length > 0 && (
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                    📦 {token.events.items.join(', ')}
                  </div>
                )}
              </div>

              {/* Status badge */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span style={{ background: statusColor, color: statusTextColor, padding: '6px 18px', borderRadius: 99, fontSize: 13, fontWeight: 600 }}>
                  {statusLabel}
                </span>
              </div>

              {/* QR Code */}
              {token.status !== 'distributed' ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ display: 'inline-block', padding: 12, background: '#fff', border: '2px solid #e5e7eb', borderRadius: 12, marginBottom: 12 }}>
                    <img src={token.qr_code} alt="QR Code" style={{ width: 200, height: 200, display: 'block' }} />
                  </div>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 4px' }}>Show this QR code to the distributor</p>
                  <code style={{ fontSize: 11, color: '#9ca3af', background: '#f3f4f6', padding: '3px 8px', borderRadius: 4 }}>
                    {token.token_code}
                  </code>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                  <p style={{ fontSize: 13 }}>Relief collected on {new Date(token.distributed_at).toLocaleString('en-IN')}</p>
                </div>
              )}

              {/* House info */}
              <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0f9ff', borderRadius: 10, fontSize: 12, color: '#374151' }}>
                🏠 {token.houses?.owner_name} · Ward: {token.houses?.ward} · Members: {token.houses?.members_count}
              </div>
            </div>
          )}

          {/* Past tokens section */}
          {activeTokens.length > 0 && pastTokens.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>Past Events</p>
              {pastTokens.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderTop: '1px solid #f3f4f6', fontSize: 12, color: '#9ca3af' }}>
                  <span>{t.events?.name}</span>
                  <span>{t.status === 'distributed' ? '✅ Collected' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <button onClick={onReset} style={{ ...btn('#6b7280'), marginTop: 20 }}>
        🔒 Exit & Clear
      </button>
    </div>
  );
}

// ─── Main Portal Page ─────────────────────────────────────────────────────────
export default function MyToken() {
  const [step, setStep] = useState(STEPS.PHONE);
  const [phoneData, setPhoneData] = useState(null);
  const [tokenData, setTokenData] = useState(null);

  const handlePhoneNext = (data) => { setPhoneData(data); setStep(STEPS.OTP); };
  const handleOTPNext = (data) => { setTokenData(data); setStep(STEPS.TOKENS); };
  const handleReset = () => { setStep(STEPS.PHONE); setPhoneData(null); setTokenData(null); };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a5f 0%, #1a56db 50%, #0ea5e9 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 28, color: '#fff' }}>
        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, opacity: 0.8, marginBottom: 4 }}>🛡 RELIEFOPS</div>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.6 }}>Household Relief Portal</p>
      </div>

      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
        {[STEPS.PHONE, STEPS.OTP, STEPS.TOKENS].map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700,
              background: step === s ? '#fff' : Object.keys(STEPS).indexOf(step) > i ? '#34d399' : 'rgba(255,255,255,0.3)',
              color: step === s ? '#1a56db' : '#fff',
            }}>
              {Object.keys(STEPS).indexOf(step) > i ? '✓' : i + 1}
            </div>
            {i < 2 && <div style={{ width: 32, height: 2, background: Object.keys(STEPS).indexOf(step) > i ? '#34d399' : 'rgba(255,255,255,0.3)', borderRadius: 2 }} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === STEPS.PHONE && <PhoneStep onNext={handlePhoneNext} />}
      {step === STEPS.OTP && (
        <OTPStep
          phone={phoneData?.phone}
          maskedEmail={phoneData?.maskedEmail}
          devOtp={phoneData?.devOtp}
          onNext={handleOTPNext}
          onBack={() => setStep(STEPS.PHONE)}
        />
      )}
      {step === STEPS.TOKENS && (
        <TokensStep
          ownerName={tokenData?.ownerName}
          tokens={tokenData?.tokens || []}
          onReset={handleReset}
        />
      )}

      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 24 }}>
        For help, contact your ward office
      </p>
    </div>
  );
}
