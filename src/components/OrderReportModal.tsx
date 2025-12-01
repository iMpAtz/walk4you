'use client';

import { useState } from 'react';
import { Flag, X, AlertTriangle } from 'lucide-react';

interface Order {
  id: string;
  totalAmount: number;
  status?: string;
}

interface OrderReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onSubmit: (reason: string, details: string) => Promise<void>;
}

export default function OrderReportModal({ isOpen, onClose, order, onSubmit }: OrderReportModalProps) {
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  if (!isOpen || !order) return null;

  const handleSubmit = async () => {
    if (!reportReason) {
      alert('กรุณาเลือกเหตุผลในการรายงาน');
      return;
    }

    setSubmittingReport(true);
    try {
      await onSubmit(reportReason, reportDetails);
      // Reset form
      setReportReason('');
      setReportDetails('');
      onClose();
    } catch (error) {
      console.error('Report submission failed:', error);
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleClose = () => {
    if (!submittingReport) {
      setReportReason('');
      setReportDetails('');
      onClose();
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">รอดำเนินการ</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">อนุมัติแล้ว</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">ปฏิเสธ</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">เสร็จสมบูรณ์</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">ไม่ระบุ</span>;
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-500 to-red-600 px-4 sm:px-6 py-4 sm:py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Flag className="w-5 h-5 text-red-500 " />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white">รายงานปัญหาคำสั่งซื้อ</h2>
              <p className="text-sm text-red-100">Order ID: #{order.id.slice(-8)}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={submittingReport}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-gray-900">ข้อมูลคำสั่งซื้อ</h3>
                <p className="text-xs text-gray-500 mt-1">Order ID: #{order.id.slice(-8)}</p>
              </div>
              {getStatusBadge(order.status)}
            </div>
            <div className="text-sm text-gray-700 mt-2">
              <div>ยอดรวม: <span className="font-semibold text-[#0B44A3]">฿{order.totalAmount.toLocaleString()}</span></div>
            </div>
          </div>

          {/* Report Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              เหตุผลในการรายงาน <span className="text-red-500">*</span>
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              disabled={submittingReport}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">-- เลือกเหตุผล --</option>
              <option value="ไม่ได้รับสินค้า">ไม่ได้รับสินค้า</option>
              <option value="สินค้าไม่ตรงตามที่สั่ง">สินค้าไม่ตรงตามที่สั่ง</option>
              <option value="สินค้าชำรุดเสียหาย">สินค้าชำรุดเสียหาย</option>
              <option value="ถูกหลอกลวง/โกง">ถูกหลอกลวง/โกง</option>
              <option value="ผู้ขายไม่ติดต่อกลับ">ผู้ขายไม่ติดต่อกลับ</option>
              <option value="ข้อมูลการจัดส่งผิดพลาด">ข้อมูลการจัดส่งผิดพลาด</option>
              <option value="อื่น ๆ">อื่น ๆ</option>
            </select>
          </div>

          {/* Report Details */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              รายละเอียดเพิ่มเติม <span className="text-gray-500 font-normal">(ไม่บังคับ)</span>
            </label>
            <textarea
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              disabled={submittingReport}
              placeholder="อธิบายปัญหาที่พบเพิ่มเติม..."
              rows={5}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20 transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-semibold mb-2">ข้อควรทราบ:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>รายงานจะถูกส่งไปยังผู้ดูแลระบบเพื่อพิจารณา</li>
                  <li>กรุณาให้ข้อมูลที่ถูกต้องและครบถ้วน</li>
                  <li>การรายงานเท็จอาจส่งผลต่อบัญชีของคุณ</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-4 sm:px-6 py-4 sm:py-5 border-t flex gap-3">
          <button
            onClick={handleClose}
            disabled={submittingReport}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            disabled={!reportReason || submittingReport}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
          >
            {submittingReport ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>กำลังส่ง...</span>
              </>
            ) : (
              <>
                <Flag className="w-5 h-5 text-white" />
                <span className="text-white">ส่งรายงาน</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
