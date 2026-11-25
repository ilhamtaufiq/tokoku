import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { useSeo } from '../lib/seo';

export default function Register() {
  useSeo({ title: 'Daftar', noindex: true });
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/';

  return (
    <section className="narrow">
      <h1>Daftar</h1>
      <form
        className="card form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await register(name.trim(), email.trim(), password);
            navigate(next, { replace: true });
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Gagal mendaftar. Coba lagi.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Nama lengkap
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password <span className="muted small">(minimal 8 karakter)</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className="error">{error}</p>}
        <button className="btn primary block" disabled={busy}>{busy ? 'Memproses…' : 'Daftar'}</button>
        <p className="small muted">
          Sudah punya akun? <Link to={`/login?next=${encodeURIComponent(next)}`}>Masuk</Link>
        </p>
      </form>
    </section>
  );
}
