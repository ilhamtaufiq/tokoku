import { NavLink, Outlet } from 'react-router';

export function AdminLayout() {
  return (
    <div>
      <nav className="subnav">
        <NavLink to="/admin/products">Produk</NavLink>
        <NavLink to="/admin/orders">Pesanan</NavLink>
        <NavLink to="/admin/promos">Promo</NavLink>
      </nav>
      <Outlet />
    </div>
  );
}
