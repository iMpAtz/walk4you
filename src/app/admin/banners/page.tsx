'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import TopBar from '@/components/TopBar';
import { getApiBase } from '@/lib/config';

interface Banner {
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function BannerManagement() {
  const router = useRouter();
  const { authenticatedFetch } = useAuth();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    order: 0,
    is_active: true
  });
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      setIsFetching(true);
      const response = await fetch(`${getApiBase()}/banners?active_only=false`);
      
      if (response.ok) {
        const data = await response.json();
        setBanners(data);
      }
    } catch (error) {
      console.error('Failed to fetch banners:', error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Get Cloudinary signature
      const signatureResponse = await fetch('/api/uploads/cloudinary-sign?type=banner');
      const { timestamp, signature, apiKey, cloudName, folder } = await signatureResponse.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const result = await uploadResponse.json();
      
      if (result.secure_url) {
        setFormData(prev => ({ ...prev, image_url: result.secure_url }));
      } else {
        alert('การอัปโหลดรูปภาพล้มเหลว');
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('การอัปโหลดรูปภาพล้มเหลว');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingBanner 
        ? `${getApiBase()}/admin/banners/${editingBanner.id}`
        : `${getApiBase()}/admin/banners`;
      
      const method = editingBanner ? 'PUT' : 'POST';

      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert(editingBanner ? 'อัปเดต Banner สำเร็จ!' : 'เพิ่ม Banner สำเร็จ!');
        setShowModal(false);
        setEditingBanner(null);
        setFormData({ title: '', subtitle: '', image_url: '', order: 0, is_active: true });
        fetchBanners();
      } else {
        const error = await response.json();
        alert(error.detail || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Failed to save banner:', error);
      alert('เกิดข้อผิดพลาด');
    }
  };  const handleEdit = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      subtitle: banner.subtitle,
      image_url: banner.image_url,
      order: banner.order,
      is_active: banner.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm('ต้องการลบ Banner นี้หรือไม่?')) return;

    try {
      const response = await authenticatedFetch(
        `${getApiBase()}/admin/banners/${bannerId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        alert('ลบ Banner สำเร็จ!');
        fetchBanners();
      } else {
        alert('เกิดข้อผิดพลาด');
      }
    } catch (error) {
      console.error('Failed to delete banner:', error);
      alert('เกิดข้อผิดพลาด');
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const response = await authenticatedFetch(
        `${getApiBase()}/admin/banners/${banner.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_active: !banner.is_active }),
        }
      );

      if (response.ok) {
        fetchBanners();
      }
    } catch (error) {
      console.error('Failed to toggle banner:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <TopBar />
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">จัดการ Banner</h1>
              <p className="text-sm text-gray-600 mt-1">
                จำกัด 3 แบนเนอร์ ({banners.length}/3 ใช้งานอยู่)
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.push('/admin')}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                กลับ
              </button>
              <button
                onClick={() => {
                  if (banners.length >= 3) {
                    alert('สามารถเพิ่มได้สูงสุด 3 แบนเนอร์เท่านั้น กรุณาลบแบนเนอร์เก่าก่อน');
                    return;
                  }
                  setEditingBanner(null);
                  setFormData({ title: '', subtitle: '', image_url: '', order: banners.length, is_active: true });
                  setShowModal(true);
                }}
                disabled={banners.length >= 3}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  banners.length >= 3
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                + เพิ่ม Banner {banners.length >= 3 ? '(เต็ม)' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 mb-1">ข้อมูลการใช้งาน</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• ระบบรองรับแบนเนอร์สูงสุด 3 รายการ</li>
                <li>• แบนเนอร์ที่ไม่มีรูปภาพจะแสดงข้อความโฆษณาแทน</li>
                <li>• แบนเนอร์ที่มีรูปภาพจะแสดงรูปเต็มพื้นที่</li>
                <li>• ขนาดแนะนำ: 1200 x 280 px (Ratio 4.3:1)</li>
              </ul>
            </div>
          </div>
        </div>

        {isFetching ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-gray-500 mb-4">ยังไม่มี Banner</p>
            <p className="text-sm text-gray-400">คลิกปุ่ม "+ เพิ่ม Banner" เพื่อเริ่มต้น</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex gap-6">
                  {/* Image */}
                  <div className="w-64 h-40 relative rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={banner.image_url}
                      alt={banner.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{banner.title}</h3>
                        <p className="text-gray-600 mt-1">{banner.subtitle}</p>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                          <span>ลำดับ: {banner.order}</span>
                          <span className={`px-2 py-1 rounded ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {banner.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleActive(banner)}
                          className={`px-3 py-1 rounded text-sm ${banner.is_active ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                        >
                          {banner.is_active ? 'ปิด' : 'เปิด'}
                        </button>
                        <button
                          onClick={() => handleEdit(banner)}
                          className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                        >
                          แก้ไข
                        </button>
                        <button
                          onClick={() => handleDelete(banner.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                        >
                          ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold">
                {editingBanner ? 'แก้ไข Banner' : 'เพิ่ม Banner'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingBanner(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  รูปภาพ Banner (1200 x 280 px) *
                </label>
                {formData.image_url ? (
                  <div className="relative w-full h-40 rounded-lg overflow-hidden mb-2">
                    <Image
                      src={formData.image_url}
                      alt="Preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-40 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                    <span className="text-gray-400">ยังไม่มีรูปภาพ</span>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                  disabled={isUploading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {isUploading && <p className="text-sm text-blue-600 mt-1">กำลังอัปโหลด...</p>}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  หัวข้อ *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น: สนใจลงโฆษณา?"
                />
              </div>

              {/* Subtitle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  คำบรรยาย *
                </label>
                <input
                  type="text"
                  value={formData.subtitle}
                  onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="เช่น: พื้นที่โฆษณาขนาดพิเศษ"
                />
              </div>

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ลำดับการแสดง
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Active Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  เปิดใช้งาน
                </label>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingBanner(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={!formData.image_url || isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {editingBanner ? 'บันทึกการแก้ไข' : 'เพิ่ม Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
