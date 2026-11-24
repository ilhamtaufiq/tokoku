import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/';

  return (
    <section className="narrow">
      <h1>Masuk</h1>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await login(email.trim(), password);
            navigate(next, { replace: true });
          } catch (err) {
            setError(err instanceof ApiError && err.status === 401 ? 'Email atau password salah.' : 'Gagal masuk. Coba lagi.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <p className="small muted">
          Belum punya akun? <Link to={`/register?next=${encodeURIComponent(next)}`}>Daftar</Link>
        </p>
      </form>
    </section>
  );
}
