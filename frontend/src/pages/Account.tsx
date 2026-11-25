import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import { useSeo } from '../lib/seo';

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

  return (
    <section className="account">
      <header className="page-head">
        <div>
          <h1>Akun saya</h1>
          <p className="muted small">Kelola data profil dan keamanan akunmu.</p>
        </div>
      </header>

      <div className="account-grid">
        <aside className="card account-card">
          <span className="avatar large" aria-hidden>{user.name.charAt(0).toUpperCase()}</span>
          <strong>{user.name}</strong>
          <span className="muted small">{user.email}</span>
          <span className={`status-pill ${user.role === 'admin' ? 'info' : ''}`}>{user.role === 'admin' ? 'Admin' : 'Pelanggan'}</span>
          <button
            className="btn ghost block"
            onClick={async () => {
              await logout();
              navigate('/');
            }}
          >
            <span className="material-symbols-outlined" aria-hidden>logout</span>
            Keluar
          </button>
        </aside>

        <div className="account-main">
          <form
            className="card section-card"
            onSubmit={(e) => {
              e.preventDefault();
              saveName.mutate();
            }}
          >
            <h2>Profil</h2>
            <div className="row">
              <label>
                Nama lengkap
                <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={120} />
              </label>
              <label>
                Email
                <input value={user.email} disabled aria-describedby="email-note" />
              </label>
            </div>
            <p id="email-note" className="muted small">Email tidak bisa diubah. Hubungi admin jika perlu perubahan.</p>
            <div className="actions">
              <button className="btn primary" disabled={!nameChanged || saveName.isPending}>
                {saveName.isPending ? 'Menyimpan…' : 'Simpan profil'}
              </button>
            </div>
          </form>

          <form
            className="card section-card"
            onSubmit={(e) => {
              e.preventDefault();
              setPwError(null);
              if (next.length < 8) return setPwError('Password baru minimal 8 karakter.');
              if (next !== confirm) return setPwError('Konfirmasi password tidak sama.');
              savePassword.mutate();
            }}
          >
            <h2>Ganti password</h2>
            <label>
              Password saat ini
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" />
            </label>
            <div className="row">
              <label>
                Password baru
                <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
              </label>
              <label>
                Ulangi password baru
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
              </label>
            </div>
            {pwError && <p className="error">{pwError}</p>}
            <div className="actions">
              <button className="btn primary" disabled={savePassword.isPending}>
                {savePassword.isPending ? 'Menyimpan…' : 'Ganti password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
