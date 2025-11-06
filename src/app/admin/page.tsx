'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Shield, 
  AlertTriangle, 
  Users, 
  Store, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Eye,
  Edit,
  Search,
  Filter
} from 'lucide-react';

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  registerDate: string;
  storeCount: number;
  storeStatus?: string;
}

interface StoreData {
  id: string;
  ownerId: string;
  ownerUsername: string;
  storeName: string;
  storeDescription?: string;
  registerDate: string;
  status: string;
}

interface Report {
  id: string;
  userId: string;
  targetStoreId?: string;
  storeName?: string;
  reportType: string;
  description?: string;
  submittedAt: string;
  status: string;
}

const REPORT_TYPES: Record<string, string> = {
  FRAUD: 'การฉ้อโกง',
  INAPPROPRIATE_CONTENT: 'เนื้อหาไม่เหมาะสม',
  POOR_SERVICE: 'บริการไม่ดี',
  FAKE_PRODUCTS: 'สินค้าปลอม',
  OTHER: 'อื่นๆ',
};

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OPEN: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
  REVIEWING: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
  RESOLVED: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
  ACTIVE: { bg: 'bg-green-50', text: 'text-green-800', border: 'border-green-200' },
  INACTIVE: { bg: 'bg-gray-50', text: 'text-gray-800', border: 'border-gray-200' },
  BLOCKED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' },
};

