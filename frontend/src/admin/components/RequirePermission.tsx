import { Link } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';

/** Wraps an admin page so a role without the permission sees a clear message instead of a broken screen. */
export function RequirePermission({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { can } = useAdminAuth();

  if (!can(permission)) {
    return (
      <div className="ss-card" style={{ maxWidth: 480 }}>
        <h2 style={{ marginTop: 0 }}>No access</h2>
        <p>Your role doesn't include this page. If you need it, ask the account owner.</p>
        <Link to="/admin/dashboard">Back to dashboard</Link>
      </div>
    );
  }

  return <>{children}</>;
}
