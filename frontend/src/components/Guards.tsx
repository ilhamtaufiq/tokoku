import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <p className="muted center">Memuat…</p>;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <p className="muted center">Memuat…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <p className="error center">Halaman ini hanya untuk admin.</p>;
  return <Outlet />;
}
