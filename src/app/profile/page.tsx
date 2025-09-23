'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { UserProfile, Store } from '@/types';
import AvatarUpload from '@/components/AvatarUpload';
import StoreRegisterModal from '@/components/StoreRegisterModal';

export default function ProfilePage() {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [userStore, setUserStore] = useState<Store | null>(null);
  const [showStoreModal, setShowStoreModal] = useState(false);
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

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
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

  const handleAvatarUpdate = (avatarData: any) => {
    // Update the user profile with new avatar data
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        avatar: {
          url: avatarData.secure_url,
          publicId: avatarData.public_id,
          folder: avatarData.folder,
          width: avatarData.width,
          height: avatarData.height,
          bytes: avatarData.bytes,
          format: avatarData.format,
          updatedAt: new Date().toISOString(),
        }
      });
    }
  };

  const checkUserStore = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/has-store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setHasStore(data.hasStore);
        
        if (data.hasStore) {
          // Fetch store details
          const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/store`, {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <button 
            onClick={() => router.push('/')}
            className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors"
          >
            Logo
          </button>
          
          <div className="flex items-center space-x-3">
            {userProfile?.avatar?.url ? (
              <Image 
                src={userProfile.avatar.url} 
                alt="Profile" 
                width={32} 
                height={32} 
                className="rounded-full object-cover w-8 h-8"
              />
            ) : (
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">{userProfile?.username || 'User'}</span>
          </div>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="bg-white shadow-sm border-b hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button 
                onClick={() => router.push('/')}
                className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
              >
                Logo
              </button>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search..."
                  className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 5.5L9 10l4.5-4.5L9 1 4.5 5.5z" />
                </svg>
              </button>

              {/* User Info */}
              <div className="flex items-center space-x-2">
                {userProfile?.avatar?.url ? (
                  <Image 
                    src={userProfile.avatar.url} 
                    alt="Profile" 
                    width={32} 
                    height={32} 
                    className="rounded-full object-cover w-8 h-8"
                    onError={(e) => {
                      console.log('Top nav image load error:', e);
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-gray-700">{userProfile?.username || 'User'}</span>
              </div>

              {/* Cart */}
              <button className="flex items-center space-x-1 text-gray-400 hover:text-gray-600">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                <span className="text-sm">Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden">
        {/* Mobile Profile Header */}
        <div className="bg-white p-4 border-b">
          <div className="flex items-center space-x-4">
            <AvatarUpload 
              currentAvatar={userProfile?.avatar?.url}
              onAvatarUpdate={handleAvatarUpdate}
            />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {userProfile?.username || 'User'}
              </h3>
              <button 
                onClick={() => setIsEditing(true)}
                className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="bg-white border-b">
          <div className="flex overflow-x-auto">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'profile' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('password')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'password' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Password
            </button>
            <button 
              onClick={() => setActiveTab('address')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'address' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Address
            </button>
            <button 
              onClick={() => setActiveTab('privacy')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'privacy' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Privacy
            </button>
            {hasStore ? (
              <button 
                onClick={() => setActiveTab('store')}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'store' 
                    ? 'border-red-500 text-red-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Store
              </button>
            ) : (
              <button 
                onClick={() => setShowStoreModal(true)}
                className="flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-green-600 hover:text-green-700"
              >
                Store Register
              </button>
            )}
            <button 
              onClick={() => setActiveTab('purchase')}
              className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'purchase' 
                  ? 'border-red-500 text-red-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Purchase
            </button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="p-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">จัดการโปรไฟล์ของคุณ</p>
          </div>

            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Username */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อผู้ใช้งาน (Username)
                    </label>
                    <div className="text-gray-900">{userProfile?.username || 'User001'}</div>
                  </div>
                </div>

                {/* Name */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ชื่อ (Name)
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="text-gray-900">{formData.name || userProfile?.username || 'User001'}</div>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      อีเมล์ (Email)
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{maskEmail(userProfile?.email || '')}</span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Change</button>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เบอร์โทร (Phone Number)
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-900">{maskPhone((userProfile as any)?.phone || '')}</span>
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Change</button>
                    </div>
                  </div>
                </div>

                {/* Gender */}
                <div className="flex items-center justify-between py-4 border-b border-gray-200">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      เพศ (Gender)
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({...formData, gender: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <div className="text-gray-900">{formData.gender}</div>
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
                      className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                    >
                      Save
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'password' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Change Password</h3>
                  <p className="text-gray-600">This feature will be available soon.</p>
                </div>
              </div>
            )}

            {activeTab === 'address' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Address Management</h3>
                  <p className="text-gray-600">This feature will be available soon.</p>
                </div>
              </div>
            )}

            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Settings</h3>
                  <p className="text-gray-600">This feature will be available soon.</p>
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
                            {new Date(userStore.registerDate).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <div className="space-y-6">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">My Purchase</h3>
                  <p className="text-gray-600">This feature will be available soon.</p>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex gap-8">
            {/* Sidebar */}
            <div className="w-64 bg-white rounded-lg shadow-sm p-6 h-fit">
              {/* User Profile Summary */}
              <div className="text-center mb-6">
                <AvatarUpload 
                  currentAvatar={userProfile?.avatar?.url}
                  onAvatarUpdate={handleAvatarUpdate}
                />
                <h3 className="text-lg font-semibold text-gray-900 mb-1 mt-4">
                  {userProfile?.username || 'User'}
                </h3>
                <button 
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  Edit Profile
                </button>
              </div>

              {/* Navigation */}
              <nav className="space-y-2">
                <div className="text-sm font-medium text-gray-500 mb-3">My Account</div>
                
                <button 
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === 'profile' 
                      ? 'bg-red-50 text-red-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Profile
                </button>
                
                <button 
                  onClick={() => setActiveTab('password')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === 'password' 
                      ? 'bg-red-50 text-red-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Change Password
                </button>
                
                <button 
                  onClick={() => setActiveTab('address')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === 'address' 
                      ? 'bg-red-50 text-red-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Address
                </button>
                
                <button 
                  onClick={() => setActiveTab('privacy')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === 'privacy' 
                      ? 'bg-red-50 text-red-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Privacy Setting
                </button>

                <div className="text-sm font-medium text-gray-500 mb-3 mt-6">Store</div>
                
                {hasStore ? (
                  <button 
                    onClick={() => setActiveTab('store')}
                    className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                      activeTab === 'store' 
                        ? 'bg-red-50 text-red-600 font-medium' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    My Store
                  </button>
                ) : (
                  <button 
                    onClick={() => setShowStoreModal(true)}
                    className="w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors bg-green-50 text-green-600 hover:bg-green-100 font-medium"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Store Register
                  </button>
                )}
                
                <button 
                  onClick={() => setActiveTab('purchase')}
                  className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === 'purchase' 
                      ? 'bg-red-50 text-red-600 font-medium' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  My Purchase
                </button>
              </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 bg-white rounded-lg shadow-sm p-8">
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">My Profile</h1>
                <p className="text-gray-600">จัดการโปรไฟล์ของคุณ</p>
              </div>

              {activeTab === 'profile' && (
                <div className="space-y-6">
                  {/* Username */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อผู้ใช้งาน (Username)
                      </label>
                      <div className="text-gray-900">{userProfile?.username || 'User001'}</div>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ชื่อ (Name)
                      </label>
                      {isEditing ? (
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : (
                        <div className="text-gray-900">{formData.name || userProfile?.username || 'User001'}</div>
                      )}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        อีเมล์ (Email)
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{maskEmail(userProfile?.email || '')}</span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Change</button>
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เบอร์โทร (Phone Number)
                      </label>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-900">{maskPhone((userProfile as any)?.phone || '')}</span>
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Change</button>
                      </div>
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="flex items-center justify-between py-4 border-b border-gray-200">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        เพศ (Gender)
                      </label>
                      {isEditing ? (
                        <select
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        <div className="text-gray-900">{formData.gender}</div>
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
                        className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium"
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'password' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Change Password</h3>
                    <p className="text-gray-600">This feature will be available soon.</p>
                  </div>
                </div>
              )}

              {activeTab === 'address' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Address Management</h3>
                    <p className="text-gray-600">This feature will be available soon.</p>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Privacy Settings</h3>
                    <p className="text-gray-600">This feature will be available soon.</p>
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
                              {new Date(userStore.registerDate).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <div className="space-y-6">
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">My Purchase</h3>
                    <p className="text-gray-600">This feature will be available soon.</p>
                  </div>
                </div>
              )}
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
