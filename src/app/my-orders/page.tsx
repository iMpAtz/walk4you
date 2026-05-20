'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';
import TopBar from '@/components/TopBar';
import OrderReportModal from '@/components/OrderReportModal';
import { getApiBase } from '@/lib/config';

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
  selection?: {
    selectedShipping?: Record<string, string>;
    selectedPayment?: Record<string, string>;
  };
  paymentProofUrl?: string;
  shippingMethod?: string;
  shippingCarrier?: string;
  shippingId?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Helper function to get customer's selected delivery method
const getCustomerDeliveryMethod = (order: Order): string => {
  const selectedShipping = order.selection?.selectedShipping?.[order.storeId];
  
  if (selectedShipping === 'post') return 'ส่งไปรษณีย์';
  if (selectedShipping === 'meet') return 'นัดรับ';
  if (selectedShipping) return selectedShipping;
  
  // Fallback: try to parse from notes
  if (order.notes) {
    try {
      const parsed = JSON.parse(order.notes);
      const notesShipping = parsed?.selection?.selectedShipping?.[order.storeId];
      
      if (notesShipping === 'post') return 'ส่งไปรษณีย์';
      if (notesShipping === 'meet') return 'นัดรับ';
      if (notesShipping) return notesShipping;
    } catch (error) {
      // Ignore parse errors
    }
  }
  
  return '—';
};

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
  const [reportModal, setReportModal] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
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
      const res = await fetch(`${getApiBase()}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setUserData(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async (token: string) => {
    try {
      const res = await fetch(`${getApiBase()}/orders/my`, {
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
      const res = await fetch(`${getApiBase()}/orders/${orderId}/complete`, {
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

  const submitReport = async (reason: string, details: string) => {
    if (!reportModal) return;

    const token = localStorage.getItem('access_token');
    if (!token) return;

    // Get the order to find the storeId
    const order = orders.find(o => o.id === reportModal);
    if (!order) {
      alert('ไม่พบข้อมูลคำสั่งซื้อ');
      throw new Error('Order not found');
    }

    const res = await fetch(`${getApiBase()}/reports`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetStoreId: order.storeId,
        reportType: reason,
        description: details.trim() || undefined
      })
    });

    if (res.ok) {
      alert('รายงานของคุณถูกส่งเรียบร้อยแล้ว ทีมงานจะตรวจสอบและดำเนินการต่อไป');
    } else {
      const error = await res.json().catch(() => ({}));
      alert(error.detail || 'เกิดข้อผิดพลาดในการส่งรายงาน');
      throw new Error('Report submission failed');
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

                    {/* Customer's selected delivery method */}
                    <div className="mt-3 bg-purple-50 rounded-lg p-3 border-l-4 border-purple-500">
                      <div className="text-xs font-semibold text-gray-700 mb-1">วิธีจัดส่งที่เลือก</div>
                      <div className="text-sm text-purple-700 font-medium">{getCustomerDeliveryMethod(order)}</div>
                    </div>

                    {/* Shipping/Pickup information from seller */}
                    {(() => {
                      const customerDeliveryMethod = getCustomerDeliveryMethod(order);
                      const isPickup = customerDeliveryMethod === 'นัดรับ';
                      
                      return (
                    <div className="mt-3 text-sm text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="font-semibold text-gray-900 mb-2">
                        {isPickup ? 'ข้อมูลการนัดรับจากผู้ขาย' : 'ข้อมูลการจัดส่งจากผู้ขาย'}
                      </div>
                      {isPickup ? (
                        <>
                          <div className="mb-1">
                            <span className="text-gray-600">เบอร์โทรศัพท์ติดต่อ:</span>{' '}
                            <span className="font-medium">{order.shippingCarrier || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">สถานที่นัดรับ:</span>{' '}
                            <span className="font-medium">{order.shippingId || '—'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="mb-1">
                            <span className="text-gray-600">รูปแบบการจัดส่ง:</span>{' '}
                            <span className="font-medium">{order.shippingMethod || '—'}</span>
                          </div>
                          <div className="mb-1">
                            <span className="text-gray-600">ชื่อขนส่ง:</span>{' '}
                            <span className="font-medium">{order.shippingCarrier || '—'}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Tracking No.:</span>{' '}
                            <span className="font-medium break-all">{order.shippingId || '—'}</span>
                          </div>
                        </>
                      )}
                    </div>
                      );
                    })()}

                    {/* Shipping address */}
                    <div className="mt-3 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      <div className="mb-1">
                        <span className="text-gray-600">ที่อยู่จัดส่ง:</span>{' '}
                        <span className="font-medium">{order.shippingAddress || '—'}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">เบอร์โทร:</span>{' '}
                        <span className="font-medium">{order.phoneNumber || '—'}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && order.status !== 'REJECTED' && order.status !== 'PENDING' && (
                        <button
                          onClick={() => confirmReceived(order.id)}
                          className="px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition-colors"
                        >
                          ยืนยันได้รับสินค้า
                        </button>
                      )}
                      {order.status !== 'PENDING' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => setReportModal(order.id)}
                          className="px-4 py-2 border-2 border-red-500 text-red-600 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2"
                        >
                          <Flag className="w-4 h-4" />
                          รายงานปัญหา
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      <OrderReportModal
        isOpen={!!reportModal}
        onClose={() => setReportModal(null)}
        order={orders.find(o => o.id === reportModal) || null}
        onSubmit={submitReport}
      />
    </div>
  );
}


