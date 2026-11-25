import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { AdminUser } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../lib/money';

export default function AdminUsers() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const users = useQuery({
    queryKey: ['admin-users', { q, role, status }],
    queryFn: () => api.adminUsers({ q: q.trim(), role, status }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { role?: string; is_active?: boolean } }) => api.adminUpdateUser(id, body),
    onSuccess: (u) => {
      toast.show(`${u.name} diperbarui`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.show(e instanceof ApiError ? e.message : 'Gagal memperbarui pengguna.', 'error'),
  });

  const list = users.data ?? [];
  const adminCount = list.filter((u) => u.role === 'admin' && u.is_active).length;

  return (
    <section>
      <PageHeader
        title="Pengguna"
        subtitle={users.data ? `${list.length} akun sesuai filter` : 'Memuat akun…'}
      />

      <div className="filter-bar card">
        <div className="search-field">
          <span className="material-symbols-outlined" aria-hidden>search</span>
          <input type="search" placeholder="Cari nama atau email…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari pengguna" />
        </div>
        <div className="chip-group" role="group" aria-label="Filter role">
          {[
            { v: '', l: 'Semua' },
            { v: 'admin', l: 'Admin' },
            { v: 'customer', l: 'Pelanggan' },
          ].map((o) => (
            <button key={o.v} className={`chip ${role === o.v ? 'on' : ''}`} aria-pressed={role === o.v} onClick={() => setRole(o.v)}>{o.l}</button>
          ))}
        </div>
        <div className="chip-group" role="group" aria-label="Filter status">
          {[
            { v: '', l: 'Semua status' },
            { v: 'active', l: 'Aktif' },
            { v: 'inactive', l: 'Nonaktif' },
          ].map((o) => (
            <button key={o.v} className={`chip ${status === o.v ? 'on' : ''}`} aria-pressed={status === o.v} onClick={() => setStatus(o.v)}>{o.l}</button>
          ))}
        </div>
      </div>

      {users.isError && <p className="error">Gagal memuat pengguna.</p>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Pengguna</th>
              <th>Role</th>
              <th>Status</th>
              <th>Bergabung</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => {
              const isMe = u.id === me?.id;
              const lastAdmin = u.role === 'admin' && u.is_active && adminCount <= 1;
              return (
                <tr key={u.id} className={u.is_active ? '' : 'row-inactive'}>
                  <td>
                    <div className="user-cell">
                      <span className="avatar" aria-hidden>{u.name.charAt(0).toUpperCase()}</span>
                      <div>
                        <strong>{u.name}</strong>
                        {isMe && <span className="tag ok me-tag">Anda</span>}
                        <div className="muted small">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <select
                      value={u.role}
                      disabled={isMe || lastAdmin || update.isPending}
                      onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })}
                      aria-label={`Role ${u.name}`}
                      className="inline-select"
                    >
                      <option value="customer">Pelanggan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <label className="switch" title={isMe ? 'Tidak bisa menonaktifkan akun sendiri' : ''}>
                      <input
                        type="checkbox"
                        checked={u.is_active}
                        disabled={isMe || lastAdmin || update.isPending}
                        onChange={(e) => update.mutate({ id: u.id, body: { is_active: e.target.checked } })}
                        aria-label={`Status aktif ${u.name}`}
                      />
                      <span className="switch-track" aria-hidden />
                      <span className="switch-label">{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </label>
                  </td>
                  <td className="muted small">{formatDate(u.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.data && list.length === 0 && <p className="muted center empty-note">Tidak ada pengguna yang cocok dengan filter.</p>}
      </div>
    </section>
  );
}

export type { AdminUser };
