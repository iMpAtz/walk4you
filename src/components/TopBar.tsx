'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types';
import MobileSidebar from './MobileSidebar';

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
      <div className="w-full bg-black text-white text-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2">
          {/* Profile button - moved to left side when logged in */}
          {hasToken && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 hover:bg-gray-800 rounded-lg px-2 py-1 transition-colors"
            >
              {userProfile?.avatar?.url ? (
                <Image 
                  src={userProfile.avatar.url} 
                  alt="Profile" 
                  width={24} 
                  height={24} 
                  className="rounded-full object-cover w-6 h-6"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span className="text-sm">{userProfile?.username || 'User'}</span>
            </button>
          )}

          {/* Logo/Brand - show when not logged in */}
          {!hasToken && (
            <div className="text-lg font-semibold">Walk4You</div>
          )}

          {/* Right side - Login/Register when not logged in */}
          {!hasToken && (
            <div className="flex items-center gap-4">
              <Link href="/login" className="rounded bg-white px-3 py-1 text-black">Login</Link>
              <Link href="/register" className="underline">Register</Link>
            </div>
          )}
        </div>
      </div>

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


