import { downloadFile, request } from './client';
import type {
  AuthResponse,
  Breakdown,
  CartItem,
  Category,
  CheckoutResponse,
  OrderDetail,
  OrderStatus,
  OrderView,
  AdminDashboard,
  Banner,
  BannerInput,
  Page,
  Product,
  StoreInfo,
  Suggestion,
  AdminUser,
  AdminReview,
  AuditEntry,
  MyReview,
  ReviewItem,
  ReviewSummary,
  User,
  Variant,
  VariantInput,
} from './types';

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
  updateProfile: (body: { name: string }) => request<User>('/auth/me', { method: 'PUT', body }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    request<void>('/auth/password', { method: 'PUT', body }),

  // Katalog
  categories: () => request<Category[]>('/categories'),
  products: (params: { q?: string; category_id?: number; sort?: string; page?: number; per_page?: number }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') qs.set(k, String(v));
    });
    return request<Page<Product>>(`/products?${qs.toString()}`);
  },
  product: (id: number) => request<Product>(`/products/${id}`),
  suggest: (q: string) => request<Suggestion[]>(`/products/suggest?q=${encodeURIComponent(q)}`),

  // Keranjang
  cart: () => request<CartItem[]>('/cart'),
  setCartItem: (product_id: number, variant_id: number, qty: number) =>
    request<void>('/cart/items', { method: 'PUT', body: { product_id, variant_id, qty } }),
  removeCartItem: (product_id: number, variant_id: number) =>
    request<void>(`/cart/items/${product_id}/${variant_id}`, { method: 'DELETE' }),
  setCartSelected: (product_id: number, variant_id: number, selected: boolean) =>
    request<void>(`/cart/items/${product_id}/${variant_id}/select`, { method: 'PUT', body: { selected } }),
  setAllCartSelected: (selected: boolean) => request<void>('/cart/select-all', { method: 'PUT', body: { selected } }),

  // Pratinjau harga
  preview: (items: { product_id: number; variant_id: number; qty: number }[], promo_code?: string) =>
    request<Breakdown>('/pricing/preview', { method: 'POST', body: { items, promo_code: promo_code || null } }),

  // Pesanan
  checkout: (body: { shipping_address: string; promo_code?: string; buyer_npwp?: string; payment_method?: string }) =>
    request<CheckoutResponse>('/orders', { method: 'POST', body }),
  orders: () => request<OrderView[]>('/orders'),
  order: (id: number) => request<OrderDetail>(`/orders/${id}`),
  payOrder: (id: number) => request<{ payment_url: string }>(`/orders/${id}/pay`, { method: 'POST' }),

  // Admin
  adminCreateCategory: (body: { name: string; slug: string }) =>
    request<Category>('/admin/categories', { method: 'POST', body }),
  adminCreateProduct: (body: ProductInput) => request<Product>('/admin/products', { method: 'POST', body }),
  adminUpdateProduct: (id: number, body: ProductInput) =>
    request<Product>(`/admin/products/${id}`, { method: 'PUT', body }),
  adminDeactivateProduct: (id: number) => request<void>(`/admin/products/${id}`, { method: 'DELETE' }),
  adminOrder: (id: number) => request<OrderDetail>(`/admin/orders/${id}`),
  adminOrderActivity: (id: number) => request<AuditEntry[]>(`/admin/orders/${id}/activity`),
  adminOrders: (status?: OrderStatus | '') =>
    request<OrderView[]>(`/admin/orders${status ? `?status=${status}` : ''}`),
  adminSetOrderStatus: (id: number, status: OrderStatus) =>
    request<OrderView>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  adminProcessOrder: (id: number, estimated_days: number) =>
    request<OrderView>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: 'processing', estimated_days } }),
  adminUploadProductImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Product>(`/admin/products/${id}/image`, { method: 'POST', body: form });
  },
  adminShipOrder: (id: number, tracking_number: string) =>
    request<OrderView>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: 'shipped', tracking_number } }),
  adminExportOrdersCsv: (status: OrderStatus | '') =>
    downloadFile(`/admin/orders/export${status ? `?status=${status}` : ''}`, 'pesanan.csv'),
  adminRefundCancel: (id: number, note: string) =>
    request<OrderView>(`/admin/orders/${id}/refund-cancel`, { method: 'POST', body: { note } }),
  store: () => request<StoreInfo>('/store'),
  reviews: (productId: number) => request<ReviewSummary>(`/products/${productId}/reviews`),
  myReview: (productId: number) => request<MyReview>(`/products/${productId}/reviews/me`),
  createReview: (productId: number, rating: number, comment: string) =>
    request<ReviewItem>(`/products/${productId}/reviews`, { method: 'POST', body: { rating, comment } }),
  adminReviews: (hiddenOnly: boolean) =>
    request<AdminReview[]>(`/admin/reviews${hiddenOnly ? '?hidden=true' : ''}`),
  adminSetReviewVisible: (id: number, is_visible: boolean) =>
    request<void>(`/admin/reviews/${id}`, { method: 'PATCH', body: { is_visible } }),
  adminAudit: () => request<AuditEntry[]>('/admin/audit?limit=200'),
  adminUpdateStore: (body: StoreInfo) => request<StoreInfo>('/admin/store', { method: 'PUT', body }),
  banners: () => request<Banner[]>('/banners'),
  adminBanners: () => request<Banner[]>('/admin/banners'),
  adminCreateBanner: (body: BannerInput) => request<Banner>('/admin/banners', { method: 'POST', body }),
  adminUpdateBanner: (id: number, body: BannerInput) => request<Banner>(`/admin/banners/${id}`, { method: 'PUT', body }),
  adminDeleteBanner: (id: number) => request<void>(`/admin/banners/${id}`, { method: 'DELETE' }),
  adminUploadBannerImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Banner>(`/admin/banners/${id}/image`, { method: 'POST', body: form });
  },
  adminUsers: (params: { q?: string; role?: string; status?: string }) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.set(k, v); });
    return request<AdminUser[]>(`/admin/users?${qs.toString()}`);
  },
  adminUpdateUser: (id: number, body: { role?: string; is_active?: boolean }) =>
    request<AdminUser>(`/admin/users/${id}`, { method: 'PATCH', body }),
  adminDashboard: () => request<AdminDashboard>('/admin/dashboard'),
  adminListVariants: (product_id: number) => request<Variant[]>(`/admin/products/${product_id}/variants`),
  adminCreateVariant: (product_id: number, body: VariantInput) =>
    request<Variant>(`/admin/products/${product_id}/variants`, { method: 'POST', body }),
  adminUpdateVariant: (id: number, body: VariantInput) => request<Variant>(`/admin/variants/${id}`, { method: 'PUT', body }),
  adminDeactivateVariant: (id: number) => request<void>(`/admin/variants/${id}`, { method: 'DELETE' }),
  adminCreatePromo: (body: PromoInput) => request<{ id: number; code: string }>('/admin/promos', { method: 'POST', body }),
};

export interface ProductInput {
  category_id: number;
  sku: string;
  name: string;
  description?: string | null;
  price: string;
  is_taxable?: boolean;
  stock?: number;
}

export interface PromoInput {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: string;
  min_subtotal?: string;
  usage_limit?: number | null;
}
