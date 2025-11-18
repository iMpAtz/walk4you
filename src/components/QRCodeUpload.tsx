'use client';

import { useState } from 'react';
import { Upload, X, CheckCircle } from 'lucide-react';
import type { CloudinarySignatureResponse } from '@/types';

type Props = {
  onUploaded?: (payload: { url: string; publicId: string; width?: number; height?: number; bytes?: number; format?: string; folder?: string; }) => void;
  onError?: (error: string) => void;
  folder?: string;
};

export default function QRCodeUpload({ onUploaded, onError, folder = 'walk4you/qrcodes' }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      setError('กรุณาเลือกไฟล์รูปภาพ');
      onError?.('Invalid file type');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('ไฟล์ต้องมีขนาดน้อยกว่า 5MB');
      onError?.('File size too large');
      return;
    }

    setError(null);
    setDone(false);
    setSelectedFile(file);
    setPreviewLocalUrl(URL.createObjectURL(file));
  }

  async function doUpload(file: File) {
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const signRes = await fetch(`/api/uploads/cloudinary-sign?folder=${encodeURIComponent(folder)}`);
      if (!signRes.ok) throw new Error('Failed to get signature');
      const sig: CloudinarySignatureResponse = await signRes.json();

      const form = new FormData();
      form.append('file', file);
      form.append('api_key', sig.apiKey);
      form.append('timestamp', String(sig.timestamp));
      form.append('signature', sig.signature);
      form.append('folder', sig.folder || folder);
      if (sig.uploadPreset) form.append('upload_preset', sig.uploadPreset);

      const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`;
      const upRes = await fetch(uploadUrl, { method: 'POST', body: form });
      if (!upRes.ok) throw new Error('Upload failed');
      const data = await upRes.json();

      const secureUrl: string = data.secure_url;
      const publicId: string = data.public_id;

      setPreviewUrl(secureUrl);
      setDone(true);
      onUploaded?.({
        url: secureUrl,
        publicId,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
        format: data.format,
        folder: sig.folder || folder,
      });
    } catch (err: any) {
      const errorMsg = err?.message || 'Upload error';
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!selectedFile) return;
    await doUpload(selectedFile);
  }

  function handleClear() {
    setSelectedFile(null);
    setPreviewLocalUrl(null);
    setPreviewUrl(null);
    setError(null);
    setDone(false);
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-4">
        {/* Upload Area */}
        <label className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition cursor-pointer">
          <Upload className="w-8 h-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">คลิกเพื่อเลือกรูป QR Code</p>
            <p className="text-xs text-gray-500">หรือลากไฟล์มาที่นี่</p>
            <p className="text-xs text-gray-400 mt-1">(PNG, JPG - สูงสุด 5MB)</p>
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={busy}
            className="hidden"
          />
        </label>

        {/* Preview */}
        {previewLocalUrl && selectedFile && (
          <div className="flex flex-col gap-3">
            <div className="relative w-full aspect-square max-w-xs mx-auto border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={previewLocalUrl}
                alt="QR Code Preview"
                className="w-full h-full object-contain p-4"
              />
            </div>
            <p className="text-xs text-gray-500 text-center">{selectedFile.name}</p>
          </div>
        )}

        {/* Preview Uploaded */}
        {previewUrl && done && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">อัปโหลดสำเร็จ</span>
            </div>
            <div className="relative w-full aspect-square max-w-xs mx-auto border-2 border-green-200 rounded-lg overflow-hidden bg-gray-50">
              <img
                src={previewUrl}
                alt="QR Code Uploaded"
                className="w-full h-full object-contain p-4"
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Actions */}
        {selectedFile && !done && (
          <div className="flex gap-2">
            <button
              onClick={handleConfirm}
              disabled={busy}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {busy ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>กำลังอัปโหลด...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>อัปโหลด</span>
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              disabled={busy}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition disabled:opacity-50"
            >
              ยกเลิก
            </button>
          </div>
        )}

        {done && (
          <button
            onClick={handleClear}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium px-4 py-2.5 rounded-lg transition"
          >
            อัปโหลดใหม่
          </button>
        )}
      </div>
    </div>
  );
}
