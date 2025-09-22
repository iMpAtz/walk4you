'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarUpdate: (avatarData: any) => void;
}

export default function AvatarUpload({ currentAvatar, onAvatarUpdate }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      // Get Cloudinary signature
      const signatureResponse = await fetch('/api/uploads/cloudinary-sign');
      const { timestamp, signature, apiKey, cloudName, folder } = await signatureResponse.json();

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder || 'avatars');

      // Upload to Cloudinary
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.secure_url) {
        // Update avatar in database
        const token = localStorage.getItem('access_token');
        const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/avatar`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            folder: uploadResult.folder,
            width: uploadResult.width,
            height: uploadResult.height,
            bytes: uploadResult.bytes,
            format: uploadResult.format,
          }),
        });

        if (updateResponse.ok) {
          onAvatarUpdate(uploadResult);
          setPreviewUrl(null);
        } else {
          console.error('Failed to update avatar in database');
        }
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center overflow-hidden">
          {previewUrl ? (
            <Image 
              src={previewUrl} 
              alt="Preview" 
              width={80} 
              height={80} 
              className="rounded-full object-cover w-full h-full"
            />
          ) : currentAvatar ? (
            <Image 
              src={currentAvatar} 
              alt="Current Avatar" 
              width={80} 
              height={80} 
              className="rounded-full object-cover w-full h-full"
            />
          ) : (
            <span className="text-white text-2xl font-bold">U</span>
          )}
        </div>
        
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="hidden"
          id="avatar-upload"
        />
        
        <label
          htmlFor="avatar-upload"
          className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer ${
            isUploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            'Upload Avatar'
          )}
        </label>
      </div>
    </div>
  );
}
