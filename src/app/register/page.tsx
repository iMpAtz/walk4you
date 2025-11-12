'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    { v: '01', t: 'January' },
    { v: '02', t: 'February' },
    { v: '03', t: 'March' },
    { v: '04', t: 'April' },
    { v: '05', t: 'May' },
    { v: '06', t: 'June' },
    { v: '07', t: 'July' },
    { v: '08', t: 'August' },
    { v: '09', t: 'September' },
    { v: '10', t: 'October' },
    { v: '11', t: 'November' },
    { v: '12', t: 'December' },
  ];

  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirm) {
      setError('❌ Password และ Confirm Password ไม่ตรงกัน');
      return;
    }
    
    setLoading(true);
    const birth = day && month && year ? `${year}-${month}-${day}` : undefined;
    
    try {
      const res = await fetch(`${config.apiBaseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          email, 
          phone,
          fullName, 
          gender, 
          birthDay: birth 
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Register failed');
      
      if (data?.access_token) localStorage.setItem('access_token', data.access_token);
      console.log('[register] success', data);
      
      alert('✅ สมัครสมาชิกสำเร็จ!');
      router.push('/login');
    } catch (err: any) {
      console.error('[register] error', err);
      setError(`❌ ${err?.message || 'Register failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center sm:justify-end bg-gradient-to-br from-[#191919] to-[#1f1f1f] overflow-hidden px-4 sm:pr-16 py-8">
      {/* Bubbles */}
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>

      {/* Register Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 border border-white/20 max-h-[90vh] overflow-y-auto">
        <h1 className="mb-4 sm:mb-6 text-center text-2xl sm:text-4xl font-bold text-white">Sign Up 🎉</h1>
        
        <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
          />

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => {
              // Allow only English letters, numbers, underscore, and hyphen
              const value = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
              setUsername(value);
            }}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ -"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(sanitizeSql(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ห้ามใช้อักขระพิเศษเช่น ', \\ , ;, --"
            required
          />

          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(sanitizeSql(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ห้ามใช้อักขระพิเศษเช่น ', \\ , ;, --"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            required
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs sm:text-sm text-gray-300 mb-1">Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 text-white focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs sm:text-sm text-gray-300 mb-1">Birth Date</label>
            <div className="grid grid-cols-3 gap-2">
              <select 
                value={day} 
                onChange={(e) => setDay(e.target.value)} 
                className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-2.5 sm:p-3 text-white focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-sm sm:text-base touch-manipulation"
              >
                <option value="" disabled hidden>Day</option>
                {days.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              
              <select 
                value={month} 
                onChange={(e) => setMonth(e.target.value)} 
                className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-2.5 sm:p-3 text-white focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-sm sm:text-base touch-manipulation"
              >
                <option value="" disabled hidden>Month</option>
                {months.map((m) => (
                  <option key={m.v} value={m.v}>{m.v}</option>
                ))}
              </select>
              
              <select 
                value={year} 
                onChange={(e) => setYear(e.target.value)} 
                className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-2.5 sm:p-3 text-white focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-sm sm:text-base touch-manipulation"
              >
                <option value="" disabled hidden>Year</option>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black shadow-md transition active:scale-95 hover:shadow-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation text-base min-h-[48px]"
          >
            {loading ? 'Loading...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-4 sm:mt-6 text-center text-sm text-gray-300">
          Already have an account? <a href="/login" className="text-[#0B44A3] underline font-semibold touch-manipulation">Login</a>
        </p>
      </div>

      {/* CSS for bubbles */}
      <style jsx>{`
        .bubble {
          position: absolute;
          bottom: -150px;
          background: rgba(11, 68, 163, 0.4);
          border-radius: 50%;
          animation: rise 20s infinite ease-in;
        }
        .bubble:nth-child(1) { width: 60px; height: 60px; left: 20%; animation-duration: 18s; }
        .bubble:nth-child(2) { width: 40px; height: 40px; left: 40%; animation-duration: 22s; }
        .bubble:nth-child(3) { width: 80px; height: 80px; left: 60%; animation-duration: 25s; }
        .bubble:nth-child(4) { width: 50px; height: 50px; left: 80%; animation-duration: 20s; }

        @media (min-width: 640px) {
          .bubble:nth-child(1) { width: 80px; height: 80px; }
          .bubble:nth-child(2) { width: 50px; height: 50px; }
          .bubble:nth-child(3) { width: 100px; height: 100px; }
          .bubble:nth-child(4) { width: 70px; height: 70px; }
        }

        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { opacity: 0.9; }
          100% { transform: translateY(-110vh) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


