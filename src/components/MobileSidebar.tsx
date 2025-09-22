'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import type { UserProfile } from '@/types';

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onLogout: () => void;
  isDesktop?: boolean;
}

export default function MobileSidebar({ isOpen, onClose, userProfile, onLogout, isDesktop = false }: MobileSidebarProps) {
  const router = useRouter();

  // ป้องกันการ scroll ของ body เมื่อ sidebar เปิด (เฉพาะ mobile)
  useEffect(() => {
    if (isOpen && !isDesktop) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isDesktop]);

  // ปิด sidebar เมื่อกด ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay - เฉพาะ mobile */}
      {isOpen && !isDesktop && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out
        ${isDesktop ? 'w-64' : 'w-80 md:hidden'}
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {userProfile?.avatar?.url ? (
              <Image 
                src={userProfile.avatar.url} 
                alt="Profile" 
                width={40} 
                height={40} 
                className="rounded-full object-cover w-10 h-10"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold">
                {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">
                {userProfile?.username || 'User'}
              </div>
              <div className="text-sm text-gray-500">Profile</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Menu Items */}
        <div className="p-4">
          <nav className="space-y-2">
            {/* Notifications */}
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.5 5.5L9 10l4.5-4.5L9 1 4.5 5.5z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">Notifications</span>
            </button>

            {/* Cart */}
            <button className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">Cart</span>
            </button>

            {/* Profile */}
            <button 
              onClick={() => {
                onClose();
                router.push('/profile');
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="font-medium text-gray-900">Profile</span>
            </button>

            

            {/* Divider */}
            <div className="my-4 border-t border-gray-200" />

            {/* Logout */}
            <button 
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-red-50 rounded-lg transition-colors text-red-600"
            >
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <span className="font-medium">Logout</span>
            </button>
          </nav>
        </div>
      </div>
    </>
  );
}
