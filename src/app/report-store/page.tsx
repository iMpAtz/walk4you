'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, FileText, Store } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';
import { config } from '@/lib/config';
import TopBar from '@/components/TopBar';

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: { url: string };
}

interface StoreData {
  id: string;
  storeName: string;
  storeDescription?: string;
}

const REPORT_TYPES = [
  { value: 'FRAUD', label: 'การฉ้อโกง' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'เนื้อหาไม่เหมาะสม' },
  { value: 'POOR_SERVICE', label: 'บริการไม่ดี' },
  { value: 'FAKE_PRODUCTS', label: 'สินค้าปลอม' },
  { value: 'OTHER', label: 'อื่นๆ' },
];

function ReportStoreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeIdParam = searchParams.get('storeId');

  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasToken, setHasToken] = useState(false);

  // Form state
  const [targetStoreId, setTargetStoreId] = useState(storeIdParam || '');
  const [reportType, setReportType] = useState('');
  const [description, setDescription] = useState('');
  const [searchStoreQuery, setSearchStoreQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<StoreData[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }
      setHasToken(true);
      await fetchUser(token);
      
      if (storeIdParam) {
        await fetchStoreInfo(token, storeIdParam);
        setTargetStoreId(storeIdParam);
      }
      
      setLoading(false);
    };
    init();
  }, [router, storeIdParam]);

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

  const fetchStoreInfo = async (token: string, storeId: string) => {
    try {
      const res = await fetch(`${config.apiBaseUrl}/stores/${storeId}`);
      if (res.ok) {
        const store = await res.json();
        setStoreData({ id: store.id, storeName: store.storeName, storeDescription: store.storeDescription });
      }
    } catch (e) {
      console.error(e);
    }
  };


  const searchStores = async (query: string) => {
    if (query.length < 2) {
      setStoreSearchResults([]);
      return;
    }

    try {
      setSearchingStores(true);
      // Note: You may need to create a store search endpoint
      // For now, we'll use a simple approach - you can enhance this later
      const res = await fetch(
        `${config.apiBaseUrl}/products/search?q=${encodeURIComponent(query)}&limit=10`
      );
      if (res.ok) {
        const products = await res.json();
        // Get unique stores from products
        const storeMap = new Map<string, StoreData>();
        for (const product of products) {
          if (product.storeId && !storeMap.has(product.storeId)) {
            try {
              const storeRes = await fetch(
                `${config.apiBaseUrl}/stores/${product.storeId}`
              );
              if (storeRes.ok) {
                const store = await storeRes.json();
                storeMap.set(store.id, {
                  id: store.id,
                  storeName: store.storeName,
                  storeDescription: store.storeDescription,
                });
              }
            } catch (e) {
              console.error('Error fetching store:', e);
            }
          }
        }
        setStoreSearchResults(Array.from(storeMap.values()));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingStores(false);
    }
  };

  const handleStoreSearch = (query: string) => {
    setSearchStoreQuery(query);
    searchStores(query);
  };

  const handleSelectStore = (store: StoreData) => {
    setStoreData(store);
    setTargetStoreId(store.id);
    setSearchStoreQuery(store.storeName);
    setStoreSearchResults([]);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!targetStoreId || !reportType) {
      alert('กรุณาเลือกร้านค้าและประเภทการรายงาน');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch(`${config.apiBaseUrl}/reports`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetStoreId,
          reportType,
          description: description || undefined,
        }),
      });

      if (res.ok) {
        alert('ส่งรายงานสำเร็จ! เราจะตรวจสอบและดำเนินการต่อไป');
        setReportType('');
        setDescription('');
        setTargetStoreId('');
        setStoreData(null);
        setSearchStoreQuery('');
        router.push('/my-reports');
      } else {
        const error = await res.json();
        throw new Error(error.detail || 'เกิดข้อผิดพลาดในการส่งรายงาน');
      }
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการส่งรายงาน');
    } finally {
      setSubmitting(false);
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
      <TopBar></TopBar>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">รายงานร้านค้า</h1>
          <p className="text-gray-600">ส่งรายงานร้านค้าที่มีพฤติกรรมไม่เหมาะสม</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <form onSubmit={handleSubmitReport} className="space-y-6">
            <div>
              <div>
              {storeData && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Store className="w-5 h-5 text-[#0B44A3]" />
                    <div>
                      <div className="font-medium text-[#0B44A3]">{storeData.storeName}</div>
                      {storeData.storeDescription && (
                        <div className="text-sm text-[#0B44A3]">{storeData.storeDescription}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ประเภทการรายงาน <span className="text-red-500">*</span>
              </label>
              <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B44A3]"
                  >
                    <option value="">เลือกประเภทการรายงาน</option>
                    {REPORT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    รายละเอียดเพิ่มเติม
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="อธิบายรายละเอียดเพิ่มเติม (ถ้ามี)..."
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0B44A3]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !targetStoreId || !reportType}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      กำลังส่ง...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      ส่งรายงาน
                    </>
                  )}
                </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ReportStorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <ReportStoreContent />
    </Suspense>
  );
}
