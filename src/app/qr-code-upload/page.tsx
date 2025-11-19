'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import QRCodeUpload from '@/components/QRCodeUpload';

export default function QRCodeUploadPage() {
  const [uploadedData, setUploadedData] = useState<{
    url: string;
    publicId: string;
    width?: number;
    height?: number;
    bytes?: number;
    format?: string;
    folder?: string;
  } | null>(null);

  const handleUploadSuccess = (payload: any) => {
    setUploadedData(payload);
  };

  const handleUploadError = (error: string) => {
    // Handle error silently
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <TopBar />
      
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 lg:p-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">อัปโหลด QR Code</h1>
          <p className="text-gray-600 mb-8">อัปโหลดรูป QR Code สำหรับร้านค้าของคุณ</p>

          <QRCodeUpload
            onUploaded={handleUploadSuccess}
            onError={handleUploadError}
            folder="walk4you/qrcodes"
          />

          {uploadedData && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-xl">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">ข้อมูลที่อัปโหลด</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700">URL:</span>
                  <a
                    href={uploadedData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline break-all ml-2"
                  >
                    {uploadedData.url}
                  </a>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Public ID:</span>
                  <span className="text-gray-600 ml-2">{uploadedData.publicId}</span>
                </div>
                {uploadedData.width && (
                  <div>
                    <span className="font-medium text-gray-700">ขนาด:</span>
                    <span className="text-gray-600 ml-2">
                      {uploadedData.width} × {uploadedData.height} px
                    </span>
                  </div>
                )}
                {uploadedData.bytes && (
                  <div>
                    <span className="font-medium text-gray-700">ขนาดไฟล์:</span>
                    <span className="text-gray-600 ml-2">
                      {(uploadedData.bytes / 1024).toFixed(2)} KB
                    </span>
                  </div>
                )}
                {uploadedData.format && (
                  <div>
                    <span className="font-medium text-gray-700">รูปแบบ:</span>
                    <span className="text-gray-600 ml-2">{uploadedData.format}</span>
                  </div>
                )}
                {uploadedData.folder && (
                  <div>
                    <span className="font-medium text-gray-700">โฟลเดอร์:</span>
                    <span className="text-gray-600 ml-2">{uploadedData.folder}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
