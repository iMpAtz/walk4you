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

interface SearchSuggestion {
  text: string;
  type: 'product' | 'category';
  count: number;
}

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string;
}

const banners: Banner[] = [
  { id: 1, title: "สินค้าอิเล็กทรอนิกส์", subtitle: "อัปเดตล่าสุด", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800" },
  { id: 2, title: "สินค้าแฟชั่น", subtitle: "สไตล์ที่เป็นคุณ", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800" },
  { id: 3, title: "ส่งฟรีทุกออเดอร์", subtitle: "ด่วน ภายใน 24 ชั่วโมง", image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800" }
];

export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<NodeJS.Timeout>();
  const bannerIntervalRef = useRef<NodeJS.Timeout>();

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

  // --- Fetch Search Suggestions with debounce ---
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const query = searchQuery.trim();
    if (!query) {
      setSearchSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        const suggestions: SearchSuggestion[] = await res.json();
        setSearchSuggestions(suggestions);
      } catch (err) { console.error(err); }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // --- Handle Search ---
const handleSearch = (query?: string) => {
  const searchTerm = query || searchQuery.trim();
  if (!searchTerm) return;
  router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
};


  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <TopBar />

      {/* Header + search */}
      <div className="bg-white shadow-sm border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-[1200px] px-4 py-4">

          {/* Search Bar */}
          <div className="mx-auto max-w-[1200px] px-4 py-4">
            <Searchbar
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              onSearch={handleSearch}
              suggestions={searchSuggestions}
              isSearching={isSearching}
            />
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <div className="relative rounded-xl overflow-hidden shadow-lg h-[160px] md:h-[200px]">
          {banners.map((banner, idx) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-500 ${idx === currentBanner ? "opacity-100" : "opacity-0"}`}>
              <img src={banner.image} alt={banner.title} className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(27,42,71,0.5), rgba(49,78,114,0.5))" }} />
              <div className="absolute inset-0 flex flex-col justify-center items-center text-white text-center px-4">
                <h2 className="text-2xl font-bold">{banner.title}</h2>
                <p className="mt-1 text-sm opacity-90">{banner.subtitle}</p>
                <button className="mt-2 px-4 py-1.5 bg-white text-[#1B2A47] font-medium rounded-lg hover:bg-[#E2E8F0] transition text-sm shadow">
                  ช้อปเลย
                </button>
              </div>
            </div>
          ))}

          <div className="absolute inset-0 flex items-center justify-between px-4 z-20">
            <button onClick={prevBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-9 h-9 flex items-center justify-center hover:bg-white text-[#1B2A47] font-bold">‹</button>
            <button onClick={nextBanner} className="bg-white/90 backdrop-blur-md shadow-lg rounded-full w-9 h-9 flex items-center justify-center hover:bg-white text-[#1B2A47] font-bold">›</button>
          </div>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-2 z-20">
            {banners.map((_, idx) => (
              <button key={idx} onClick={() => goToBanner(idx)} className={`w-3 h-3 rounded-full transition-all ${idx === currentBanner ? "bg-white scale-110" : "bg-white/50"}`}></button>
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
              <button key={category.id} onClick={() => handleSearch(category.name)}
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
