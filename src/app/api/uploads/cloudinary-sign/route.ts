import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET; // optional for unsigned preset

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary env not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const folder = searchParams.get('folder') || 'uploads';

  const timestamp = Math.floor(Date.now() / 1000);

  // Build params to sign (must be sorted and exclude file, api_key, resource_type, cloud_name)
  const params: Record<string, string | number> = {
    timestamp,
    folder,
  };

  // If you use an upload preset that is signed, include it in the signature
  if (uploadPreset) {
    params.upload_preset = uploadPreset;
  }

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');

  const signature = crypto
    .createHash('sha1')
    .update(`${toSign}${apiSecret}`)
    .digest('hex');

  return NextResponse.json({
    timestamp,
    signature,
    apiKey,
    cloudName,
    uploadPreset: uploadPreset || undefined,
    folder,
  });
}


