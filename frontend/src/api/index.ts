import { request } from './client';
import type {
  AuthResponse,
  Breakdown,
  CartItem,
  Category,
  CheckoutResponse,
  OrderDetail,
  OrderStatus,
  OrderView,
  Page,
  AdminDashboard,
  Product,
  StoreInfo,
  User,
} from './types';

export const api = {
  // Auth
  register: (body: { email: string; password: string; name: string }) =>
    request<AuthResponse>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),

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

  // Keranjang
  cart: () => request<CartItem[]>('/cart'),
  setCartItem: (product_id: number, qty: number) =>
    request<void>('/cart/items', { method: 'PUT', body: { product_id, qty } }),
  removeCartItem: (product_id: number) => request<void>(`/cart/items/${product_id}`, { method: 'DELETE' }),

  // Pratinjau harga
  preview: (items: { product_id: number; qty: number }[], promo_code?: string) =>
    request<Breakdown>('/pricing/preview', { method: 'POST', body: { items, promo_code: promo_code || null } }),

  // Pesanan
  checkout: (body: { shipping_address: string; promo_code?: string; buyer_npwp?: string }) =>
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
  adminOrders: (status?: OrderStatus | '') =>
    request<OrderView[]>(`/admin/orders${status ? `?status=${status}` : ''}`),
  adminSetOrderStatus: (id: number, status: OrderStatus) =>
    request<OrderView>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  adminUploadProductImage: (id: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<Product>(`/admin/products/${id}/image`, { method: 'POST', body: form });
  },
  adminShipOrder: (id: number, tracking_number: string) =>
    request<OrderView>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status: 'shipped', tracking_number } }),
  adminRefundCancel: (id: number, note: string) =>
    request<OrderView>(`/admin/orders/${id}/refund-cancel`, { method: 'POST', body: { note } }),
  store: () => request<StoreInfo>('/store'),
  adminUpdateStore: (body: StoreInfo) => request<StoreInfo>('/admin/store', { method: 'PUT', body }),
  adminDashboard: () => request<AdminDashboard>('/admin/dashboard'),
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
