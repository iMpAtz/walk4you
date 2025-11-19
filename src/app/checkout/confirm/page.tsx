'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useCart } from '@/contexts/CartContext';
import { config } from '@/lib/config';
import TopBar from '@/components/TopBar';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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
  shippingCost?: number;
}

function StoreQrImage({ storeId }: { storeId: string }) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchQr = async () => {
      try {
        const res = await fetch(`${config.apiBaseUrl}/stores/${storeId}/qr`);
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setQrUrl(data.qrUrl || null);
          }
        }
      } catch (error) {
        console.error('Failed to fetch QR:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchQr();
    return () => {
      mounted = false;
    };
  }, [storeId]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">กำลังโหลด QR...</div>;
  }

  if (!qrUrl) {
    return <div className="text-sm text-red-500 text-center">ไม่มี QR ที่บันทึกไว้สำหรับร้านนี้</div>;
  }

  return (
    <div className="flex justify-center">
      <Image src={qrUrl} alt="QR" width={320} height={320} className="object-contain" />
    </div>
  );
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
  const { clearCart } = useCart();
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const [selection, setSelection] = useState<any>(null);
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [useCustomAddress, setUseCustomAddress] = useState(false);

  // Fetch user profile to get saved address
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(`${config.apiBaseUrl}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
          // Set default address from profile if available
          if (profile.address && !useCustomAddress) {
            setAddress(profile.address);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, [useCustomAddress]);

  useEffect(() => {
    const stored = sessionStorage.getItem('checkoutData');
    const sel = sessionStorage.getItem('checkoutSelection');
    const phone = sessionStorage.getItem('checkoutPhoneNumber') || '';
    if (!stored) {
      router.push('/cart');
      return;
    }
    setCheckoutData(JSON.parse(stored));
    setSelection(sel ? JSON.parse(sel) : null);
    setPhoneNumber(phone);
  }, [router]);

  const [showUpload, setShowUpload] = useState(false);
  const [currentStoreIndex, setCurrentStoreIndex] = useState(0);
  const [storeProofs, setStoreProofs] = useState<Record<string, File | null>>({});
  const [storeProofPreviews, setStoreProofPreviews] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);

  // Calculate shipping cost for a store
  const calculateStoreShipping = (store: CheckoutStore) => {
    if (selection?.selectedShipping?.[store.storeId] === 'post') {
      // Sum up shipping costs of items in this store
      return store.items.reduce((total, item) => total + (item.shippingCost || 0), 0);
    }
    return 0; // No shipping cost for meetup
  };

  // Calculate store total with shipping
  const getStoreTotal = (store: CheckoutStore) => {
    return store.totalAmount + calculateStoreShipping(store);
  };

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

  const handleStoreProofChange = (storeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setStoreProofs(prev => ({ ...prev, [storeId]: file }));
      // Create preview
      const preview = URL.createObjectURL(file);
      setStoreProofPreviews(prev => ({ ...prev, [storeId]: preview }));
    }
  };

  const handleUploadAndSubmit = async () => {
    const anyQr = checkoutData!.stores.some(s => selection?.selectedPayment?.[s.storeId] === 'qr');
    
    if (anyQr) {
      // Check if all QR stores have proofs
      const missingProofs = checkoutData!.stores.filter(
        s => selection?.selectedPayment?.[s.storeId] === 'qr' && !storeProofs[s.storeId]
      );
      
      if (missingProofs.length > 0) {
        alert(`กรุณาอัปโหลดหลักฐานการชำระเงินสำหรับ: ${missingProofs.map(s => s.storeName).join(', ')}`);
        return;
      }
    }

    setUploading(true);
    try {
      const token = localStorage.getItem('access_token');
      
      // Upload proofs for each store and collect URLs
      const storeProofUrls: Record<string, string> = {};
      
      for (const store of checkoutData!.stores) {
        if (selection?.selectedPayment?.[store.storeId] === 'qr' && storeProofs[store.storeId]) {
          const file = storeProofs[store.storeId];
          const fd = new FormData();
          fd.append('file', file!);
          
          const uploadRes = await fetch(`${config.apiBaseUrl}/orders/upload-slip`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: fd
          });
          
          if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            throw new Error(`Failed to upload for ${store.storeName}: ${errorText}`);
          }
          
          const uploadData = await uploadRes.json();
          storeProofUrls[store.storeId] = uploadData.url;
        }
      }
      
      await submitOrder(storeProofUrls);
    } catch (error) {
      console.error('Error uploading payment slip:', error);
      alert(`อัปโหลดหลักฐานไม่สำเร็จ: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    setUploading(false);
  };

  const submitOrder = async (storeProofUrls: Record<string, string> | null = null) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาล็อกอินก่อนสั่งซื้อ');
        router.push('/login');
        return;
      }

      // Send orders per store separately
      const failedStores: string[] = [];
      
      for (const store of checkoutData!.stores) {
        try {
          // Prepare items for this specific store
          const storeItems = store.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.productPrice,
          }));

          const body = {
            items: storeItems,
            storeId: store.storeId,
            shippingAddress: address,
            phoneNumber,
            paymentProofUrl: storeProofUrls?.[store.storeId] || null,
            paymentMethod: selection?.selectedPayment?.[store.storeId] || 'cod',
            selection: selection,
            notes: ''
          };

          const res = await fetch(`${config.apiBaseUrl}/orders`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
          });

          if (!res.ok) {
            const err = await res.text();
            failedStores.push(`${store.storeName}: ${err}`);
          }
        } catch (error) {
          failedStores.push(`${store.storeName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (failedStores.length > 0) {
        alert('การสั่งซื้อล้มเหลว:\n' + failedStores.join('\n'));
        return;
      }

      // Clear cart after successful order
      try {
        await clearCart();
      } catch (error) {
        console.error('Failed to clear cart after order:', error);
        // Don't block the flow if cart clearing fails
      }

      alert('สั่งซื้อเรียบร้อย');
      sessionStorage.removeItem('checkoutData');
      sessionStorage.removeItem('checkoutSelection');
      setShowUpload(false);
      router.push('/');
    } catch {
      console.error('Error submitting order');
      alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
    }
  };

  if (!checkoutData) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">ยืนยันการสั่งซื้อ</h1>

        <div className="space-y-6">
          {checkoutData.stores.map((store) => (
            <div key={store.storeId} className="bg-white rounded shadow overflow-hidden">
              {/* Store Header */}
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-lg">{store.storeName}</h2>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">สินค้า: ฿{store.totalAmount.toLocaleString()}</div>
                    {(() => {
                      const shipping = calculateStoreShipping(store);
                      return shipping > 0 ? (
                        <>
                          <div className="text-sm text-gray-600">จัดส่ง: ฿{shipping.toLocaleString()}</div>
                          <div className="text-sm font-semibold text-blue-600">รวม: ฿{getStoreTotal(store).toLocaleString()}</div>
                        </>
                      ) : (
                        <div className="text-sm font-semibold">฿{store.totalAmount.toLocaleString()}</div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Store Items */}
              <div className="p-4 border-b">
                <div className="space-y-2">
                  {store.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span className="text-gray-700">
                        {item.productName} × {item.quantity}
                      </span>
                      <span className="font-medium">฿{item.totalPrice.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping & Payment Info */}
              <div className="p-4 bg-gray-50 space-y-2 border-b">
                {(() => {
                  const shipping = calculateStoreShipping(store);
                  return shipping > 0 ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ค่าจัดส่ง ({selection?.selectedShipping?.[store.storeId] === 'post' ? 'ไปรษณีย์' : 'นัดรับ'})</span>
                      <span className="font-semibold">฿{shipping.toLocaleString()}</span>
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-between font-semibold text-base pt-2 border-t">
                  <span>ยอดรวมร้านนี้</span>
                  <span className="text-blue-600">฿{getStoreTotal(store).toLocaleString()}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="p-4">
                {selection?.selectedPayment?.[store.storeId] === 'qr' ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900 space-y-1">
                    <p className="font-medium">วิธีชำระเงิน: QR PromptPay</p>
                    <p>QR ของร้านนี้จะแสดงหลังจากกดปุ่ม <strong>“ยืนยันและชำระเงิน”</strong></p>
                    <p className="text-xs text-yellow-800">
                      โปรดเตรียมพร้อมชำระเงินและอัปโหลดสลิปในขั้นตอนถัดไป
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-sm text-blue-900 font-medium">✓ วิธีชำระเงิน: เก็บเงินปลายทาง</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="bg-white p-4 rounded shadow">
            <h3 className="font-semibold mb-2">ที่อยู่สำหรับจัดส่ง</h3>
            
            {/* Address selection options */}
            {userProfile?.address && (
              <div className="mb-4 space-y-2">
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="addressOption"
                    checked={!useCustomAddress}
                    onChange={() => {
                      setUseCustomAddress(false);
                      setAddress(userProfile.address);
                    }}
                    className="w-4 h-4"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm">ใช้ที่อยู่ที่บันทึกไว้</div>
                    <div className="text-sm text-gray-600 mt-1">{userProfile.address}</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50 transition">
                  <input
                    type="radio"
                    name="addressOption"
                    checked={useCustomAddress}
                    onChange={() => {
                      setUseCustomAddress(true);
                      setAddress('');
                    }}
                    className="w-4 h-4"
                  />
                  <div className="font-medium text-sm">กรอกที่อยู่ใหม่</div>
                </label>
              </div>
            )}
            
            {/* Address textarea - shown when custom address is selected or no saved address */}
            {(useCustomAddress || !userProfile?.address) && (
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={4}
                className="w-full p-2 border rounded"
                placeholder="กรอกที่อยู่จัดส่งของผู้รับ"
              />
            )}
            
          <div className="mt-3">
            <label className="block text-sm font-medium mb-1">เบอร์โทรผู้รับ</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '');
                setPhoneNumber(value);
              }}
              className="w-full p-2 border rounded"
              placeholder="กรอกเบอร์โทร"
              maxLength={10}
            />
          </div>
          </div>

          {/* Order Summary with Shipping */}
          <div className="bg-white p-6 rounded shadow">
            <h3 className="text-xl font-bold mb-4">สรุปการสั่งซื้อ</h3>
            
            <div className="space-y-3 mb-4">
              {checkoutData.stores.map((store) => {
                const shipping = calculateStoreShipping(store);
                const total = getStoreTotal(store);
                return (
                  <div key={store.storeId} className="border-b pb-3 last:border-b-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{store.storeName}</span>
                      <span className="text-gray-900">฿{total.toLocaleString()}</span>
                    </div>
                    {shipping > 0 && (
                      <div className="flex justify-between text-sm ml-4 text-gray-600">
                        <span>ค่าจัดส่ง</span>
                        <span>฿{shipping.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="border-t pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">ราคารวมสินค้า</span>
                <span className="font-semibold">฿{checkoutData.totalAmount.toLocaleString()}</span>
              </div>
              {(() => {
                const totalShipping = checkoutData.stores.reduce((sum, store) => sum + calculateStoreShipping(store), 0);
                return totalShipping > 0 ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700">ค่าจัดส่งรวม</span>
                    <span className="font-semibold">฿{totalShipping.toLocaleString()}</span>
                  </div>
                ) : null;
              })()}
              <div className="flex justify-between text-lg font-bold bg-blue-50 p-3 rounded mt-3">
                <span>ยอดรวมทั้งหมด</span>
                <span className="text-blue-600">
                  ฿{(() => {
                    const total = checkoutData.totalAmount + checkoutData.stores.reduce((sum, store) => sum + calculateStoreShipping(store), 0);
                    return total.toLocaleString();
                  })()}
                </span>
              </div>
            </div>
          </div>
        
          <div className="flex gap-3 justify-end">
            <button onClick={() => router.back()} className="px-4 py-2 border rounded">ย้อนกลับ</button>
            <button onClick={handleConfirm} className="px-4 py-2 bg-[#0B44A3] text-white rounded hover:bg-[#093782]">ยืนยันและชำระเงิน</button>
          </div>

          {/* Upload modal - Step by Step */}
          {showUpload && checkoutData && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded shadow max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header with Stepper */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">ชำระเงินและอัปโหลดหลักฐาน</h3>
                    <button
                      onClick={() => {
                        setShowUpload(false);
                        setCurrentStoreIndex(0);
                        setStoreProofs({});
                        setStoreProofPreviews({});
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      ✕
                    </button>
                  </div>
                  
                  {/* Stepper */}
                  <div className="flex items-center justify-between">
                    {checkoutData.stores.map((store, idx) => (
                      (selection?.selectedPayment?.[store.storeId] === 'qr' || selection?.selectedPayment?.[store.storeId] === 'cod') && (
                        <div key={store.storeId} className="flex flex-col items-center flex-1">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm mb-1 ${
                            idx < currentStoreIndex 
                              ? 'bg-green-500 text-white' 
                              : idx === currentStoreIndex 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-300 text-gray-600'
                          }`}>
                            {idx < currentStoreIndex ? '✓' : idx + 1}
                          </div>
                          <span className="text-xs text-center line-clamp-2">{store.storeName}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>

                {/* Current Store Content */}
                {(() => {
                  const storesWithPayment = checkoutData.stores.filter(
                    s => selection?.selectedPayment?.[s.storeId] === 'qr' || selection?.selectedPayment?.[s.storeId] === 'cod'
                  );
                  const currentStore = storesWithPayment[currentStoreIndex];
                  
                  if (!currentStore) return null;

                  const isQR = selection?.selectedPayment?.[currentStore.storeId] === 'qr';

                  return (
                    <div className="py-6 border-t border-b">
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold mb-2">{currentStore.storeName}</h4>
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">ราคาสินค้า: <span className="font-semibold">฿{currentStore.totalAmount.toLocaleString()}</span></p>
                          {(() => {
                            const shipping = calculateStoreShipping(currentStore);
                            return shipping > 0 ? (
                              <>
                                <p className="text-sm text-gray-600">ค่าจัดส่ง: <span className="font-semibold">฿{shipping.toLocaleString()}</span></p>
                                <p className="text-sm font-semibold text-blue-600 border-t pt-1 mt-1">รวมทั้งหมด: ฿{getStoreTotal(currentStore).toLocaleString()}</p>
                              </>
                            ) : null;
                          })()}
                        </div>
                        <p className="text-sm text-gray-500 mt-2">วิธีชำระเงิน: {isQR ? 'QR PromptPay' : 'เก็บเงินปลายทาง'}</p>
                      </div>

                      {isQR ? (
                        <>
                          {/* QR Code Section */}
                          <div className="mb-6">
                            <label className="block text-sm font-medium mb-3">1. สแกน QR เพื่อชำระเงิน</label>
                            <div className="flex justify-center bg-white p-4 rounded border border-gray-200">
                              <StoreQrImage storeId={currentStore.storeId} />
                            </div>
                          </div>

                          {/* Upload Proof Section */}
                          <div>
                            <label className="block text-sm font-medium mb-3">2. อัปโหลดรูปสลิป</label>
                            
                            {/* Preview */}
                            {storeProofPreviews[currentStore.storeId] && (
                              <div className="mb-4 bg-white p-3 rounded border">
                                <Image 
                                  src={storeProofPreviews[currentStore.storeId]} 
                                  alt="Preview" 
                                  width={300}
                                  height={200}
                                  className="w-full h-40 object-cover rounded"
                                />
                                <p className="text-xs text-green-600 mt-2 font-medium">✓ {storeProofs[currentStore.storeId]?.name}</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setStoreProofs(prev => ({ ...prev, [currentStore.storeId]: null }));
                                    setStoreProofPreviews(prev => ({ ...prev, [currentStore.storeId]: '' }));
                                  }}
                                  className="text-xs text-red-500 hover:text-red-700 mt-2"
                                >
                                  เปลี่ยนรูป
                                </button>
                              </div>
                            )}

                            {/* File Input */}
                            {!storeProofPreviews[currentStore.storeId] && (
                              <div className="border-2 border-dashed border-gray-300 rounded p-4 text-center">
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleStoreProofChange(currentStore.storeId, e)}
                                  title={`เลือกหลักฐานชำระเงินสำหรับ ${currentStore.storeName}`}
                                  className="w-full"
                                />
                                <p className="text-xs text-gray-500 mt-2">เลือกรูปสลิปหรือหลักฐานการโอนเงิน</p>
                              </div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded p-4">
                          <p className="text-sm text-blue-800">
                            ✓ ร้านนี้เป็น <strong>เก็บเงินปลายทาง</strong> ไม่ต้องอัปโหลดหลักฐาน
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Navigation Buttons */}
                <div className="mt-6 flex justify-between items-center">
                  <button
                    onClick={() => setCurrentStoreIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentStoreIndex === 0}
                    className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← ย้อนกลับ
                  </button>

                  <div className="text-sm text-gray-600">
                    {(() => {
                      const storesWithPayment = checkoutData.stores.filter(
                        s => selection?.selectedPayment?.[s.storeId] === 'qr' || selection?.selectedPayment?.[s.storeId] === 'cod'
                      );
                      return `${currentStoreIndex + 1} / ${storesWithPayment.length}`;
                    })()}
                  </div>

                  <div className="flex gap-2">
                    {(() => {
                      const storesWithPayment = checkoutData.stores.filter(
                        s => selection?.selectedPayment?.[s.storeId] === 'qr' || selection?.selectedPayment?.[s.storeId] === 'cod'
                      );
                      const isLastStore = currentStoreIndex === storesWithPayment.length - 1;
                      const currentStore = storesWithPayment[currentStoreIndex];
                      const isQR = selection?.selectedPayment?.[currentStore.storeId] === 'qr';
                      const hasProof = storeProofs[currentStore.storeId];

                      if (isLastStore) {
                        return (
                          <button
                            onClick={handleUploadAndSubmit}
                            disabled={uploading || (isQR && !hasProof)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-medium"
                          >
                            {uploading ? 'กำลังส่ง...' : 'ยืนยันและสั่งซื้อ'}
                          </button>
                        );
                      }

                      return (
                        <button
                          onClick={() => {
                            if (!isQR || hasProof) {
                              setCurrentStoreIndex(prev => prev + 1);
                            } else {
                              alert('กรุณาอัปโหลดหลักฐานการชำระเงินก่อน');
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                        >
                          ถัดไป →
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
