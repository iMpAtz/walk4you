'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  quantity: number;
  totalPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  error: string | null;
  addToCart: (productId: string, quantity: number) => Promise<void>;
  updateCartItem: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider = ({ children }: CartProviderProps) => {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000';

  const getAuthHeaders = () => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  };

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('access_token');
      if (!token) {
        setCart(null);
        return;
      }

      const response = await fetch(`${API_BASE}/cart`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const cartData = await response.json();
        setCart(cartData);
      } else if (response.status === 401) {
        // User not authenticated
        setCart(null);
      } else {
        throw new Error(`Failed to fetch cart: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (productId: string, quantity: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/cart/items`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          productId,
          quantity,
        }),
      });

      if (response.ok) {
        // Refresh cart data
        await fetchCart();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Failed to add to cart';
        
        // Check if it's an insufficient quantity error
        if (errorMessage.includes('Insufficient quantity')) {
          throw new Error('สินค้ามีไม่เพียงพอ กรุณาลดจำนวนลง');
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to add to cart';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateCartItem = async (itemId: string, quantity: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          quantity,
        }),
      });

      if (response.ok) {
        // Refresh cart data
        await fetchCart();
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'Failed to update cart item';
        
        // Check if it's an insufficient quantity error
        if (errorMessage.includes('Insufficient quantity')) {
          throw new Error('สินค้ามีไม่เพียงพอ กรุณาลดจำนวนลง');
        }
        
        throw new Error(errorMessage);
      }
    } catch (err) {
      console.error('Error updating cart item:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update cart item';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Refresh cart data
        await fetchCart();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to remove from cart');
      }
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove from cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const clearCart = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE}/cart`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        // Refresh cart data
        await fetchCart();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to clear cart');
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear cart');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshCart = async () => {
    await fetchCart();
  };

  // Fetch cart on mount and when token changes
  useEffect(() => {
    fetchCart();
  }, []);

  // Listen for storage changes (login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      fetchCart();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value: CartContextType = {
    cart,
    loading,
    error,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
    refreshCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
