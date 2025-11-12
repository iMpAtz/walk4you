'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Lock, 
  MapPin, 
  Info, 
  Building2, 
  Plus, 
  FileText,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-react';
import type { UserProfile, Store } from '@/types';
import AvatarUpload from '@/components/AvatarUpload';
import StoreRegisterModal from '@/components/StoreRegisterModal';
import TopBar from '@/components/TopBar';
import { config } from '@/lib/config';

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [userStore, setUserStore] = useState<Store | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  
  // Address state
  const [address, setAddress] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    birthDate: '',
    birthMonth: '',
    birthYear: ''
  });

  useEffect(() => {
    fetchUserProfile();
    checkUserStore();
  }, []);

  useEffect(() => {
    // Fetch orders when switching to purchase tab
    if (activeTab === 'purchase') {
      fetchOrders();
    }
    // Load address when switching to address tab
    if (activeTab === 'address' && userProfile) {
      setAddress((userProfile as any)?.address || '');
    }
  }, [activeTab, userProfile]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const profile = await response.json();
        console.log('Profile data received:', profile); // Debug log
        console.log('Avatar data:', profile.avatar); // Debug log
        setUserProfile(profile);
        setFormData({
          name: profile.username || '',
          email: profile.email || '',
          phone: profile.phone || '',
          gender: 'Male',
          birthDate: '',
          birthMonth: '',
          birthYear: ''
        });
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Here you would implement the save functionality
    setIsEditing(false);
    // Show success message
  };

  const handleAvatarUpdate = async (avatarData: any) => {
    // Refresh user profile from backend to get the latest data
    console.log('Avatar update callback received:', avatarData);
    await fetchUserProfile();
  };

  const checkUserStore = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${config.apiBaseUrl}/users/me/has-store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasStore(data.hasStore);
        
        if (data.hasStore) {
          // Fetch store details
          const storeResponse = await fetch(`${config.apiBaseUrl}/users/me/store`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          if (storeResponse.ok) {
            const store = await storeResponse.json();
            setUserStore(store);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check user store:', error);
    }
  };

  const handleStoreSuccess = (store: Store) => {
    setUserStore(store);
    setHasStore(true);
    setShowStoreModal(false);
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('รหัสผ่านใหม่ไม่ตรงกัน');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_password: passwordData.currentPassword,
          new_password: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        setPasswordSuccess('เปลี่ยนรหัสผ่านสำเร็จ');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const error = await response.json();
        setPasswordError(error.detail || 'รหัสผ่านปัจจุบันไม่ถูกต้อง');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      setPasswordError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleAddressSave = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${config.apiBaseUrl}/users/address`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      if (response.ok) {
        setAddressSaved(true);
        setTimeout(() => setAddressSaved(false), 3000);
        // Update user profile
        if (userProfile) {
          setUserProfile({ ...userProfile, address });
        }
        // Refresh user profile data from server
        await fetchUserProfile();
        alert('บันทึกที่อยู่สำเร็จ');
      } else {
        const errorData = await response.json();
        alert(`เกิดข้อผิดพลาด: ${errorData.detail || 'ไม่สามารถบันทึกที่อยู่ได้'}`);
      }
    } catch (error) {
      console.error('Failed to save address:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกที่อยู่ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${config.apiBaseUrl}/orders/my`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } else if (response.status === 404) {
        setOrders([]);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const confirmReceived = async (orderId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const response = await fetch(`${config.apiBaseUrl}/orders/${orderId}/complete`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchOrders();
      }
    } catch (error) {
      console.error('Failed to confirm order:', error);
    }
  };

  const maskEmail = (email: string) => {
    if (!email) return '';
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const maskLength = Math.max(0, username.length - 2);
    const maskedUsername = username.substring(0, 2) + '*'.repeat(maskLength);
    return `${maskedUsername}@${domain}`;
  };

  const maskPhone = (phone: string) => {
    if (!phone) return '';
    const maskLength = Math.max(0, phone.length - 2);
    return '*'.repeat(maskLength) + phone.slice(-2);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-32 sm:w-32 border-b-2 border-[#0B44A3]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <TopBar />

      {/* Mobile Layout */}
      <div className="md:hidden bg-gray-50 min-h-screen">
        {/* Mobile Profile Header */}
        <div className="bg-white p-4 mb-4">
          <div className="flex flex-col items-center text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {userProfile?.username || 'User'}
            </h3>
            <AvatarUpload 
              currentAvatar={userProfile?.avatar?.secure_url || userProfile?.avatar?.url}
              onAvatarUpdate={handleAvatarUpdate}
              username={userProfile?.username}
            />
            <p className="text-sm text-gray-500 mt-2">{userProfile?.email || 'user@example.com'}</p>
          </div>
        </div>

        {/* Mobile Navigation Buttons */}
        <div className="px-4 space-y-3">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all touch-manipulation ${
              activeTab === 'profile' 
                ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-lg' 
                : 'bg-white text-gray-700 shadow-sm'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'profile' ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className={`font-medium ${activeTab === 'profile' ? 'text-white' : ''}`}>ข้อมูลส่วนตัว</span>
          </button>

          <button 
            onClick={() => setActiveTab('password')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all touch-manipulation ${
              activeTab === 'password' 
                ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-lg' 
                : 'bg-white text-gray-700 shadow-sm'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'password' ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className={`font-medium ${activeTab === 'password' ? 'text-white' : ''}`}>ตั้งค่ารหัสผ่าน</span>
          </button>

          <button 
            onClick={() => setActiveTab('address')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all touch-manipulation ${
              activeTab === 'address' 
                ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-lg' 
                : 'bg-white text-gray-700 shadow-sm'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'address' ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className={`font-medium ${activeTab === 'address' ? 'text-white' : ''}`}>รายการที่อยู่</span>
          </button>

          {hasStore ? (
            <button 
              onClick={() => setActiveTab('store')}
              className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all touch-manipulation ${
                activeTab === 'store' 
                  ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-lg' 
                  : 'bg-white text-gray-700 shadow-sm'
              }`}
            >
              <svg className={`w-5 h-5 ${activeTab === 'store' ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <span className={`font-medium ${activeTab === 'store' ? 'text-white' : ''}`}>ร้านค้าของฉัน</span>
            </button>
          ) : (
            <button 
              onClick={() => setShowStoreModal(true)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-white text-green-600 shadow-sm touch-manipulation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="font-medium">ลงทะเบียนร้านค้า</span>
            </button>
          )}

          <button 
            onClick={() => setActiveTab('purchase')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all touch-manipulation ${
              activeTab === 'purchase' 
                ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-lg' 
                : 'bg-white text-gray-700 shadow-sm'
            }`}
          >
            <svg className={`w-5 h-5 ${activeTab === 'purchase' ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className={`font-medium ${activeTab === 'purchase' ? 'text-white' : ''}`}>การซื้อของฉัน</span>
          </button>
        </div>

        {/* Mobile Content */}
        <div className="p-4 mt-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {activeTab === 'profile' && 'ข้อมูลส่วนตัว'}
              {activeTab === 'password' && 'เปลี่ยนรหัสผ่าน'}
              {activeTab === 'address' && 'ที่อยู่จัดส่ง'}
              {activeTab === 'store' && 'ร้านค้าของฉัน'}
              {activeTab === 'purchase' && 'การซื้อของฉัน'}
            </h2>

            {activeTab === 'profile' && (
              <div className="space-y-4 sm:space-y-6">
                {/* Username */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      ชื่อผู้ใช้งาน (Username)
                    </label>
                    <div className="text-gray-900 text-sm sm:text-base">{userProfile?.username || 'User001'}</div>
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      ชื่อ (Name)
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                      />
                    ) : (
                      <div className="text-gray-900 text-sm sm:text-base">{formData.name || userProfile?.username || 'User001'}</div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      อีเมล์ (Email)
                    </label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                      />
                    ) : (
                      <div className="text-gray-900 text-sm sm:text-base truncate">{maskEmail(userProfile?.email || '')}</div>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทร (Phone Number)
                    </label>
                    {isEditing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                      />
                    ) : (
                      <div className="text-gray-900 text-sm sm:text-base">{maskPhone((userProfile as any)?.phone || '')}</div>
                    )}
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      เพศ (Gender)
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <div className="text-gray-900 text-sm sm:text-base">{formData.gender}</div>
                    )}
                  </div>
                </div>

                {/* Date of Birth */}
                <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                      วันเกิด (Date of Birth)
                    </label>
                    {isEditing ? (
                      <div className="flex space-x-2">
                        <select
                          value={formData.birthDate}
                          onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                          className="px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        >
                          <option value="">Date</option>
                          {Array.from({length: 31}, (_, i) => (
                            <option key={i+1} value={i+1}>{i+1}</option>
                          ))}
                        </select>
                        <select
                          value={formData.birthMonth}
                          onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                          className="px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        >
                          <option value="">Month</option>
                          <option value="1">January</option>
                          <option value="2">February</option>
                          <option value="3">March</option>
                          <option value="4">April</option>
                          <option value="5">May</option>
                          <option value="6">June</option>
                          <option value="7">July</option>
                          <option value="8">August</option>
                          <option value="9">September</option>
                          <option value="10">October</option>
                          <option value="11">November</option>
                          <option value="12">December</option>
                        </select>
                        <select
                          value={formData.birthYear}
                          onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                          className="px-2 sm:px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        >
                          <option value="">Year</option>
                          {Array.from({length: 100}, (_, i) => (
                            <option key={2024-i} value={2024-i}>{2024-i}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="text-gray-900 text-sm sm:text-base">
                        {formData.birthDate && formData.birthMonth && formData.birthYear 
                          ? `${formData.birthDate}/${formData.birthMonth}/${formData.birthYear}`
                          : 'Not set'
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <div className="flex justify-center pt-4 sm:pt-6">
                    <button
                      onClick={handleSave}
                      className="px-6 sm:px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium min-h-[48px] touch-manipulation active:scale-95 text-base"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รหัสผ่านปัจจุบัน
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                        placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      />
                    </div>

                    {passwordError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {passwordSuccess}
                      </div>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      className="w-full px-4 py-3 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition-colors font-medium min-h-[48px] touch-manipulation active:scale-95 text-base"
                    >
                      <span className="text-white">เปลี่ยนรหัสผ่าน</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">ที่อยู่จัดส่ง</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ที่อยู่
                      </label>
                      <textarea
                        value={address || (userProfile as any)?.address || ''}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base touch-manipulation"
                        placeholder="กรอกที่อยู่สำหรับจัดส่งสินค้า&#10;ตัวอย่าง: 123 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330"
                      />
                    </div>

                    {addressSaved && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        บันทึกที่อยู่สำเร็จ
                      </div>
                    )}

                    <button
                      onClick={handleAddressSave}
                      className="w-full px-4 py-3 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition-colors font-medium min-h-[48px] touch-manipulation active:scale-95 text-base"
                    >
                      <span className="text-white">บันทึกที่อยู่</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'store' && (
              <div className="space-y-6">
                {hasStore && userStore ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">Store Information</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          userStore.status === 'ACTIVE' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {userStore.status}
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Store Name
                          </label>
                          <div className="text-gray-900 font-medium">{userStore.storeName}</div>
                        </div>
                        
                        {userStore.storeDescription && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <div className="text-gray-900">{userStore.storeDescription}</div>
                          </div>
                        )}
                        
                        {userStore.phoneNumber && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number
                            </label>
                            <div className="text-gray-900">{userStore.phoneNumber}</div>
                          </div>
                        )}
                        
                        {userStore.buMail && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              BU Mail
                            </label>
                            <div className="text-gray-900">{userStore.buMail}</div>
                          </div>
                        )}
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Registration Date
                          </label>
                          <div className="text-gray-900">
                            {new Date(userStore.registerDate.endsWith('Z') ? userStore.registerDate : userStore.registerDate + 'Z').toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              timeZone: 'Asia/Bangkok'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Info className="w-5 h-5 text-[#0B44A3] mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-900">Store Management</h4>
                          <p className="text-sm text-blue-700">Manage your products, orders, and store settings.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Store Found</h3>
                    <p className="text-gray-600 mb-4">You don't have a store yet. Register your store to start selling.</p>
                    <button
                      onClick={() => setShowStoreModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Register Store
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'purchase' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">คำสั่งซื้อของฉัน</h3>
                
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
                    <p className="mt-4 text-gray-600 text-sm">กำลังโหลด...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">ยังไม่มีคำสั่งซื้อ</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div key={order.id} className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              เลขที่: {order.id.substring(0, 8)}...
                            </div>
                            <div className="font-semibold text-gray-900 text-sm sm:text-base">
                              ฿{order.totalAmount?.toLocaleString()}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500">
                              {order.status || 'รอดำเนินการ'}
                            </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            {order.updatedAt ? new Date(order.updatedAt.endsWith('Z') ? order.updatedAt : order.updatedAt + 'Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : 
                             order.createdAt ? new Date(order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' }) : ''}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs sm:text-sm">
                              <div className="truncate">{item.productName || item.productId} × {item.quantity}</div>
                              <div className="font-medium ml-2">
                                ฿{(item.total ?? item.price * item.quantity).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>

                        {order.shippingAddress && (
                          <div className="mt-3 pt-3 border-t text-xs sm:text-sm text-gray-600">
                            <div>ที่อยู่: {order.shippingAddress}</div>
                            <div>เบอร์: {order.phoneNumber || '-'}</div>
                          </div>
                        )}

                        {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                          <div className="mt-3 pt-3 border-t">
                            <button
                              onClick={() => confirmReceived(order.id)}
                              className="w-full px-4 py-2.5 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] text-sm font-medium min-h-[44px] touch-manipulation active:scale-95"
                            >
                              ยืนยันได้รับสินค้า
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Sidebar */}
            <div className="lg:w-64">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 sticky top-20 sm:top-24">
                {/* User Profile Summary */}
                <div className="flex flex-col items-center text-center mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-2">
                    {userProfile?.username || 'User'}
                  </h3>
                  <AvatarUpload 
                    currentAvatar={userProfile?.avatar?.secure_url || userProfile?.avatar?.url}
                    onAvatarUpdate={handleAvatarUpdate}
                    username={userProfile?.username}
                  />
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">{userProfile?.email || 'user@example.com'}</p>
                </div>

                {/* Edit Profile Button */}
                <button 
                  onClick={() => setIsEditing(true)}
                  className={`w-full flex items-center justify-center gap-2 p-2 sm:p-3 mb-4 sm:mb-6 rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm font-medium shadow-sm ${
                    isEditing
                      ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isEditing ? 'text-white' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span className={isEditing ? 'text-white' : ''}>Edit Profile</span>
                </button>

                {/* Navigation */}
                <nav className="space-y-1">
                  <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3">My Account</div>
                  
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm ${
                      activeTab === 'profile' 
                        ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={activeTab === 'profile' ? 'text-white' : ''}>Profile</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('password')}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm ${
                      activeTab === 'password' 
                        ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={activeTab === 'password' ? 'text-white' : ''}>Change Password</span>
                  </button>
                  
                  <button 
                    onClick={() => setActiveTab('address')}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm ${
                      activeTab === 'address' 
                        ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={activeTab === 'address' ? 'text-white' : ''}>Address</span>
                  </button>
                  
                  <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2 sm:mb-3 mt-4 sm:mt-6">Store</div>
                  
                  {hasStore ? (
                  <button 
                    onClick={() => setActiveTab('store')}
                    className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm ${
                      activeTab === 'store' 
                        ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'store' ? 'text-white' : ''}`} />
                    <span className={activeTab === 'store' ? 'text-white' : ''}>My Store</span>
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowStoreModal(true)}
                    className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                    Store Register
                  </button>
                )}
                
                <button 
                  onClick={() => setActiveTab('purchase')}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left rounded-lg transition-colors touch-manipulation min-h-[44px] text-xs sm:text-sm ${
                    activeTab === 'purchase' 
                      ? 'bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white shadow-sm' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${activeTab === 'purchase' ? 'text-white' : ''}`} />
                  <span className={activeTab === 'purchase' ? 'text-white' : ''}>My Purchase</span>
                </button>
              </nav>
            </div>
          </div>

            {/* Main Content */}
            <div className="flex-1">
              <div className="bg-white rounded-xl shadow-md border border-gray-200">
                {/* Header */}
                <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">My Profile</h1>
                  <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">จัดการโปรไฟล์ของคุณ</p>
                </div>

                {/* Content */}
                <div className="p-4 sm:p-6 md:p-8">
                  {activeTab === 'profile' && (
                <div className="space-y-4 sm:space-y-6">
                  {/* Username */}
                  <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        ชื่อผู้ใช้งาน (Username)
                      </label>
                      <div className="text-gray-900 text-sm sm:text-base break-words">{userProfile?.username || 'User001'}</div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        ชื่อ (Name)
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm sm:text-base break-words">{formData.name || userProfile?.username || 'User001'}</div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        อีเมล์ (Email)
                      </label>
                      {isEditing ? (
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm sm:text-base truncate">{maskEmail(userProfile?.email || '')}</div>
                      )}
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        เบอร์โทร (Phone Number)
                      </label>
                      {isEditing ? (
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        />
                      ) : (
                        <div className="text-gray-900 text-sm sm:text-base">{maskPhone((userProfile as any)?.phone || '')}</div>
                      )}
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-center justify-between py-3 sm:py-4 border-b border-gray-200">
                    <div className="flex-1 min-w-0">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        เพศ (Gender)
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm sm:text-base touch-manipulation"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div className="text-gray-900 text-sm sm:text-base">{formData.gender}</div>
                      )}
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        วันเกิด (Date of Birth)
                      </label>
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <select
                            value={formData.birthDate}
                            onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Date</option>
                            {Array.from({length: 31}, (_, i) => (
                              <option key={i+1} value={i+1}>{i+1}</option>
                            ))}
                          </select>
                          <select
                            value={formData.birthMonth}
                            onChange={(e) => setFormData({...formData, birthMonth: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Month</option>
                            <option value="1">January</option>
                            <option value="2">February</option>
                            <option value="3">March</option>
                            <option value="4">April</option>
                            <option value="5">May</option>
                            <option value="6">June</option>
                            <option value="7">July</option>
                            <option value="8">August</option>
                            <option value="9">September</option>
                            <option value="10">October</option>
                            <option value="11">November</option>
                            <option value="12">December</option>
                          </select>
                          <select
                            value={formData.birthYear}
                            onChange={(e) => setFormData({...formData, birthYear: e.target.value})}
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Year</option>
                            {Array.from({length: 100}, (_, i) => (
                              <option key={2024-i} value={2024-i}>{2024-i}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="text-gray-900">
                          {formData.birthDate && formData.birthMonth && formData.birthYear 
                            ? `${formData.birthDate}/${formData.birthMonth}/${formData.birthYear}`
                            : 'Not set'
                          }
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Save Button */}
                  {isEditing && (
                    <div className="flex justify-center pt-6">
                      <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white rounded-lg hover:from-[#093782] hover:to-[#1557c0] transition-colors font-medium"
                      >
                        <span className="text-white">Save</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">เปลี่ยนรหัสผ่าน</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รหัสผ่านปัจจุบัน
                      </label>
                      <input
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="กรอกรหัสผ่านปัจจุบัน"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        รหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ยืนยันรหัสผ่านใหม่
                      </label>
                      <input
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      />
                    </div>

                    {passwordError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                        {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        {passwordSuccess}
                      </div>
                    )}

                    <button
                      onClick={handlePasswordChange}
                      className="w-full px-4 py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:from-[#093782] hover:to-[#1557c0] transition-colors font-medium"
                    >
                      <span className="text-white">เปลี่ยนรหัสผ่าน</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">ที่อยู่จัดส่ง</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ที่อยู่
                      </label>
                      <textarea
                        value={address || (userProfile as any)?.address || ''}
                        onChange={(e) => setAddress(e.target.value)}
                        rows={5}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="กรอกที่อยู่สำหรับจัดส่งสินค้า&#10;ตัวอย่าง: 123 ถนนพระราม 4 แขวงปทุมวัน เขตปทุมวัน กรุงเทพมหานคร 10330"
                      />
                    </div>

                    {addressSaved && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                        บันทึกที่อยู่สำเร็จ
                      </div>
                    )}

                    <button
                      onClick={handleAddressSave}
                      className="w-full px-4 py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:from-[#093782] hover:to-[#1557c0] transition-colors font-medium"
                    >
                      <span className="text-white">บันทึกที่อยู่</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'store' && (
                <div className="space-y-6">
                  {hasStore && userStore ? (
                    <div className="space-y-6">
                      <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-semibold text-gray-900">Store Information</h3>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            userStore.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {userStore.status}
                          </span>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Store Name
                            </label>
                            <div className="text-gray-900 font-medium">{userStore.storeName}</div>
                          </div>
                          
                          {userStore.storeDescription && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                              </label>
                              <div className="text-gray-900">{userStore.storeDescription}</div>
                            </div>
                          )}
                          
                          {userStore.phoneNumber && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number
                              </label>
                              <div className="text-gray-900">{userStore.phoneNumber}</div>
                            </div>
                          )}
                          
                          {userStore.buMail && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                BU Mail
                              </label>
                              <div className="text-gray-900">{userStore.buMail}</div>
                            </div>
                          )}
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Registration Date
                            </label>
                            <div className="text-gray-900">
                              {new Date(userStore.registerDate.endsWith('Z') ? userStore.registerDate : userStore.registerDate + 'Z').toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                timeZone: 'Asia/Bangkok'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-[#0B44A3] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <h4 className="text-sm font-medium text-blue-900">Store Management</h4>
                            <p className="text-sm text-blue-700">Manage your products, orders, and store settings.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Store Found</h3>
                      <p className="text-gray-600 mb-4">You don't have a store yet. Register your store to start selling.</p>
                      <button
                        onClick={() => setShowStoreModal(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Register Store
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'purchase' && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">คำสั่งซื้อของฉัน</h3>
                  
                  {ordersLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
                      <p className="mt-4 text-gray-600">กำลังโหลด...</p>
                    </div>
                  ) : orders.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600">ยังไม่มีคำสั่งซื้อ</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <div key={order.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="text-sm text-gray-600">
                                เลขที่คำสั่งซื้อ: {order.id}
                              </div>
                              <div className="font-semibold text-gray-900 text-lg">
                                ฿{order.totalAmount?.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-500">
                                สถานะ: {order.status || 'รอดำเนินการ'}
                              </div>
                            </div>
                            <div className="text-right text-sm text-gray-500">
                              {order.updatedAt ? new Date(order.updatedAt.endsWith('Z') ? order.updatedAt : order.updatedAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) :
                               order.createdAt ? new Date(order.createdAt.endsWith('Z') ? order.createdAt : order.createdAt + 'Z').toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' }) : ''}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2 text-sm">
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="flex justify-between">
                                <div className="truncate">{item.productName || item.productId} × {item.quantity}</div>
                                <div className="font-medium ml-4">
                                  ฿{(item.total ?? item.price * item.quantity).toLocaleString()}
                                </div>
                              </div>
                            ))}
                          </div>

                          {order.paymentProofUrl && (
                            <div className="mt-3">
                              <div className="text-sm text-gray-600 mb-2">หลักฐานการชำระเงิน</div>
                              <Image 
                                src={order.paymentProofUrl} 
                                alt="proof" 
                                width={240} 
                                height={240} 
                                className="object-contain rounded-md border" 
                              />
                            </div>
                          )}

                          <div className="mt-3 pt-3 border-t text-sm text-gray-700">
                            <div>ที่อยู่จัดส่ง: {order.shippingAddress || '—'}</div>
                            <div>เบอร์โทร: {order.phoneNumber || '—'}</div>
                            <div className="mt-1">รูปแบบการจัดส่ง: {order.shippingMethod || '—'}</div>
                            <div>ชื่อขนส่ง: {order.shippingCarrier || '—'}</div>
                            <div>Shipping ID: {order.shippingId || '—'}</div>
                          </div>

                          {order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && (
                            <div className="mt-4">
                              <button
                                onClick={() => confirmReceived(order.id)}
                                className="px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] font-medium"
                              >
                                ยืนยันได้รับสินค้า
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

      {/* Store Register Modal */}
      <StoreRegisterModal
        isOpen={showStoreModal}
        onClose={() => setShowStoreModal(false)}
        onSuccess={handleStoreSuccess}
      />
    </div>
  );
}
