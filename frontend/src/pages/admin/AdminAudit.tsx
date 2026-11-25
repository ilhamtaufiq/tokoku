import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { formatDate } from '../../lib/money';
import { EMPTY_ROW, HIDE_MD, HIDE_SM, TABLE, TABLE_WRAP, TBODY, TD, TH, cx } from './adminUi';

const ACTION_LABEL: Record<string, string> = {
  'order.status': 'Ubah status pesanan',
  'order.refund_cancel': 'Batalkan + catat refund',
  'review.visibility': 'Atur ulasan',
};

/** Riwayat aksi admin: siapa mengubah apa dan kapan. */
export default function AdminAudit() {
  const log = useQuery({ queryKey: ['admin-audit'], queryFn: api.adminAudit });
  return (
    <section>
      <PageHeader title="Aktivitas" subtitle="Riwayat perubahan status pesanan dan aksi admin, terbaru di atas." />
      <div className={TABLE_WRAP}>
        <table className={TABLE}>
          <thead>
            <tr>
              <th className={TH}>Waktu</th>
              <th className={TH}>Aksi</th>
              <th className={cx(TH, HIDE_SM)}>Oleh</th>
              <th className={cx(TH, HIDE_MD)}>Objek</th>
              <th className={TH}>Keterangan</th>
            </tr>
          </thead>
          <tbody className={TBODY}>
            {(log.data ?? []).map((e) => (
              <tr key={e.id}>
                <td className={cx(TD, 'whitespace-nowrap text-muted')}>{formatDate(e.created_at)}</td>
                <td className={cx(TD, 'font-medium')}>{ACTION_LABEL[e.action] ?? e.action}</td>
                <td className={cx(TD, HIDE_SM)}>{e.actor_name ?? 'Sistem'}</td>
                <td className={cx(TD, HIDE_MD, 'whitespace-nowrap')}>{e.entity} #{e.entity_id ?? '-'}</td>
                <td className={cx(TD, 'max-w-[360px] whitespace-normal break-words text-ink-2')}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.data?.length === 0 && <p className={EMPTY_ROW}>Belum ada aktivitas.</p>}
      </div>
    </section>
  );
}
