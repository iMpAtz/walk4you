'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle, Clock, XCircle, FileText, Store } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';
import TopBar from '@/components/TopBar';
import { config } from '@/lib/config';

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: { url: string };
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

const REPORT_TYPES = [
  { value: 'FRAUD', label: 'การฉ้อโกง' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'POOR_SERVICE', label: 'บริการไม่ดี' },
  { value: 'FAKE_PRODUCTS', label: 'สินค้าปลอม' },
  { value: 'OTHER', label: 'อื่นๆ' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; icon: any }> = {
  OPEN: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
  REVIEWING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertTriangle },
  RESOLVED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
};

export default function MyReportsPage() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
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
      await Promise.all([fetchUser(token), fetchMyReports(token)]);
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

  const fetchMyReports = async (token: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/reports/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
      setReports([]);
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">รายงานของฉัน</h1>
          <p className="text-gray-600">ดูสถานะรายงานที่คุณส่งมา</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            {reports.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="mb-4">ยังไม่มีรายงานที่คุณส่ง</p>
                <a
                  href="/report-store"
                  className="inline-block px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition"
                >
                  ส่งรายงานร้านค้า
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => {
                  const StatusIcon = STATUS_COLORS[report.status]?.icon || Clock;
                  const statusColor = STATUS_COLORS[report.status] || STATUS_COLORS.OPEN;

                  return (
                    <div key={report.id} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Store className="w-5 h-5 text-gray-600" />
                            <h3 className="font-semibold text-gray-900">
                              {report.storeName || 'ไม่ระบุร้านค้า'}
                            </h3>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">ประเภท:</span>{' '}
                            {REPORT_TYPES.find((t) => t.value === report.reportType)?.label || report.reportType}
                          </div>
                          {report.description && (
                            <p className="text-gray-700 mb-2">{report.description}</p>
                          )}
                          <div className="text-xs text-gray-500">
                            ส่งเมื่อ: {new Date(report.submittedAt.endsWith('Z') ? report.submittedAt : report.submittedAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}
                          </div>
                          {report.targetStoreId && (
                            <a
                              href={`/stores/${report.targetStoreId}`}
                              className="inline-block mt-2 text-sm text-[#0B44A3] hover:text-[#093782] hover:underline"
                            >
                              ดูร้านค้า →
                            </a>
                          )}
                        </div>
                        <div className={`px-3 py-1 rounded-full flex items-center gap-2 ${statusColor.bg} ${statusColor.text}`}>
                          <StatusIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {report.status === 'OPEN' && 'เปิด'}
                            {report.status === 'REVIEWING' && 'กำลังตรวจสอบ'}
                            {report.status === 'RESOLVED' && 'แก้ไขแล้ว'}
                            {report.status === 'REJECTED' && 'ปฏิเสธ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

