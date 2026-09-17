import { Routes, Route, Link } from 'react-router-dom';
import { CartProvider, useCart } from './context/CartContext';
import { Catalogue } from './pages/Catalogue';
import { ProductPage } from './pages/ProductPage';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { WhatsAppFab } from './components/WhatsAppFab';
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

export default function App() {
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
