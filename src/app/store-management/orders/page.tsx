'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopBar from '@/components/TopBar';
import { config } from '@/lib/config';
import { 
  Building2,
  Clipboard,
  BarChart3,
  Check,
  X,
  AlertTriangle,
  Package
} from 'lucide-react';

interface OrderItem {
  productId: string;
  productName?: string;
  quantity: number;
  price: number;
  total?: number;
}

interface Order {
  id: string;
  username?: string;
  userId: string;
  storeId: string;
  items: OrderItem[];
  totalAmount: number;
  status?: string;
  shippingAddress?: string;
  phoneNumber?: string;
  notes?: string;
  paymentProofUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingId?: string;
}

// Helper function to get customer's selected delivery method from notes
const getCustomerDeliveryMethod = (order: Order): string => {
  if (!order.notes) return '—';
  
  try {
    const parsed = JSON.parse(order.notes);
    const selectedShipping = parsed?.selection?.selectedShipping?.[order.storeId];
    
    if (selectedShipping === 'post') return 'ส่งไปรษณีย์';
    if (selectedShipping === 'meet') return 'นัดรับ';
    return '—';
  } catch {
    return '—';
  }
};

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: {
    url: string;
  };
}

interface StoreData {
  id: string;
  storeName: string;
  logoUrl?: string | null;
}

