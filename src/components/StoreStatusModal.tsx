'use client';

import { AlertTriangle } from 'lucide-react';

interface StoreStatusModalProps {
  isOpen: boolean;
  store: {
    storeName: string;
  } | null;
  targetStatus: 'INACTIVE' | 'BLOCKED' | null;
  reason: string;
  loading?: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const STATUS_TEXT: Record<'INACTIVE' | 'BLOCKED', { title: string; description: string }> = {
  INACTIVE: {
    title: 'ปิดใช้งานร้านค้า',
    description: 'ร้านค้าจะถูกปิดชั่วคราว ผู้ใช้จะไม่เห็นสินค้าและไม่สามารถทำรายการได้จนกว่าจะเปิดใช้งานใหม่',
  },
  BLOCKED: {
    title: 'บล็อกร้านค้า',
    description: 'ร้านค้าจะถูกระงับทั้งหมดทันทีและไม่สามารถกลับมาเปิดได้จนกว่าผู้ดูแลจะปลดบล็อก',
  },
};

const MIN_REASON_LENGTH = 10;

export default function StoreStatusModal({
  isOpen,
  store,
  targetStatus,
  reason,
  loading = false,
  onReasonChange,
  onClose,
  onConfirm,
}: StoreStatusModalProps) {
  if (!isOpen || !store || !targetStatus) {
    return null;
  }

  const config = STATUS_TEXT[targetStatus];
  const trimmedReason = reason.trim();
  const disableConfirm = loading || trimmedReason.length < MIN_REASON_LENGTH;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500">จัดการร้านค้า</p>
            <h2 className="text-xl font-semibold text-gray-900">{config.title}</h2>
          </div>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-sm text-gray-600">ร้านค้า</p>
          <p className="font-semibold text-gray-900">{store.storeName}</p>
        </div>

        <p className="text-sm text-gray-600 mb-4">{config.description}</p>

        <label className="block text-sm font-medium text-gray-700 mb-2">
          สาเหตุ (จะแสดงให้เจ้าของร้านเห็น)
        </label>
        <textarea
          rows={4}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-[#0B44A3] focus:ring-2 focus:ring-[#0B44A3]/20 text-sm resize-none"
          placeholder="เช่น &quot;ร้านค้าลงสินค้าที่ผิดกฎของเว็บไชต์&quot;"
        />
        <div className="text-xs text-gray-500 mt-1">
          {trimmedReason.length < MIN_REASON_LENGTH
            ? `ต้องการอีก ${MIN_REASON_LENGTH - trimmedReason.length} อักขระ`
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
            {loading ? 'กำลังบันทึก...' : 'ยืนยันการเปลี่ยนสถานะ'}
          </button>
        </div>
      </div>
    </div>
  );
}

