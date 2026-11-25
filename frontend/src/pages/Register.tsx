import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { alertError, btn, card, field, label, pageTitle } from '../components/flowClasses';
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
    <section className="mx-auto max-w-[440px] py-2 md:py-6">
      <h1 className={pageTitle}>Daftar</h1>
      <form
        className={`${card} mt-4 flex flex-col gap-4 p-5 md:p-6`}
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
        <label className={label}>
          Nama lengkap
          <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
        </label>
        <label className={label}>
          Email
          <input
            type="email"
            className={field}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        <label className={label}>
          <span>
            Password <span className="ml-1 text-xs font-normal text-muted">(minimal 8 karakter)</span>
          </span>
          <input
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {error && <p className={alertError}>{error}</p>}
        <button className={btn('primary', 'lg', 'w-full')} disabled={busy}>{busy ? 'Memproses…' : 'Daftar'}</button>
        <p className="text-center text-[13px] text-muted">
          Sudah punya akun?{' '}
          <Link to={`/login?next=${encodeURIComponent(next)}`} className="font-semibold">Masuk</Link>
        </p>
      </form>
    </section>
  );
}
