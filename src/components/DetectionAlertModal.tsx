'use client';

import { AlertTriangle, X, RefreshCw, Check } from 'lucide-react';

interface DetectedItem {
  class: string;
  confidence: number;
}

interface DetectionAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRescan: () => void;
  detectedItem: DetectedItem | DetectedItem[] | null;
}

export default function DetectionAlertModal({
  isOpen,
  onClose,
  onConfirm,
  onRescan,
  detectedItem
}: DetectionAlertModalProps) {
  if (!isOpen || !detectedItem) return null;

  // Convert to array if single item
  const detectedItems = Array.isArray(detectedItem) ? detectedItem : [detectedItem];
  
  // Find highest confidence for color coding
  const maxConfidence = Math.max(...detectedItems.map(item => item.confidence));
  const isHighConfidence = maxConfidence > 0.6;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slideUp">
        {/* Header */}
        <div className={`px-6 py-5 border-b ${
          isHighConfidence 
            ? 'bg-gradient-to-r from-red-500 to-red-600' 
            : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">ตรวจพบสินค้าผิดกฎหมาย!</h2>
                <p className="text-sm text-white text-opacity-90">
                  ระบบตรวจพบสินค้าที่ไม่สามารถวางขายได้
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className={`rounded-xl p-4 border-2 ${
            isHighConfidence 
              ? 'bg-red-50 border-red-300' 
              : 'bg-yellow-50 border-yellow-300'
          }`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-6 h-6 flex-shrink-0 mt-0.5 ${
                isHighConfidence ? 'text-red-600' : 'text-yellow-600'
              }`} />
              <div>
                <h3 className={`font-bold text-lg mb-1 ${
                  isHighConfidence ? 'text-red-900' : 'text-yellow-900'
                }`}>
                  🚫 ตรวจพบสินค้าผิดกฎหมาย
                </h3>
                <p className={`text-sm ${
                  isHighConfidence ? 'text-red-800' : 'text-yellow-800'
                }`}>
                  ระบบตรวจพบว่ารูปภาพมีสินค้าที่ไม่สามารถวางขายได้
                </p>
              </div>
            </div>
          </div>

          {/* Detected Objects Display */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">
                สินค้าที่ตรวจพบ: ({detectedItems.length} รายการ)
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isHighConfidence 
                  ? 'bg-red-100 text-red-700' 
                  : 'bg-yellow-100 text-yellow-700'
              }`}>
                {isHighConfidence ? 'ความมั่นใจสูง' : 'ความมั่นใจปานกลาง'}
              </span>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {detectedItems.map((item, index) => (
                <div key={index} className="bg-white rounded-lg p-4 border-2 border-red-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-lg font-bold text-red-600 break-words">
                        {item.class}
                      </div>
                      <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>ค่าความมั่นใจของโมเดล:</span>
                          <span className="font-semibold">{(item.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div 
                            className={`h-full transition-all ${
                              item.confidence > 0.8 ? 'bg-red-500' : 'bg-yellow-500'
                            }`}
                            style={{ width: `${item.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Additional Warning */}
          <div className="bg-gray-50 border-l-4 border-gray-400 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-semibold mb-1">คำเตือน</p>
                <ul className="text-xs space-y-1 list-disc list-inside">
                  <li>กรุณาตรวจสอบรูปภาพและเปลี่ยนรูปใหม่หากไม่ถูกต้อง</li>
                  <li>การวางขายสินค้าผิดกฎหมายอาจทำให้บัญชีถูกระงับ</li>
                  <li>หากคุณมั่นใจว่าสินค้าถูกต้อง กรุณาติดต่อทีมงาน</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-50 px-6 py-4 border-t flex gap-3">
          <button
            onClick={onRescan}
            className="flex-1 px-4 py-3 border-2 border-blue-500 text-blue-600 rounded-xl font-semibold hover:bg-blue-50 transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-5 h-5" />
            <span>เปลี่ยนรูปใหม่</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2 min-h-[44px]"
          >
            <X className="w-5 h-5" />
            <span>ปิด</span>
          </button>
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
