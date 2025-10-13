'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';
import { 
  ArrowLeft,
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
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and back */}
            <div className="flex items-center">
              <button 
                onClick={() => router.back()}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <a 
                href="/" 
                className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition cursor-pointer"
              >
                ShopLogo
              </a>
            </div>

            {/* Right icons */}
            <div className="flex items-center space-x-4">
              <NotificationBell />
              <CartIcon />
              <button className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors">
                {userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Profile" 
                    width={24} 
                    height={24} 
                    className="rounded-full object-cover w-6 h-6"
                  />
                ) : (
                  <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs text-white">
                    {userData?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">
                  {userData?.username || 'User001'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

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
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-red-600" />
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

                <button className="w-full flex items-center gap-3 p-3 text-left bg-red-50 text-red-600 rounded-lg">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-red-600" />
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
                            <div className="text-sm text-gray-600">ผู้สั่งซื้อ: {order.userId}</div>
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
