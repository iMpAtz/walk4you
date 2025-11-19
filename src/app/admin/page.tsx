'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/TopBar';
import SuspendUserModal from '@/components/SuspendUserModal';
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
  Filter,
  BarChart3,
  Image
} from 'lucide-react';
import UserEditModal from '@/components/UserEditModal';
import StoreStatusModal from '@/components/StoreStatusModal';
import { config } from '@/lib/config';

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  role: string;
  registerDate: string;
  storeCount: number;
  storeStatus?: string;
  status?: string;
  statusReason?: string;
}

interface StoreData {
  id: string;
  ownerId: string;
  ownerUsername: string;
  storeName: string;
  storeDescription?: string;
  buMail?: string;
  registerDate: string;
  status: string;
  statusReason?: string;
}

type StoreStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
type RestrictableStoreStatus = Exclude<StoreStatus, 'ACTIVE'>;

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
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStoreStatusModalOpen, setIsStoreStatusModalOpen] = useState(false);
  const [storeStatusReason, setStoreStatusReason] = useState('');
  const [pendingStore, setPendingStore] = useState<StoreData | null>(null);
  const [storeTargetStatus, setStoreTargetStatus] = useState<RestrictableStoreStatus | null>(null);
  const [isUpdatingStoreStatus, setIsUpdatingStoreStatus] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [userToSuspend, setUserToSuspend] = useState<UserData | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [isSuspending, setIsSuspending] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/');
        return;
      }

      try {
        const userRes = await fetch(`${config.apiBaseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!userRes.ok) {
          router.push('/');
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
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [router]);

  const fetchReports = async (token: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/reports`, {
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
      const res = await fetch(`${config.apiBaseUrl}/admin/users`, {
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
      const res = await fetch(`${config.apiBaseUrl}/admin/stores`, {
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

  const handleStoreStatusChange = (store: StoreData, newStatus: StoreStatus) => {
    if (newStatus === store.status) return;

    if (newStatus === 'ACTIVE') {
      const confirmed = confirm(`ต้องการเปิดใช้งานร้าน ${store.storeName} อีกครั้งหรือไม่?`);
      if (!confirmed) return;
      updateStoreStatus(store.id, newStatus);
      return;
    }

    setPendingStore(store);
    setStoreTargetStatus(newStatus as RestrictableStoreStatus);
    setStoreStatusReason('');
    setIsStoreStatusModalOpen(true);
  };

  const handleCloseStoreStatusModal = () => {
    setIsStoreStatusModalOpen(false);
    setStoreStatusReason('');
    setPendingStore(null);
    setStoreTargetStatus(null);
  };

  const handleConfirmStoreStatus = async () => {
    if (!pendingStore || !storeTargetStatus) return;
    const trimmed = storeStatusReason.trim();
    if (trimmed.length < 10) {
      alert('กรุณาระบุสาเหตุอย่างน้อย 10 อักขระ');
      return;
    }

    setIsUpdatingStoreStatus(true);
    try {
      await updateStoreStatus(pendingStore.id, storeTargetStatus, trimmed);
      handleCloseStoreStatusModal();
    } finally {
      setIsUpdatingStoreStatus(false);
    }
  };

  const updateReportStatus = async (reportId: string, newStatus: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${config.apiBaseUrl}/reports/${reportId}/status`, {
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

  const updateStoreStatus = async (storeId: string, newStatus: string, reason?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await fetch(`${config.apiBaseUrl}/admin/stores/${storeId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          ...(reason ? { reason } : {}),
        }),
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

  const updateUserStatus = async (userId: string, newStatus: string, reason?: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const payload: Record<string, string> = { status: newStatus };
      if (typeof reason === 'string' && reason.trim().length > 0) {
        payload.reason = reason.trim();
      }

      const res = await fetch(`${config.apiBaseUrl}/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await fetchUsers(token);
        alert('อัปเดตสถานะผู้ใช้สำเร็จ');
      } else {
        const error = await res.json();
        alert(error.detail || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดต');
    }
  };

  const handleOpenSuspendModal = (user: UserData) => {
    setUserToSuspend(user);
    setSuspendReason('');
    setIsSuspendModalOpen(true);
  };

  const handleCloseSuspendModal = () => {
    setIsSuspendModalOpen(false);
    setUserToSuspend(null);
    setSuspendReason('');
  };

  const handleConfirmSuspend = async () => {
    if (!userToSuspend) return;
    const trimmedReason = suspendReason.trim();
    if (trimmedReason.length < 10) {
      alert('กรุณาระบุสาเหตุอย่างน้อย 10 ตัวอักษร');
      return;
    }

    setIsSuspending(true);
    try {
      await updateUserStatus(userToSuspend.id, 'BANNED', trimmedReason);
      handleCloseSuspendModal();
    } finally {
      setIsSuspending(false);
    }
  };

  const handleReactivateUser = async (user: UserData) => {
    const confirmed = confirm(`คุณต้องการปลดแบนผู้ใช้ ${user.username} หรือไม่?`);
    if (!confirmed) return;
    await updateUserStatus(user.id, 'ACTIVE');
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

  const handleEditUser = (user: UserData) => {
    setEditingUser(user);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
  };

  const handleUpdateUser = () => {
    const token = localStorage.getItem('access_token');
    if (token) {
      fetchUsers(token);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />

      {/* User Edit Modal */}
      {editingUser && (
        <UserEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          onUpdate={handleUpdateUser}
          user={{
            id: editingUser.id,
            username: editingUser.username,
            email: editingUser.email,
            phone: editingUser.phone || '',
            role: editingUser.role
          }}
        />
      )}

      <SuspendUserModal
        isOpen={isSuspendModalOpen}
        user={userToSuspend}
        reason={suspendReason}
        loading={isSuspending}
        onReasonChange={setSuspendReason}
        onClose={handleCloseSuspendModal}
        onConfirm={handleConfirmSuspend}
      />

      <StoreStatusModal
        isOpen={isStoreStatusModalOpen}
        store={pendingStore}
        targetStatus={storeTargetStatus}
        reason={storeStatusReason}
        loading={isUpdatingStoreStatus}
        onReasonChange={setStoreStatusReason}
        onClose={handleCloseStoreStatusModal}
        onConfirm={handleConfirmStoreStatus}
      />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 xl:px-12 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sticky top-24">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                <div className="w-12 h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-gray-900">Admin Panel</div>
                  <div className="text-xs text-gray-500">จัดการระบบ</div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button 
                  onClick={() => {
                    setActiveTab('reports');
                    setStatusFilter('all');
                  }}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all group ${
                    activeTab === 'reports'
                      ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4]  shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    activeTab === 'reports'
                      ? 'text-gray-600  bg-opacity-20'
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 ${activeTab === 'reports' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${activeTab === 'reports' ? '!text-white font-semibold' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      รายงาน
                    </span>
                    <div className={`text-xs opacity-75 ${activeTab === 'reports' ? '!text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{reports.length} รายการ</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab('users');
                    setStatusFilter('all');
                  }}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all group ${
                    activeTab === 'users'
                      ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    activeTab === 'users'
                      ? 'text-gray-600  bg-opacity-20'
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Users className={`w-5 h-5 ${activeTab === 'users' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${activeTab === 'users' ? '!text-white font-semibold' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      ผู้ใช้งาน
                    </span>
                    <div className={`text-xs opacity-75 ${activeTab === 'users' ? '!text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>{users.length} คน</div>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    setActiveTab('stores');
                    setStatusFilter('all');
                  }}
                  className={`w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all group ${
                    activeTab === 'stores'
                      ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                    activeTab === 'stores'
                      ? 'text-gray-600  bg-opacity-20'
                      : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Store className={`w-5 h-5 ${activeTab === 'stores' ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`font-medium ${activeTab === 'stores' ? '!text-white font-semibold' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      ร้านค้า
                    </span>
                    <div className={`text-xs opacity-75 ${activeTab === 'stores' ? '!text-white' : 'text-gray-700 group-hover:text-gray-900'}`}>
                      {stores.length} ร้าน</div>
                  </div>
                </button>

                <button 
                  onClick={() => router.push('/admin/banners')}
                  className="w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all group hover:bg-gray-50"
                >
                  <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                    <Image className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-gray-700 group-hover:text-gray-900">
                      จัดการแบนเนอร์
                    </span>
                    <div className="text-xs text-gray-500">พื้นที่โฆษณา</div>
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">
                  {activeTab === 'reports' && 'จัดการรายงาน'}
                  {activeTab === 'users' && 'จัดการผู้ใช้งาน'}
                  {activeTab === 'stores' && 'จัดการร้านค้า'}
                </h1>
                <p className="text-gray-600 mt-2">
                  {activeTab === 'reports' && 'ตรวจสอบและจัดการรายงานที่เข้ามา'}
                  {activeTab === 'users' && 'จัดการข้อมูลและสิทธิ์ผู้ใช้งาน'}
                  {activeTab === 'stores' && 'จัดการสถานะร้านค้าในระบบ'}
                </p>
              </div>

              {/* Search and Filter */}
              <div className="px-8 py-6 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหา..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all"
              />
            </div>
            {activeTab !== 'users' && (
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all"
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
              </div>

          {/* Content */}
          <div className="p-8">
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
                              ส่งเมื่อ: {new Date(report.submittedAt.endsWith('Z') ? report.submittedAt : report.submittedAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
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
                            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all"
                          >
                            <option value="OPEN">เปิด</option>
                            <option value="REVIEWING">กำลังตรวจสอบ</option>
                            <option value="RESOLVED">แก้ไขแล้ว</option>
                            <option value="REJECTED">ปฏิเสธ</option>
                          </select>
                          {report.targetStoreId && (
                            <a
                              href={`/stores/${report.targetStoreId}`}
                              className="px-4 py-2 text-sm bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:opacity-90 transition flex items-center gap-1 shadow-md"
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
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จำนวนร้าน</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">วันที่สมัคร</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">จัดการ</th>
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
                            user.role === 'SELLER' ? 'bg-blue-100 text-[#0B44A3]' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'ADMIN' ? 'แอดมิน' : user.role === 'SELLER' ? 'ผู้ขาย' : 'ลูกค้า'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.status === 'BANNED' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {user.status === 'BANNED' ? 'ถูกแบน' : 'ปกติ'}
                          </span>
                          {user.status === 'BANNED' && user.statusReason && (
                            <div className="text-xs text-red-500 mt-1 whitespace-pre-line">
                              {user.statusReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.storeCount}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {new Date(user.registerDate.endsWith('Z') ? user.registerDate : user.registerDate + 'Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="px-3 py-1.5 text-xs  font-medium rounded-lg bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white hover:opacity-90 transition flex items-center gap-1 shadow-sm"
                            >
                              <Edit className="w-3 h-3" />
                              แก้ไข
                            </button>
                            {user.role !== 'ADMIN' && (
                              <button
                                onClick={() =>
                                  user.status === 'BANNED'
                                    ? handleReactivateUser(user)
                                    : handleOpenSuspendModal(user)
                                }
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition shadow-sm ${
                                  user.status === 'BANNED'
                                    ? 'bg-gradient-to-r from-green-500 to-green-600 !text-white hover:opacity-90'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 !text-white hover:opacity-90'
                                }`}
                              >
                                {user.status === 'BANNED' ? 'ปลดระงับการใช้งาน' : 'ระงับการใช้งาน'}
                              </button>
                            )}
                          </div>
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
                            {store.buMail && (
                              <div className="text-sm text-gray-700 mt-1">
                                <span className="font-medium">อีเมล:</span> {store.buMail}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 mt-2">
                              เปิดร้าน: {new Date(store.registerDate.endsWith('Z') ? store.registerDate : store.registerDate + 'Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColor.text} ${statusColor.bg}`}>
                            {store.status === 'ACTIVE' && 'เปิดใช้งาน'}
                            {store.status === 'INACTIVE' && 'ปิดใช้งาน'}
                            {store.status === 'BLOCKED' && 'ถูกบล็อก'}
                          </span>
                          {store.status !== 'ACTIVE' && store.statusReason && (
                            <div className="text-xs text-red-500 mt-1 whitespace-pre-line">
                              {store.statusReason}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={store.status}
                            onChange={(e) => handleStoreStatusChange(store, e.target.value as StoreStatus)}
                            className="px-3 py-2 text-sm border-2 border-gray-200 rounded-lg focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3] focus:ring-opacity-20 transition-all"
                          >
                            <option value="ACTIVE">เปิดใช้งาน</option>
                            <option value="INACTIVE">ปิดใช้งาน</option>
                            <option value="BLOCKED">ถูกบล็อก</option>
                          </select>
                          <a
                            href={`/stores/${store.id}`}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg hover:opacity-90 transition flex items-center gap-1 shadow-md"
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
      </div>
    </div>
  );
}

