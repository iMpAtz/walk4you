'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/types';

export default function TopBar() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

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
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('access_token');
    } finally {
      setHasToken(false);
      setUserProfile(null);
      router.push('/');
    }
  };

  return (
    <div className="w-full bg-black text-white text-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-6 px-4 py-2">
        
        {hasToken ? (
          <>
          <Link href="/upload-test" className="underline">Upload Test</Link>
            <div className="flex items-center gap-2"><span>notifications</span></div>
            <div className="flex items-center gap-2">
              {userProfile?.avatar?.url ? (
                <Image 
                  src={userProfile.avatar.url} 
                  alt="Profile" 
                  width={24} 
                  height={24} 
                  className="rounded-full"
                />
              ) : (
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-xs">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
              <span>{userProfile?.username || 'User'}</span>
            </div>
            <div className="flex items-center gap-2"><span>Cart</span></div>
            <button onClick={handleLogout} className="rounded bg-white px-3 py-1 text-black">Logout</button>
          </>
        ) : (
          <>
            <Link href="/login" className="rounded bg-white px-3 py-1 text-black">Login</Link>
            <Link href="/register" className="underline">Register</Link>
          </>
        )}
      </div>
    </div>
  );
}


