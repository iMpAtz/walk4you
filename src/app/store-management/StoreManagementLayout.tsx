'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  ArrowLeft, 
  Search, 
  Bell, 
  ShoppingCart, 
  Building2, 
  User, 
  Clipboard, 
  BarChart3, 
  Edit3, 
  Save, 
  X 
} from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';

interface StoreData {
  id: string;
  storeName: string;
  storeDescription: string;
  phoneNumber?: string;
  buMail?: string;
  registerDate: string;
  status: string;
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

interface StoreManagementLayoutProps {
  storeData: StoreData | null;
  userData: UserData | null;
  onSave: (formData: Partial<StoreData>) => Promise<void>;
}

export default function StoreManagementLayout({ storeData, userData, onSave }: StoreManagementLayoutProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    storeName: storeData?.storeName || '',
    storeDescription: storeData?.storeDescription || '',
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSave(formData);
    setIsEditing(false);
  };


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 lg:px-8 py-4 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a 
            href="/" 
            className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition cursor-pointer"
          >
            ShopLogo
          </a>
          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell />
            <CartIcon />
            <div className="flex items-center gap-2 lg:gap-3">
              {userData?.avatar?.url ? (
                <Image 
                  src={userData.avatar.url} 
                  alt="Profile" 
                  width={32} 
                  height={32} 
                  className="rounded-full object-cover w-8 h-8"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="hidden sm:block font-medium text-gray-700">
                {userData?.username || 'User'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              {/* Store Info */}
              <div className="flex items-center gap-3 mb-6">
                {userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={40} 
                    height={40} 
                    className="rounded-full object-cover w-10 h-10"
                  />
                ) : (
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900">
                    {storeData?.storeName || userData?.username || 'ร้านค้า'}
                  </div>
                  <div className="text-sm text-gray-500">
                    {userData?.username ? `เจ้าของ: ${userData.username}` : 'ร้านค้า'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <button className="w-full flex items-center gap-3 p-3 text-left bg-red-50 text-red-600 rounded-lg">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="font-medium">ร้านค้าของฉัน</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/products')}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <Clipboard className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">สินค้าของฉัน</span>
                </button>

                <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-900">ยอดขายของฉัน</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow-sm border">
              {/* Header */}
              <div className="px-6 py-4 border-b">
                <h1 className="text-2xl font-bold text-gray-900">ร้านค้าของฉัน</h1>
                <p className="text-gray-600 mt-1">จัดการร้านค้าของคุณ</p>
              </div>

              {/* Form */}
              <div className="p-6">
                <div className="space-y-6">
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
