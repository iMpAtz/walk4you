'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Store, Package, Mail, Phone, Calendar, AlertTriangle, ShoppingCart, Heart, Star } from 'lucide-react';
import TopBar from '@/components/TopBar';
import { useCart } from '@/contexts/CartContext';
import { config } from '@/lib/config';

interface StoreData {
  id: string;
  storeName: string;
  storeDescription?: string;
  phoneNumber?: string;
  buMail?: string;
  qrUrl?: string;
  logoUrl?: string | null;
  registerDate: string;
  status: string;
}

interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  role: string;
  avatar?: { url: string };
}

export default function StorePage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params?.id as string | undefined;
  const { addToCart } = useCart();

  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    if (storeId) {
      fetchStoreData();
      fetchStoreProducts();
      fetchUserData();
    }
  }, [storeId]);

  const fetchStoreData = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${config.apiBaseUrl}/stores/${storeId}`);
      if (res.ok) {
        const data = await res.json();
        setStoreData(data);
      } else {
        console.error('Failed to fetch store data');
      }
    } catch (error) {
      console.error('Error fetching store data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreProducts = async () => {
    if (!storeId) return;
    try {
      const res = await fetch(`${config.apiBaseUrl}/stores/${storeId}/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching store products:', error);
      setProducts([]);
    }
  };

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      
      const res = await fetch(`${config.apiBaseUrl}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUserData(await res.json());
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      setAddingToCart(productId);
      await addToCart(productId, 1);
      alert('เพิ่มสินค้าเข้าตระกร้าสำเร็จ!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มสินค้าเข้าตระกร้า');
    } finally {
      setAddingToCart(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!storeData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-xl font-semibold mb-2">ไม่พบร้านค้า</p>
          <p className="text-gray-500 mb-4">ร้านค้านี้อาจถูกลบหรือไม่สามารถเข้าถึงได้</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition"
          >
            กลับหน้าหลัก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Store Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:p-8 mb-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Store Icon/Image */}
            <div className="flex-shrink-0">
              {storeData.logoUrl ? (
                <Image
                  src={storeData.logoUrl}
                  alt={`${storeData.storeName} Logo`}
                  width={128}
                  height={128}
                  className="w-24 h-24 lg:w-32 lg:h-32 rounded-xl object-cover shadow-md"
                />
              ) : (
                <div className="w-24 h-24 lg:w-32 lg:h-32 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-md">
                  <Store className="w-12 h-12 lg:w-16 lg:h-16 text-white" />
                </div>
              )}
            </div>

            {/* Store Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">{storeData.storeName}</h1>
                  {storeData.storeDescription && (
                    <p className="text-gray-600 mb-4">{storeData.storeDescription}</p>
                  )}
                </div>
                {userData && (
                  <a
                    href={`/report-store?storeId=${storeData.id}`}
                    className="ml-4 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition flex items-center gap-1 whitespace-nowrap"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    รายงานร้านค้า
                  </a>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {storeData.phoneNumber && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Phone className="w-5 h-5 text-gray-500" />
                    <span>{storeData.phoneNumber}</span>
                  </div>
                )}
                {storeData.buMail && (
                  <div className="flex items-center gap-3 text-gray-700">
                    <Mail className="w-5 h-5 text-gray-500" />
                    <span>{storeData.buMail}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-gray-700">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <span>เปิดร้าน: {new Date(storeData.registerDate.endsWith('Z') ? storeData.registerDate : storeData.registerDate + 'Z').toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok' })}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-700">
                  <Package className="w-5 h-5 text-gray-500" />
                  <span>{products.length} สินค้า</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products Section */}
        <div className="mb-6">
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900 mb-4">สินค้าในร้าน ({products.length})</h2>
          
          {products.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">ยังไม่มีสินค้าในร้านนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {products.map((product) => {
                const inStock = product.quantity > 0;
                
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-100 overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                          <Package className="w-12 h-12 mb-2" />
                          <p className="text-sm">ไม่มีรูปภาพ</p>
                        </div>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <span className="text-white font-semibold">สินค้าหมด</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle favorite
                        }}
                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                      >
                        <Heart className="w-4 h-4 text-gray-700" />
                      </button>
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      {product.category && (
                        <span className="inline-block px-2 py-1 bg-blue-50 text-[#0B44A3] text-xs rounded-full mb-2">
                          {product.category}
                        </span>
                      )}
                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-1 mb-2">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm text-gray-600">4.9</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-lg font-bold text-green-700">
                            ฿{product.price.toLocaleString()}
                          </p>
                          {inStock && (
                            <p className="text-xs text-gray-500">คงเหลือ {product.quantity} ชิ้น</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (inStock && userData) {
                            handleAddToCart(product.id);
                          } else if (!userData) {
                            router.push('/login');
                          }
                        }}
                        disabled={!inStock || addingToCart === product.id}
                        className={`w-full mt-3 px-4 py-2 rounded-lg font-medium transition ${
                          inStock
                            ? 'bg-[#0B44A3] hover:bg-[#093782] text-white'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                      >
                        {addingToCart === product.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            กำลังเพิ่ม...
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            {inStock ? 'เพิ่มลงตะกร้า' : 'สินค้าหมด'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

