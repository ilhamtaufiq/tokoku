import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { formatDate } from '../../lib/money';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState, PANEL } from '../../components/admin-stores/AdminBits';

const ACTION_LABEL: Record<string, string> = {
  'order.status': 'Ubah status pesanan',
  'order.refund_cancel': 'Batalkan + catat refund',
  'review.visibility': 'Atur ulasan',
};

const TH = 'h-auto bg-surface-low px-4 py-3 text-[11px] font-bold uppercase tracking-[0.6px] text-sub';

/** Riwayat aksi admin: siapa mengubah apa dan kapan. */
export default function AdminAudit() {
  const log = useQuery({ queryKey: ['admin-audit'], queryFn: api.adminAudit });
  return (
    <section>
      <PageHeader title="Aktivitas" subtitle="Riwayat perubahan status pesanan dan aksi admin, terbaru di atas." />
      <Card className={`${PANEL} gap-0 py-0`}>
        <Table className="max-md:block">
          <TableHeader className="max-md:sr-only">
            <TableRow className="border-border hover:bg-transparent">
              <TableHead className={TH}>Waktu</TableHead>
              <TableHead className={TH}>Aksi</TableHead>
              <TableHead className={`${TH} hidden sm:table-cell`}>Oleh</TableHead>
              <TableHead className={`${TH} hidden md:table-cell`}>Objek</TableHead>
              <TableHead className={TH}>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="max-md:block">
            {(log.data ?? []).map((e) => (
              <TableRow
                key={e.id}
                className="border-border max-md:flex max-md:flex-wrap max-md:items-center max-md:gap-x-4 max-md:gap-y-1 max-md:px-4 max-md:py-3"
              >
                <TableCell className="whitespace-nowrap px-4 py-3 text-xs text-sub max-md:w-full max-md:px-0 max-md:py-0">
                  {formatDate(e.created_at)}
                </TableCell>
                <TableCell className="px-4 py-3 font-medium max-md:w-full max-md:px-0 max-md:py-0">
                  {ACTION_LABEL[e.action] ?? e.action}
                </TableCell>
                <TableCell className="hidden px-4 py-3 sm:table-cell">{e.actor_name ?? 'Sistem'}</TableCell>
                <TableCell className="hidden whitespace-nowrap px-4 py-3 md:table-cell">{e.entity} #{e.entity_id ?? '-'}</TableCell>
                <TableCell className="max-w-[360px] whitespace-normal break-words px-4 py-3 text-ink-2 max-md:w-full max-md:max-w-full max-md:px-0 max-md:py-0">
                  {e.detail}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {log.data?.length === 0 && <EmptyState>Belum ada aktivitas.</EmptyState>}
      </Card>
    </section>
  );
}
