import { Navigate, NavLink, Link, Outlet, useLocation } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  operations: 'Operations & Support',
  finance: 'Finance',
};

// Each link appears only for roles holding its permission. (The server enforces
// the same rules; this just keeps people from seeing pages they can't use.)
const NAV_ITEMS: { to: string; label: string; permission: string }[] = [
  { to: '/admin/dashboard', label: 'Dashboard', permission: 'dashboard:view' },
  { to: '/admin/products', label: 'Products', permission: 'products:view' },
  { to: '/admin/reports', label: 'Reports', permission: 'reports:view' },
  { to: '/admin/stock-take', label: 'Stock Take', permission: 'stock:adjust' },
  { to: '/admin/discount-codes', label: 'Discount Codes', permission: 'discounts:manage' },
  { to: '/admin/users', label: 'Users', permission: 'users:manage' },
];

export function AdminLayout() {
  const { token, user, loading, logout, can } = useAdminAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  if (loading || !user) {
    return <p style={{ padding: '2rem' }}>Loading...</p>;
  }

  // Someone with a temporary password must set their own before anything else.
  if (user.must_change_password && location.pathname !== '/admin/account') {
    return <Navigate to="/admin/account" replace />;
  }

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? 'var(--ss-gold)' : 'var(--ss-text-light)',
    textDecoration: 'none',
    fontWeight: 600,
  });

  const forcedChange = user.must_change_password;

  return (
    <div>
      <header className="ss-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <Link to="/admin/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Serani Spark Admin" style={{ height: 44, width: 'auto' }} />
          <span className="logo">Serani Spark Admin</span>
        </Link>
        <nav style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {!forcedChange && NAV_ITEMS.filter((item) => can(item.permission)).map((item) => (
            <NavLink key={item.to} to={item.to} style={linkStyle}>{item.label}</NavLink>
          ))}
          <NavLink to="/admin/account" style={linkStyle} title={`${user.email} · ${ROLE_LABELS[user.role] ?? user.role}`}>
            My Account
          </NavLink>
          <span style={{ color: 'var(--ss-text-light)', opacity: 0.75, fontSize: '0.8rem' }}>
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
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
