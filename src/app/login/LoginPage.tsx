'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';

export default function LoginPage() {
  const router = useRouter();
  const { login: authLogin } = useAuth();
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
    
    try {
      const success = await authLogin(username, password);
      
      if (!success) {
        throw new Error('Invalid username or password');
      }

      console.log('[login] success');
      
      // Get user info to determine redirect
      const token = localStorage.getItem('access_token');
      if (token) {
        const userRes = await fetch(`${config.apiBaseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const user = await userRes.json();
          if (user.role === 'ADMIN') {
            router.push('/admin');
          } else {
            router.push('/');
          }
        } else {
          router.push('/');
        }
      } else {
        router.push('/');
      }
    } catch (err: any) {
      console.error('[login] error', err);
      setError(`❌ ${err?.message || 'Login failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center sm:justify-end bg-gradient-to-br from-[#191919] to-[#1f1f1f] overflow-hidden px-4 sm:pr-16">
      {/* Bubbles */}
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>
      <div className="bubble"></div>

      {/* Login Card */}
      <div className="w-full max-w-md rounded-3xl bg-white/10 p-6 sm:p-10 shadow-2xl backdrop-blur-md relative z-10 border border-white/20">
        <h1 className="mb-4 sm:mb-6 text-center text-2xl sm:text-4xl font-bold text-white">Login 👋</h1>
        <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(sanitizeSql(e.target.value))}
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 sm:p-4 text-white placeholder-gray-400 focus:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 transition text-base touch-manipulation"
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
            className="w-full rounded-lg border border-gray-700 bg-[#2a2a2a] p-3 sm:p-4 text-white placeholder-gray-400 focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/50 transition text-base touch-manipulation"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            title="ห้ามใช้อักขระพิเศษเช่น ', \\ , ;, --"
          />
          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white px-4 py-3 font-semibold text-black shadow-md transition active:scale-95 hover:shadow-lg hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation text-base min-h-[48px]"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <p className="mt-4 sm:mt-6 text-center text-sm text-gray-300">
          Don't have an account? <a href="/register" className="text-[#0B44A3] underline font-semibold touch-manipulation">Sign up</a>
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


