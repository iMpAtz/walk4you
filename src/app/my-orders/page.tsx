'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';
import TopBar from '@/components/TopBar';
import { config } from '@/lib/config';

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
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingId?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: { url: string };
}

export default function MyOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      setHasToken(true);
      await Promise.all([fetchUser(token), fetchOrders(token)]);
      setLoading(false);
    };
    init();
  }, [router]);

  const fetchUser = async (token: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUserData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async (token: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/orders/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      } else if (res.status === 404) {
        setOrders([]);
      }
    } catch (e) {
      console.error(e);
      setOrders([]);
    }
  };

  const confirmReceived = async (orderId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${config.apiBaseUrl}/orders/${orderId}/complete`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchOrders(token);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!hasToken || loading) {
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
      <TopBar />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">คำสั่งซื้อของฉัน</h1>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-gray-600">ยังไม่มีคำสั่งซื้อ</div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div key={order.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm text-gray-600">เลขที่คำสั่งซื้อ: {order.id}</div>
                        <div className="font-semibold text-gray-900">ยอดรวม: ฿{order.totalAmount?.toLocaleString()}</div>
                        <div className="text-sm text-gray-500">สถานะ: {order.status || '—'}</div>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        {order.updatedAt ? new Date(order.updatedAt.endsWith('Z') ? order.updatedAt : order.updatedAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) :
                         order.createdAt ? new Date(order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : ''}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
                      {order.items.map((it, idx) => (
                        <div key={idx} className="flex justify-between">
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

                    <div className="mt-3 text-sm text-gray-700">
                      <div>ที่อยู่จัดส่ง: {order.shippingAddress || '—'}</div>
                      <div>เบอร์โทร: {order.phoneNumber || '—'}</div>
                      <div className="mt-1">รูปแบบการจัดส่ง: {order.shippingMethod || '—'}</div>
                      <div>ชื่อขนส่ง: {order.shippingCarrier || '—'}</div>
                      <div>Shipping ID: {order.shippingId || '—'}</div>
                    </div>

                    {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                      <div className="mt-4">
                        <button
                          onClick={() => confirmReceived(order.id)}
                          className="px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782]"
                        >
                          ยืนยันได้รับสินค้า
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


