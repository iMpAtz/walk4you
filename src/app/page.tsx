'use client';

import { useState, useEffect, useRef } from 'react';
import TopBar from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { categories as baseCategories, useCategoriesWithCounts } from '@/constants/categories';
import Image from 'next/image';
import Searchbar from '@/components/Searchbar';

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

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
  isAdvertisement?: boolean;
}

const banners: Banner[] = [
  { 
    id: 1, 
    title: "พื้นที่โฆษณา", 
    subtitle: "ติดต่อแอดมินเพื่อลงโฆษณา", 
    image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200",
    isAdvertisement: true
  },
  { 
    id: 2, 
    title: "พื้นที่โฆษณา", 
    subtitle: "ติดต่อแอดมินเพื่อลงโฆษณา", 
    image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200",
    isAdvertisement: true
  },
  { 
    id: 3, 
    title: "พื้นที่โฆษณา", 
    subtitle: "ติดต่อแอดมินเพื่อลงโฆษณา", 
    image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200",
    isAdvertisement: true
  }
];

export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bannerIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { categories: categoriesWithCounts, error: categoriesError } = useCategoriesWithCounts();

  // --- Fetch Featured Products ---
  useEffect(() => { fetchFeaturedProducts(); }, []);

  const fetchFeaturedProducts = async () => {
    try {
      setError(null);
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/featured?limit=8`);
      if (!response.ok) throw new Error('Failed to fetch products');
      const products: Product[] = await response.json();
      setFeaturedProducts(products);
    } catch (err) {
      console.error(err);
      setError('ไม่สามารถโหลดสินค้าได้ กรุณาลองใหม่อีกครั้ง');
    } finally { setIsLoading(false); }
  };

  // --- Banner Carousel ---
  useEffect(() => {
    bannerIntervalRef.current = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 4500);
    return () => bannerIntervalRef.current && clearInterval(bannerIntervalRef.current);
  }, []);

  const prevBanner = () => setCurrentBanner(prev => (prev === 0 ? banners.length - 1 : prev - 1));
  const nextBanner = () => setCurrentBanner(prev => (prev === banners.length - 1 ? 0 : prev + 1));
  const goToBanner = (index: number) => {
    setCurrentBanner(index);
    if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
    bannerIntervalRef.current = setInterval(() => setCurrentBanner(prev => (prev + 1) % banners.length), 4500);
  };

  // --- Handle Category Search ---
  const handleCategorySearch = (categoryName: string) => {
    router.push(`/search?query=${encodeURIComponent(categoryName)}`);
  };


  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <TopBar />

      {/* Header + search */}
      <div className="bg-white shadow-sm border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-[1200px] px-4 py-4">
          {/* Search Bar */}
          <Searchbar />
        </div>
      </div>

      {/* Banner - Advertisement Space */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <div className="relative rounded-xl overflow-hidden shadow-lg h-[200px] md:h-[280px]">
          {banners.map((banner, idx) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-500 ${idx === currentBanner ? "opacity-100" : "opacity-0"}`}>
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover opacity-30" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(27,42,71,0.85), rgba(49,78,114,0.85))" }} />
              
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-6 z-30 pointer-events-none">
                {/* Advertisement Badge */}
                <div className="mb-3 px-4 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium border border-white/30">
                  พื้นที่โฆษณา
                </div>
                
                <h2 className="text-3xl md:text-4xl font-bold mb-2">สนใจลงโฆษณา?</h2>
                <p className="text-base md:text-lg opacity-90 mb-4">
                  พื้นที่โฆษณาขนาดพิเศษ 1200x280px
                </p>
                
                <div className="flex flex-col gap-2 items-center pointer-events-auto">
                  <button 
                    onClick={() => window.location.href = "mailto:patjiranuwat@gmail.com?subject=สอบถามเกี่ยวกับพื้นที่โฆษณา&body=สวัสดีครับ/ค่ะ%0A%0Aผม/ดิฉันสนใจสอบถามเกี่ยวกับพื้นที่โฆษณาบนเว็บไซต์ Walk4You%0A%0Aขนาดโฆษณา: 1200 x 280 px%0A%0Aโปรดติดต่อกลับที่:%0A%0Aขอบคุณครับ/ค่ะ"}
                    className="px-6 py-2.5 bg-white text-[#1B2A47] font-semibold rounded-lg hover:bg-[#E2E8F0] transition shadow-lg flex items-center gap-2 cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    ติดต่อแอดมิน
                  </button>
                  
                  <div className="text-xs opacity-75 flex items-center gap-1">
                    <span>📧</span>
                    <span>admin@walk4you.com</span>
                  </div>
                </div>
              </div>

              {/* Specs Corner Badge */}
              <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 text-white text-xs border border-white/20 z-30">
                <div className="font-semibold mb-1">ขนาดแนะนำ</div>
                <div className="opacity-90">1200 x 280 px</div>
                <div className="opacity-75 mt-1">Ratio 4.3:1</div>
              </div>
            </div>
          ))}

          <div className="absolute inset-0 flex items-center justify-between px-4 z-20 pointer-events-none">
            <button onClick={prevBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-9 h-9 flex items-center justify-center hover:bg-white text-[#1B2A47] font-bold pointer-events-auto">‹</button>
            <button onClick={nextBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-9 h-9 flex items-center justify-center hover:bg-white text-[#1B2A47] font-bold pointer-events-auto">›</button>
          </div>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20 pointer-events-none">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => goToBanner(idx)} className={`w-3 h-3 rounded-full transition-all ${idx === currentBanner ? "bg-white scale-110" : "bg-white/50"} pointer-events-auto`}></button>
            ))}
          </div>
        </div>

      </div>

      {/* Categories */}
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <h2 className="text-xl font-bold text-[#1B2A47] mb-3">หมวดหมู่สินค้า</h2>
        <div className="flex flex-wrap gap-2">
          {(categoriesError ? baseCategories : categoriesWithCounts).map((category) => {
            const Icon = category.icon;
            return (
              <button key={category.id} onClick={() => handleCategorySearch(category.name)}
                className="flex items-center gap-2 px-4 py-2 rounded-full border bg-white text-[#1B2A47] border-[#1B2A47] hover:bg-[#1B2A47] hover:text-white active:scale-95 transition-all text-sm shadow-sm"
              >
                <Icon className="w-4 h-4" />
                {category.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Products */}
      <div className="mx-auto max-w-[1200px] px-4 pb-10">
        <h2 className="text-xl font-bold text-[#1B2A47] mb-3">สินค้าแนะนำ</h2>
        <div className="rounded-xl bg-white border p-6 shadow">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="h-[240px] bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-red-500 flex items-center gap-2"><AlertCircle size={20} /> {error}</div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-gray-500">ไม่มีสินค้าแนะนำในขณะนี้</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((p) => (
                <div key={p.id} className="bg-white border rounded-lg shadow-sm hover:shadow-lg cursor-pointer transition" onClick={() => router.push(`/products/${p.id}`)}>
                  <div className="h-[180px] overflow-hidden rounded-t-lg relative">
                    {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover hover:scale-110 transition" /> : <div className="bg-gray-200 w-full h-full" />}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-lg font-bold text-[#1B2A47]">฿{p.price.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
