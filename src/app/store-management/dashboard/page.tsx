'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  DollarSign,
  Package,
  Building2,
  User,
  Clipboard,
  BarChart3,
  X,
  Calendar
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { config } from '@/lib/config';

interface OrderDetail {
  orderId: string;
  orderDate: string;
  status: string;
  total: number;
  itemCount: number;
  productNames: string;
  customerName?: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  topProducts: Array<{
    productId: string;
    name: string;
    quantity: number;
    revenue: number;
    price: number;
  }>;
  recentOrders: Array<{
    orderId: string;
    orderDate: string;
    status: string;
    total: number;
    itemCount: number;
    productNames: string;
  }>;
  dailySales: Array<{
    date: string;
    revenue: number;
  }>;
  monthlySales: Array<{
    month: string;
    revenue: number;
  }>;
}

interface OrderDetail {
  orderId: string;
  orderDate: string;
  status: string;
  total: number;
  itemCount: number;
  productNames: string;
  customerName?: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

export default function StoreDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOrders, setModalOrders] = useState<OrderDetail[]>([]);
  const [modalTitle, setModalTitle] = useState('');
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      const res = await fetch(`${config.apiBaseUrl}/stores/my/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        if (res.status === 404) {
          setError('ไม่พบร้านค้า กรุณาสร้างร้านค้าก่อน');
          return;
        }
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch dashboard data');
      }

      const dashboardData = await res.json();
      // Filter out rejected orders from recent orders (keep COMPLETED, PENDING, PROCESSING, CANCELLED)
      if (dashboardData.recentOrders) {
        dashboardData.recentOrders = dashboardData.recentOrders.filter(
          (order: any) => order.status !== 'REJECTED' && order.status !== 'REJECT'
        );
      }
      setData(dashboardData);
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersForDate = async (date: string, type: 'day' | 'month') => {
    setLoadingOrders(true);
    setModalOpen(true);
    
    try {
      if (!data || !data.recentOrders) {
        throw new Error('No order data available');
      }

      // Filter orders from existing dashboard data
      const filteredOrders = data.recentOrders.filter(order => {
        if (order.status !== 'COMPLETED') return false;
        
        const orderDate = new Date(order.orderDate.endsWith('Z') ? order.orderDate : order.orderDate + 'Z');
        
        if (type === 'day') {
          const orderDateStr = orderDate.toISOString().split('T')[0];
          return orderDateStr === date;
        } else {
          const orderMonthStr = orderDate.toISOString().substring(0, 7); // YYYY-MM
          return orderMonthStr === date;
        }
      });

      // Map to OrderDetail format
      const ordersWithDetails: OrderDetail[] = filteredOrders.map(order => ({
        orderId: order.orderId,
        orderDate: order.orderDate,
        status: order.status,
        total: order.total,
        itemCount: order.itemCount,
        productNames: order.productNames,
        products: [] // Dashboard data doesn't include detailed product list
      }));

      setModalOrders(ordersWithDetails);
      
      if (type === 'day') {
        const formattedDate = new Date(date + 'T00:00:00Z').toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          weekday: 'long',
          timeZone: 'Asia/Bangkok'
        });
        setModalTitle(`คำสั่งซื้อที่สำเร็จ - ${formattedDate}`);
      } else {
        const formattedMonth = new Date(date + '-01T00:00:00Z').toLocaleDateString('th-TH', {
          year: 'numeric',
          month: 'long',
          timeZone: 'Asia/Bangkok'
        });
        setModalTitle(`คำสั่งซื้อที่สำเร็จ - ${formattedMonth}`);
      }
    } catch (err: any) {
      console.error('Error filtering orders:', err);
      setModalOrders([]);
      setModalTitle('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingOrders(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/store-management')}
            className="px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition"
          >
            กลับไปหน้าจัดการร้าน
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Backend sends UTC time, need to add 'Z' to indicate UTC timezone
    const utcDate = dateString.endsWith('Z') ? dateString : dateString + 'Z';
    return new Date(utcDate).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Bangkok'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'รอดำเนินการ' },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'กำลังจัดส่ง' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'สำเร็จ' },
      CANCELLED: { bg: 'bg-red-100', text: 'text-red-800', label: 'ยกเลิก' }
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* TopBar */}
      <TopBar />

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 transition-all duration-300 ${modalOpen ? 'blur-sm pointer-events-none' : ''}`}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sticky top-24">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">จัดการร้านค้า</div>
                  <div className="text-xs text-gray-500">Store Management</div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button
                  onClick={() => router.push('/store-management')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-all group"
                >
                  <div className="w-9 h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                    <Building2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-white-700 group-hover:text-gray-900">ข้อมูลร้านค้า</span>
                </button>

                <button className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg shadow-sm">
                  <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-white">ยอดขายของฉัน</span>
                </button>

                <button
                  onClick={() => router.push('/store-management/products')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-all group"
                >
                  <div className="w-9 h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">สินค้าของฉัน</span>
                </button>

                <button
                  onClick={() => router.push('/store-management/orders')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-all group"
                >
                  <div className="w-9 h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                    <Clipboard className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">รายการสั่งซื้อ</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-8">
              <div className="mb-8">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent mb-2">Dashboard</h1>
                <p className="text-gray-600">ภาพรวมยอดขายและสถิติร้านค้า</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-sm">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-green-700 mb-1">ยอดขายรวม</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(data.totalRevenue)}</p>
                  <p className="text-xs text-green-600 mt-1">จากออเดอร์ที่สำเร็จ</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-sm">
                      <ShoppingCart className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-700 mb-1">คำสั่งซื้อทั้งหมด</h3>
                  <p className="text-2xl font-bold text-gray-900">{data.totalOrders}</p>
                  <p className="text-xs text-blue-600 mt-1">ทั้งหมดในระบบ</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl shadow-md border border-yellow-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl shadow-sm">
                      <Clock className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-yellow-700 mb-1">รอดำเนินการ</h3>
                  <p className="text-2xl font-bold text-gray-900">{data.pendingOrders}</p>
                  <p className="text-xs text-yellow-600 mt-1">กำลังดำเนินการ</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl shadow-md border border-green-200 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl shadow-sm">
                      <CheckCircle className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <h3 className="text-sm font-semibold text-green-700 mb-1">สำเร็จแล้ว</h3>
                  <p className="text-2xl font-bold text-gray-900">{data.completedOrders}</p>
                  <p className="text-xs text-green-600 mt-1">จัดส่งสำเร็จ</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Top Products */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-[#0B44A3] bg-opacity-10 rounded-lg">
                      <Package className="w-5 h-5 text-[#0B44A3]" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">สินค้าขายดี</h2>
                  </div>
                  <div className="space-y-4">
                    {data.topProducts.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">ยังไม่มีข้อมูล</p>
                      </div>
                    ) : (
                      data.topProducts.map((product, index) => (
                        <div key={product.productId} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                          <div className={`w-9 h-9 flex items-center justify-center flex-shrink-0 ${index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                              index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' :
                                'bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4]'
                            } text-white rounded-full font-bold text-sm shadow-sm`}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 break-words line-clamp-2 leading-tight">{product.name}</p>
                            <p className="text-xs text-gray-600 mt-0.5">ขาย {product.quantity} ชิ้น</p>
                          </div>
                          <p className="font-bold text-[#0B44A3] flex-shrink-0 ml-2">{formatCurrency(product.revenue)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Recent Orders */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-[#0B44A3] bg-opacity-10 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-[#0B44A3]" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">คำสั่งซื้อล่าสุด</h2>
                  </div>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                    {!data.recentOrders || data.recentOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">ยังไม่มีคำสั่งซื้อ</p>
                      </div>
                    ) : (
                      data.recentOrders.map((order) => (
                        <div key={order.orderId} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start flex-wrap gap-2 mb-1">
                              <p className="text-sm font-semibold text-gray-900 break-words line-clamp-2 leading-tight flex-1 min-w-0">{order.productNames}</p>
                              <div className="flex-shrink-0">
                                {getStatusBadge(order.status)}
                              </div>
                            </div>
                            <p className="text-xs text-gray-500">{formatDate(order.orderDate)}</p>
                          </div>
                          <p className="font-bold text-[#0B44A3] flex-shrink-0 ml-2">{formatCurrency(order.total)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Sales Summary - Simplified View */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Sales Summary */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-[#0B44A3] bg-opacity-10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#0B44A3]" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">ยอดขายรายวัน (30 วันล่าสุด)</h2>
                  </div>
                  <div className="space-y-3">
                    {data.dailySales.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">ยังไม่มีข้อมูล</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
                          <p className="text-sm text-blue-700 font-medium mb-1">ยอดขายรวม 30 วัน</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(data.dailySales.reduce((sum, day) => sum + day.revenue, 0))}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">ยอดเฉลี่ยต่อวัน</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(data.dailySales.reduce((sum, day) => sum + day.revenue, 0) / data.dailySales.length)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">วันที่มียอดสูงสุด</p>
                            <p className="text-lg font-bold text-[#0B44A3]">
                              {formatCurrency(Math.max(...data.dailySales.map(d => d.revenue)))}
                            </p>
                          </div>
                        </div>
                        
                        {/* Daily Sales Details */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">รายละเอียดยอดขายรายวัน</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {data.dailySales
                              .filter(day => day.revenue > 0)
                              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((day, index) => (
                                <div 
                                  key={day.date} 
                                  onClick={() => fetchOrdersForDate(day.date, 'day')}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-[#0B44A3] bg-opacity-10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-[#0B44A3]">{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {new Date(day.date + 'T00:00:00Z').toLocaleDateString('th-TH', {
                                          year: 'numeric',
                                          month: 'long',
                                          day: 'numeric',
                                          timeZone: 'Asia/Bangkok'
                                        })}
                                      </p>
                                      <p className="text-xs text-gray-500">
                                        {new Date(day.date + 'T00:00:00Z').toLocaleDateString('th-TH', {
                                          weekday: 'long',
                                          timeZone: 'Asia/Bangkok'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-[#0B44A3]">
                                      {formatCurrency(day.revenue)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            {data.dailySales.filter(day => day.revenue > 0).length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-4">ไม่มียอดขายในช่วง 30 วันที่ผ่านมา</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Monthly Sales Summary */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-[#0B44A3] bg-opacity-10 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-[#0B44A3]" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">ยอดขายรายเดือน (12 เดือนล่าสุด)</h2>
                  </div>
                  <div className="space-y-3">
                    {data.monthlySales.length === 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500">ยังไม่มีข้อมูล</p>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                          <p className="text-sm text-green-700 font-medium mb-1">ยอดขายรวม 12 เดือน</p>
                          <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(data.monthlySales.reduce((sum, month) => sum + month.revenue, 0))}
                          </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">ยอดเฉลี่ยต่อเดือน</p>
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(data.monthlySales.reduce((sum, month) => sum + month.revenue, 0) / data.monthlySales.length)}
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                            <p className="text-xs text-gray-600 mb-1">เดือนที่มียอดสูงสุด</p>
                            <p className="text-lg font-bold text-[#0B44A3]">
                              {formatCurrency(Math.max(...data.monthlySales.map(m => m.revenue)))}
                            </p>
                          </div>
                        </div>

                        {/* Monthly Sales Details */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-700 mb-3">รายละเอียดยอดขายรายเดือน</h3>
                          <div className="max-h-64 overflow-y-auto space-y-2">
                            {data.monthlySales
                              .filter(month => month.revenue > 0)
                              .sort((a, b) => new Date(b.month + '-01').getTime() - new Date(a.month + '-01').getTime())
                              .map((month, index) => (
                                <div 
                                  key={month.month} 
                                  onClick={() => fetchOrdersForDate(month.month, 'month')}
                                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-600 bg-opacity-10 flex items-center justify-center">
                                      <span className="text-xs font-bold text-green-700">{index + 1}</span>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">
                                        {new Date(month.month + '-01T00:00:00Z').toLocaleDateString('th-TH', {
                                          year: 'numeric',
                                          month: 'long',
                                          timeZone: 'Asia/Bangkok'
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm font-bold text-green-700">
                                      {formatCurrency(month.revenue)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            {data.monthlySales.filter(month => month.revenue > 0).length === 0 && (
                              <p className="text-sm text-gray-500 text-center py-4">ไม่มียอดขายในช่วง 12 เดือนที่ผ่านมา</p>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Modal */}
      <OrderDetailsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        orders={modalOrders}
        title={modalTitle}
        loading={loadingOrders}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        getStatusBadge={getStatusBadge}
      />
    </div>
  );
}
