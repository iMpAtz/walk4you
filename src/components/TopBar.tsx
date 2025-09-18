'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TopBar() {
  const router = useRouter();
  const [hasToken, setHasToken] = useState<boolean>(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('access_token');
      setHasToken(Boolean(token));
    } catch {
      setHasToken(false);
    }
  }, []);

  const handleLogout = () => {
    try {
      localStorage.removeItem('access_token');
    } finally {
      setHasToken(false);
      router.push('/');
    }
  };

  return (
    <div className="w-full bg-black text-white text-sm">
      <div className="mx-auto flex max-w-[1200px] items-center justify-end gap-6 px-4 py-2">
        {hasToken ? (
          <>
            <div className="flex items-center gap-2"><span>notifications</span></div>
            <div className="flex items-center gap-2"><span>User</span></div>
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


