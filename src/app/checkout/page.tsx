'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';

interface CheckoutItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  quantity: number;
  totalPrice: number;
  storeId: string;
  storeName: string;
}

interface CheckoutStore {
  storeId: string;
  storeName: string;
  items: CheckoutItem[];
  totalAmount: number;
}

interface CheckoutData {
  stores: CheckoutStore[];
  totalAmount: number;
  totalItems: number;
}

export default function CheckoutPage() {
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const router = useRouter();

  // Fetch user profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    // Get checkout data from sessionStorage
    const storedData = sessionStorage.getItem('checkoutData');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);
        setCheckoutData(data);
      } catch (error) {
        console.error('Error parsing checkout data:', error);
        router.push('/cart');
      }
    } else {
      // No checkout data, redirect to cart
      router.push('/cart');
    }
    setLoading(false);
  }, [router]);

  const handlePlaceOrder = async () => {
    if (!checkoutData) return;

    // Here you would implement the actual order placement logic
    alert('ฟีเจอร์การสั่งซื้อจะพัฒนาต่อไป');
    
    // Clear checkout data and redirect
    sessionStorage.removeItem('checkoutData');
    router.push('/main');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">ไม่พบข้อมูลการสั่งซื้อ</p>
          <button 
            onClick={() => router.push('/cart')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            กลับไปยังตระกร้า
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 lg:px-8 py-4 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a 
            href="/" 
            className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition cursor-pointer"
          >
            ShopLogo
          </a>
          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell />
            <CartIcon />
            <div className="flex items-center gap-2 lg:gap-3">
              {userProfile?.avatar?.url ? (
                <Image 
                  src={userProfile.avatar.url} 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="rounded-full object-cover w-8 h-8"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="hidden sm:block font-medium text-gray-700">
                {userProfile?.username || 'User'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ชำระเงิน</h1>
          <p className="text-gray-600">ตรวจสอบรายการสินค้าและดำเนินการชำระเงิน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            {checkoutData.stores.map((store) => (
              <div key={store.storeId} className="bg-white rounded-lg shadow-sm mb-6">
                {/* Store Header */}
                <div className="border-b border-gray-200 p-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    🏪 {store.storeName}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {store.items.length} รายการ • ฿{store.totalAmount.toLocaleString()}
                  </p>
                </div>

                {/* Store Items */}
                <div className="p-4">
                  {store.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-4 border-b border-gray-100 last:border-b-0">
                      {/* Product Image */}
                      <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            width={64}
                            height={64}
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
                        <p className="text-sm text-gray-600">
                          ฿{item.productPrice.toLocaleString()} × {item.quantity}
                        </p>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-800">
                          ฿{item.totalPrice.toLocaleString()}
                        </p>
                      </div>
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
                  <span>จำนวนสินค้า</span>
                  <span>{checkoutData.totalItems} รายการ</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>จำนวนร้านค้า</span>
                  <span>{checkoutData.stores.length} ร้าน</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg font-bold text-gray-800">
                    <span>ยอดรวมทั้งหมด</span>
                    <span>฿{checkoutData.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Store Breakdown */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">รายละเอียดตามร้าน</h4>
                <div className="space-y-2">
                  {checkoutData.stores.map((store) => (
                    <div key={store.storeId} className="flex justify-between text-sm">
                      <span className="text-gray-600 truncate">{store.storeName}</span>
                      <span className="font-medium">฿{store.totalAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors mb-4"
              >
                สั่งซื้อสินค้า
              </button>

              <div className="text-center">
                <button
                  onClick={() => router.push('/cart')}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  ← กลับไปแก้ไขตระกร้า
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
