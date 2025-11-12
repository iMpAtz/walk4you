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
  id: string;
  title: string;
  subtitle: string;
  image_url: string;
  order: number;
  is_active: boolean;
}

export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const bannerIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const { categories: categoriesWithCounts, error: categoriesError } = useCategoriesWithCounts();

  // --- Fetch Featured Products and Banners ---
  useEffect(() => { 
    fetchFeaturedProducts();
    fetchBanners();
  }, []);

  // Reset current banner when banners array changes
  useEffect(() => {
    if (banners.length > 0 && currentBanner >= banners.length) {
      setCurrentBanner(0);
    }
  }, [banners.length, currentBanner]);

  const fetchBanners = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/banners`);
      if (response.ok) {
        const data: Banner[] = await response.json();
        console.log('Fetched banners:', data);
        
        // Create array with maximum 3 slots
        const bannerSlots: Banner[] = [];
        
        // Fill with actual banners (max 3)
        for (let i = 0; i < 3; i++) {
          if (data[i]) {
            bannerSlots.push(data[i]);
          } else {
            // Add placeholder banner for empty slots
            bannerSlots.push({
              id: `placeholder-${i}`,
              title: "สนใจลงโฆษณา?",
              subtitle: "พื้นที่โฆษณาขนาดพิเศษ 1200x280px",
              image_url: "", // No image = show advertisement text
              order: i,
              is_active: true
            });
          }
        }
        
        setBanners(bannerSlots);
      }
    } catch (err) {
      console.error('Failed to fetch banners:', err);
      // Use 3 default placeholder banners on error
      setBanners([
        { 
          id: 'placeholder-0',
          title: "สนใจลงโฆษณา?", 
          subtitle: "พื้นที่โฆษณาขนาดพิเศษ 1200x280px", 
          image_url: "",
          order: 0,
          is_active: true
        },
        { 
          id: 'placeholder-1',
          title: "สนใจลงโฆษณา?", 
          subtitle: "พื้นที่โฆษณาขนาดพิเศษ 1200x280px", 
          image_url: "",
          order: 1,
          is_active: true
        },
        { 
          id: 'placeholder-2',
          title: "สนใจลงโฆษณา?", 
          subtitle: "พื้นที่โฆษณาขนาดพิเศษ 1200x280px", 
          image_url: "",
          order: 2,
          is_active: true
        }
      ]);
    }
  };

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
    // Only start carousel if we have banners
    if (banners.length > 0) {
      bannerIntervalRef.current = setInterval(() => {
        setCurrentBanner(prev => (prev + 1) % banners.length);
      }, 4500);
    }
    return () => {
      if (bannerIntervalRef.current) {
        clearInterval(bannerIntervalRef.current);
      }
    };
  }, [banners.length]); // Re-run when banners.length changes

  const prevBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner(prev => (prev === 0 ? banners.length - 1 : prev - 1));
  };
  
  const nextBanner = () => {
    if (banners.length === 0) return;
    setCurrentBanner(prev => (prev === banners.length - 1 ? 0 : prev + 1));
  };
  
  const goToBanner = (index: number) => {
    if (banners.length === 0) return;
    setCurrentBanner(index);
    if (bannerIntervalRef.current) clearInterval(bannerIntervalRef.current);
    bannerIntervalRef.current = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length);
    }, 4500);
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
        <div className="mx-auto max-w-[1200px] px-3 sm:px-4 py-3 sm:py-4">
          {/* Search Bar */}
          <Searchbar />
        </div>
      </div>

      {/* Banner - Advertisement Space */}
      <div className="mx-auto max-w-[1200px] px-3 sm:px-4 pt-4 sm:pt-6">
        {banners.length === 0 ? (
          <div className="relative rounded-xl overflow-hidden shadow-lg h-[160px] sm:h-[200px] md:h-[280px] bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-white mx-auto mb-3 sm:mb-4"></div>
              <p className="text-sm sm:text-base">กำลังโหลดแบนเนอร์...</p>
            </div>
          </div>
        ) : (
          <div className="relative rounded-xl overflow-hidden shadow-lg h-[160px] sm:h-[200px] md:h-[280px]">
            {banners.map((banner, idx) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-500 ${idx === currentBanner ? "opacity-100" : "opacity-0"}`}>
              {/* Background Image (only if image_url exists) */}
              {banner.image_url ? (
                <>
                  {/* Banner has image - show image only */}
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                  
                  {/* Optional: Subtle gradient overlay for better text visibility if needed */}
                  {(banner.title || banner.subtitle) && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                      <div className="absolute bottom-3 sm:bottom-6 left-3 sm:left-6 text-white z-30 max-w-[85%]">
                        {banner.title && <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-0.5 sm:mb-1 line-clamp-2">{banner.title}</h2>}
                        {banner.subtitle && <p className="text-xs sm:text-sm md:text-base opacity-90 line-clamp-1">{banner.subtitle}</p>}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* No image - show advertisement placeholder with gradient */}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(11,68,163,0.9), rgba(26,95,212,0.9))" }} />
                  
                  <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4 sm:px-6 z-30 pointer-events-none">
                    {/* Advertisement Badge */}
                    <div className="mb-2 sm:mb-3 px-3 sm:px-4 py-1 sm:py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-[10px] sm:text-xs font-medium border border-white/30">
                      พื้นที่โฆษณา
                    </div>
                    
                    <h2 className="text-xl sm:text-3xl md:text-4xl font-bold mb-1.5 sm:mb-2">{banner.title || "สนใจลงโฆษณา?"}</h2>
                    <p className="text-xs sm:text-base md:text-lg opacity-90 mb-3 sm:mb-4 px-2">
                      {banner.subtitle || "พื้นที่โฆษณาขนาดพิเศษ 1200x280px"}
                    </p>
                    
                    <div className="flex flex-col gap-1.5 sm:gap-2 items-center pointer-events-auto">
                      <button 
                        onClick={() => window.location.href = "mailto:patjiranuwat@gmail.com?subject=สอบถามเกี่ยวกับพื้นที่โฆษณา&body=สวัสดีครับ/ค่ะ%0A%0Aผม/ดิฉันสนใจสอบถามเกี่ยวกับพื้นที่โฆษณาบนเว็บไซต์ Walk4You%0A%0Aขนาดโฆษณา: 1200 x 280 px%0A%0Aโปรดติดต่อกลับที่:%0A%0Aขอบคุญครับ/ค่ะ"}
                        className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white text-[#1B2A47] font-semibold rounded-lg hover:bg-[#E2E8F0] active:scale-95 transition shadow-lg flex items-center gap-1.5 sm:gap-2 cursor-pointer text-sm sm:text-base touch-manipulation"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        ติดต่อแอดมิน
                      </button>
                      
                      <div className="text-[10px] sm:text-xs opacity-75 flex items-center gap-1">
                        <span>📧</span>
                        <span>patjiranuwat@gmail.com</span>
                      </div>
                    </div>
                  </div>

                  {/* Specs Corner Badge - only for advertisement placeholder */}
                  <div className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/10 backdrop-blur-md rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-white text-[10px] sm:text-xs border border-white/20 z-30">
                    <div className="font-semibold mb-0.5 sm:mb-1">ขนาดแนะนำ</div>
                    <div className="opacity-90">1200 x 280 px</div>
                    <div className="opacity-75 mt-0.5 sm:mt-1">Ratio 4.3:1</div>
                  </div>
                </>
              )}
            </div>
          ))}

          <div className="absolute inset-0 flex items-center justify-between px-2 sm:px-4 z-20 pointer-events-none">
            <button onClick={prevBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-white active:scale-95 text-[#1B2A47] font-bold pointer-events-auto touch-manipulation text-xl sm:text-2xl">‹</button>
            <button onClick={nextBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center hover:bg-white active:scale-95 text-[#1B2A47] font-bold pointer-events-auto touch-manipulation text-xl sm:text-2xl">›</button>
          </div>

          <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 flex justify-center gap-1.5 sm:gap-2 z-20 pointer-events-none">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => goToBanner(idx)} className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all touch-manipulation ${idx === currentBanner ? "bg-white scale-110" : "bg-white/50"} pointer-events-auto`}></button>
            ))}
          </div>
          </div>
        )}
      </div>

      {/* Categories */}
      <div className="mx-auto max-w-[1200px] px-3 sm:px-4 py-4 sm:py-6">
        <h2 className="text-lg sm:text-xl font-bold text-[#1B2A47] mb-2 sm:mb-3">หมวดหมู่สินค้า</h2>
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {(categoriesError ? baseCategories : categoriesWithCounts).map((category) => {
            const Icon = category.icon;
            return (
              <button key={category.id} onClick={() => handleCategorySearch(category.name)}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border bg-white text-[#1B2A47] border-[#1B2A47] hover:bg-[#1B2A47] hover:text-white active:scale-95 transition-all text-xs sm:text-sm shadow-sm touch-manipulation"
              >
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Products */}
      <div className="mx-auto max-w-[1200px] px-3 sm:px-4 pb-8 sm:pb-10">
        <h2 className="text-lg sm:text-xl font-bold text-[#1B2A47] mb-2 sm:mb-3">สินค้าแนะนำ</h2>
        <div className="rounded-xl bg-white border p-3 sm:p-6 shadow">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
              {Array(8).fill(null).map((_, i) => (
                <div key={i} className="h-[200px] sm:h-[240px] bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : error ? (
            <div className="text-red-500 flex items-center gap-2 text-sm sm:text-base p-3"><AlertCircle size={18} className="flex-shrink-0" /> <span>{error}</span></div>
          ) : featuredProducts.length === 0 ? (
            <div className="text-gray-500 text-center py-8 text-sm sm:text-base">ไม่มีสินค้าแนะนำในขณะนี้</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
              {featuredProducts.map((p) => (
                <div key={p.id} className="bg-white border rounded-lg shadow-sm hover:shadow-lg active:scale-[0.98] cursor-pointer transition touch-manipulation" onClick={() => router.push(`/products/${p.id}`)}>
                  <div className="h-[140px] sm:h-[180px] overflow-hidden rounded-t-lg relative">
                    {p.image_url ? <Image src={p.image_url} alt={p.name} fill className="object-cover" /> : <div className="bg-gray-200 w-full h-full" />}
                  </div>
                  <div className="p-2 sm:p-3">
                    <div className="text-xs sm:text-sm font-medium truncate mb-1">{p.name}</div>
                    <div className="text-base sm:text-lg font-bold text-[#1B2A47]">฿{p.price.toLocaleString()}</div>
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