export default function StoreOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [showStatusError, setShowStatusError] = useState<string | null>(null);
  const [shippingDrafts, setShippingDrafts] = useState<Record<string, { shippingMethod: string; shippingCarrier: string; shippingId: string }>>({});

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }
        setHasToken(true);
        await Promise.all([
          fetchUserData(token),
          fetchStoreData(token),
          fetchOrders(token)
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setUserData(data);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchStoreData = async (token: string) => {
    try {
      const response = await fetch(`${config.apiBaseUrl}/users/me/store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        const { id, storeName, logoUrl } = data;
        setStoreData({ id, storeName, logoUrl });
      }
    } catch (error) {
      console.error('Failed to fetch store data:', error);
    }
  };

  const fetchOrders = async (token: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/orders/my-store`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } else if (res.status === 404) {
        setOrders([]);
      } else {
        throw new Error('Failed to fetch orders');
      }
    } catch (e) {
      console.error(e);
      setOrders([]);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      setShowStatusError(null);

      // If approving order, check that shipping info is complete
      if (newStatus === 'APPROVED') {
        const order = orders.find(o => o.id === orderId);
        const draft = shippingDrafts[orderId];
        
        const shippingMethod = draft?.shippingMethod || order?.shippingMethod || '';
        const shippingCarrier = draft?.shippingCarrier || order?.shippingCarrier || '';
        const shippingId = draft?.shippingId || order?.shippingId || '';

        if (!shippingMethod.trim() || !shippingCarrier.trim() || !shippingId.trim()) {
          setShowStatusError('กรุณากรอกข้อมูลการจัดส่งให้ครบถ้วนก่อนยืนยันคำสั่งซื้อ (รูปแบบการจัดส่ง, ชื่อขนส่ง, และ Tracking No.)');
          return;
        }

        // Save shipping info first if there are unsaved changes
        if (draft) {
          await updateOrderShipping(orderId, draft);
        }
      }

      const res = await fetch(`${config.apiBaseUrl}/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed');
      }
      await fetchOrders(token);
    } catch (e: any) {
      console.error(e);
      setShowStatusError(e?.message || 'อัปเดตสถานะล้มเหลว');
    }
  };

  const updateOrderShipping = async (
    orderId: string,
    payload: { shippingMethod?: string; shippingCarrier?: string; shippingId?: string }
  ) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${config.apiBaseUrl}/orders/${orderId}/shipping`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed');
      }
      await fetchOrders(token);
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasToken || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 sticky top-20 sm:top-24">
              {/* Store Info */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
                {storeData?.logoUrl ? (
                  <Image 
                    src={storeData.logoUrl} 
                    alt="Store Logo" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm"
                  />
                ) : userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 text-sm sm:text-base truncate">จัดการร้านค้า</div>
                  <div className="text-xs text-gray-500 truncate">
                    {userData?.username || 'Store Management'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button 
                  onClick={() => router.push('/store-management')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">ข้อมูลร้านค้า</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/dashboard')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">ยอดขายของฉัน</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/products')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">สินค้าของฉัน</span>
                </button>

                <button className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg shadow-sm touch-manipulation min-h-[44px]">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-white">รายการสั่งซื้อ</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">รายการสั่งซื้อ</h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">จัดการคำสั่งซื้อที่เข้ามาทั้งหมด</p>
              </div>

              {/* Orders List */}
              <div className="p-4 sm:p-6 md:p-8">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clipboard className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีคำสั่งซื้อ</h3>
                    <p className="text-gray-500">เมื่อมีคำสั่งซื้อเข้ามาจะแสดงที่นี่</p>
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 sm:p-5 md:p-6 border-2 border-gray-200 rounded-xl hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50">
                        <div className="flex flex-col sm:flex-row items-start justify-between mb-3 sm:mb-4 gap-3 sm:gap-0">
                          <div className="w-full sm:w-auto">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-gray-500 uppercase">Order ID:</span>
                              <span className="font-mono text-xs sm:text-sm text-gray-700">#{order.id.slice(-8)}</span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 break-words">ผู้สั่งซื้อ: <span className="font-semibold">{order.username || order.userId}</span></div>
                            <div className="text-xl sm:text-2xl font-bold text-[#0B44A3] mt-1">฿{order.totalAmount?.toLocaleString()}</div>
                            <div className="mt-2">
                              {order.status === 'PENDING' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                  รอดำเนินการ
                                </span>
                              )}
                              {order.status === 'APPROVED' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                  อนุมัติแล้ว
                                </span>
                              )}
                              {order.status === 'REJECTED' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                  ปฏิเสธ
                                </span>
                              )}
                              {order.status === 'COMPLETED' && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                                  เสร็จสมบูรณ์
                                </span>
                              )}
                              {!order.status && (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                                  ไม่ระบุ
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500 w-full sm:w-auto">
                            {order.updatedAt ? new Date(order.updatedAt.endsWith('Z') ? order.updatedAt : order.updatedAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : ''}
                          </div>
                        </div>

                        <div className="border-t-2 border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
                          <div className="font-semibold text-gray-900 mb-2 sm:mb-3 text-sm sm:text-base">รายการสินค้า</div>
                          <div className="space-y-2 bg-white rounded-lg p-3 sm:p-4 shadow-sm">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-xs sm:text-sm hover:bg-gray-50 p-2 rounded transition-colors gap-2">
                                <div className="flex-1 truncate font-medium text-gray-700">{it.productName || it.productId} <span className="text-gray-500">× {it.quantity}</span></div>
                                <div className="font-bold text-[#0B44A3] flex-shrink-0">฿{(it.total ?? it.price * it.quantity).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>

                          {order.paymentProofUrl && (
                            <div className="mt-3 sm:mt-4 bg-gray-50 rounded-lg p-3 sm:p-4">
                              <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">หลักฐานการชำระเงิน</div>
                              <Image src={order.paymentProofUrl} alt="proof" width={280} height={280} className="object-contain rounded-lg border-2 border-gray-200 shadow-sm w-full max-w-[280px]" />
                            </div>
                          )}

                          <div className="mt-3 sm:mt-4 bg-blue-50 rounded-lg p-3 sm:p-4">
                            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">ที่อยู่จัดส่ง</div>
                            <div className="text-xs sm:text-sm text-gray-600 break-words">{order.shippingAddress || '—'}</div>
                          </div>

                          {/* Customer's selected delivery method */}
                          <div className="mt-3 sm:mt-4 bg-purple-50 rounded-lg p-3 sm:p-4 border-l-4 border-purple-500">
                            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-1">วิธีจัดส่งที่ลูกค้าเลือก</div>
                            <div className="text-xs sm:text-sm text-purple-700 font-medium">{getCustomerDeliveryMethod(order)}</div>
                          </div>

                          {/* Shipping details entry for seller */}
                          <div className="mt-3 sm:mt-4 bg-gray-50 rounded-lg p-3 sm:p-4">
                            <div className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">ข้อมูลการจัดส่ง</div>
                            <div className="space-y-2 sm:space-y-3">
                              <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                <input
                                  className="border-2 border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all touch-manipulation"
                                  placeholder="รูปแบบการจัดส่ง เช่น ปกติ/ด่วน"
                                  value={shippingDrafts[order.id]?.shippingMethod ?? order.shippingMethod ?? ''}
                                  onChange={(e) => setShippingDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      shippingMethod: e.target.value,
                                      shippingCarrier: prev[order.id]?.shippingCarrier ?? order.shippingCarrier ?? '',
                                      shippingId: prev[order.id]?.shippingId ?? order.shippingId ?? ''
                                    }
                                  }))}
                                />
                                <input
                                  className="border-2 border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all touch-manipulation"
                                  placeholder="ชื่อขนส่ง เช่น Kerry, J&T, Flash"
                                  value={shippingDrafts[order.id]?.shippingCarrier ?? order.shippingCarrier ?? ''}
                                  onChange={(e) => setShippingDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      shippingMethod: prev[order.id]?.shippingMethod ?? order.shippingMethod ?? '',
                                      shippingCarrier: e.target.value,
                                      shippingId: prev[order.id]?.shippingId ?? order.shippingId ?? ''
                                    }
                                  }))}
                                />
                                <input
                                  className="border-2 border-gray-200 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all touch-manipulation"
                                  placeholder="Shipping ID / Tracking No."
                                  value={shippingDrafts[order.id]?.shippingId ?? order.shippingId ?? ''}
                                  onChange={(e) => setShippingDrafts((prev) => ({
                                    ...prev,
                                    [order.id]: {
                                      shippingMethod: prev[order.id]?.shippingMethod ?? order.shippingMethod ?? '',
                                      shippingCarrier: prev[order.id]?.shippingCarrier ?? order.shippingCarrier ?? '',
                                      shippingId: e.target.value
                                    }
                                  }))}
                                />
                              </div>
                              <button
                                onClick={() => updateOrderShipping(order.id, {
                                  shippingMethod: shippingDrafts[order.id]?.shippingMethod ?? order.shippingMethod,
                                  shippingCarrier: shippingDrafts[order.id]?.shippingCarrier ?? order.shippingCarrier,
                                  shippingId: shippingDrafts[order.id]?.shippingId ?? order.shippingId
                                })}
                                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg text-xs sm:text-sm font-semibold hover:opacity-90 transition-all shadow-md touch-manipulation min-h-[44px]"
                              >
                                <span className="text-white ">บันทึก</span>
                              </button>
                            </div>
                          </div>

                          {/* Read-only shipping summary */}
                          <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-600 bg-white rounded-lg p-3 border border-gray-200 space-y-1">
                            <div className="break-words">รูปแบบการจัดส่ง: {order.shippingMethod || shippingDrafts[order.id]?.shippingMethod || '—'}</div>
                            <div className="break-words">ชื่อขนส่ง: {order.shippingCarrier || shippingDrafts[order.id]?.shippingCarrier || '—'}</div>
                            <div className="break-words">Shipping ID: {order.shippingId || shippingDrafts[order.id]?.shippingId || '—'}</div>
                          </div>

                          {order.status === 'PENDING' && (
                            <div className="mt-4 sm:mt-5 flex flex-col sm:flex-row gap-2 sm:gap-3">
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'APPROVED')}
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 font-semibold shadow-md text-sm sm:text-base min-h-[44px] touch-manipulation"
                              >
                                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> <span className='text-white'>ยืนยันคำสั่งซื้อ</span>
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                                className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition-all flex items-center justify-center gap-2 font-semibold text-sm sm:text-base min-h-[44px] touch-manipulation"
                              >
                                <X className="w-4 h-4 sm:w-5 sm:h-5" /> ปฏิเสธคำสั่งซื้อ
                              </button>
                            </div>
                          )}

                          {showStatusError && (
                            <div className="mt-3 sm:mt-4 flex items-start gap-2 text-xs sm:text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" /> <span className="break-words flex-1">{showStatusError}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
