import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import cloudinary from 'cloudinary';

// Configure Cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET; // optional for unsigned preset

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Cloudinary env not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const username = searchParams.get('username');
    const type = searchParams.get('type'); // 'avatar' or 'product' or 'logo'
    const customFolder = searchParams.get('folder'); // Allow custom folder parameter
    
    // Create folder structure: prioritize custom folder, then user/username/type
    let folder = customFolder || 'uploads'; // default fallback
    if (!customFolder) {
      if (username && type) {
        folder = `user/${username}/${type}`;
      } else if (username) {
        folder = `user/${username}`;
      }
    }

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
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate signature', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST: รับไฟล์ QR, อัปโหลดไป Cloudinary, คืน URL
export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const formData = await req.formData();
  const file = formData.get('qr') as File | null;
  const username = (formData.get('username') as string) || undefined;
  const type = (formData.get('type') as string) || undefined;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Convert file to buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Upload to Cloudinary
  let folder = 'uploads/qr';
  if (username && type) folder = `user/${username}/${type}`;
  else if (username) folder = `user/${username}`;

  try {
    const result: any = await new Promise((resolve, reject) => {
      cloudinary.v2.uploader.upload_stream({ folder }, (error, res) => {
        if (error) return reject(error);
        return resolve(res);
      }).end(buffer);
    });

    if (!result || !result.secure_url) {
      return NextResponse.json({ error: 'Cloudinary upload failed' }, { status: 500 });
    }

    return NextResponse.json({ qrUrl: result.secure_url });
  } catch (e) {
    console.error('Cloudinary upload error:', e);
    return NextResponse.json({ error: 'Cloudinary upload failed' }, { status: 500 });
  }
}

