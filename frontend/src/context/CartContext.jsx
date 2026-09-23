import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { apiGet } from '../api.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);

  const refreshCartCount = useCallback(async () => {
    try {
      const { ok, data } = await apiGet('/api/cart');
      if (ok && Array.isArray(data.items)) {
        const total = data.items.reduce((sum, i) => sum + i.quantity, 0);
        setCartCount(total);
      }
    } catch (err) {
      // ບຕອງໂຊວ error ພຽງແຕນບ badge
    }
  }, []);

  useEffect(() => {
    refreshCartCount();
  }, [refreshCartCount]);

  return (
    <CartContext.Provider value={{ cartCount, refreshCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}