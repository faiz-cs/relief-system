import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import api from '../lib/api';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Scanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const videoRef = useRef();
  const canvasRef = useRef();
  const animRef = useRef();
  const { isOnline, queueScan, getTokenOffline } = useOfflineSync();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      setScanning(true);
      scanFrame();
    } catch (err) {
      setError('Camera access denied. Use manual entry below.');
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject;
    stream?.getTracks().forEach(t => t.stop());
    setScanning(false);
    cancelAnimationFrame(animRef.current);
  };

  const scanFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code) {
        stopCamera();
        handleQRData(code.data);
        return;
      }
    }
    animRef.current = requestAnimationFrame(scanFrame);
  };

  const handleQRData = async (rawData) => {
    try {
      const parsed = JSON.parse(rawData);
      await distributeToken(parsed.tokenCode);
    } catch {
      await distributeToken(rawData);
    }
  };

  const distributeToken = async (tokenCode) => {
    setProcessing(true);
    setError('');
    setResult(null);

    if (!isOnline) {
      // Offline: check local cache and queue
      const cached = await getTokenOffline(tokenCode);
      if (!cached) { setError('Token not found in offline cache.'); setProcessing(false); return; }
      if (cached.status === 'distributed') { setError('⚠ Token already distributed.'); setProcessing(false); return; }
      await queueScan(tokenCode);
      setResult({ offline: true, token: cached });
      setProcessing(false);
      return;
    }

    try {
      const { data } = await api.post('/api/tokens/distribute', { token_code: tokenCode });
      setResult({ success: true, ...data });
    } catch (err) {
      const errData = err.response?.data;
      if (errData?.flags) {
        setResult({ blocked: true, flags: errData.flags });
      } else {
        setError(errData?.error || 'Distribution failed');
      }
    } finally { setProcessing(false); }
  };

  const handleManual = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await distributeToken(manualCode.trim().toUpperCase());
    setManualCode('');
  };

  const reset = () => { setResult(null); setError(''); };

  return (
    <div style={{ padding: 32, maxWidth: 520, margin: '0 auto' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#1a1a2e' }}>QR Scanner</h2>
      <p style={{ margin: '0 0 24px', fontSize: 13, color: isOnline ? '#10b981' : '#f59e0b' }}>
        {isOnline ? '🟢 Online — scans sync immediately' : '🟡 Offline — scans will sync when connected'}
      </p>

      {!result && (
        <>
          <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
            <video ref={videoRef} style={{ width: '100%', borderRadius: 8, display: scanning ? 'block' : 'none', maxHeight: 280 }} />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
            {!scanning && (
              <div style={{ padding: '40px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>📷</div>
                <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: 13 }}>Point camera at a QR code</p>
              </div>
            )}
            <button onClick={scanning ? stopCamera : startCamera}
              style={{ padding: '10px 28px', background: scanning ? '#dc2626' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
              {scanning ? '⏹ Stop' : '▶ Start Camera'}
            </button>
          </div>

          <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, color: '#374151', fontWeight: 600 }}>Manual Token Entry</p>
            <form onSubmit={handleManual} style={{ display: 'flex', gap: 8 }}>
              <input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Enter token code..."
                style={{ flex: 1, padding: '9px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, fontFamily: 'monospace', textTransform: 'uppercase' }} />
              <button type="submit" disabled={processing}
                style={{ padding: '9px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                {processing ? '...' : 'Submit'}
              </button>
            </form>
          </div>

          {error && (
            <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14, color: '#dc2626', fontSize: 13 }}>
              {error}
            </div>
          )}
        </>
      )}

      {result && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
          {result.success && (
            <>
              <div style={{ fontSize: 56, marginBottom: 8 }}>✅</div>
              <h3 style={{ color: '#065f46', margin: '0 0 8px' }}>Distribution Successful</h3>
              <p style={{ color: '#374151', fontSize: 13 }}>{result.token?.houses?.owner_name}</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>{result.token?.houses?.address}</p>
              {result.warnings?.length > 0 && (
                <div style={{ marginTop: 12, background: '#fffbeb', borderRadius: 6, padding: 10, fontSize: 12, color: '#92400e' }}>
                  ⚠ {result.warnings.length} warning(s) logged for review
                </div>
              )}
            </>
          )}
          {result.offline && (
            <>
              <div style={{ fontSize: 56, marginBottom: 8 }}>📶</div>
              <h3 style={{ color: '#92400e', margin: '0 0 8px' }}>Queued for Sync</h3>
              <p style={{ color: '#374151', fontSize: 13 }}>{result.token?.houses?.owner_name}</p>
              <p style={{ color: '#6b7280', fontSize: 12 }}>Will sync when online</p>
            </>
          )}
          {result.blocked && (
            <>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🚫</div>
              <h3 style={{ color: '#dc2626', margin: '0 0 8px' }}>Distribution Blocked</h3>
              {result.flags?.map((f, i) => (
                <div key={i} style={{ background: '#fef2f2', borderRadius: 6, padding: 8, margin: '6px 0', fontSize: 12, color: '#dc2626' }}>
                  {f.rule}: {f.message}
                </div>
              ))}
            </>
          )}
          <button onClick={reset} style={{ marginTop: 20, padding: '10px 28px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
}
