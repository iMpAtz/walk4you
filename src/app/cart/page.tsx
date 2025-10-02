'use client';

import { useState, useEffect } from 'react';
import { useCart, CartItem } from '@/contexts/CartContext';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface StoreGroup {
  storeId: string;
  storeName: string;
  items: CartItem[];
  totalAmount: number;
  selected: boolean;
}

export default function CartPage() {
  const { cart, loading, error, updateCartItem, removeFromCart } = useCart();
  const [storeGroups, setStoreGroups] = useState<StoreGroup[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const router = useRouter();

  // Group cart items by store
  useEffect(() => {
    if (cart?.items) {
      const grouped = cart.items.reduce((acc, item) => {
        const existingStore = acc.find(group => group.storeId === item.storeId);
        
        if (existingStore) {
          existingStore.items.push(item);
          existingStore.totalAmount += item.totalPrice;
        } else {
          acc.push({
            storeId: item.storeId,
            storeName: item.storeName,
            items: [item],
            totalAmount: item.totalPrice,
            selected: false
          });
        }
        
        return acc;
      }, [] as StoreGroup[]);
      
      setStoreGroups(grouped);
    }
  }, [cart?.items]);

  const handleStoreSelect = (storeId: string, selected: boolean) => {
    setStoreGroups(prev => 
      prev.map(group => 
        group.storeId === storeId 
          ? { ...group, selected }
          : group
      )
    );
    
    // Update select all state
    const updatedGroups = storeGroups.map(group => 
      group.storeId === storeId ? { ...group, selected } : group
    );
    setSelectAll(updatedGroups.every(group => group.selected));
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectAll(selected);
    setStoreGroups(prev => 
      prev.map(group => ({ ...group, selected }))
    );
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    try {
      await updateCartItem(itemId, newQuantity);
    } catch (error) {
      console.error('Error updating quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeFromCart(itemId);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const getSelectedTotal = () => {
    return storeGroups
      .filter(group => group.selected)
      .reduce((total, group) => total + group.totalAmount, 0);
  };

  const getSelectedItemsCount = () => {
    return storeGroups
      .filter(group => group.selected)
      .reduce((count, group) => count + group.items.length, 0);
  };

  const handleCheckout = () => {
    const selectedStores = storeGroups.filter(group => group.selected);
    
    if (selectedStores.length === 0) {
      alert('กรุณาเลือกสินค้าที่ต้องการชำระเงิน');
      return;
    }

    // Navigate to checkout with selected store data
    const selectedItems = selectedStores.flatMap(store => store.items);
    const checkoutData = {
      stores: selectedStores.map(store => ({
        storeId: store.storeId,
        storeName: store.storeName,
        items: store.items,
        totalAmount: store.totalAmount
      })),
      totalAmount: getSelectedTotal(),
      totalItems: getSelectedItemsCount()
    };
    
    // Store checkout data in sessionStorage for checkout page
    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    router.push('/checkout');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดตระกร้าสินค้า...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">เกิดข้อผิดพลาด: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">ตระกร้าสินค้าว่างเปล่า</h2>
          <p className="text-gray-600 mb-6">เพิ่มสินค้าลงในตระกร้าเพื่อเริ่มต้นการช้อปปิ้ง</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            เริ่มช้อปปิ้ง
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ตระกร้าสินค้า</h1>
          <p className="text-gray-600">จัดการสินค้าในตระกร้าและเลือกสินค้าที่ต้องการชำระเงิน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            {/* Select All */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-lg font-medium text-gray-800">
                  เลือกทั้งหมด ({storeGroups.length} ร้านค้า)
                </span>
              </label>
            </div>

            {/* Store Groups */}
            {storeGroups.map((storeGroup) => (
              <div key={storeGroup.storeId} className="bg-white rounded-lg shadow-sm mb-6">
                {/* Store Header */}
                <div className="border-b border-gray-200 p-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeGroup.selected}
                      onChange={(e) => handleStoreSelect(storeGroup.storeId, e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-800">
                        🏪 {storeGroup.storeName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {storeGroup.items.length} รายการ • ฿{storeGroup.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Store Items */}
                <div className="p-4">
                  {storeGroup.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
                      {/* Product Image */}
                      <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            📦
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 truncate">
                          {item.productName}
                        </h4>
                        <p className="text-lg font-semibold text-blue-600 mt-1">
                          ฿{item.productPrice.toLocaleString()}
                        </p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          -
                        </button>
                        <span className="w-12 text-center font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right min-w-0">
                        <p className="font-semibold text-gray-800">
                          ฿{item.totalPrice.toLocaleString()}
                        </p>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="ลบสินค้า"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">สรุปคำสั่งซื้อ</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span>สินค้าที่เลือก</span>
                  <span>{getSelectedItemsCount()} รายการ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>ร้านค้าที่เลือก</span>
                  <span>{storeGroups.filter(g => g.selected).length} ร้าน</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-800">
                    <span>ยอดรวม</span>
                    <span>฿{getSelectedTotal().toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={getSelectedItemsCount() === 0}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ดำเนินการชำระเงิน
              </button>

              <div className="mt-4 text-center">
                <button
                  onClick={() => router.push('/')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← กลับไปช้อปปิ้งต่อ
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
