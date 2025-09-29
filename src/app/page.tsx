'use client';

import { useState, useEffect } from 'react';
import TopBar from "@/components/TopBar";
import { useRouter } from "next/navigation";

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image_url?: string;
  category?: string;
  storeId: string;
}

export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/featured?limit=8`);
      if (response.ok) {
        const products = await response.json();
        setFeaturedProducts(products);
      }
    } catch (error) {
      console.error('Failed to fetch featured products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <TopBar />

      {/* Header with logo + search */}
      <div className="mx-auto max-w-[1200px] px-4 py-4">
        <div className="text-3xl font-semibold">Logo</div>
        <div className="mt-3 flex items-center gap-2">
          <input className="w-full rounded border border-gray-300 px-3 py-2" placeholder="Search" />
          <button className="rounded bg-black px-4 py-2 text-white">Search</button>
        </div>
      </div>

      {/* Hero and side banners */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-1 md:grid-cols-4 gap-4 px-4">
        <div className="col-span-1 h-[140px] rounded bg-gray-200 md:block hidden" />
        <div className="col-span-1 md:col-span-2 h-[140px] rounded bg-gray-200" />
        <div className="col-span-1 h-[140px] rounded bg-gray-200 md:block hidden" />
        <div className="col-span-1 md:col-span-3 h-[60px] rounded bg-gray-200" />
        <div className="col-span-1 h-[60px] rounded bg-gray-200 md:block hidden" />
      </div>

      {/* ====== Featured products ====== */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold">สินค้าแนะนำ</h2>
        <div className="rounded border border-gray-200 p-4">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[120px] rounded bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="h-[120px] rounded bg-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(`/product/${product.id}`)}
                >
                  <div className="relative h-full">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600">
                        <span className="text-xs">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                      <div className="text-xs font-medium truncate">{product.name}</div>
                      <div className="text-xs">฿{product.price.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>ไม่มีสินค้าแนะนำในขณะนี้</p>
            </div>
          )}
        </div>
      </div>

      {/* ====== Categories carousel ====== */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold">หมวดหมู่</h2>
        <div className="relative rounded border border-gray-200 p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-[120px] rounded bg-gray-100" />
            ))}
          </div>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black px-3 py-2 text-white hidden md:block">›</button>
        </div>
      </div>
    </div>
  );
}
