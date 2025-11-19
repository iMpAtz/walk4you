'use client';

import { AlertTriangle } from 'lucide-react';
import { useEffect } from 'react';

interface SuspendUserModalProps {
  isOpen: boolean;
  user: {
    username: string;
    email: string;
    role?: string;
  } | null;
  reason: string;
  loading?: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const MIN_REASON_LENGTH = 10;

export default function SuspendUserModal({
  isOpen,
  user,
  reason,
  loading = false,
  onReasonChange,
  onClose,
  onConfirm,
}: SuspendUserModalProps) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !user) {
    return null;
  }

  const remaining = Math.max(0, MIN_REASON_LENGTH - reason.trim().length);
  const disableConfirm = loading || reason.trim().length < MIN_REASON_LENGTH;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">ยืนยันการระงับการใช้งาน</h2>
            <p className="text-sm text-gray-500">กรอกสาเหตุเพื่อแจ้งให้ผู้ใช้ทราบหลังจากถูกระงับ</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600">ผู้ใช้ที่จะระงับ:</p>
          <p className="font-semibold text-gray-900">{user.username}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          สาเหตุการระงับ (จะแสดงให้ผู้ใช้เห็น)
        </label>
        <textarea
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          rows={4}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3]/20 text-sm resize-none"
          placeholder="เช่น &quot;บัญชีนี้ถูกรายงานว่าโพสต์สินค้าที่ไม่เหมาะสม&quot;"
        />
        <div className="text-xs text-gray-500 mt-1">
          {remaining > 0
            ? `ต้องการอีก ${remaining} อักขระ`
            : 'พร้อมส่ง'}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={disableConfirm}
            onClick={onConfirm}
            className={`w-full sm:w-auto px-5 py-2.5 rounded-lg text-white font-semibold transition-all shadow-md ${
              disableConfirm
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-red-500 to-red-600 !text-white hover:opacity-90'
            }`}
          >
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการระงับ'}
          </button>
        </div>
      </div>
    </div>
  );
}

