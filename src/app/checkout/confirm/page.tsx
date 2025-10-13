'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface CheckoutItem {
  id: string;
  productId: string;
  productName: string;
  productPrice: number;
  productImage?: string;
  quantity: number;
  totalPrice: number;
  storeId: string;
  storeName: string;
}

interface CheckoutStore {
  storeId: string;
  storeName: string;
  items: CheckoutItem[];
  totalAmount: number;
}

interface CheckoutData {
  stores: CheckoutStore[];
  totalAmount: number;
  totalItems: number;
}

export default function CheckoutConfirmPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [selection, setSelection] = useState<any>(null);
  const [address, setAddress] = useState('');

  useEffect(() => {
    const stored = sessionStorage.getItem('checkoutData');
    const sel = sessionStorage.getItem('checkoutSelection');
    if (!stored) {
      router.push('/cart');
      return;
    }
    setCheckoutData(JSON.parse(stored));
    setSelection(sel ? JSON.parse(sel) : null);
  }, [router]);

  const [showUpload, setShowUpload] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleConfirm = async () => {
    if (!checkoutData) return;

    const anyQr = checkoutData.stores.some(s => selection?.selectedPayment?.[s.storeId] === 'qr');
    if (anyQr) {
      setShowUpload(true);
      return;
    }

    // No QR required -> submit directly
    await submitOrder(null);
  };

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setProofFile(f);
  };

  const handleUploadAndSubmit = async () => {
    if (!proofFile) {
      alert('กรุณาเลือกรูปหลักฐานการชำระเงิน');
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('qr', proofFile);
      const res = await fetch('/api/uploads/cloudinary-sign', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('upload failed');
      const data = await res.json();
      const proofUrl = data.qrUrl;
      await submitOrder(proofUrl);
    } catch (e) {
      alert('อัปโหลดหลักฐานไม่สำเร็จ');
    }
    setUploading(false);
  };

  const submitOrder = async (paymentProofUrl: string | null) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนสั่งซื้อ');
        router.push('/login');
        return;
      }

      const items: any[] = [];
      checkoutData!.stores.forEach(store => {
        store.items.forEach(item => {
          items.push({ productId: item.productId, quantity: item.quantity, price: item.productPrice });
        });
      });

      const body = {
        items,
        shippingAddress: address,
        phoneNumber: '',
        notes: JSON.stringify({ selection }),
        paymentProofUrl
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.text();
        alert('การสั่งซื้อล้มเหลว: ' + err);
        return;
      }

      alert('สั่งซื้อเรียบร้อย');
      sessionStorage.removeItem('checkoutData');
      sessionStorage.removeItem('checkoutSelection');
      setShowUpload(false);
      router.push('/');
    } catch (e) {
      console.error(e);
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
    }
  };

  if (!checkoutData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">ยืนยันการสั่งซื้อ</h1>

        <div className="space-y-6">
          {checkoutData.stores.map((store) => (
            <div key={store.storeId} className="bg-white p-4 rounded shadow">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold">{store.storeName}</h2>
                <span className="text-sm text-gray-600">ราคาทั้งหมด ฿{store.totalAmount.toLocaleString()}</span>
              </div>

              {/* If this store chose QR payment, show large QR */}
              {selection?.selectedPayment?.[store.storeId] === 'qr' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="text-sm text-gray-600">Scan to pay (QR PromptPay)</div>
                  {/* fetch QR from /stores/{id}/qr to ensure we have latest */}
                  <StoreQrImage storeId={store.storeId} />
                </div>
              ) : (
                <div className="text-sm text-gray-600">วิธีชำระเงิน: เก็บเงินปลายทาง</div>
              )}
            </div>
          ))}

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">ที่อยู่สำหรับจัดส่ง</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={4}
              className="w-full p-2 border rounded"
              placeholder="กรอกที่อยู่จัดส่งของผู้รับ"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button onClick={() => router.back()} className="px-4 py-2 border rounded">ย้อนกลับ</button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-green-600 text-white rounded">ยืนยันและชำระเงิน</button>
          </div>

          {/* Upload modal */}
          {showUpload && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white p-6 rounded shadow max-w-lg w-full">
                <h3 className="text-lg font-semibold mb-2">แนบหลักฐานการชำระเงิน</h3>
                <p className="text-sm text-gray-600 mb-3">อัปโหลดรูปสลิปหรือหลักฐานการโอน</p>
                <input type="file" accept="image/*" onChange={handleProofChange} />
                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowUpload(false)} className="px-3 py-1 border rounded">ยกเลิก</button>
                  <button onClick={handleUploadAndSubmit} disabled={uploading} className="px-3 py-1 bg-green-600 text-white rounded">
                    {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลดและยืนยัน'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StoreQrImage({ storeId }: { storeId: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchQr = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/stores/${storeId}/qr`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) setQrUrl(data.qrUrl || null);
        }
      } catch (e) {
        // ignore
      }
    };
    fetchQr();
    return () => { mounted = false };
  }, [storeId]);

  if (!qrUrl) return <div className="w-full text-center text-gray-500">ไม่มี QR สำหรับร้านนี้</div>;

  return (
    <div className="flex justify-center">
      <Image src={qrUrl} alt="QR" width={320} height={320} className="object-contain" />
    </div>
  );
}
