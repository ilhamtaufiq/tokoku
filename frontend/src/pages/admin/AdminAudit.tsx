import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader';
import { api } from '../../api';
import { formatDate } from '../../lib/money';

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
      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Waktu</th><th>Oleh</th><th>Aksi</th><th>Objek</th><th>Keterangan</th></tr>
          </thead>
          <tbody>
            {(log.data ?? []).map((e) => (
              <tr key={e.id}>
                <td>{formatDate(e.created_at)}</td>
                <td>{e.actor_name ?? 'Sistem'}</td>
                <td>{ACTION_LABEL[e.action] ?? e.action}</td>
                <td>{e.entity} #{e.entity_id ?? '-'}</td>
                <td className="review-cell">{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {log.data?.length === 0 && <p className="muted center">Belum ada aktivitas.</p>}
      </div>
    </section>
  );
}
