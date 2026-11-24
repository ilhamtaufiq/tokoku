import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api';
import { ORDER_STATUS_LABEL, formatDate, rp } from '../../lib/money';
import type { OrderStatus, PaymentStatus } from '../../api/types';

const DAY = new Intl.DateTimeFormat('id-ID', { weekday: 'short' });

function statusInfo(status: OrderStatus, payment: PaymentStatus): { label: string; cls: string } {
  if (payment === 'refunded') return { label: 'Dana dikembalikan', cls: 'danger' };
  if (status === 'paid') return { label: 'Perlu dikirim', cls: 'warn' };
  if (status === 'completed') return { label: 'Selesai', cls: 'ok' };
  if (status === 'cancelled') return { label: 'Dibatalkan', cls: 'danger' };
  if (status === 'pending_payment') return { label: 'Menunggu bayar', cls: '' };
  return { label: ORDER_STATUS_LABEL[status] ?? status, cls: 'info' };
}

export default function AdminDashboard() {
  const dash = useQuery({ queryKey: ['admin-dashboard'], queryFn: api.adminDashboard, refetchInterval: 60_000 });

  if (dash.isPending) return <p className="muted">Memuat ringkasan…</p>;
  if (dash.isError || !dash.data) return <p className="error">Gagal memuat ringkasan.</p>;
  const d = dash.data;
  const max = Math.max(1, ...d.sales_7d.map((x) => Number(x.total)));
  const todayIso = d.sales_7d[d.sales_7d.length - 1]?.day;

  return (
    <div className="dash">
      <header className="page-head">
        <div>
          <h1>Ringkasan penjualan</h1>
          <p className="muted small">Pendapatan dari pesanan yang sudah dibayar · diperbarui otomatis</p>
        </div>
        <Link to="/admin/products" className="btn primary">
          <span className="material-symbols-outlined" aria-hidden>add</span>
          Kelola produk
        </Link>
      </header>

      <section className="kpi-grid">
        <article className="card kpi">
          <div className="kpi-top"><span>Total pendapatan</span><span className="material-symbols-outlined" aria-hidden>payments</span></div>
          <strong className="kpi-value">{rp(d.revenue_total)}</strong>
          <span className="muted small">{d.orders_total} pesanan lunas</span>
        </article>
        <article className="card kpi">
          <div className="kpi-top"><span>Perlu dikirim</span><span className="material-symbols-outlined" aria-hidden>local_shipping</span></div>
          <strong className="kpi-value">{d.orders_to_ship}</strong>
          <span className="muted small">pesanan menunggu proses</span>
        </article>
        <article className="card kpi">
          <div className="kpi-top"><span>Produk aktif</span><span className="material-symbols-outlined" aria-hidden>inventory_2</span></div>
          <strong className="kpi-value">{d.active_products}</strong>
          <span className="muted small">produk tampil di katalog</span>
        </article>
        <article className="card kpi">
          <div className="kpi-top"><span>Stok menipis</span><span className="material-symbols-outlined warn-icon" aria-hidden>warning</span></div>
          <strong className="kpi-value">{d.low_stock_count}</strong>
          <span className={d.low_stock_count > 0 ? 'warn-text small' : 'muted small'}>
            {d.low_stock_count > 0 ? 'Perlu restok (≤ 5 unit)' : 'Semua stok aman'}
          </span>
        </article>
      </section>

      <section className="dash-row">
        <article className="card chart-card">
          <div className="section-head">
            <h2>Penjualan 7 hari terakhir</h2>
            <span className="muted small">Dalam ribu rupiah</span>
          </div>
          <div className="bars" role="img" aria-label="Grafik penjualan 7 hari">
            {d.sales_7d.map((x) => {
              const value = Number(x.total);
              const isToday = x.day === todayIso;
              const dayLabel = DAY.format(new Date(`${x.day}T00:00:00Z`));
              return (
                <div className="bar-col" key={x.day}>
                  <span className="bar-value">{value > 0 ? Math.round(value / 1000).toLocaleString('id-ID') : ''}</span>
                  <div className="bar-track">
                    <div className={`chart-bar ${isToday ? 'today' : ''}`} style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
                  </div>
                  <span className={`bar-label ${isToday ? 'today' : ''}`}>{dayLabel}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="card">
          <div className="section-head">
            <h2>Stok menipis</h2>
            <Link to="/admin/products" className="small">Lihat semua</Link>
          </div>
          {d.low_stock.length === 0 && <p className="muted small">Tidak ada produk dengan stok menipis.</p>}
          <ul className="stock-list">
            {d.low_stock.map((p) => (
              <li key={p.id} className={p.stock <= 2 ? 'critical' : ''}>
                <div>
                  <strong>{p.name}</strong>
                  <span className="sku">{p.sku}</span>
                </div>
                <span className={`tag ${p.stock <= 2 ? 'danger' : 'warn'}`}>Sisa {p.stock}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card table-card">
        <div className="section-head pad">
          <h2>Pesanan terbaru</h2>
          <Link to="/admin/orders" className="small">Kelola pesanan</Link>
        </div>
        <div className="table-wrap flat">
          <table>
            <thead>
              <tr><th>Invoice</th><th>Pembeli</th><th>Waktu</th><th>Status</th><th className="num">Total</th></tr>
            </thead>
            <tbody>
              {d.recent_orders.map((o) => {
                const s = statusInfo(o.status, o.payment_status);
                return (
                  <tr key={o.id}>
                    <td className="sku">{o.invoice_no}</td>
                    <td>{o.buyer_name ?? '-'}</td>
                    <td className="muted small">{formatDate(o.created_at)}</td>
                    <td><span className={`status-pill ${s.cls}`}>{s.label}</span></td>
                    <td className="num">{rp(o.grand_total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
