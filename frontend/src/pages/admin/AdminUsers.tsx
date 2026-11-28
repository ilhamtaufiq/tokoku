import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { api } from '../../api';
import { ApiError } from '../../api/client';
import type { AdminUser } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { PageHeader } from '../../components/PageHeader';
import { useToast } from '../../components/Toast';
import { formatDate } from '../../lib/money';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmptyState, FilterChip, Notice, PANEL, StatusPill } from '../../components/admin-stores/AdminBits';

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
/** Pilihan role di dropdown baris. Label dipakai Select untuk menampilkan nilai terpilih. */
const ROLE_ITEMS = [
  { value: 'customer', label: 'Pelanggan' },
  { value: 'admin', label: 'Admin' },
];

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

      <Card className={`${PANEL} mb-4 flex-col gap-3 p-3.5 md:flex-row md:flex-wrap md:items-center`}>
        <div className="relative w-full md:min-w-60 md:flex-1">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-sub" aria-hidden>search</span>
          <Input
            type="search"
            className="h-11 w-full pl-10 text-sm md:h-9"
            placeholder="Cari nama atau email…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Cari pengguna"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter role">
          {ROLE_OPTIONS.map((o) => (
            <FilterChip key={o.v} on={role === o.v} onClick={() => setRole(o.v)}>{o.l}</FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter status">
          {STATUS_OPTIONS.map((o) => (
            <FilterChip key={o.v} on={status === o.v} onClick={() => setStatus(o.v)}>{o.l}</FilterChip>
          ))}
        </div>
      </Card>

      {users.isError && <Notice kind="error" className="mb-4">Gagal memuat pengguna.</Notice>}

      <Card className={`${PANEL} gap-0 py-0`}>
        <Table className="max-md:block">
          <TableHeader className="max-md:sr-only">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className="h-auto bg-surface-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sub">Pengguna</TableHead>
              <TableHead className="h-auto bg-surface-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sub">Role</TableHead>
              <TableHead className="h-auto bg-surface-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sub">Status</TableHead>
              <TableHead className="hidden h-auto bg-surface-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sub md:table-cell">Bergabung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:block">
            {list.map((u) => {
              const isMe = u.id === me?.id;
              const lastAdmin = u.role === 'admin' && u.is_active && adminCount <= 1;
              return (
                <TableRow
                  key={u.id}
                  className={cn(
                    'border-border max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-4 max-md:gap-y-2 max-md:px-4 max-md:py-3',
                    !u.is_active && 'bg-subtle/60 text-sub',
                  )}
                >
                  <TableCell className="whitespace-normal px-4 py-3 max-md:w-full max-md:px-0 max-md:py-0">
                    <UserName user={u} isMe={isMe} />
                  </TableCell>
                  <TableCell className="px-4 py-3 max-md:px-0 max-md:py-0">
                    <Select
                      items={ROLE_ITEMS}
                      value={u.role}
                      disabled={isMe || lastAdmin || update.isPending}
                      onValueChange={(value) => {
                        if (value) update.mutate({ id: u.id, body: { role: value } });
                      }}
                    >
                      <SelectTrigger aria-label={`Role ${u.name}`} className="h-11! min-w-36 bg-surface text-[13px] text-ink md:h-9! md:min-w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Pelanggan</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="px-4 py-3 max-md:px-0 max-md:py-0">
                    <label
                      className={cn(
                        'inline-flex min-h-11 cursor-pointer items-center gap-2.5 whitespace-nowrap text-[13px] font-semibold text-ink-2 md:min-h-0',
                        (isMe || lastAdmin) && 'cursor-not-allowed',
                      )}
                      title={isMe ? 'Tidak bisa menonaktifkan akun sendiri' : ''}
                    >
                      <Switch
                        checked={u.is_active}
                        disabled={isMe || lastAdmin || update.isPending}
                        onCheckedChange={(checked) => update.mutate({ id: u.id, body: { is_active: checked } })}
                        aria-label={`Status aktif ${u.name}`}
                        className="max-md:after:-inset-y-[13px]"
                      />
                      <span className={cn(u.is_active ? 'text-ink' : 'text-sub')}>{u.is_active ? 'Aktif' : 'Nonaktif'}</span>
                    </label>
                  </TableCell>
                  <TableCell className="hidden px-4 py-3 text-xs text-sub md:table-cell">{formatDate(u.created_at)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {users.data && list.length === 0 && <EmptyState>Tidak ada pengguna yang cocok dengan filter.</EmptyState>}
      </Card>
    </section>
  );
}

function UserName({ user: u, isMe }: { user: AdminUser; isMe: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar className="size-9 shrink-0" aria-hidden>
        <AvatarFallback className="bg-secondary-container font-display text-sm font-bold text-on-secondary-container">
          {u.name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <strong className="font-semibold">{u.name}</strong>
        {isMe && <StatusPill tone="ok" className="ml-2 align-middle">Anda</StatusPill>}
        <div className="truncate text-xs text-sub">{u.email}</div>
      </div>
    </div>
  );
}

export type { AdminUser };
