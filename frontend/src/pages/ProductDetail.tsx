import { useState } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { rp } from '../lib/money';

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
      <Link to="/" className="muted small">← Kembali ke katalog</Link>
      <div className="detail-grid">
        <div className="thumb large" aria-hidden>{p.name.charAt(0).toUpperCase()}</div>
        <div>
          <h1>{p.name}</h1>
          <p className="muted small">SKU {p.sku}</p>
          <p className="price big">{rp(p.price)}</p>
          <p className="muted">
            {p.is_taxable
              ? <>Harga sudah termasuk PPN {Number(p.tax_rate)}% sebesar {rp(p.ppn_included)}.</>
              : 'Produk ini tidak kena PPN.'}
          </p>
          {p.description && <p>{p.description}</p>}
          <p className="small">
            {outOfStock ? <span className="tag danger">Stok habis</span> : `Stok tersedia: ${p.stock}`}
          </p>

          {!outOfStock && (
            <div className="add-row">
              <label>
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
                className="btn primary"
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
                {user ? 'Tambah ke keranjang' : 'Masuk untuk belanja'}
              </button>
            </div>
          )}
          {message && <p className={message.kind === 'ok' ? 'success' : 'error'}>{message.text}</p>}
          {user && cart.data?.some((i) => i.product_id === productId) && (
            <p className="small"><Link to="/cart">Lihat keranjang →</Link></p>
          )}
        </div>
      </div>
    </section>
  );
}
