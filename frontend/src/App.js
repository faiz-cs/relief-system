import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Houses from './pages/Houses';
import Events from './pages/Events';
import EventDetail from './pages/EventDetail';
import Scanner from './pages/Scanner';
import FlaggedTokens from './pages/FlaggedTokens';
import Users from './pages/Users';
import Layout from './components/Layout';
import MyToken from './pages/MyToken';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/my-token" element={<MyToken />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="houses" element={<Houses />} />
            <Route path="events" element={<Events />} />
            <Route path="events/:id" element={<EventDetail />} />
            <Route path="scanner" element={<Scanner />} />
            <Route path="flagged" element={<ProtectedRoute roles={['admin','supervisor']}><FlaggedTokens /></ProtectedRoute>} />
            <Route path="users" element={<ProtectedRoute roles={['admin']}><Users /></ProtectedRoute>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
