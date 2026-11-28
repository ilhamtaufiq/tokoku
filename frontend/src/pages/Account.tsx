import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { alertError, btn, card, field, label, pageTitle } from '../components/flowClasses';
import { useSeo } from '../lib/seo';

const heading = 'mt-0 mb-4 font-display text-lg font-semibold leading-7 text-ink';

/** Profil akun: ubah nama dan ganti password. */
export default function Account() {
  useSeo({ title: 'Akun saya', noindex: true });
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? '');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);

  const saveName = useMutation({
    mutationFn: () => api.updateProfile({ name: name.trim() }),
    onSuccess: (u) => {
      updateUser(u);
      toast.show('Nama berhasil diubah');
    },
    onError: (e) => toast.show(e instanceof ApiError ? e.message : 'Gagal menyimpan.', 'error'),
  });

  const savePassword = useMutation({
    mutationFn: () => api.changePassword({ current_password: current, new_password: next }),
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setConfirm('');
      setPwError(null);
      toast.show('Password berhasil diganti');
    },
    onError: (e) => setPwError(e instanceof ApiError ? e.message : 'Gagal mengganti password.'),
  });

  if (!user) return null;
  const nameChanged = name.trim() !== user.name;
  const isAdmin = user.role === 'admin';

  return (
    <section className="mx-auto max-w-[1040px]">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className={pageTitle}>Akun saya</h1>
          <p className="text-xs text-muted">Kelola data profil dan keamanan akunmu.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <aside className={`${card} flex flex-col items-center gap-2 p-6 text-center md:sticky md:top-[100px]`}>
          <span
            className="grid grid-cols-1 size-16 shrink-0 place-items-center rounded-pill bg-primary-container font-display text-2xl font-bold text-on-primary"
            aria-hidden
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
          <strong className="font-display text-[17px] font-semibold text-ink">{user.name}</strong>
          <span className="break-all text-xs text-muted">{user.email}</span>
          <span
            className={`inline-flex h-[26px] items-center whitespace-nowrap rounded-pill px-3 text-xs font-semibold ${
              isAdmin ? 'bg-primary-container text-on-primary' : 'bg-surface-high text-ink-2'
            }`}
          >
            {isAdmin ? 'Admin' : 'Pelanggan'}
          </span>
          <button
            className={btn('ghost', 'md', 'mt-2.5 w-full !rounded-pill')}
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>logout</span>
            Keluar
          </button>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <form
            className={`${card} p-5 md:p-6`}
            onSubmit={(e) => {
              e.preventDefault();
              saveName.mutate();
            }}
          >
            <h2 className={heading}>Profil</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className={label}>
                Nama lengkap
                <input className={field} value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
              </label>
              <label className={label}>
                Email
                <input className={field} value={user.email} disabled aria-describedby="email-note" />
              </label>
            </div>
            <p id="email-note" className="mt-1.5 text-xs text-muted">Email tidak bisa diubah. Hubungi admin jika perlu perubahan.</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className={btn('primary', 'md', '!rounded-pill')} disabled={!nameChanged || saveName.isPending}>
                {saveName.isPending ? 'Menyimpan…' : 'Simpan profil'}
              </button>
            </div>
          </form>

          <form
            className={`${card} p-5 md:p-6`}
            onSubmit={(e) => {
              e.preventDefault();
              setPwError(null);
              if (next.length < 8) return setPwError('Password baru minimal 8 karakter.');
              if (next !== confirm) return setPwError('Konfirmasi password tidak sama.');
              savePassword.mutate();
            }}
          >
            <h2 className={heading}>Ganti password</h2>
            <div className="flex flex-col gap-4">
              <label className={label}>
                Password saat ini
                <input
                  type="password"
                  className={field}
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </label>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className={label}>
                  Password baru
                  <input
                    type="password"
                    className={field}
                    value={next}
                    onChange={(e) => setNext(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
                <label className={label}>
                  Ulangi password baru
                  <input
                    type="password"
                    className={field}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </label>
              </div>
            </div>
            {pwError && <p className={`${alertError} mt-4`}>{pwError}</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button className={btn('primary', 'md', '!rounded-pill')} disabled={savePassword.isPending}>
                {savePassword.isPending ? 'Menyimpan…' : 'Ganti password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