export default function AdminPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'stores'>('reports');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userRes.ok) {
          router.push('/login');
          return;
        }

        const user = await userRes.json();
        setUserData(user);

        if (user.role !== 'ADMIN') {
          router.push('/');
          return;
        }

        await Promise.all([fetchReports(token), fetchUsers(token), fetchStores(token)]);
      } catch (error) {
        console.error('Error initializing admin page:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchReports = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchUsers = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStores = async (token: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/admin/stores`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStores(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/reports/${reportId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchReports(token);
        alert('อัปเดตสถานะรายงานสำเร็จ');
      } else {
        const error = await res.json();
        alert(error.detail || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating report status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  const updateStoreStatus = async (storeId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/admin/stores/${storeId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        await fetchStores(token);
        alert('อัปเดตสถานะร้านค้าสำเร็จ');
      } else {
        const error = await res.json();
        alert(error.detail || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating store status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.storeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.reportType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredStores = stores.filter((store) => {
    const matchesSearch = 
      store.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.ownerUsername.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || store.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
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
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            </div>
            <a
              href="/"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
            >
              กลับหน้าหลัก
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setStatusFilter('all');
                }}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'reports'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
                รายงาน ({reports.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('users');
                  setStatusFilter('all');
                }}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'users'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-5 h-5" />
                ผู้ใช้งาน ({users.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('stores');
                  setStatusFilter('all');
                }}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'stores'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Store className="w-5 h-5" />
                ร้านค้า ({stores.length})
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {activeTab !== 'users' && (
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">ทั้งหมด</option>
                  {activeTab === 'reports' ? (
                    <>
                      <option value="OPEN">เปิด</option>
                      <option value="REVIEWING">กำลังตรวจสอบ</option>
                      <option value="RESOLVED">แก้ไขแล้ว</option>
                      <option value="REJECTED">ปฏิเสธ</option>
                    </>
                  ) : (
                    <>
                      <option value="ACTIVE">เปิดใช้งาน</option>
                      <option value="INACTIVE">ปิดใช้งาน</option>
                      <option value="BLOCKED">ถูกบล็อก</option>
                    </>
                  )}
                </select>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'reports' && (
              <div className="space-y-4">
                {filteredReports.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>ไม่พบรายงาน</p>
                  </div>
                ) : (
                  filteredReports.map((report) => {
                    const statusColor = STATUS_COLORS[report.status] || STATUS_COLORS.OPEN;
                    return (
                      <div
                        key={report.id}
                        className={`p-4 border rounded-lg ${statusColor.border} ${statusColor.bg}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Store className="w-5 h-5 text-gray-600" />
                              <h3 className="font-semibold text-gray-900">{report.storeName || 'ไม่ระบุร้านค้า'}</h3>
                            </div>
                            <div className="text-sm text-gray-700 mb-2">
                              <span className="font-medium">ประเภท:</span> {REPORT_TYPES[report.reportType] || report.reportType}
                            </div>
                            {report.description && (
                              <p className="text-gray-600 mb-2">{report.description}</p>
                            )}
                            <div className="text-xs text-gray-500">
                              ส่งเมื่อ: {new Date(report.submittedAt).toLocaleString('th-TH')}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor.text} ${statusColor.bg}`}>
                              {report.status === 'OPEN' && 'เปิด'}
                              {report.status === 'REVIEWING' && 'กำลังตรวจสอบ'}
                              {report.status === 'RESOLVED' && 'แก้ไขแล้ว'}
                              {report.status === 'REJECTED' && 'ปฏิเสธ'}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={report.status}
                            onChange={(e) => updateReportStatus(report.id, e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="OPEN">เปิด</option>
                            <option value="REVIEWING">กำลังตรวจสอบ</option>
                            <option value="RESOLVED">แก้ไขแล้ว</option>
                            <option value="REJECTED">ปฏิเสธ</option>
                          </select>
                          {report.targetStoreId && (
                            <a
                              href={`/stores/${report.targetStoreId}`}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              ดูร้านค้า
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {activeTab === 'users' && (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อผู้ใช้</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">บทบาท</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนร้าน</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะร้าน</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สมัคร</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.username}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'SELLER' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'ADMIN' ? 'แอดมิน' : user.role === 'SELLER' ? 'ผู้ขาย' : 'ลูกค้า'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.storeCount}</td>
                        <td className="px-4 py-3 text-sm">
                          {user.storeStatus && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              user.storeStatus === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                              user.storeStatus === 'INACTIVE' ? 'bg-gray-100 text-gray-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {user.storeStatus === 'ACTIVE' ? 'เปิดใช้งาน' :
                               user.storeStatus === 'INACTIVE' ? 'ปิดใช้งาน' : 'ถูกบล็อก'}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(user.registerDate).toLocaleDateString('th-TH')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'stores' && (
              <div className="space-y-4">
                {filteredStores.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    <Store className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                    <p>ไม่พบร้านค้า</p>
                  </div>
                ) : (
                  filteredStores.map((store) => {
                    const statusColor = STATUS_COLORS[store.status] || STATUS_COLORS.ACTIVE;
                    return (
                      <div
                        key={store.id}
                        className={`p-4 border rounded-lg ${statusColor.border} ${statusColor.bg}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 mb-2">{store.storeName}</h3>
                            {store.storeDescription && (
                              <p className="text-sm text-gray-600 mb-2">{store.storeDescription}</p>
                            )}
                            <div className="text-sm text-gray-700">
                              <span className="font-medium">เจ้าของ:</span> {store.ownerUsername}
                            </div>
                            <div className="text-xs text-gray-500 mt-2">
                              เปิดร้าน: {new Date(store.registerDate).toLocaleDateString('th-TH')}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor.text} ${statusColor.bg}`}>
                            {store.status === 'ACTIVE' && 'เปิดใช้งาน'}
                            {store.status === 'INACTIVE' && 'ปิดใช้งาน'}
                            {store.status === 'BLOCKED' && 'ถูกบล็อก'}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={store.status}
                            onChange={(e) => updateStoreStatus(store.id, e.target.value)}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ACTIVE">เปิดใช้งาน</option>
                            <option value="INACTIVE">ปิดใช้งาน</option>
                            <option value="BLOCKED">ถูกบล็อก</option>
                          </select>
                          <a
                            href={`/stores/${store.id}`}
                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            ดูร้านค้า
                          </a>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

