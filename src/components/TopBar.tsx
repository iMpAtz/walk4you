'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Ban, Store, Shield } from 'lucide-react';
import type { UserProfile } from '@/types';
import MobileSidebar from './MobileSidebar';
import NotificationBell from './NotificationBell';
import CartIcon from './CartIcon';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import { getApiBase } from '@/lib/config';

export default function TopBar() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);
  const [showBannedModal, setShowBannedModal] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token');
      setHasToken(Boolean(token));
      if (token) {
        fetchUserProfile(token);
      }
    } catch {
      setHasToken(false);
    }
  }, []);

  // ตรวจสอบขนาดหน้าจอ
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${getApiBase()}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        
        // Check if user is banned
        if (profile.status === 'BANNED') {
          setShowBannedModal(true);
          return;
        }
        
        // Check if user has a store
        await checkStoreStatus(token);
      } else if (response.status === 401 || response.status === 403) {
        // Token expired or invalid - logout automatically
        handleLogout();
      } else {
        // Other errors - clear profile but don't logout
        setUserProfile(null);
      }
    } catch (error) {
      // Network error - don't logout, just clear profile
      setUserProfile(null);
    }
  };

  const checkStoreStatus = async (token: string) => {
    try {
      const response = await fetch(`${getApiBase()}/users/me/has-store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setHasStore(data.hasStore);
      } else {
        setHasStore(false);
      }
    } catch (error) {
      console.error('Failed to check store status:', error);
      setHasStore(false);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('access_token');
    } finally {
      setHasToken(false);
      setUserProfile(null);
      setHasStore(false);
      router.push('/');
    }
  };

  // Function to refresh store status (can be called from other components)
  const refreshStoreStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await checkStoreStatus(token);
      }
    } catch (error) {
      console.error('Failed to refresh store status:', error);
    }
  };

  // Expose refresh function globally for other components to use
  useEffect(() => {
    (window as any).refreshStoreStatus = refreshStoreStatus;
    return () => {
      delete (window as any).refreshStoreStatus;
    };
  }, []);

  return (
    <>
      {/* Navbar */}
      <nav className="bg-[#0B44A3] border-b border-[#093782] px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2 sm:gap-4">
          <div className="flex flex-col min-w-0 flex-1">
            <Link 
              href="/" 
              className="text-xl sm:text-2xl lg:text-3xl font-bold text-white hover:opacity-80 transition cursor-pointer leading-tight"
            >
              Walk4You
            </Link>
            <p className="text-white text-[10px] sm:text-xs lg:text-sm leading-tight">
              เว็บไชต์ซื้อขายสำหรับนักศึกษามหาวิทยาลัยกรุงเทพ
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 lg:gap-6 flex-shrink-0">
            {hasToken && (
              <>
                <NotificationBell />
                <CartIcon />
                {/* Admin Panel Icon - Only show if user is ADMIN */}
                {userProfile?.role === 'ADMIN' && (
                  <button
                    onClick={() => router.push('/admin')}
                    className="relative p-1.5 sm:p-2 hover:bg-[#093782] rounded-full transition-all group"
                    title="Admin Panel"
                  >
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                  </button>
                )}
                {/* Shop Icon - Only show if user has a store */}
                {hasStore && (
                  <button
                    onClick={() => router.push('/store-management')}
                    className="relative p-1.5 sm:p-2 hover:bg-[#093782] rounded-full transition-all group"
                    title="จัดการร้านค้า"
                  >
                    <Store className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600" />
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border-2 border-[#0B44A3]"></span>
                  </button>
                )}
                <div 
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 hover:bg-[#093782] rounded-full transition cursor-pointer"
                >
                  {userProfile?.avatar?.secure_url || userProfile?.avatar?.url ? (
                    <img
                      src={userProfile.avatar.secure_url || userProfile.avatar.url}
                      alt={userProfile.username}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-[#0B44A3]" />
                    </div>
                  )}
                  <div className="hidden md:flex flex-col items-start">
                    <span className="font-medium text-white text-sm lg:text-base truncate max-w-[100px] lg:max-w-none">
                      {userProfile?.username || '...'}
                    </span>
                    <span className={`text-[10px] lg:text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                      userProfile?.role === 'ADMIN'
                        ? 'bg-green-500 text-white'
                        : hasStore 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-300 text-gray-700'
                    }`}>
                      {userProfile?.role === 'ADMIN' ? 'ผู้ดูแลระบบ' : hasStore ? 'ร้านค้า' : 'ผู้ใช้งานทั่วไป'}
                    </span>
                  </div>
                </div>
              </>
            )}
            {!hasToken && (
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="rounded bg-white px-3 sm:px-4 py-1.5 sm:py-2 text-[#0B44A3] font-semibold text-sm sm:text-base hover:bg-gray-100 transition-colors whitespace-nowrap"
                >
                  Login
                </button>
                <button 
                  onClick={() => setShowRegisterModal(true)}
                  className="text-white underline hover:no-underline transition-all text-sm sm:text-base whitespace-nowrap"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Sidebar - works for both mobile and desktop */}
      <MobileSidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        userProfile={userProfile}
        onLogout={handleLogout}
        isDesktop={isDesktop}
        hasStore={hasStore}
      />

      {/* Banned User Modal */}
      {showBannedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Ban className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">บัญชีถูกระงับ</h2>
            <p className="text-gray-600 mb-4">
              คุณถูกแบนไม่สามารถใช้งานเว็บไซต์ได้<br />
              กรุณาติดต่อผู้ดูแลระบบสำหรับข้อมูลเพิ่มเติม
            </p>
            {userProfile?.statusReason && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl p-4 mb-6 whitespace-pre-line">
                {userProfile.statusReason}
              </div>
            )}
            <button
              onClick={() => {
                setShowBannedModal(false);
                handleLogout();
              }}
              className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all shadow-md"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      )}
      
      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => {
          setShowLoginModal(false);
          setShowRegisterModal(true);
        }}
      />
      
      {/* Register Modal */}
      <RegisterModal 
        isOpen={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => {
          setShowRegisterModal(false);
          setShowLoginModal(true);
        }}
      />
    </>
  );
}


