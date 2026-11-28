import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api/client';
import { alertError, btn, card, field, label, pageTitle } from '../components/flowClasses';
import { useSeo } from '../lib/seo';

export default function Login() {
  useSeo({ title: 'Masuk', noindex: true });
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = params.get('next') || '/';

  return (
    <section className="mx-auto flex max-w-[440px] flex-col items-stretch py-4 md:py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="material-symbols-outlined mb-3 grid size-14 place-items-center rounded-pill bg-primary-container text-[28px] text-on-primary" aria-hidden>storefront</span>
        <h1 className={`${pageTitle} !mb-0 text-center`}>Masuk</h1>
      </div>
      <form
        className={`${card} flex flex-col gap-4 p-5 shadow-card md:p-8`}
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
          Password
          <input
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className={alertError}>{error}</p>}
        <button className={btn('primary', 'lg', 'w-full !rounded-pill')} disabled={busy}>{busy ? 'Memproses…' : 'Masuk'}</button>
        <p className="text-center text-[13px] text-muted">
          Belum punya akun?{' '}
          <Link to={`/register?next=${encodeURIComponent(next)}`} className="font-semibold">Daftar</Link>
        </p>
      </form>
    </section>
  );
}
