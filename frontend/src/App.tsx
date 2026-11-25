import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAdmin, RequireAuth } from './components/Guards';
import { AdminLayout } from './components/AdminNav';
import AdminDashboard from './pages/admin/AdminDashboard';
import Catalog from './pages/Catalog';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminProducts from './pages/admin/AdminProducts';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPromos from './pages/admin/AdminPromos';
import AdminStore from './pages/admin/AdminStore';
import AdminBanners from './pages/admin/AdminBanners';
import AdminUsers from './pages/admin/AdminUsers';
import Account from './pages/Account';
import Invoice from './pages/Invoice';
import Help from './pages/Help';
import AdminReviews from './pages/admin/AdminReviews';
import AdminAudit from './pages/admin/AdminAudit';
import { Privacy, Refund, Terms } from './pages/Legal';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Catalog />} />
        <Route path="products/:id" element={<ProductDetail />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="syarat" element={<Terms />} />
        <Route path="privasi" element={<Privacy />} />
        <Route path="pengembalian" element={<Refund />} />
        <Route path="bantuan" element={<Help />} />

        <Route element={<RequireAuth />}>
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="orders/:id/invoice" element={<Invoice />} />
          <Route path="orders/:id/surat-pesanan" element={<Invoice variant="sp" />} />
          <Route path="account" element={<Account />} />
        </Route>

        <Route path="*" element={<p className="error">Halaman tidak ditemukan.</p>} />
      </Route>

      <Route element={<RequireAdmin />}>
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="promos" element={<AdminPromos />} />
          <Route path="store" element={<AdminStore />} />
          <Route path="reviews" element={<AdminReviews />} />
          <Route path="aktivitas" element={<AdminAudit />} />
        </Route>
      </Route>
    </Routes>
  );
}
