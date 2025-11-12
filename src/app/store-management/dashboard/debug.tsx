'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';

export default function DebugPage() {
  const router = useRouter();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDebugData();
  }, []);

  const fetchDebugData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      console.log('Fetching debug data with token:', token.substring(0, 20) + '...');

      const res = await fetch(`${config.apiBaseUrl}/stores/my/debug`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Debug response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.detail || 'Failed to fetch debug data');
      }

      const data = await res.json();
      console.log('Debug data received:', data);
      setDebugData(data);
    } catch (err: any) {
      console.error('Error fetching debug data:', err);
      setError(err.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล Debug...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/store-management/dashboard')}
            className="px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition"
          >
            กลับไป Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Debug Information</h1>
            <button
              onClick={() => router.push('/store-management/dashboard')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
            >
              กลับไป Dashboard
            </button>
          </div>

          {debugData && (
            <div className="space-y-6">
              {/* Store Info */}
              <div className="border-b pb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">ร้านค้า</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-gray-600">Store ID:</span>
                      <p className="font-mono text-sm">{debugData.store?.id}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Store Name:</span>
                      <p className="font-medium">{debugData.store?.name}</p>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Owner ID:</span>
                      <p className="font-mono text-sm">{debugData.store?.ownerId}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="border-b pb-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  สินค้า ({debugData.products?.count || 0})
                </h2>
                {debugData.products?.count > 0 ? (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="space-y-2">
                      {debugData.products.names.map((name: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-sm font-mono text-gray-500">{debugData.products.ids[idx]}</span>
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">ไม่มีสินค้าในร้าน</p>
                )}
              </div>

              {/* Orders */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">
                  ออร์เดอร์
                </h2>
                <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <span className="text-sm text-gray-600">ทั้งหมดในระบบ</span>
                      <p className="text-2xl font-bold text-gray-900">{debugData.orders?.total_in_system || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="text-sm text-gray-600">มีสินค้าของร้าน</span>
                      <p className="text-2xl font-bold text-[#0B44A3]">{debugData.orders?.with_store_products || 0}</p>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <span className="text-sm text-gray-600">Status</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {debugData.orders?.statuses?.map((status: string, idx: number) => (
                          <span 
                            key={idx}
                            className={`px-2 py-0.5 text-xs rounded ${
                              status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {status}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {debugData.orders?.details?.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700">รายละเอียดออร์เดอร์:</h3>
                      {debugData.orders.details.map((order: any, idx: number) => (
                        <div key={idx} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs text-gray-500">{order.id}</span>
                            <span className={`px-2 py-1 text-xs rounded font-medium ${
                              order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                              order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            <span>Items: {order.itemCount}</span>
                            <div className="mt-1 text-xs">
                              Product IDs: {order.productIds.join(', ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Raw JSON */}
              <div className="border-t pt-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Raw JSON</h2>
                <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(debugData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
