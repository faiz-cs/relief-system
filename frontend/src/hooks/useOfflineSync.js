import { useState, useEffect } from 'react';
import api from '../lib/api';

const DB_NAME = 'relief-offline-db';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('tokens')) {
        db.createObjectStore('tokens', { keyPath: 'token_code' });
      }
      if (!db.objectStoreNames.contains('pending_scans')) {
        db.createObjectStore('pending_scans', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const onOnline = () => { setIsOnline(true); syncPending(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Cache tokens for offline use
  const cacheTokens = async (tokens) => {
    const db = await openDB();
    const tx = db.transaction('tokens', 'readwrite');
    tokens.forEach(t => tx.objectStore('tokens').put(t));
    await new Promise(r => tx.oncomplete = r);
  };

  // Lookup token offline
  const getTokenOffline = async (tokenCode) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tokens', 'readonly');
      const req = tx.objectStore('tokens').get(tokenCode);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  };

  // Queue a scan for later sync
  const queueScan = async (tokenCode) => {
    const db = await openDB();
    const tx = db.transaction('pending_scans', 'readwrite');
    tx.objectStore('pending_scans').add({ tokenCode, queuedAt: new Date().toISOString() });
    await new Promise(r => tx.oncomplete = r);
    updatePendingCount();
  };

  const updatePendingCount = async () => {
    const db = await openDB();
    const tx = db.transaction('pending_scans', 'readonly');
    const req = tx.objectStore('pending_scans').count();
    req.onsuccess = () => setPendingCount(req.result);
  };

  // Sync pending scans when online
  const syncPending = async () => {
    const db = await openDB();
    const tx = db.transaction('pending_scans', 'readwrite');
    const store = tx.objectStore('pending_scans');
    const all = await new Promise(r => { const req = store.getAll(); req.onsuccess = () => r(req.result); });

    for (const scan of all) {
      try {
        await api.post('/api/tokens/distribute', { token_code: scan.tokenCode });
        store.delete(scan.id);
      } catch (err) {
        console.error('Sync failed for', scan.tokenCode, err);
      }
    }
    updatePendingCount();
  };

  useEffect(() => { updatePendingCount(); }, []);

  return { isOnline, pendingCount, cacheTokens, getTokenOffline, queueScan, syncPending };
}
