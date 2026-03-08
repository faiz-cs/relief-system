import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useOfflineSync } from '../hooks/useOfflineSync';

export default function Layout() {
  const { user, logout } = useAuth();
  const { isOnline, pendingCount } = useOfflineSync();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const navItems = [
    { to: '/', label: '📊 Dashboard', roles: ['admin', 'supervisor', 'distributor'] },
    { to: '/houses', label: '🏠 Houses', roles: ['admin', 'supervisor'] },
    { to: '/events', label: '📅 Events', roles: ['admin', 'supervisor'] },
    { to: '/scanner', label: '📱 Scanner', roles: ['admin', 'supervisor', 'distributor'] },
    { to: '/flagged', label: '⚠️ Flagged', roles: ['admin', 'supervisor'] },
    { to: '/users', label: '👥 Users', roles: ['admin'] },
  ].filter(item => item.roles.includes(user?.role));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: '#1a1a2e', color: '#fff', padding: '24px 0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid #ffffff22' }}>
          <h1 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#60a5fa' }}>🛡 ReliefOps</h1>
          <p style={{ fontSize: 11, margin: '4px 0 0', color: '#9ca3af' }}>{user?.name || user?.email}</p>
          <span style={{ fontSize: 10, background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: 99, textTransform: 'uppercase' }}>{user?.role}</span>
        </div>
        <nav style={{ flex: 1, padding: '16px 0' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}
              style={({ isActive }) => ({
                display: 'block', padding: '10px 20px', color: isActive ? '#60a5fa' : '#d1d5db',
                textDecoration: 'none', fontSize: 14, background: isActive ? '#ffffff11' : 'transparent',
                borderLeft: isActive ? '3px solid #60a5fa' : '3px solid transparent',
              })}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #ffffff22', borderBottom: '1px solid #ffffff22', marginBottom: 8 }}>
          <a href="/my-token" target="_blank" rel="noreferrer"
            style={{ display: 'block', fontSize: 12, color: '#fbbf24', textDecoration: 'none' }}>
            🔗 Household Portal ↗
          </a>
          <p style={{ fontSize: 10, color: '#6b7280', margin: '3px 0 0' }}>Share this link with households</p>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 12, marginBottom: 8, color: isOnline ? '#34d399' : '#f87171' }}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
            {pendingCount > 0 && <span style={{ marginLeft: 8, color: '#fbbf24' }}>({pendingCount} pending)</span>}
          </div>
          <button onClick={handleLogout} style={{ width: '100%', padding: '8px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, background: '#f8fafc', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
