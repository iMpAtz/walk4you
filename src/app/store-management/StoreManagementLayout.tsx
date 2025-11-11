'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  User, 
  Clipboard, 
  BarChart3,
  Package, 
} from 'lucide-react';
import TopBar from '@/components/TopBar';
import { Metadata } from 'next';

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
  // ดึง QR และ Logo จาก backend เมื่อโหลดหน้า
  useEffect(() => {
    const fetchStoreAssets = async () => {
      if (!storeData?.id) return;
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/stores/${storeData.id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.qrUrl) setQrPreview(data.qrUrl);
          if (data.logoUrl) setLogoPreview(data.logoUrl);
        }
      } catch {}
    };
    fetchStoreAssets();
  }, [storeData?.id]);
  // ...existing code...
  const handleSave = async () => {
    await onSave(formData);
    setIsEditing(false);
  };
  const router = useRouter();
  const [formData, setFormData] = useState({
    storeName: storeData?.storeName || '',
    storeDescription: storeData?.storeDescription || '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(storeData?.qrUrl || null);
  const [uploading, setUploading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(storeData?.logoUrl || null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleQrChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setQrFile(file);
    if (file) {
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadQr = async () => {
    if (!qrFile || !storeData?.id) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('qr', qrFile);
    try {
      // 1. Upload QR to Cloudinary
      const res = await fetch('/api/uploads/cloudinary-sign', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        const qrUrl = data.qrUrl;
        // 2. Save QR URL to backend
        const token = localStorage.getItem('access_token');
        const saveRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/stores/${storeData.id}/qr`, {
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
        } else {
          alert('บันทึก QR URL ไม่สำเร็จ');
        }
      } else {
        alert('อัปโหลด QR ไม่สำเร็จ');
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการอัปโหลด QR');
    }
    setUploading(false);
  };

  const handleRemoveQr = () => {
    setQrPreview(null);
    setQrFile(null);
    // TODO: call API to remove QR if needed
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile || !storeData?.id) return;
    setUploadingLogo(true);
    
    try {
      const token = localStorage.getItem('access_token');
      
      // Get Cloudinary signature using GET
      const signRes = await fetch('/api/uploads/cloudinary-sign?username=store&type=logo', {
        method: 'GET',
      });

      if (!signRes.ok) {
        throw new Error('Failed to get signature');
      }

      const { timestamp, signature, apiKey, cloudName, folder } = await signRes.json();

      // Upload to Cloudinary
      const formData = new FormData();
      formData.append('file', logoFile);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('api_key', apiKey);
      formData.append('folder', folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload to Cloudinary');
      }

      const uploadData = await uploadRes.json();
      const logoUrl = uploadData.secure_url;

      // Save logo URL to backend
      const saveRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/stores/${storeData.id}/logo`, {
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
        alert('อัปโหลดโลโก้สำเร็จ');
      } else {
        throw new Error('Failed to save logo URL');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดโลโก้');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 sticky top-24">
              {/* Store Info */}
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                {logoPreview ? (
                  <Image 
                    src={logoPreview} 
                    alt="Store Logo" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-12 h-12 shadow-sm border border-gray-200"
                  />
                ) : userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-12 h-12 shadow-sm"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
                <div>
                  <div className="font-bold text-gray-900">
                    {storeData?.storeName || userData?.username || 'ร้านค้า'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {userData?.username ? `${userData.username}` : 'Store Owner'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button className="w-full flex items-center gap-3 p-3 text-left bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg shadow-sm">
                  <div className="w-9 h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-semibold">ข้อมูลร้านค้า</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/dashboard')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-all group"
                >
                  <div className="w-9 h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900">ยอดขายของฉัน</span>
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
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {/* Header */}
              <div className="px-8 py-6 border-b border-gray-200">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">ร้านค้าของฉัน</h1>
                <p className="text-gray-600 mt-2">จัดการข้อมูลร้านค้าของคุณ</p>
              </div>

              {/* Form */}
              <div className="p-8">
                <div className="space-y-6">
                  {/* Store Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      โลโก้ร้านค้า
                    </label>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative group">
                          <Image 
                            src={logoPreview} 
                            alt="Store Logo" 
                            width={120} 
                            height={120} 
                            className="rounded-xl border-2 border-gray-200 object-cover shadow-md"
                          />
                          <button
                            onClick={handleRemoveLogo}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <div className="w-[120px] h-[120px] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                          <Building2 className="w-12 h-12" />
                        </div>
                      )}
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleLogoChange}
                          id="logo-upload"
                          className="hidden"
                        />
                        <label 
                          htmlFor="logo-upload"
                          className="inline-block px-4 py-2 bg-gray-100 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-200 transition cursor-pointer"
                        >
                          เลือกรูปภาพ
                        </label>
                        {logoFile && (
                          <button
                            type="button"
                            onClick={handleUploadLogo}
                            disabled={uploadingLogo}
                            className="ml-2 px-4 py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:opacity-90 transition shadow-md disabled:opacity-50"
                          >
                            {uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้'}
                          </button>
                        )}
                        <div className="text-sm text-gray-500 mt-2">
                          แนะนำขนาด 500x500px, ไฟล์ JPG, PNG (สูงสุด 5MB)
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shop Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ชื่อของร้านค้า
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {storeData?.storeName || userData?.username || 'ยังไม่ได้ตั้งชื่อร้านค้า'}
                    </div>
                  </div>

                  {/* Shop Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      คำอธิบายร้านค้า
                    </label>
                    {isEditing ? (
                      <textarea
                        value={formData.storeDescription}
                        onChange={(e) => handleInputChange('storeDescription', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                        rows={4}
                        placeholder="กรอกคำอธิบายร้านค้า..."
                      />
                    ) : (
                      <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 min-h-[100px]">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ช่องทางชำระเงิน QR PromptPay
                    </label>
                    <div className="flex items-center gap-4">
                      {qrPreview ? (
                        <div className="relative">
                          <Image src={qrPreview} alt="QR PromptPay" width={96} height={96} className="rounded border" />
                        </div>
                      ) : (
                        <>
                          <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-400 border">
                            ไม่มี QR
                          </div>
                          <div>
                            <input type="file" accept="image/*" onChange={handleQrChange} className="mb-2" />
                            {qrFile && (
                              <button
                                type="button"
                                onClick={handleUploadQr}
                                disabled={uploading}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด QR'}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">อัปโหลด QR PromptPay เพื่อให้ลูกค้าชำระเงินผ่านแอปธนาคาร</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-8 flex justify-end">
                  {isEditing ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        บันทึก
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
