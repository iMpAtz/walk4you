'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopBar from '@/components/TopBar';



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
  const [storePayments, setStorePayments] = useState<Record<string, { qrUrl?: string }>>({});
  const [selectedPayment, setSelectedPayment] = useState<Record<string, string>>({});
  const [selectedShipping, setSelectedShipping] = useState<Record<string, string>>({});
  const [phoneNumber, setPhoneNumber] = useState('');
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
          // Fetch QR PromptPay for each store
          const fetchStorePayments = async () => {
            const payments: Record<string, { qrUrl?: string }> = {};
            await Promise.all(
              data.stores.map(async (store: CheckoutStore) => {
                try {
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/stores/${store.storeId}/qr`);
                  if (res.ok) {
                    const paymentData = await res.json();
                    payments[store.storeId] = { qrUrl: paymentData.qrUrl };
                  } else {
                    payments[store.storeId] = {};
                  }
                } catch {
                  payments[store.storeId] = {};
                }
              })
            );
            setStorePayments(payments);
          };
          fetchStorePayments();
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

    // Save current selections so confirm page can show QR or address
    const selections = {
      selectedPayment,
      selectedShipping,
    };
    sessionStorage.setItem('checkoutSelection', JSON.stringify(selections));
    sessionStorage.setItem('checkoutPhoneNumber', phoneNumber);

    // Keep checkoutData in sessionStorage (already present) and navigate to confirm page
    router.push('/checkout/confirm');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-600 mb-4 text-sm sm:text-base">ไม่พบข้อมูลการสั่งซื้อ</p>
          <button 
            onClick={() => router.push('/cart')}
            className="bg-[#0B44A3] text-white px-4 py-3 rounded-lg hover:bg-[#093782] min-h-[48px] touch-manipulation active:scale-95 text-base"
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
      <TopBar />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1 sm:mb-2">ชำระเงิน</h1>
          <p className="text-gray-600 text-sm sm:text-base">ตรวจสอบรายการสินค้าและดำเนินการชำระเงิน</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          {/* Order Items */}
          <div className="lg:col-span-2">
            {checkoutData.stores.map((store) => (
              <div key={store.storeId} className="bg-white rounded-lg shadow-sm mb-4 sm:mb-6">
                {/* Store Header */}
                <div className="border-b border-gray-200 p-3 sm:p-4">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-800 truncate">
                    🏪 {store.storeName}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {store.items.length} รายการ • ฿{store.totalAmount.toLocaleString()}
                  </p>
                </div>

                {/* Store Items */}
                <div className="p-3 sm:p-4">
                  {store.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 sm:gap-4 py-3 sm:py-4 border-b border-gray-100 last:border-b-0">
                      {/* Product Image */}
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {item.productImage ? (
                          <Image
                            src={item.productImage}
                            alt={item.productName}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm sm:text-base">
                            📦
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-800 truncate text-sm sm:text-base">
                          {item.productName}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          ฿{item.productPrice.toLocaleString()} × {item.quantity}
                        </p>
                      </div>

                      {/* Item Total */}
                      <div className="text-right">
                        <p className="font-semibold text-gray-800 text-sm sm:text-base">
                          ฿{item.totalPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment & Shipping Options */}
                <div className="border-t p-3 sm:p-4 space-y-4">
                  <div>
                    <label className="block font-medium mb-2 text-sm sm:text-base">วิธีชำระเงิน</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] px-2">
                        <input
                          type="radio"
                          name={`payment-${store.storeId}`}
                          value="cod"
                          checked={selectedPayment[store.storeId] === 'cod'}
                          onChange={() => setSelectedPayment({ ...selectedPayment, [store.storeId]: 'cod' })}
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span className="text-sm sm:text-base">เก็บเงินปลายทาง</span>
                      </label>
                      {storePayments[store.storeId]?.qrUrl && (
                        <label className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] px-2">
                          <input
                            type="radio"
                            name={`payment-${store.storeId}`}
                            value="qr"
                            checked={selectedPayment[store.storeId] === 'qr'}
                            onChange={() => setSelectedPayment({ ...selectedPayment, [store.storeId]: 'qr' })}
                            className="w-4 h-4 sm:w-5 sm:h-5"
                          />
                          <span className="text-sm sm:text-base">QR PromptPay</span>
                        </label>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block font-medium mb-2 text-sm sm:text-base">วิธีจัดส่ง</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] px-2">
                        <input
                          type="radio"
                          name={`shipping-${store.storeId}`}
                          value="post"
                          checked={selectedShipping[store.storeId] === 'post'}
                          onChange={() => setSelectedShipping({ ...selectedShipping, [store.storeId]: 'post' })}
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span className="text-sm sm:text-base">ส่งไปรษณีย์</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer touch-manipulation min-h-[44px] px-2">
                        <input
                          type="radio"
                          name={`shipping-${store.storeId}`}
                          value="meet"
                          checked={selectedShipping[store.storeId] === 'meet'}
                          onChange={() => setSelectedShipping({ ...selectedShipping, [store.storeId]: 'meet' })}
                          className="w-4 h-4 sm:w-5 sm:h-5"
                        />
                        <span className="text-sm sm:text-base">นัดรับ</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 sticky top-4">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 sm:mb-4">สรุปคำสั่งซื้อ</h3>
              
              <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>จำนวนสินค้า</span>
                  <span>{checkoutData.totalItems} รายการ</span>
                </div>
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>จำนวนร้านค้า</span>
                  <span>{checkoutData.stores.length} ร้าน</span>
                </div>
                <div className="pt-2 sm:pt-3">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">เบอร์โทรผู้รับ</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="กรอกเบอร์โทรติดต่อผู้รับ"
                    className="w-full border rounded-lg px-3 py-2.5 text-base touch-manipulation"
                  />
                </div>
                <div className="border-t pt-2 sm:pt-3">
                  <div className="flex justify-between text-base sm:text-lg font-bold text-gray-800">
                    <span>ยอดรวมทั้งหมด</span>
                    <span>฿{checkoutData.totalAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Store Breakdown */}
              <div className="mb-4 sm:mb-6">
                <h4 className="font-semibold text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">รายละเอียดตามร้าน</h4>
                <div className="space-y-2">
                  {checkoutData.stores.map((store) => (
                    <div key={store.storeId} className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-600 truncate">{store.storeName}</span>
                      <span className="font-medium">฿{store.totalAmount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handlePlaceOrder}
                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors mb-3 sm:mb-4 min-h-[48px] touch-manipulation active:scale-95 text-base"
              >
                สั่งซื้อสินค้า
              </button>

              <div className="text-center">
                <button
                  onClick={() => router.push('/cart')}
                  className="text-[#0B44A3] hover:text-[#093782] font-medium touch-manipulation text-sm sm:text-base min-h-[44px] inline-flex items-center justify-center px-2"
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
