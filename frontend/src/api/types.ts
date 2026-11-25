// Semua nilai uang dikirim backend sebagai string desimal (mis. "111000.00").
export type Money = string;

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'customer' | 'admin';
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  id: number;
  category_id: number;
  sku: string;
  name: string;
  description: string | null;
  price: Money;
  ppn_included: Money;
  tax_rate: Money;
  is_taxable: boolean;
  stock: number;
  is_active: boolean;
  image_url: string | null;
}

export interface Page<T> {
  items: T[];
  page: number;
  per_page: number;
  total: number;
}

export interface CartItem {
  product_id: number;
  name: string;
  image_url: string | null;
  price: Money;
  is_taxable: boolean;
  is_active: boolean;
  stock: number;
  qty: number;
  selected: boolean;
}

export interface BreakdownLine {
  product_id: number;
  name: string;
  unit_price: Money;
  qty: number;
  is_taxable: boolean;
  line_subtotal: Money;
  line_discount: Money;
  line_net: Money;
}

export interface Breakdown {
  lines: BreakdownLine[];
  subtotal: Money;
  discount_total: Money;
  taxable_gross: Money;
  dpp: Money;
  ppn: Money;
  ppn_rate: Money;
  shipping_fee: Money;
  grand_total: Money;
}

export type OrderStatus = 'pending_payment' | 'paid' | 'processing' | 'shipped' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'expired' | 'refunded';

export interface OrderView {
  id: number;
  invoice_no: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: Money;
  discount_total: Money;
  promo_code: string | null;
  dpp: Money;
  ppn_rate: Money;
  ppn_total: Money;
  shipping_fee: Money;
  grand_total: Money;
  shipping_address: string;
  buyer_npwp: string | null;
  payment_url: string | null;
  expires_in_seconds: number;
  created_at: string;
  tracking_number: string | null;
  refund_note: string | null;
  buyer_name: string | null;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  unit_price: Money;
  qty: number;
  is_taxable: boolean;
  line_subtotal: Money;
  line_discount: Money;
}

export interface OrderDetail extends OrderView {
  items: OrderItem[];
}

export interface CheckoutResponse {
  order: OrderDetail;
  payment_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: User;
}

export interface StoreInfo {
  name: string;
  npwp: string;
  address: string;
  phone: string;
}

export interface AdminDashboard {
  revenue_total: Money;
  orders_to_ship: number;
  orders_total: number;
  active_products: number;
  low_stock_count: number;
  low_stock: { id: number; sku: string; name: string; stock: number }[];
  sales_7d: { day: string; total: Money }[];
  recent_orders: {
    id: number;
    invoice_no: string;
    buyer_name: string | null;
    status: OrderStatus;
    payment_status: PaymentStatus;
    grand_total: Money;
    created_at: string;
  }[];
}

export interface Banner {
  id: number;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  cta_url: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface BannerInput {
  title: string;
  subtitle?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  is_active?: boolean;
  sort_order?: number;
}
