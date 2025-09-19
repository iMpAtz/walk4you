'use client';

import CloudinaryUploadButton from '@/components/CloudinaryUploadButton';

export default function UploadTestClient() {
  const onUploaded = async (p: { url: string; publicId: string; width?: number; height?: number; bytes?: number; format?: string; folder?: string; }) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      if (!token) return;
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          secure_url: p.url,
          public_id: p.publicId,
          folder: p.folder,
          width: p.width,
          height: p.height,
          bytes: p.bytes,
          format: p.format,
        }),
      });
    } catch (e) {
      // no-op for demo
    }
  };

  return <CloudinaryUploadButton folder="walk4you/test" onUploaded={onUploaded} requireConfirm />;
}


