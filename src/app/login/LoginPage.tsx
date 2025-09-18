'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // sanitize เบื้องต้นฝั่ง client
  const sanitizeSql = (value: string) =>
    value.replace(/(--|\/\*|\*\/)/g, '').replace(/[;'"`\\<>]/g, '').trim();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const apiBase = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8000';
    try {
      const res = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || 'Login failed');
      if (data?.access_token) localStorage.setItem('access_token', data.access_token);
      console.log('[login] success', data);
      router.push('/');
    } catch (err: any) {
      console.error('[login] error', err);
      setError(`❌ ${err?.message || 'Login failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex h-screen items-center justify-end bg-gradient-to-br from-[#191919] to-[#1f1f1f] overflow-hidden pr-16">
      {/* Bubbles */}
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>

      {/* Login Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-10 shadow-2xl backdrop-blur-md relative z-10 border border-white/20">
        <h1 className="mb-6 text-center text-4xl font-bold text-white">Login 👋</h1>
        <form onSubmit={handleLogin} className="space-y-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(sanitizeSql(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-4 text-white placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ห้ามใช้อักขระพิเศษเช่น ', \\ , ;, --"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(sanitizeSql(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-4 text-white placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ห้ามใช้อักขระพิเศษเช่น ', \\ , ;, --"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black shadow-md transition transform hover:scale-105 hover:shadow-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-300">
          Don’t have an account? <a href="/register" className="text-pink-400 underline">Sign up</a>
        </p>
      </div>

      {/* CSS for bubbles */}
      <style jsx>{`
        .bubble {
          position: absolute;
          bottom: -150px;
          background: rgba(255, 192, 203, 0.4);
          border-radius: 50%;
          animation: rise 20s infinite ease-in;
        }
        .bubble:nth-child(1) { width: 80px; height: 80px; left: 20%; animation-duration: 18s; }
        .bubble:nth-child(2) { width: 50px; height: 50px; left: 40%; animation-duration: 22s; }
        .bubble:nth-child(3) { width: 100px; height: 100px; left: 60%; animation-duration: 25s; }
        .bubble:nth-child(4) { width: 70px; height: 70px; left: 80%; animation-duration: 20s; }

        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { opacity: 0.9; }
          100% { transform: translateY(-110vh) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}


