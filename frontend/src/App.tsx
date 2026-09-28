import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { Catalogue } from './pages/Catalogue';
import { ProductPage } from './pages/ProductPage';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { WhatsAppFab } from './components/WhatsAppFab';
import { Footer } from './components/Footer';
import { SharedCartLoader } from './components/SharedCartLoader';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import { AdminLayout } from './admin/components/AdminLayout';
import { AdminLogin } from './admin/pages/AdminLogin';
import { AdminDashboard } from './admin/pages/AdminDashboard';
import { AdminProducts } from './admin/pages/AdminProducts';
import { AdminProductDetail } from './admin/pages/AdminProductDetail';
import { AdminStockTake } from './admin/pages/AdminStockTake';
import { AdminDiscountCodes } from './admin/pages/AdminDiscountCodes';
import { AdminReports } from './admin/pages/AdminReports';
import { AdminOrders } from './admin/pages/AdminOrders';
import { AdminUsers } from './admin/pages/AdminUsers';
import { AdminAccount } from './admin/pages/AdminAccount';
import { RequirePermission } from './admin/components/RequirePermission';
import './styles/theme.css';

function Header() {
  const { lines } = useCart();
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <header className="ss-header">
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', textDecoration: 'none' }}>
        <img src="/logo.svg" alt="Serani Spark" style={{ height: 48, width: 'auto' }} />
        <span className="logo">Serani Spark</span>
      </Link>
      <Link to="/cart" style={{ color: 'var(--ss-text-light)', textDecoration: 'none' }}>
        🛒 Cart {itemCount > 0 && `(${itemCount})`}
      </Link>
    </header>
  );
}

function Storefront() {
  return (
    <CartProvider>
      <Header />
      <SharedCartLoader />
      <Routes>
        <Route path="/" element={<Catalogue />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
      </Routes>
      <WhatsAppFab />
      <Footer />
    </CartProvider>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          {/* Each page sits behind the permission the server also enforces (see backend config/permissions.ts). */}
          <Route path="dashboard" element={<RequirePermission permission="dashboard:view"><AdminDashboard /></RequirePermission>} />
          <Route path="products" element={<RequirePermission permission="products:view"><AdminProducts /></RequirePermission>} />
          <Route path="products/:id" element={<RequirePermission permission="reports:view"><AdminProductDetail /></RequirePermission>} />
          <Route path="stock-take" element={<RequirePermission permission="stock:adjust"><AdminStockTake /></RequirePermission>} />
          <Route path="discount-codes" element={<RequirePermission permission="discounts:manage"><AdminDiscountCodes /></RequirePermission>} />
          <Route path="reports" element={<RequirePermission permission="reports:view"><AdminReports /></RequirePermission>} />
          <Route path="orders" element={<RequirePermission permission="orders:view"><AdminOrders /></RequirePermission>} />
          <Route path="users" element={<RequirePermission permission="users:manage"><AdminUsers /></RequirePermission>} />
          <Route path="account" element={<AdminAccount />} />
        </Route>
        <Route path="/*" element={<Storefront />} />
      </Routes>
    </AdminAuthProvider>
  );
}
