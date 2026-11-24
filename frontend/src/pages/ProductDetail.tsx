import { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';
import { ProductImage } from '../components/ProductImage';

const MAX_QTY = 99;

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId) });
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });

  const add = useMutation({
    mutationFn: async () => {
      const existing = cart.data?.find((i) => i.product_id === productId)?.qty ?? 0;
      const max = Math.min(product.data?.stock ?? 0, MAX_QTY);
      const total = Math.min(existing + qty, max);
      await api.setCartItem(productId, total);
      return total;
    },
    onSuccess: (total) => {
      setMessage({ kind: 'ok', text: `Keranjang sekarang berisi ${total} buah.` });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (e) => setMessage({ kind: 'error', text: e instanceof ApiError ? e.message : 'Gagal menambahkan.' }),
  });

  if (product.isPending) return <p className="muted">Memuat…</p>;
  if (product.isError || !product.data) return <p className="error">Produk tidak ditemukan.</p>;
  const p = product.data;
  const outOfStock = p.stock === 0;

  return (
    <section className="detail">
      <nav className="crumb" aria-label="Breadcrumb">
        <Link to="/"><span className="material-symbols-outlined" aria-hidden>arrow_back</span>Katalog</Link>
        <span>/</span>
        <span className="crumb-current">{p.name}</span>
      </nav>

      <div className="detail-grid">
        <div className="detail-media card">
          <ProductImage name={p.name} src={p.image_url} large />
        </div>

        <div className="detail-info">
          <div className="status-row">
            {outOfStock
              ? <span className="tag danger">Habis</span>
              : <span className="tag ok">Tersedia • {p.stock} unit</span>}
            <span className="sku">SKU {p.sku}</span>
          </div>
          <h1>{p.name}</h1>

          <div className="price-box">
            <span className="price big">{rp(p.price)}</span>
            {p.is_taxable && <span className="ppn-chip">Termasuk PPN {Number(p.tax_rate)}%</span>}
          </div>
          <p className="ppn-note">
            <span className="material-symbols-outlined" aria-hidden>receipt_long</span>
            {p.is_taxable
              ? <>PPN {rp(p.ppn_included)} sudah termasuk dalam harga di atas.</>
              : 'Produk ini tidak kena PPN.'}
          </p>

          {p.description && <p className="desc">{p.description}</p>}

          {!outOfStock && (
            <div className="add-row">
              <label className="qty-field">
                Jumlah
                <input
                  type="number"
                  min={1}
                  max={Math.min(p.stock, MAX_QTY)}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Math.min(Number(e.target.value) || 1, p.stock, MAX_QTY)))}
                />
              </label>
              <button
                className="btn primary add-btn"
                disabled={add.isPending}
                onClick={() => {
                  if (!user) {
                    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
                    return;
                  }
                  setMessage(null);
                  add.mutate();
                }}
              >
                <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
                {user ? 'Tambah ke Keranjang' : 'Masuk untuk belanja'}
              </button>
            </div>
          )}
          {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
          {user && cart.data?.some((i) => i.product_id === productId) && (
            <p className="small"><Link to="/cart">Lihat keranjang →</Link></p>
          )}

          <ul className="trust-row">
            <li><span className="material-symbols-outlined" aria-hidden>verified</span>Harga final termasuk PPN</li>
            <li><span className="material-symbols-outlined" aria-hidden>receipt_long</span>Invoice dengan rincian pajak</li>
            <li><span className="material-symbols-outlined" aria-hidden>local_shipping</span>Ongkir tanpa PPN</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
