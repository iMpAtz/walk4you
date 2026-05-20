'use client';

import { useState } from 'react';
import type { StoreCreate } from '@/types';
import { getApiBase } from '@/lib/config';

interface StoreRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (store: any) => void;
}

export default function StoreRegisterModal({ isOpen, onClose, onSuccess }: StoreRegisterModalProps) {
  const [formData, setFormData] = useState({
    storeName: '',
    storeDescription: '',
    phoneNumber: '',
    buMail: '',
    otp: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);

  const handleSendOTP = async () => {
    if (!formData.buMail) {
      setError('Please enter BU Mail first');
      return;
    }
    
    // Validate BU Mail format
    if (!formData.buMail.endsWith('@bumail.net')) {
      setError('Please enter a valid BU Mail address');
      return;
    }
    
    setSendingOTP(true);
    setError(null);
    
    try {
      const response = await fetch(`${getApiBase()}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.buMail
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOtpSent(true);
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate required fields
    if (!formData.storeName || !formData.phoneNumber || !formData.buMail || !formData.otp) {
      setError('Please fill in all required fields');
      setIsSubmitting(false);
      return;
    }

    try {
      // First verify OTP
      const otpResponse = await fetch(`${getApiBase()}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.buMail,
          otp: formData.otp
        }),
      });

      if (!otpResponse.ok) {
        const otpErrorData = await otpResponse.json();
        setError(otpErrorData.detail || 'Invalid OTP');
        setIsSubmitting(false);
        return;
      }

      // OTP verified, now create store
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${getApiBase()}/users/me/store`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeName: formData.storeName,
          storeDescription: formData.storeDescription,
          phoneNumber: formData.phoneNumber,
          buMail: formData.buMail
        }),
      });

      if (response.ok) {
        const store = await response.json();
        onSuccess(store);
        onClose();
        setFormData({ storeName: '', storeDescription: '', phoneNumber: '', buMail: '', otp: '' });
        setOtpSent(false);
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Failed to create store');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-md sm:max-w-lg lg:max-w-xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] sticky top-0 z-10">
          <h1 className="text-lg sm:text-xl font-bold text-white">ลงทะเบียนร้านค้า</h1>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 transition-colors p-2 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="ปิด"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] sm:max-h-[calc(90vh-80px)]">
          <div className="p-4 sm:p-6">
            {/* Store Icon */}
            <div className="flex justify-center mb-6 sm:mb-8">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* Store Name */}
              <div className="space-y-2">
                <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700">
                  ชื่อร้านค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-[#0B44A3] transition-all text-gray-900 placeholder-gray-400 touch-manipulation"
                  placeholder="กรอกชื่อร้านค้า"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="storeDescription" className="block text-sm font-semibold text-gray-700">
                  คำอธิบาย
                </label>
                <textarea
                  id="storeDescription"
                  value={formData.storeDescription}
                  onChange={(e) => setFormData({...formData, storeDescription: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-[#0B44A3] transition-all text-gray-900 placeholder-gray-400 resize-none touch-manipulation"
                  placeholder="คำอธิบายร้านค้า..."
                  rows={3}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700">
                  เบอร์โทรศัพท์ <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-[#0B44A3] transition-all text-gray-900 placeholder-gray-400 touch-manipulation"
                  placeholder="กรอกเบอร์โทรศัพท์"
                  required
                />
              </div>

              {/* BU Mail */}
              <div className="space-y-2">
                <label htmlFor="buMail" className="block text-sm font-semibold text-gray-700">
                  BU Mail <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="buMail"
                  value={formData.buMail}
                  onChange={(e) => setFormData({...formData, buMail: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-[#0B44A3] transition-all text-gray-900 placeholder-gray-400 touch-manipulation"
                  placeholder="กรอก xxxx.xx@bumail.net"
                  required
                />
                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={sendingOTP || !formData.buMail}
                  className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md text-sm sm:text-base flex items-center justify-center gap-2 min-h-[44px] touch-manipulation"
                >
                  {sendingOTP ? (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>กำลังส่ง OTP...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>ส่ง OTP</span>
                    </>
                  )}
                </button>
              </div>

              {/* OTP */}
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700">
                  รหัส OTP <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="otp"
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-[#0B44A3] transition-all text-gray-900 placeholder-gray-400 touch-manipulation"
                  placeholder="กรอกรหัส OTP"
                  required
                />
                {otpSent && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="break-all">ส่ง OTP ไปที่ {formData.buMail} แล้ว</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-xs sm:text-sm font-medium break-words">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2 sm:pt-4 sticky bottom-0 bg-white pb-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm sm:text-base min-h-[48px] touch-manipulation"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>กำลังดำเนินการ...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>ยืนยันการลงทะเบียน</span>
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
