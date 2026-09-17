import { Routes, Route, Link } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { Catalogue } from './pages/Catalogue';
import { ProductPage } from './pages/ProductPage';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { WhatsAppFab } from './components/WhatsAppFab';
import { AdminAuthProvider } from './admin/context/AdminAuthContext';
import { AdminLayout } from './admin/components/AdminLayout';
import { AdminLogin } from './admin/pages/AdminLogin';
import { AdminDashboard } from './admin/pages/AdminDashboard';
import { AdminProducts } from './admin/pages/AdminProducts';
import { AdminOrders } from './admin/pages/AdminOrders';
import './styles/theme.css';

function Header() {
  const { lines } = useCart();
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);
  return (
    <header className="ss-header">
      <Link to="/" className="logo" style={{ textDecoration: 'none' }}>Serani Spark</Link>
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
      <Routes>
        <Route path="/" element={<Catalogue />} />
        <Route path="/products/:id" element={<ProductPage />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
      </Routes>
      <WhatsAppFab />
    </CartProvider>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
        <Route path="/*" element={<Storefront />} />
      </Routes>
    </AdminAuthProvider>
  );
}
