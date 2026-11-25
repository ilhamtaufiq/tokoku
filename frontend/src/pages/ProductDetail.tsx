import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { ProductImage } from '../components/ProductImage';
import { useToast } from '../components/Toast';
import { rp } from '../lib/money';
import { useSeo } from '../lib/seo';

const MAX_QTY = 99;

export default function ProductDetail() {
  const { id } = useParams();
  const productId = Number(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [qty, setQty] = useState(1);

  const product = useQuery({ queryKey: ['product', productId], queryFn: () => api.product(productId) });
  const cart = useQuery({ queryKey: ['cart'], queryFn: api.cart, enabled: !!user });

  const seoProduct = product.data;
  useSeo(
    seoProduct
      ? {
          title: seoProduct.name,
          description: seoProduct.description ?? `${seoProduct.name} — ${rp(seoProduct.price)}, sudah termasuk PPN.`,
          canonicalPath: `/products/${seoProduct.id}`,
          image: seoProduct.image_url ? new URL(seoProduct.image_url, window.location.origin).href : null,
          jsonLd: {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: seoProduct.name,
            sku: seoProduct.sku,
            description: seoProduct.description ?? seoProduct.name,
            ...(seoProduct.image_url ? { image: new URL(seoProduct.image_url, window.location.origin).href } : {}),
            offers: {
              '@type': 'Offer',
              priceCurrency: 'IDR',
              price: Number(seoProduct.price),
              availability: seoProduct.stock > 0 && seoProduct.is_active
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock',
              url: `${window.location.origin}/products/${seoProduct.id}`,
            },
          },
        }
      : {},
  );

  const add = useMutation({
    mutationFn: async (checkout: boolean) => {
      const p = product.data;
      if (!p) throw new Error('produk belum dimuat');
      const existing = cart.data?.find((i) => i.product_id === productId)?.qty ?? 0;
      const total = Math.min(existing + qty, p.stock, MAX_QTY);
      await api.setCartItem(productId, total);
      return { total, checkout };
    },
    onSuccess: ({ checkout }) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      if (checkout) {
        navigate('/checkout');
      } else {
        toast.show(`${product.data?.name ?? 'Produk'} ditambahkan ke keranjang`);
      }
    },
    onError: (e) => toast.show(e instanceof ApiError ? e.message : 'Gagal menambahkan ke keranjang.', 'error'),
  });

  const requireLogin = () => {
    navigate(`/login?next=${encodeURIComponent(location.pathname)}`);
  };

  if (product.isPending) {
    return (
      <div className="detail-grid" aria-hidden>
        <div className="detail-media card skeleton skeleton-media" />
        <div className="detail-info">
          <div className="skeleton skeleton-line" />
          <div className="skeleton skeleton-line short" />
        </div>
      </div>
    );
  }
  if (product.isError || !product.data) {
    return (
      <div className="empty-note card">
        <p>Produk tidak ditemukan.</p>
        <Link to="/" className="btn">Kembali ke katalog</Link>
      </div>
    );
  }

  const p = product.data;
  const outOfStock = p.stock === 0 || !p.is_active;
  const inCart = user && cart.data?.some((i) => i.product_id === productId);

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
          <h1>{p.name}</h1>
          <p className="sku">SKU {p.sku}</p>

          <div className="price-box">
            <span className="price big">{rp(p.price)}</span>
            {p.is_taxable && <span className="ppn-chip">Termasuk PPN {Number(p.tax_rate)}%</span>}
          </div>

          <ul className="detail-facts">
            <li>
              <span className="material-symbols-outlined" aria-hidden>inventory_2</span>
              {outOfStock ? 'Stok habis' : p.stock <= 5 ? `Stok tinggal ${p.stock} unit` : `Stok tersedia ${p.stock} unit`}
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden>receipt_long</span>
              {p.is_taxable
                ? <>PPN {rp(p.ppn_included)} sudah termasuk dalam harga</>
                : 'Produk ini tidak kena PPN'}
            </li>
            <li>
              <span className="material-symbols-outlined" aria-hidden>local_shipping</span>
              Ongkos kirim dihitung saat checkout, tanpa PPN
            </li>
          </ul>

          {p.description && (
            <div className="detail-desc">
              <h2>Deskripsi</h2>
              <p>{p.description}</p>
            </div>
          )}

          {!outOfStock && (
            <div className="add-row desktop-only">
              <div className="qty-field-wrap">
                <span className="qty-label">Jumlah</span>
                <div className="qty">
                  <button className="btn" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Kurangi">−</button>
                  <span>{qty}</span>
                  <button className="btn" onClick={() => setQty((q) => Math.min(Math.min(p.stock, MAX_QTY), q + 1))} disabled={qty >= Math.min(p.stock, MAX_QTY)} aria-label="Tambah">+</button>
                </div>
              </div>
              <button className="btn outline add-btn" disabled={add.isPending} onClick={() => (user ? add.mutate(false) : requireLogin())}>
                <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
                {user ? 'Tambah ke keranjang' : 'Masuk untuk belanja'}
              </button>
              <button className="btn primary add-btn" disabled={add.isPending} onClick={() => (user ? add.mutate(true) : requireLogin())}>
                Beli sekarang
              </button>
            </div>
          )}
          {inCart && <p className="small"><Link to="/cart">Lihat keranjang →</Link></p>}

          <ul className="trust-row">
            <li><span className="material-symbols-outlined" aria-hidden>verified</span>Harga final termasuk PPN</li>
            <li><span className="material-symbols-outlined" aria-hidden>receipt_long</span>Invoice dengan rincian pajak</li>
            <li><span className="material-symbols-outlined" aria-hidden>shield</span>Pembayaran aman via Midtrans</li>
          </ul>
        </div>
      </div>

      {/* Bar aksi tetap di bawah untuk mobile */}
      {!outOfStock && (
        <div className="buy-bar mobile-only" role="region" aria-label="Aksi belanja">
          <button className="btn outline" disabled={add.isPending} onClick={() => (user ? add.mutate(false) : requireLogin())} aria-label="Tambah ke keranjang">
            <span className="material-symbols-outlined" aria-hidden>add_shopping_cart</span>
          </button>
          <button className="btn primary grow" disabled={add.isPending} onClick={() => (user ? add.mutate(true) : requireLogin())}>
            Beli sekarang
          </button>
        </div>
      )}
    </section>
  );
}
