'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function LoginPage() {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  // กรองอักขระที่เสี่ยงต่อ SQL injection / XSS แบบเบื้องต้นฝั่งคลายเอนต์
  const sanitizeSql = (value: string) =>
    value
      // ลบคอมเมนต์/ตัวเชื่อมที่พบบ่อยใน SQLi
      .replace(/(--|\/\*|\*\/)/g, '')
      // ลบตัวอักษรอันตรายพื้นฐาน
      .replace(/[;'"`\\<>]/g, '')
      .trim();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submit', { account, password: '•••', remember });
  };

  return (
    <div className="min-h-screen w-full bg-[#444]">
      {/* Top white bar with logo */}
      <div className="w-full bg-white shadow-sm motion-safe:animate-[slideDown_400ms_ease-out] [@keyframes_slideDown]:{from{transform:translateY(-6px);opacity:.0}to{transform:translateY(0);opacity:1}}">
        <div className="mx-auto max-w-[1200px] px-6 py-6">
          <div className="text-4xl tracking-wider text-black select-none">LOGO</div>
        </div>
      </div>

      {/* Content area */}
      <div className="mx-auto flex max-w-[1200px] justify-end px-4 py-12 sm:py-16">
        <div className="w-full max-w-xl">
          <div className="mx-auto w-full rounded bg-white p-8 shadow-md sm:p-10 motion-safe:animate-[fadeIn_420ms_ease-out] [@keyframes_fadeIn]:{from{opacity:.0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}">
            <h1 className="mb-6 text-center text-xl font-medium text-black">Account log in</h1>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="sr-only" htmlFor="account">Account</label>
                <div className="group flex overflow-hidden rounded border border-gray-300 focus-within:border-[#ff6b6b]/60 transition-colors">
                  <div className="flex shrink-0 items-center bg-gray-100 px-3 text-sm text-gray-700">Account</div>
                  <input
                    id="account"
                    value={account}
                    onChange={(e) => setAccount(sanitizeSql(e.target.value))}
                    placeholder="Account"
                    className="w-full border-0 px-3 py-2 text-sm outline-none focus:ring-0"
                    inputMode="email"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    title="ห้ามใช้อักขระพิเศษเช่น ', \, ;, --" 
                  />
                </div>
              </div>

              <div>
                <label className="sr-only" htmlFor="password">Password</label>
                <div className="group flex overflow-hidden rounded border border-gray-300 focus-within:border-[#ff6b6b]/60 transition-colors">
                  <div className="flex shrink-0 items-center bg-gray-100 px-3 text-sm text-gray-700">Password</div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(sanitizeSql(e.target.value))}
                    placeholder="Password"
                    className="w-full border-0 px-3 py-2 text-sm outline-none focus:ring-0"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    title="ห้ามใช้อักขระพิเศษเช่น ', \, ;, --" 
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  Remember Me
                </label>

                <button
                  type="submit"
                  className="rounded bg-[#ff6b6b] px-6 py-2 text-white shadow transition-transform hover:translate-y-[-1px] active:translate-y-[0] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/40"
                >
                  Login
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <Link href="/register" className="text-[#ff6b6b] transition-colors hover:underline hover:text-[#ff6b6b]/80">Register now</Link>
                <Link href="#" className="transition-colors hover:underline">Forgot Password?</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


