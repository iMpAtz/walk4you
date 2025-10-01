'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import CartDropdown from './CartDropdown';
import { useCart } from '@/contexts/CartContext';

export default function CartIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const { cart } = useCart();

  const itemCount = cart?.totalItems || 0;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
        title="ตระกร้าสินค้า"
      >
        <ShoppingCart className="w-6 h-6 text-gray-600" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      <CartDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
