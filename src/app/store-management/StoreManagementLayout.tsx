'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  User, 
  Clipboard, 
  BarChart3,
  Package, 
  AlertTriangle,
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Metadata } from 'next';
import { getApiBase } from '@/lib/config';

interface StoreData {
  id: string;
  storeName: string;
  storeDescription: string;
  phoneNumber?: string;
  buMail?: string;
  registerDate: string;
  status: string;
  qrUrl?: string | null;
  logoUrl?: string | null;
  statusReason?: string | null;
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
export const metadata: Metadata = {
  title: "Walk4You",
  description: "Senior Project by Team Walk4You",
};

interface StoreManagementLayoutProps {
  storeData: StoreData | null;
  userData: UserData | null;
  onSave: (formData: Partial<StoreData>) => Promise<void>;
}

export default function StoreManagementLayout({ storeData, userData, onSave }: StoreManagementLayoutProps) {
  // ดึง QR และ Logo จาก storeData props เมื่อโหลดหน้า
  useEffect(() => {
    if (storeData?.qrUrl) setQrPreview(storeData.qrUrl);
    if (storeData?.logoUrl) setLogoPreview(storeData.logoUrl);
  }, [storeData?.qrUrl, storeData?.logoUrl]);
  const router = useRouter();
  const [formData, setFormData] = useState({
    storeName: storeData?.storeName || '',
    storeDescription: storeData?.storeDescription || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(storeData?.qrUrl || null);
  const [qrTempPreview, setQrTempPreview] = useState<string | null>(null); // Temporary preview for selected file
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(storeData?.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [statusAlertOpen, setStatusAlertOpen] = useState(false);
  const isStoreRestricted = storeData && (storeData.status === 'INACTIVE' || storeData.status === 'BLOCKED');
  const isStoreBlocked = storeData?.status === 'BLOCKED';
  const lastReasonRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isStoreRestricted) {
      setStatusAlertOpen(false);
      lastReasonRef.current = null;
      return;
    }

    const currentReason = storeData?.statusReason ?? null;
    if (lastReasonRef.current !== currentReason) {
      lastReasonRef.current = currentReason;
      setStatusAlertOpen(true);
    }
  }, [isStoreRestricted, storeData?.statusReason]);

  useEffect(() => {
    if (isStoreBlocked) {
      setIsEditing(false);
    }
  }, [isStoreBlocked]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถแก้ไขข้อมูลได้');
      return;
    }
    await onSave(formData);
    setIsEditing(false);
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถเปลี่ยน QR ได้');
      return;
    }
    const file = e.target.files?.[0] || null;
    setQrFile(file);
    if (file) {
      const preview = URL.createObjectURL(file);
      setQrTempPreview(preview); // Show temporary preview
    }
  };

  const handleUploadQr = async () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถอัปโหลด QR ได้');
      return;
    }
    if (!qrFile || !storeData?.id) {
      alert('กรุณาเลือกไฟล์ QR Code ก่อน');
      return;
    }
    setUploading(true);
    
    try {
      // 1. Get Cloudinary signature
      const signUrl = `/api/uploads/cloudinary-sign?folder=walk4you/qrcodes`;
      
      const signRes = await fetch(signUrl, { method: 'GET' });
      
      if (!signRes.ok) {
        alert('ไม่สามารถได้รับลายเซ็นจาก Cloudinary');
        setUploading(false);
        return;
      }
      
      const sig = await signRes.json();
      
      // 2. Upload to Cloudinary
      const form = new FormData();
      form.append('file', qrFile);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder || 'walk4you/qrcodes');
      if (sig.uploadPreset) form.append('upload_preset', sig.uploadPreset);
      
      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const uploadRes = await fetch(uploadUrl, { method: 'POST', body: form });
      
      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        alert(`อัปโหลด QR ไม่สำเร็จ: ${error.error?.message || 'Unknown error'}`);
        setUploading(false);
        return;
      }
      
      const data = await uploadRes.json();
      const qrUrl = data.secure_url;
      
      // 3. Save QR URL to backend
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        setUploading(false);
        return;
      }
      
      const saveRes = await fetch(`${getApiBase()}/stores/${storeData.id}/qr`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qrUrl }),
      });
      
      if (saveRes.ok) {
        setQrPreview(qrUrl);
        setQrFile(null);
        alert('อัปโหลด QR สำเร็จ!');
      } else {
        const error = await saveRes.json();
        alert(`บันทึก QR URL ไม่สำเร็จ: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveQr = () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถลบ QR ได้');
      return;
    }
    setQrPreview(null);
    setQrFile(null);
    // TODO: call API to remove QR if needed
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถเปลี่ยนโลโก้ได้');
      return;
    }
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถอัปโหลดโลโก้ได้');
      return;
    }
    if (!logoFile || !storeData?.id) {
      alert('กรุณาเลือกไฟล์โลโก้ก่อน');
      return;
    }
    setUploadingLogo(true);
    
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อน');
        setUploadingLogo(false);
        return;
      }
      
      // Get Cloudinary signature using GET with folder parameter
      const signUrl = `/api/uploads/cloudinary-sign?folder=walk4you/logos`;
      const signRes = await fetch(signUrl, { method: 'GET' });

      if (!signRes.ok) {
        const error = await signRes.text();
        alert('ไม่สามารถได้รับลายเซ็นจาก Cloudinary');
        setUploadingLogo(false);
        return;
      }

      const sig = await signRes.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('api_key', sig.apiKey);
      formData.append('timestamp', String(sig.timestamp));
      formData.append('signature', sig.signature);
      formData.append('folder', sig.folder || 'walk4you/logos');
      if (sig.uploadPreset) formData.append('upload_preset', sig.uploadPreset);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        alert(`อัปโหลดโลโก้ไม่สำเร็จ: ${error.error?.message || 'Unknown error'}`);
        setUploadingLogo(false);
        return;
      }

      const uploadData = await uploadRes.json();
      const logoUrl = uploadData.secure_url;

      // Save logo URL to backend
      const saveRes = await fetch(`${getApiBase()}/stores/${storeData.id}/logo`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ logoUrl }),
      });

      if (saveRes.ok) {
        setLogoPreview(logoUrl);
        setLogoFile(null);
        alert('อัปโหลดโลโก้สำเร็จ!');
      } else {
        const error = await saveRes.json();
        alert(`บันทึกโลโก้ไม่สำเร็จ: ${error.detail || 'Unknown error'}`);
      }
    } catch (error) {
      alert(`เกิดข้อผิดพลาด: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถลบโลโก้ได้');
      return;
    }
    setLogoPreview(null);
    setLogoFile(null);
  };

  const handleEditClick = () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถแก้ไขข้อมูลได้');
      return;
    }
    setIsEditing(true);
  };

  const handleNavigateProducts = () => {
    if (isStoreBlocked) {
      alert('ร้านค้าถูกบล็อก ไม่สามารถเพิ่มหรือแก้ไขสินค้าได้');
      return;
    }
    router.push('/store-management/products');
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {statusAlertOpen && storeData && isStoreRestricted && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
          onClick={() => setStatusAlertOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {storeData.status === 'BLOCKED' ? 'ร้านค้าถูกบล็อก' : 'ร้านค้าถูกปิดใช้งาน'}
            </h2>
            <p className="text-gray-600 mb-4">
              ร้านค้าของคุณไม่สามารถให้บริการได้ในขณะนี้ โปรดตรวจสอบสาเหตุด้านล่าง
            </p>
            <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-left text-sm text-red-700 whitespace-pre-line mb-6">
              {storeData.statusReason || 'ผู้ดูแลระบบไม่ได้ระบุสาเหตุ'}
            </div>
            <button
              type="button"
              onClick={() => setStatusAlertOpen(false)}
              className="w-full px-5 py-3 rounded-xl bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white font-semibold hover:opacity-90 transition"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Navbar */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 sticky top-20 sm:top-24">
              {/* Store Info */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
                {logoPreview ? (
                  <Image 
                    src={logoPreview} 
                    alt="Store Logo" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm border border-gray-200"
                  />
                ) : userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    {storeData?.storeName || userData?.username || 'ร้านค้า'}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {userData?.username ? `${userData.username}` : 'Store Owner'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg shadow-sm touch-manipulation min-h-[44px] active:text-white-300">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base text-white">ข้อมูลร้านค้า</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/dashboard')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">ยอดขายของฉัน</span>
                </button>

                <button 
                  onClick={handleNavigateProducts}
                  disabled={isStoreBlocked}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-all group touch-manipulation min-h-[44px] ${
                    isStoreBlocked ? 'opacity-60 cursor-not-allowed bg-gray-100' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                    isStoreBlocked ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-gray-200'
                  }`}>
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className={`font-medium text-sm sm:text-base ${
                    isStoreBlocked ? 'text-gray-500' : 'text-gray-700 group-hover:text-gray-900'
                  }`}>
                    สินค้าของฉัน
                  </span>
                </button>
                
                <button 
                  onClick={() => router.push('/store-management/orders')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">รายการสั่งซื้อ</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {isStoreRestricted && storeData && (
                <div className="px-4 sm:px-6 md:px-8 py-4 bg-red-50 border-b border-red-100 text-sm text-red-700 whitespace-pre-line">
                  <div className="font-semibold mb-1">
                    {storeData.status === 'BLOCKED' ? 'ร้านค้าถูกบล็อก' : 'ร้านค้าถูกปิดใช้งาน'}
                  </div>
                  {storeData.statusReason || 'ผู้ดูแลระบบไม่ได้ระบุสาเหตุ'}
                </div>
              )}
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">ร้านค้าของฉัน</h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">จัดการข้อมูลร้านค้าของคุณ</p>
              </div>

              {/* Form */}
              <div className="p-4 sm:p-6 md:p-8">
                <div className="space-y-6">
                  {/* Store Logo */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      โลโก้ร้านค้า
                    </label>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      {logoPreview ? (
                        <div className="relative group">
                          <Image 
                            src={logoPreview} 
                            alt="Store Logo" 
                            width={120} 
                            height={120} 
                            className="rounded-xl border-2 border-gray-200 object-cover shadow-md w-20 h-20 sm:w-[120px] sm:h-[120px]"
                          />
                          <button
                            onClick={handleRemoveLogo}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-manipulation"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 sm:w-[120px] sm:h-[120px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                          <Building2 className="w-8 h-8 sm:w-12 sm:h-12" />
                        </div>
                      )}
                      <div className="flex-1 w-full">
                        {isEditing && (
                          <>
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={handleLogoChange}
                              id="logo-upload"
                              className="hidden"
                            />
                            <label 
                              htmlFor="logo-upload"
                              className="inline-block px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer text-sm sm:text-base min-h-[44px] flex items-center justify-center touch-manipulation"
                            >
                              เลือกรูปภาพ
                            </label>
                            {logoFile && (
                              <button
                                type="button"
                                onClick={handleUploadLogo}
                                disabled={uploadingLogo}
                                className="mt-2 sm:mt-0 sm:ml-2 w-full sm:w-auto px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white rounded-lg hover:opacity-90 transition shadow-md disabled:opacity-50 text-sm sm:text-base min-h-[44px] touch-manipulation"
                              >
                                {uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้'}
                              </button>
                            )}
                            <div className="text-xs sm:text-sm text-gray-500 mt-2">
                              แนะนำขนาด 500x500px, ไฟล์ JPG, PNG (สูงสุด 5MB)
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      ชื่อของร้านค้า
                    </label>
                    <div className="text-base sm:text-lg font-semibold text-gray-900 break-words">
                      {storeData?.storeName || userData?.username || 'ยังไม่ได้ตั้งชื่อร้านค้า'}
                    </div>
                  </div>

                  {/* Shop Description */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      คำอธิบายร้านค้า
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.storeDescription}
                        onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                        className="w-full px-3 py-2.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-sm sm:text-base touch-manipulation"
                        rows={4}
                        placeholder="กรอกคำอธิบายร้านค้า..."
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 min-h-[100px] text-sm sm:text-base break-words">
                        {storeData?.storeDescription || 'ยังไม่มีคำอธิบายร้านค้า'}
                      </div>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      อีเมล์
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {storeData?.buMail || userData?.email || 'ยังไม่ได้ตั้งอีเมล์'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      อีเมล์ที่ใช้ในการสมัครเปิดร้านค้า
                    </div>
                  </div>

                  {/* Contact Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      เบอร์ติดต่อ
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {storeData?.phoneNumber || userData?.phone || 'ยังไม่ได้ตั้งเบอร์ติดต่อ'}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      เบอร์ติดต่อที่ใช้ในการสมัครเปิดร้านค้า
                    </div>
                  </div>

                {/* QR PromptPay Upload */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    ช่องทางชำระเงิน QR PromptPay
                  </label>
                  <div className="flex items-center gap-4">
                    {qrPreview ? (
                      <div className="flex flex-col items-start gap-3">
                        <div className="relative">
                          <Image src={qrPreview} alt="QR PromptPay" width={120} height={120} className="rounded border" />
                          {isEditing && (
                            <button
                              type="button"
                              onClick={handleRemoveQr}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow"
                            >
                              ×
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">แสดง QR นี้ให้ลูกค้าเมื่อเลือกชำระเงินแบบโอน</p>
                        {isEditing && (
                          <button
                            type="button"
                            onClick={handleRemoveQr}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                          >
                            เปลี่ยน QR Code
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400 border">
                        ไม่มี QR
                      </div>
                    )}
                  </div>
                  {isEditing && !qrPreview && (
                    <div className="mt-3 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrChange}
                        className="w-full border border-dashed border-gray-300 rounded px-3 py-2 text-sm"
                        title="เลือกไฟล์ QR Code"
                      />
                      {qrFile && (
                        <button
                          type="button"
                          onClick={handleUploadQr}
                          disabled={uploading}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด QR Code'}
                        </button>
                      )}
                      <p className="text-xs text-gray-500">
                        อัปโหลดไฟล์ JPG หรือ PNG ขนาดไม่เกิน 5MB
                      </p>
                    </div>
                  )}
                </div>

                </div>

                {/* Action Buttons */}
                <div className="mt-6 sm:mt-8 flex justify-end">
                  {isEditing ? (
                    <div className="flex gap-2 sm:gap-3 w-full sm:w-auto">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSave}
                        className="flex-1 sm:flex-none px-4 sm:px-6 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base min-h-[44px] touch-manipulation"
                      >
                        บันทึก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleEditClick}
                      disabled={isStoreBlocked}
                      className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-2 rounded-lg text-sm sm:text-base min-h-[44px] touch-manipulation ${
                        isStoreBlocked
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-600 text-white hover:bg-gray-700 transition-colors'
                      }`}
                    >
                      แก้ไข
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
