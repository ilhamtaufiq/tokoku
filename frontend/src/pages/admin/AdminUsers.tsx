import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { AdminUser } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../lib/money';
import {
  CHIP_GROUP,
  EMPTY_ROW,
  FILTER_BAR,
  HIDE_MD,
  INPUT,
  MUTED_SMALL,
  Notice,
  SEARCH_ICON,
  SEARCH_WRAP,
  StatusBadge,
  TABLE_WRAP,
  TBODY,
  TD,
  TH,
  chipClass,
  cx, TABLE_STACK } from './adminUi';

const ROLE_OPTIONS = [
  { v: '', l: 'Semua' },
  { v: 'admin', l: 'Admin' },
  { v: 'customer', l: 'Pelanggan' },
];
const STATUS_OPTIONS = [
  { v: '', l: 'Semua status' },
  { v: 'active', l: 'Aktif' },
  { v: 'inactive', l: 'Nonaktif' },
];

/* `select` di styles.css tanpa layer memberi width:100%, jadi lebar memakai !w-auto. */
const ROLE_SELECT =
  'h-11 md:h-9 !w-auto min-w-[140px] rounded-field border border-outline bg-surface px-2.5 text-[13px] text-ink focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-45';

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

      <div className={FILTER_BAR}>
        <div className={SEARCH_WRAP}>
          <span className={SEARCH_ICON} aria-hidden>search</span>
          <input
            type="search"
            className={cx(INPUT, 'pl-10')}
            placeholder="Cari nama atau email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari pengguna"
          />
        </div>
        <div className={CHIP_GROUP} role="group" aria-label="Filter role">
          {ROLE_OPTIONS.map((o) => (
            <button type="button" key={o.v} className={chipClass(role === o.v)} aria-pressed={role === o.v} onClick={() => setRole(o.v)}>{o.l}</button>
          ))}
        </div>
        <div className={CHIP_GROUP} role="group" aria-label="Filter status">
          {STATUS_OPTIONS.map((o) => (
            <button type="button" key={o.v} className={chipClass(status === o.v)} aria-pressed={status === o.v} onClick={() => setStatus(o.v)}>{o.l}</button>
          ))}
        </div>
      </div>

      {users.isError && <div className="mb-4"><Notice kind="error">Gagal memuat pengguna.</Notice></div>}

      <div className={TABLE_WRAP}>
        <table className={TABLE_STACK}>
          <thead>
            <tr>
              <th className={TH}>Pengguna</th>
              <th className={TH}>Role</th>
              <th className={TH}>Status</th>
              <th className={cx(TH, HIDE_MD)}>Bergabung</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {list.map((u) => {
              const isMe = u.id === me?.id;
              const lastAdmin = u.role === 'admin' && u.is_active && adminCount <= 1;
              return (
                <tr key={u.id} className={u.is_active ? '' : 'bg-surface-low/60 text-muted'}>
                  <td data-label="" className={cx(TD, 'max-md:block!')}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-secondary-container font-display text-sm font-bold text-on-secondary-container" aria-hidden>
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <strong className="font-semibold">{u.name}</strong>
                        {isMe && <StatusBadge tone="ok" className="ml-2 align-middle">Anda</StatusBadge>}
                        <div className={cx(MUTED_SMALL, 'truncate')}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role" className={TD}>
                    <select
                      value={u.role}
                      disabled={isMe || lastAdmin || update.isPending}
                      onChange={(e) => update.mutate({ id: u.id, body: { role: e.target.value } })}
                      aria-label={`Role ${u.name}`}
                      className={ROLE_SELECT}
                    >
                      <option value="customer">Pelanggan</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td data-label="Status" className={TD}>
                    <label
                      className={cx(
                        'relative !inline-flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-ink-2 md:min-h-0',
                        (isMe || lastAdmin) && 'cursor-not-allowed',
                      )}
                      title={isMe ? 'Tidak bisa menonaktifkan akun sendiri' : ''}
                    >
                      <input
                        type="checkbox"
                        className="peer sr-only !h-px !w-px !min-h-0"
                        checked={u.is_active}
                        disabled={isMe || lastAdmin || update.isPending}
                        onChange={(e) => update.mutate({ id: u.id, body: { is_active: e.target.checked } })}
                        aria-label={`Status aktif ${u.name}`}
                      />
                      <span
                        aria-hidden
                        className="relative h-[22px] w-[38px] shrink-0 rounded-pill bg-outline transition-colors after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform after:content-[''] peer-checked:bg-primary peer-checked:after:translate-x-4 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:opacity-45"
                      />
                      <span className={cx('peer-disabled:opacity-60', u.is_active ? 'text-ink' : 'text-muted')}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </label>
                  </td>
                  <td data-label="Bergabung" className={cx(TD, HIDE_MD, MUTED_SMALL)}>{formatDate(u.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {users.data && list.length === 0 && <p className={EMPTY_ROW}>Tidak ada pengguna yang cocok dengan filter.</p>}
      </div>
    </section>
  );
}

export type { AdminUser };
