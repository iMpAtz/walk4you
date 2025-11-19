'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/lib/config';
import { X, Mail, Lock, LogIn } from 'lucide-react';
import Link from 'next/link';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister?: () => void;
}

export default function LoginModal({ isOpen, onClose, onSwitchToRegister }: LoginModalProps) {
  const router = useRouter();
  const { login: authLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await authLogin(email, password);
      
      if (!success) {
        throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      }
      
      // Get user info to determine redirect
      const token = localStorage.getItem('access_token');
      if (token) {
        const userRes = await fetch(`${config.apiBaseUrl}/users/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (userRes.ok) {
          const user = await userRes.json();
          onClose();
          if (user.role === 'ADMIN') {
            router.push('/admin');
          } else {
            // Reload the page to update TopBar
            window.location.reload();
          }
        } else {
          onClose();
          window.location.reload();
        }
      } else {
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      console.error('[login] error', err);
      setError(err?.message || 'เข้าสู่ระบบไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" onClick={onClose}>
      {/* Modal */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md relative animate-slideUp overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B44A3]/95 to-[#1a5fd4]/95 backdrop-blur-md text-white p-8 rounded-t-2xl relative">
         
          
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <LogIn className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center">เข้าสู่ระบบ</h1>
          <p className="text-center text-blue-100 text-sm mt-1">ยินดีต้อนรับกลับมา</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                อีเมล
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition text-base"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition text-base"
                  required
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white py-3 rounded-lg font-semibold hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed text-base"
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              ยังไม่มีบัญชี?{' '}
              <span
                onClick={() => {
                  onClose();
                  onSwitchToRegister?.();
                }}
                className="text-[#0B44A3] font-semibold hover:underline cursor-pointer"
              >
                สมัครสมาชิก
              </span>
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
