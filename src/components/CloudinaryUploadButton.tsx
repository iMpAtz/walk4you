'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { CloudinarySignatureResponse } from '@/types';

type Props = {
  folder?: string;
  onUploaded?: (payload: { url: string; publicId: string; width?: number; height?: number; bytes?: number; format?: string; folder?: string; }) => void;
  requireConfirm?: boolean;
};

export default function CloudinaryUploadButton({ folder = 'uploads', onUploaded, requireConfirm = false }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLocalUrl, setPreviewLocalUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setDone(false);
    if (requireConfirm) {
      setSelectedFile(file);
      setPreviewLocalUrl(URL.createObjectURL(file));
    } else {
      await doUpload(file);
    }
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
      setError(err?.message || 'Upload error');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm() {
    if (!selectedFile) return;
    await doUpload(selectedFile);
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="inline-flex items-center gap-2">
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={busy} />
      </label>

      {requireConfirm && selectedFile && (
        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={busy}
            className="rounded bg-black text-white px-3 py-1 disabled:opacity-50"
          >
            ยืนยันอัปโหลด
          </button>
          {busy && <span>กำลังอัปโหลด...</span>}
          {!busy && done && <span className="text-green-600">อัปโหลดสำเร็จ</span>}
        </div>
      )}

      {error && <p className="text-red-600 text-sm">{error}</p>}

      {/* Preview before or after upload */}
      {previewLocalUrl && !previewUrl && (
        <Image src={previewLocalUrl} alt="preview-local" width={240} height={240} className="rounded" />
      )}
      {previewUrl && (
        <Image src={previewUrl} alt="preview" width={240} height={240} className="rounded" />
      )}
    </div>
  );
}


