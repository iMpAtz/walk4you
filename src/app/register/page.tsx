'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // ฟังก์ชันกรองอักขระเสี่ยง SQLi/XSS เบื้องต้น
  const sanitizeSql = (value: string) =>
    value
      .replace(/(--|\/\*|\*\/)/g, '')
      .replace(/[;'"`\\<>]/g, '')
      .trim();

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    const start = now - 100;
    return Array.from({ length: 101 }, (_, i) => String(start + i));
  }, []);

  const months = [
    { v: '01', t: '01' },
    { v: '02', t: '02' },
    { v: '03', t: '03' },
    { v: '04', t: '04' },
    { v: '05', t: '05' },
    { v: '06', t: '06' },
    { v: '07', t: '07' },
    { v: '08', t: '08' },
    { v: '09', t: '09' },
    { v: '10', t: '10' },
    { v: '11', t: '11' },
    { v: '12', t: '12' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      alert('Password และ Confirm Password ไม่ตรงกัน');
      return;
    }
    setLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
    const birth = day && month && year ? `${year}-${month}-${day}` : undefined;
    try {
      const res = await fetch(`${apiBase}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, email, fullName, gender, birthDay: birth })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Register failed');
      if (data?.access_token) localStorage.setItem('access_token', data.access_token);
      console.log('[register] success', data);
      setShowSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 1200);
    } catch (err: any) {
      console.error('[register] error', err);
      alert(`Register failed: ${err?.message || 'unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // ทำความสะอาด URL ชั่วคราวเมื่อ unmount หรือเปลี่ยนรูป
  useEffect(() => {
    return () => {
      if (avatarUrl) URL.revokeObjectURL(avatarUrl);
    };
  }, [avatarUrl]);

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-[680px] px-6 py-6 motion-safe:animate-[fadeIn_420ms_ease-out] [@keyframes_fadeIn]:{from{opacity:.0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}">
        <div className="mb-4 flex items-center gap-2">
          <Link href="/" aria-label="Back" className="text-2xl leading-none">←</Link>
          <h1 className="mx-auto text-center text-lg font-medium">Registration From</h1>
        </div>

        <div className="flex justify-center py-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group h-24 w-24 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-[#ff6b6b]/40"
            aria-label="Upload avatar"
            title="อัปโหลดรูปโปรไฟล์"
          >
            {avatarUrl ? (
              // แสดงพรีวิวรูป
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="avatar preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-black text-white/70">
                +
              </div>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              // จำกัดขนาดไฟล์ ~5MB
              if (file.size > 5 * 1024 * 1024) {
                alert('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
                e.currentTarget.value = '';
                return;
              }
              const url = URL.createObjectURL(file);
              if (avatarUrl) URL.revokeObjectURL(avatarUrl);
              setAvatarUrl(url);
            }}
          />
        </div>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-700">Full Name</label>
            <input
              placeholder="Enter full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#ff6b6b]/60"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Username</label>
            <input
              placeholder="Enter Username"
              value={username}
              onChange={(e) => setUsername(sanitizeSql(e.target.value))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#ff6b6b]/60"
              inputMode="email"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              title="ห้ามใช้อักขระพิเศษเช่น ', \, ;, --" 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Password</label>
            <input
              type="password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => setPassword(sanitizeSql(e.target.value))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#ff6b6b]/60"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              title="ห้ามใช้อักขระพิเศษเช่น ', \, ;, --" 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(sanitizeSql(e.target.value))}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#ff6b6b]/60"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              title="ห้ามใช้อักขระพิเศษเช่น ', \, ;, --" 
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-700">Email</label>
            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-2 text-sm outline-none transition-colors focus:border-[#ff6b6b]/60"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-700">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-sm focus:border-[#ff6b6b]/60"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-700">Birth Day</label>
              <div className="flex gap-2">
                <select value={day} onChange={(e) => setDay(e.target.value)} className="w-20 rounded border border-gray-200 bg-white px-2 py-2 text-sm focus:border-[#ff6b6b]/60">
                  <option value="">DD</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select value={month} onChange={(e) => setMonth(e.target.value)} className="w-20 rounded border border-gray-200 bg-white px-2 py-2 text-sm focus:border-[#ff6b6b]/60">
                  <option value="">MM</option>
                  {months.map((m) => (
                    <option key={m.v} value={m.v}>{m.t}</option>
                  ))}
                </select>
                <select value={year} onChange={(e) => setYear(e.target.value)} className="w-28 rounded border border-gray-200 bg-white px-2 py-2 text-sm focus:border-[#ff6b6b]/60">
                  <option value="">YYYY</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded bg-[#ff6b6b] px-8 py-2 text-white shadow transition-transform hover:translate-y-[-1px] active:translate-y-[0] focus:outline-none focus:ring-2 focus:ring-[#ff6b6b]/40 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Submit'}
            </button>
          </div>
        </form>
        {/* Success Popup */}
        {showSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-[92%] max-w-sm rounded-lg bg-white p-6 text-center shadow-xl">
              <div className="mb-2 text-lg font-semibold text-gray-900">Register Successful</div>
              <div className="mb-4 text-sm text-gray-600">กำลังพากลับไปหน้า Login...</div>
              <button
                type="button"
                onClick={() => router.push('/')}
                className="rounded bg-[#ff6b6b] px-4 py-2 text-white shadow hover:brightness-95"
              >
                ไปหน้า Login ตอนนี้
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


