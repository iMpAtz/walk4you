'use client';

import { useState } from 'react';
import { ShoppingCart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import CartDropdown from './CartDropdown';
import { useCart } from '@/contexts/CartContext';

export default function CartIcon() {
  const [isOpen, setIsOpen] = useState(false);
  const { cart } = useCart();
  const router = useRouter();

  const itemCount = cart?.totalItems || 0;

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    // If there are items in cart, go to cart page directly
    if (itemCount > 0) {
      router.push('/cart');
    } else {
      // If cart is empty, show dropdown with empty state
      setIsOpen(!isOpen);
    }
  };

  return (
    <>
      <div className="relative">
        <button
          onClick={handleCartClick}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="ตระกร้าสินค้า"
        >
          <ShoppingCart className="w-6 h-6 text-gray-600" />
        </button>
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold border-2 border-white z-20">
            {itemCount > 9 ? '9+' : itemCount}
          </span>
        )}
      </div>

      <CartDropdown
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
