import React, { createContext, useContext, useEffect, useState } from 'react';
import type { PublicProduct } from '../../../shared/types';

interface CartLine {
  product: PublicProduct;
  quantity: number;
}

interface CartContextValue {
  lines: CartLine[];
  addToCart: (product: PublicProduct, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  loadCart: (newLines: CartLine[]) => void;
  subtotal: number;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);
const STORAGE_KEY = 'serani-spark-cart';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  }, [lines]);

  function addToCart(product: PublicProduct, quantity = product.moq) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + quantity } : l
        );
      }
      // Never let an initial add sit below MOQ.
      return [...prev, { product, quantity: Math.max(quantity, product.moq) }];
    });
  }

  function updateQuantity(productId: string, quantity: number) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l;
        // Enforce MOQ floor client-side (server re-validates on checkout regardless).
        const clamped = Math.max(quantity, l.product.moq);
        return { ...l, quantity: clamped };
      })
    );
  }

  function removeFromCart(productId: string) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function clearCart() {
    setLines([]);
  }

  function loadCart(newLines: CartLine[]) {
    setLines(newLines);
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price_kes * l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, addToCart, updateQuantity, removeFromCart, clearCart, loadCart, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
