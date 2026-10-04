import { useEffect, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useCategories } from '../hooks/useCategories';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface CategoryDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CategoryDrawer({ open, onClose }: CategoryDrawerProps) {
  const { categories, status, reload } = useCategories();
  const { token } = useCustomerAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  // Kept in a ref so the effect below doesn't re-run (and steal focus) every time
  // the parent re-renders with a new function.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The drawer is always mounted (so it can slide), which means a failed load would
  // otherwise never be retried. Retry each time it's opened.
  useEffect(() => {
    if (open && status === 'error') return reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    document.body.style.overflow = 'hidden'; // stop the page scrolling behind the menu

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      // Keep Tab inside the menu while it's open.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open]);

  const onCatalogue = location.pathname === '/';
  const activeCategory = onCatalogue && !searchParams.get('q') ? searchParams.get('category') : null;
  const showingAll = onCatalogue && !searchParams.get('q') && !searchParams.get('category');

  return (
    <>
      <div className={`ss-drawer-overlay${open ? ' open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside
        id="ss-drawer"
        ref={panelRef}
        className={`ss-drawer${open ? ' open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
      >
        <div className="ss-drawer-head">
          <Link to={token ? '/account' : '/login'} onClick={onClose} className="ss-drawer-account">
            {token ? 'My Account' : 'Sign In'}
          </Link>
          <button ref={closeRef} type="button" className="ss-drawer-close" aria-label="Close menu" onClick={onClose}>
            ✕
          </button>
        </div>

        <nav aria-label="Product categories">
          <p className="ss-drawer-title">Shop by category</p>
          {status === 'error' && <p className="ss-drawer-note">Couldn't load categories. Close and reopen the menu to try again.</p>}
          {status === 'loading' && categories.length === 0 && <p className="ss-drawer-note">Loading categories...</p>}
          <ul>
            <li>
              <Link to="/" onClick={onClose} className={showingAll ? 'active' : ''} aria-current={showingAll ? 'page' : undefined}>
                All products
              </Link>
            </li>
            {categories.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <li key={cat}>
                  <Link
                    to={`/?category=${encodeURIComponent(cat)}`}
                    onClick={onClose}
                    className={isActive ? 'active' : ''}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {cat}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
