'use client';

import { useState } from 'react';
import type { StoreCreate } from '@/types';

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/send-otp`, {
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
        
        // For development, show OTP in console
        if (data.otp) {
          console.log('Development OTP:', data.otp);
        }
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
      const otpResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/verify-otp`, {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/store`, {
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
    <div className="fixed inset-0 bg-black bg-opacity-50 md:bg-gray-200 md:bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 transition-colors p-2 hover:bg-white rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h1 className="text-xl font-bold text-gray-900">Registration Store</h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="p-6">
            {/* Store Logo Placeholder */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-10 h-10 md:w-12 md:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Store Name */}
              <div className="space-y-2">
                <label htmlFor="storeName" className="block text-sm font-semibold text-gray-700">
                  Store Name
                </label>
                <input
                  type="text"
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData({...formData, storeName: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Enter Store Name"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label htmlFor="storeDescription" className="block text-sm font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  id="storeDescription"
                  value={formData.storeDescription}
                  onChange={(e) => setFormData({...formData, storeDescription: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500 resize-none"
                  placeholder="Description..."
                  rows={3}
                />
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-700">
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Enter Phone Number"
                  required
                />
              </div>

              {/* BU Mail */}
              <div className="space-y-2">
                <label htmlFor="buMail" className="block text-sm font-semibold text-gray-700">
                  BU Mail
                </label>
                <div className="relative">
                  <input
                    type="email"
                    id="buMail"
                    value={formData.buMail}
                    onChange={(e) => setFormData({...formData, buMail: e.target.value})}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                    placeholder="Enter xxxx.xx@bumail.net"
                    required
                  />
                  <button
                    type="button"
                    onClick={handleSendOTP}
                    disabled={sendingOTP || !formData.buMail}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingOTP ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Get OTP */}
              <div className="space-y-2">
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700">
                  Get OTP
                </label>
                <input
                  type="text"
                  id="otp"
                  value={formData.otp}
                  onChange={(e) => setFormData({...formData, otp: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900 placeholder-gray-500"
                  placeholder="Enter OTP"
                  required
                />
                {otpSent && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>OTP sent to {formData.buMail}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Submit</span>
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
