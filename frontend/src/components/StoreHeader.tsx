import { useCallback, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { SearchBox } from './SearchBox';
import { CategoryDrawer } from './CategoryDrawer';

export function StoreHeader() {
  const { lines } = useCart();
  const { token } = useCustomerAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  // No search box while paying: typing in it would navigate away and lose a
  // half-filled checkout form.
  const showSearch = !location.pathname.startsWith('/checkout') && !location.pathname.startsWith('/order-confirmation');

  return (
    <>
      <header className={`ss-store-header${showSearch ? '' : ' ss-store-header--no-search'}`}>
        <button
          type="button"
          className="ss-menu-btn"
          aria-label="Open menu"
          aria-expanded={drawerOpen}
          aria-controls="ss-drawer"
          onClick={() => setDrawerOpen(true)}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="currentColor" aria-hidden="true">
            <rect y="4" width="22" height="2.5" rx="1.25" />
            <rect y="9.75" width="22" height="2.5" rx="1.25" />
            <rect y="15.5" width="22" height="2.5" rx="1.25" />
          </svg>
        </button>

        <Link to="/" className="ss-brand">
          <img src="/logo.svg" alt="" />
          <span className="logo">Serani Spark</span>
        </Link>

        {showSearch && <SearchBox />}

        <div className="ss-header-links">
          {/* On phones this lives in the menu drawer, which keeps the top row from overflowing. */}
          <Link to={token ? '/account' : '/login'} className="ss-hide-mobile">
            {token ? 'My Account' : 'Sign In'}
          </Link>
          <Link to="/cart" aria-label={`Cart${itemCount > 0 ? `, ${itemCount} items` : ''}`}>
            🛒<span className="ss-hide-xs"> Cart</span>
            {itemCount > 0 && ` (${itemCount})`}
          </Link>
        </div>
      </header>

      <CategoryDrawer open={drawerOpen} onClose={closeDrawer} />
    </>
  );
}
