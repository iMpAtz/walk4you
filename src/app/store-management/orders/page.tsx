'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import TopBar from '@/components/TopBar';
import { 
  Building2,
  Clipboard,
  BarChart3,
  Check,
  X,
  AlertTriangle
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
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingId?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: {
    url: string;
  };
}

export default function StoreOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
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

  const fetchOrders = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/orders/my-store`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/orders/${orderId}/status`, {
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/orders/${orderId}/shipping`, {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              {/* Store Info */}
              <div className="flex items-center gap-3 mb-6">
                {userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={40} 
                    height={40} 
                    className="rounded-full object-cover w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-[#0B44A3]" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">Store001</div>
                  <div className="text-sm text-gray-500">
                    {userData?.username ? `เจ้าของ: ${userData.username}` : 'ร้านค้า'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button 
                  onClick={() => router.push('/store-management')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">ร้านค้าของฉัน</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/products')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">สินค้าของฉัน</span>
                </button>

                <button className="w-full flex items-center gap-3 p-3 text-left bg-blue-50 text-[#0B44A3] rounded-lg">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-[#0B44A3]" />
                  </div>
                  <span className="font-medium">รายการสั่งซื้อ</span>
                </button>

                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">ยอดขายของฉัน</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Header */}
              <div className="px-6 py-4 border-b">
                <h1 className="text-2xl font-bold text-gray-900">รายการสั่งซื้อ</h1>
                <p className="text-gray-600 mt-1">จัดการคำสั่งซื้อที่เข้ามาทั้งหมด</p>
              </div>

              {/* Orders List */}
              <div className="p-6">
                {orders.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Clipboard className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">ยังไม่มีคำสั่งซื้อ</h3>
                    <p className="text-gray-500">เมื่อมีคำสั่งซื้อเข้ามาจะแสดงที่นี่</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-sm text-gray-600">ผู้สั่งซื้อ: {order.username || order.userId}</div>
                            <div className="font-semibold text-gray-900">ยอดรวม: ฿{order.totalAmount?.toLocaleString()}</div>
                            <div className="text-sm text-gray-500">สถานะ: {order.status || '—'}</div>
                          </div>
                          <div className="text-right text-sm text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleString() : ''}
                          </div>
                        </div>

                        <div className="mt-3 border-t pt-3">
                          <div className="grid grid-cols-1 gap-2">
                            {order.items.map((it, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <div className="truncate">{it.productName || it.productId} × {it.quantity}</div>
                                <div className="font-medium">฿{(it.total ?? it.price * it.quantity).toLocaleString()}</div>
                              </div>
                            ))}
                          </div>

                          {order.paymentProofUrl && (
                            <div className="mt-3">
                              <div className="text-sm text-gray-600 mb-2">หลักฐานการชำระเงิน</div>
                              <Image src={order.paymentProofUrl} alt="proof" width={240} height={240} className="object-contain rounded-md border" />
                            </div>
                          )}

                          <div className="mt-3 text-sm text-gray-600">ที่อยู่จัดส่ง: {order.shippingAddress || '—'}</div>

                          {/* Shipping details entry for seller */}
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                            <input
                              className="border rounded-lg px-3 py-2 text-sm"
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
                              className="border rounded-lg px-3 py-2 text-sm"
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
                            <div className="flex gap-2">
                              <input
                                className="flex-1 border rounded-lg px-3 py-2 text-sm"
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
                              <button
                                onClick={() => updateOrderShipping(order.id, {
                                  shippingMethod: shippingDrafts[order.id]?.shippingMethod ?? order.shippingMethod,
                                  shippingCarrier: shippingDrafts[order.id]?.shippingCarrier ?? order.shippingCarrier,
                                  shippingId: shippingDrafts[order.id]?.shippingId ?? order.shippingId
                                })}
                                className="px-3 py-2 bg-[#0B44A3] text-white rounded-lg text-sm hover:bg-[#093782]"
                              >
                                บันทึก
                              </button>
                            </div>
                          </div>

                          {/* Read-only shipping summary */}
                          <div className="mt-2 text-sm text-gray-600">
                            <div>รูปแบบการจัดส่ง: {order.shippingMethod || shippingDrafts[order.id]?.shippingMethod || '—'}</div>
                            <div>ชื่อขนส่ง: {order.shippingCarrier || shippingDrafts[order.id]?.shippingCarrier || '—'}</div>
                            <div>Shipping ID: {order.shippingId || shippingDrafts[order.id]?.shippingId || '—'}</div>
                          </div>

                          {order.status === 'PENDING' && (
                            <div className="mt-3 flex gap-2">
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'APPROVED')}
                                className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
                              >
                                <Check className="w-4 h-4" /> ยืนยันคำสั่งซื้อ
                              </button>
                              <button 
                                onClick={() => updateOrderStatus(order.id, 'REJECTED')}
                                className="px-3 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1"
                              >
                                <X className="w-4 h-4" /> ปฏิเสธคำสั่งซื้อ
                              </button>
                            </div>
                          )}

                          {showStatusError && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                              <AlertTriangle className="w-4 h-4" /> {showStatusError}
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
