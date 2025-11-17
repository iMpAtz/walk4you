'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { config } from '@/lib/config';
import { X, UserPlus, Mail, Lock, User, Phone, Calendar } from 'lucide-react';
import TermsModal from './TermsModal';
import PrivacyModal from './PrivacyModal';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin?: () => void;
}

export default function RegisterModal({ isOpen, onClose, onSwitchToLogin }: RegisterModalProps) {
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
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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

  // ฟังก์ชันเช็คอายุ 18+
  const validateAge = (): boolean => {
    if (!day || !month || !year) {
      setError('กรุณากรอกวันเกิดให้ครบถ้วน');
      return false;
    }

    const birthDate = new Date(`${year}-${month}-${day}`);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      setError('คุณต้องมีอายุอย่างน้อย 18 ปีขึ้นไป');
      return false;
    }

    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // เช็คว่ายอมรับข้อกำหนดและนโยบายหรือยัง
    if (!acceptedTerms) {
      setError('กรุณายอมรับข้อกำหนดและเงื่อนไขการให้บริการ');
      return;
    }

    if (!acceptedPrivacy) {
      setError('กรุณายอมรับนโยบายความเป็นส่วนตัว');
      return;
    }
    
    // เช็ครหัสผ่าน
    if (password !== confirm) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    // เช็คอายุ 18+
    if (!validateAge()) {
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
      if (!res.ok) throw new Error(data?.detail || 'สมัครสมาชิกไม่สำเร็จ');
      
      if (data?.access_token) localStorage.setItem('access_token', data.access_token);
      console.log('[register] success', data);
      
      alert('✅ สมัครสมาชิกสำเร็จ!');
      onClose();
      onSwitchToLogin?.();
    } catch (err: any) {
      console.error('[register] error', err);
      setError(err?.message || 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto animate-fadeIn" onClick={onClose}>
      {/* Modal */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl relative my-8 animate-slideUp overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0B44A3]/95 to-[#1a5fd4]/95 backdrop-blur-md text-white p-8 rounded-t-2xl relative">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <UserPlus className="w-8 h-8" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center">สมัครสมาชิก</h1>
          <p className="text-center text-blue-100 text-sm mt-1">เริ่มต้นใช้งานกับเรา</p>
        </div>

        {/* Form */}
        <div className="p-8 max-h-[calc(100vh-200px)] overflow-y-auto">
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ชื่อ-นามสกุล
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ชื่อผู้ใช้
                </label>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^a-zA-Z0-9_-]/g, '');
                    setUsername(value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                  title="ใช้ได้เฉพาะภาษาอังกฤษ ตัวเลข _ และ -"
                  required
                />
              </div>

              {/* Email */}
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
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Password */}
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
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ยืนยันรหัสผ่าน
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Phone & Gender */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เบอร์โทรศัพท์
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    placeholder="0812345678"
                    value={phone}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setPhone(value);
                    }}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition"
                    maxLength={10}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  เพศ
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition bg-white"
                >
                  <option value="Male">ชาย</option>
                  <option value="Female">หญิง</option>
                  <option value="Other">อื่นๆ</option>
                </select>
              </div>
            </div>

            {/* Birth Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                วันเกิด
              </label>
              <div className="grid grid-cols-3 gap-3">
                <select 
                  value={day} 
                  onChange={(e) => setDay(e.target.value)} 
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition bg-white"
                >
                  <option value="" disabled hidden>Day</option>
                  {days.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                
                <select 
                  value={month} 
                  onChange={(e) => setMonth(e.target.value)} 
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition bg-white"
                >
                  <option value="" disabled hidden>Month</option>
                  {months.map((m) => (
                    <option key={m.v} value={m.v}>{m.v}</option>
                  ))}
                </select>
                
                <select 
                  value={year} 
                  onChange={(e) => setYear(e.target.value)} 
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:border-[#0B44A3] focus:outline-none focus:ring-2 focus:ring-[#0B44A3]/20 transition bg-white"
                >
                  <option value="" disabled hidden>Year</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#0B44A3] border-gray-300 rounded focus:ring-[#0B44A3]"
              />
              <label htmlFor="terms" className="text-sm text-gray-700 flex-1">
                ฉันยอมรับ{' '}
                <span
                  onClick={() => setShowTermsModal(true)}
                  className="text-[#0B44A3] font-semibold underline hover:no-underline cursor-pointer"
                >
                  ข้อกำหนดและเงื่อนไขการให้บริการ
                </span>
              </label>
            </div>

            {/* Privacy Policy */}
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="privacy"
                checked={acceptedPrivacy}
                onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                className="mt-1 w-4 h-4 text-[#0B44A3] border-gray-300 rounded focus:ring-[#0B44A3]"
              />
              <label htmlFor="privacy" className="text-sm text-gray-700 flex-1">
                ฉันยอมรับ{' '}
                <span
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[#0B44A3] font-semibold underline hover:no-underline cursor-pointer"
                >
                  นโยบายความเป็นส่วนตัว
                </span>
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !acceptedTerms || !acceptedPrivacy}
              className="w-full bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] !text-white py-3 rounded-lg font-semibold hover:shadow-lg active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'กำลังสมัครสมาชิก...' : 'สมัครสมาชิก'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              มีบัญชีอยู่แล้ว?{' '}
              <span
                onClick={() => {
                  onClose();
                  onSwitchToLogin?.();
                }}
                className="text-[#0B44A3] font-semibold hover:underline"
              >
                เข้าสู่ระบบ
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Terms Modal */}
      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => setAcceptedTerms(true)}
      />

      {/* Privacy Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => setAcceptedPrivacy(true)}
      />

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
