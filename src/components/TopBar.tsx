'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User } from 'lucide-react';
import type { UserProfile } from '@/types';
import MobileSidebar from './MobileSidebar';
import NotificationBell from './NotificationBell';
import CartIcon from './CartIcon';

export default function TopBar() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [hasStore, setHasStore] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isDesktop, setIsDesktop] = useState<boolean>(false);

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const profile = await response.json();
        setUserProfile(profile);
        // Check if user has a store
        await checkStoreStatus(token);
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const checkStoreStatus = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/has-store`, {
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
      <nav className="bg-[#0B44A3] border-b border-[#093782] px-6 lg:px-8 py-4 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link 
            href="/" 
            className="text-2xl lg:text-3xl font-bold text-white hover:opacity-80 transition cursor-pointer"
          >
            ShopLogo
          </Link>
          <div className="flex items-center gap-3 lg:gap-6">
            {hasToken && (
              <>
                <NotificationBell />
                <CartIcon />
                <div 
                  onClick={() => setIsSidebarOpen(true)}
                  className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 hover:bg-[#093782] rounded-full transition cursor-pointer"
                >
                  {userProfile?.avatar?.url ? (
                    <img
                      src={userProfile.avatar.url}
                      alt={userProfile.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[#0B44A3]" />
                    </div>
                  )}
                  <span className="hidden sm:block font-medium text-white">
                    {userProfile?.username || 'Guest'}
                  </span>
                </div>
              </>
            )}
            {!hasToken && (
              <div className="flex items-center gap-4">
                <Link href="/login" className="rounded bg-white px-4 py-2 text-[#0B44A3] font-semibold hover:bg-gray-100 transition-colors">
                  Login
                </Link>
                <Link href="/register" className="text-white underline hover:no-underline transition-all">
                  Register
                </Link>
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
    </>
  );
}


