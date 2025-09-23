'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import StoreManagementLayout from '@/app/store-management/StoreManagementLayout';

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

export default function StoreManagementPage() {
  const router = useRouter();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }
        setHasToken(true);
        await fetchStoreData(token);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchStoreData = async (token: string) => {
    try {
      setIsLoading(true);
      
      // Fetch user profile first to get user info
      const userResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('access_token');
          router.push('/login');
          return;
        }
        throw new Error(`Failed to fetch user data: ${userResponse.status}`);
      }

      const userData = await userResponse.json();
      setUserData(userData);
      
      // Fetch store data
      const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (storeResponse.ok) {
        const store = await storeResponse.json();
        setStoreData({
          id: store.id,
          storeName: store.storeName,
          storeDescription: store.storeDescription || '',
          phoneNumber: store.phoneNumber,
          buMail: store.buMail,
          registerDate: store.registerDate,
          status: store.status,
        });
      } else if (storeResponse.status === 404) {
        // No store exists, create default data
        setStoreData({
          id: '',
          storeName: userData.username || 'Store001',
          storeDescription: '',
          phoneNumber: userData.phone,
          buMail: userData.email,
          registerDate: new Date().toISOString(),
          status: 'DRAFT',
        });
      } else {
        throw new Error(`Failed to fetch store data: ${storeResponse.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch store data:', error);
      // Show user-friendly error message
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: Partial<StoreData>) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/store`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: formData.storeName,
          storeDescription: formData.storeDescription,
        }),
      });

      if (response.ok) {
        const updatedStore = await response.json();
        setStoreData(prev => prev ? { ...prev, ...formData, id: updatedStore.id } : null);
        alert('บันทึกข้อมูลสำเร็จ');
      } else {
        throw new Error('Failed to save store data');
      }
    } catch (error) {
      console.error('Failed to save store data:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  if (!hasToken || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreManagementLayout 
      storeData={storeData}
      userData={userData}
      onSave={handleSave}
    />
  );
}
