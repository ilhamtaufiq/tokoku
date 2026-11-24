import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../lib/money';

export default function Orders() {
  const orders = useQuery({ queryKey: ['orders'], queryFn: api.orders });

  if (orders.isPending) return <p className="muted">Memuat pesanan…</p>;
  if (orders.isError) return <p className="error">Gagal memuat pesanan.</p>;
  if (orders.data.length === 0) {
    return (
      <section className="empty">
        <h1>Belum ada pesanan</h1>
        <Link to="/" className="btn primary">Mulai belanja</Link>
      </section>
    );
  }

  return (
    <section>
      <h1>Pesanan saya</h1>
      <ul className="order-list">
        {orders.data.map((o) => (
          <li key={o.id}>
            <Link to={`/orders/${o.id}`} className="card order-row">
              <div className="grow">
                <strong>{o.invoice_no}</strong>
                <p className="muted small">{formatDate(o.created_at)}</p>
              </div>
              <span className={`tag ${o.status === 'cancelled' ? 'danger' : ''}`}>
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </span>
              <strong>{rp(o.grand_total)}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
