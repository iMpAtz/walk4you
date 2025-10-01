'use client';

import { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';

interface CartDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDropdown({ isOpen, onClose }: CartDropdownProps) {
  const { cart, loading, updateCartItem, removeFromCart, clearCart } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      setUpdatingItems(prev => new Set(prev).add(itemId));
      await updateCartItem(itemId, newQuantity);
    } catch (error) {
      console.error('Failed to update quantity:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัปเดตจำนวนสินค้า';
      alert(errorMessage);
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!confirm('คุณต้องการลบสินค้านี้ออกจากตระกร้าหรือไม่?')) return;
    
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Failed to remove item:', error);
      alert('เกิดข้อผิดพลาดในการลบสินค้า');
    }
  };

  const handleClearCart = async () => {
    if (!confirm('คุณต้องการลบสินค้าทั้งหมดออกจากตระกร้าหรือไม่?')) return;
    
    try {
      await clearCart();
    } catch (error) {
      console.error('Failed to clear cart:', error);
      alert('เกิดข้อผิดพลาดในการลบสินค้าทั้งหมด');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute top-16 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">ตระกร้าสินค้า</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-500">กำลังโหลด...</span>
            </div>
          ) : !cart || cart.items.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">ตระกร้าว่างเปล่า</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {cart.items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Product Image */}
                    <div className="flex-shrink-0">
                      {item.productImage ? (
                        <Image
                          src={item.productImage}
                          alt={item.productName}
                          width={60}
                          height={60}
                          className="rounded-lg object-cover w-15 h-15"
                        />
                      ) : (
                        <div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
                          <ShoppingBag className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                        {item.productName}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        ฿{item.productPrice.toLocaleString()}
                      </p>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1 || updatingItems.has(item.id)}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        <span className="text-sm font-medium min-w-[20px] text-center">
                          {updatingItems.has(item.id) ? (
                            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          ) : (
                            item.quantity
                          )}
                        </span>
                        
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          disabled={updatingItems.has(item.id)}
                          className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        ฿{item.totalPrice.toLocaleString()}
                      </p>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 hover:bg-red-50 rounded text-red-500 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {cart && cart.items.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                รวม {cart.totalItems} ชิ้น
              </span>
              <span className="text-lg font-bold text-gray-900">
                ฿{cart.totalAmount.toLocaleString()}
              </span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleClearCart}
                className="flex-1 text-sm text-red-600 hover:text-red-700 font-medium py-2 px-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                ลบทั้งหมด
              </button>
              <button
                onClick={() => {
                  // Navigate to checkout page
                  window.location.href = '/checkout';
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-lg transition-colors"
              >
                ชำระเงิน
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
