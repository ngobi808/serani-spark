import { Navigate, NavLink, Outlet } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

export function AdminLayout() {
  const { token, logout } = useAdminAuth();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? 'var(--ss-gold)' : 'var(--ss-text-light)',
    textDecoration: 'none',
    fontWeight: 600,
  });

  return (
    <div>
      <header className="ss-header">
        <span className="logo">Serani Spark Admin</span>
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
          <NavLink to="/admin/dashboard" style={linkStyle}>Dashboard</NavLink>
          <NavLink to="/admin/products" style={linkStyle}>Products</NavLink>
          <NavLink to="/admin/orders" style={linkStyle}>Orders</NavLink>
          <button
            onClick={logout}
            style={{ background: 'transparent', border: '1px solid var(--ss-gold)', color: 'var(--ss-gold)', padding: '0.4rem 0.8rem', borderRadius: 8, cursor: 'pointer' }}
          >
            Log out
          </button>
        </nav>
      </header>
      <main className="ss-container">
        <Outlet />
      </main>
    </div>
  );
}
