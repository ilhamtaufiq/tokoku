import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { alertError, skeleton } from './flowClasses';

/** Tampilan saat sesi sedang diperiksa: skeleton kecil di tengah halaman. */
function SessionLoading() {
  return (
    <div className="mx-auto mt-16 flex w-full max-w-sm flex-col gap-3 px-4">
      <div className={`${skeleton} h-5 w-2/3`} aria-hidden />
      <div className={`${skeleton} h-4 w-full`} aria-hidden />
      <p className="text-center text-sm text-muted">Memuat…</p>
    </div>
  );
}

export function RequireAuth() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <SessionLoading />;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, loading } = useAuth();
  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') {
    return <p className={`${alertError} mx-auto mt-16 max-w-md text-center`}>Halaman ini hanya untuk admin.</p>;
  }
  return <Outlet />;
}
