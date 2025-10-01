'use client';

import { useState, useEffect } from 'react';
import TopBar from "@/components/TopBar";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categories as baseCategories, useCategoriesWithCounts } from '@/constants/categories';
import NotificationBell from '@/components/NotificationBell';
import CartIcon from '@/components/CartIcon';

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
  color: string;
}

interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
}

interface CategoryWithCount {
  category: string;
  count: number;
}

const banners: Banner[] = [
  {
    id: 1,
    title: "สินค้าอิเล็กทรอนิกส์",
    subtitle: "ที่หลากหลาย",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=400&fit=crop",
    color: "from-blue-600 to-purple-600"
  },
  {
    id: 2,
    title: "ของใหม่มาแล้ว",
    subtitle: "แฟชั่นสไตล์คุณ",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=400&fit=crop",
    color: "from-pink-500 to-rose-500"
  },
  {
    id: 3,
    title: "จัดส่งฟรี",
    subtitle: "ทุกคำสั่งซื้อ",
    image: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&h=400&fit=crop",
    color: "from-green-500 to-emerald-500"
  }
];


export default function Home() {
  const router = useRouter();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [categoryScroll, setCategoryScroll] = useState(0);
  
  // Use custom hook for categories with counts
  const { categories: categoriesWithCounts, isLoading: categoriesLoading, error: categoriesError } = useCategoriesWithCounts();

  useEffect(() => {
    fetchFeaturedProducts();
    
    // Auto-rotate banner
    const interval = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 5000);
    
    return () => clearInterval(interval);
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

  const fetchSearchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
      if (response.ok) {
        const suggestions = await response.json();
        setSearchSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      }
    } catch (error) {
      console.error('Failed to fetch search suggestions:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(false);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/search?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (response.ok) {
        const products = await response.json();
        setSearchResults(products);
        setShowSearchResults(true);
      }
    } catch (error) {
      console.error('Failed to search products:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim() === '') {
      setShowSearchResults(false);
      setShowSuggestions(false);
    } else {
      const timeoutId = setTimeout(() => {
        fetchSearchSuggestions(value);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  const nextBanner = () => {
    setCurrentBanner((prev) => (prev + 1) % banners.length);
  };

  const prevBanner = () => {
    setCurrentBanner((prev) => (prev - 1 + banners.length) % banners.length);
  };

  const scrollCategories = (direction: 'left' | 'right') => {
    const container = document.getElementById('category-scroll');
    if (container) {
      const scrollAmount = 300;
      if (direction === 'left') {
        container.scrollLeft -= scrollAmount;
      } else {
        container.scrollLeft += scrollAmount;
      }
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    const category = baseCategories.find(c => c.id === categoryId);
    if (category) {
      setSearchQuery(category.name);
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <TopBar />

      {/* Header with logo + search */}
      <div className="bg-white shadow-sm">
        <div className="mx-auto max-w-[1200px] px-4 py-4">
          <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">ShopLogo</div>
          <div className="mt-3 flex items-center gap-2 relative">
            <div className="w-full relative">
              <input 
                className="w-full rounded-lg border-2 border-gray-300 px-4 py-2.5 focus:border-blue-500 focus:outline-none transition" 
                placeholder="ค้นหาสินค้า..." 
                value={searchQuery}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={() => {
                  if (searchSuggestions.length > 0) {
                    setShowSuggestions(true);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
              />
              
              {showSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                  {searchSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{suggestion.text}</span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            suggestion.type === 'product' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {suggestion.type === 'product' ? 'สินค้า' : 'หมวดหมู่'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <button 
              className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-2.5 text-white font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 whitespace-nowrap transition" 
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>
          </div>
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                ผลการค้นหา:"{searchQuery}" 
                <span className="text-gray-500 font-normal ml-2">({searchResults.length} รายการ)</span>
              </h2>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {searchResults.map((product) => (
                  <div 
                    key={product.id} 
                    className="rounded-xl bg-white border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                    onClick={() => router.push(`/products/${product.id}`)}
                  >
                    <div className="relative h-[180px]">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                          <span className="text-sm">ไม่มีรูปภาพ</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-sm font-medium truncate mb-1">{product.name}</div>
                      <div className="text-lg font-bold text-blue-600">฿{product.price.toLocaleString()}</div>
                      {product.category && (
                        <div className="text-xs text-gray-500 mt-1">{product.category}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">ไม่พบสินค้าที่ตรงกับการค้นหา</p>
                <p className="text-sm mt-2">ลองใช้คำค้นหาอื่น หรือตรวจสอบการสะกด</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Banner Carousel */}
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="relative rounded-2xl overflow-hidden shadow-xl h-[300px] md:h-[400px]">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentBanner ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative h-full">
                <img
                  src={banner.image}
                  alt={banner.title}
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${banner.color} opacity-80`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                  <h2 className="text-4xl md:text-6xl font-bold mb-4">{banner.title}</h2>
                  <p className="text-xl md:text-2xl mb-6">{banner.subtitle}</p>
                  <button className="bg-white text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition">
                    ช้อปเลย
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {/* Banner Controls */}
          <button
            onClick={prevBanner}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-100 rounded-full p-2 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={nextBanner}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white bg-opacity-50 hover:bg-opacity-100 rounded-full p-2 transition"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          
          {/* Banner Indicators */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentBanner(index)}
                className={`w-2 h-2 rounded-full transition ${
                  index === currentBanner ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Categories Section */}
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">หมวดหมู่สินค้า</h2>
          <div className="flex gap-2">
            <button
              onClick={() => scrollCategories('left')}
              className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scrollCategories('right')}
              className="p-2 rounded-full bg-white border border-gray-300 hover:bg-gray-50 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div
          id="category-scroll"
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {categoriesLoading ? (
            // Loading skeleton for categories
            [...Array(5)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[140px]">
                <div className="bg-gray-200 rounded-2xl p-6 h-[140px] flex flex-col items-center justify-center animate-pulse">
                  <div className="w-10 h-10 bg-gray-300 rounded mb-2"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))
          ) : categoriesError ? (
            // Error state - show base categories
            baseCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex-shrink-0 w-[140px] cursor-pointer group"
                >
                  <div className={`bg-gradient-to-br ${category.color} rounded-2xl p-6 h-[140px] flex flex-col items-center justify-center text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}>
                    <Icon className="w-10 h-10 mb-2" />
                    <span className="text-sm font-semibold text-center">{category.name}</span>
                  </div>
                </div>
              );
            })
          ) : (
            // Normal state with real counts
            categoriesWithCounts.map((category) => {
              const Icon = category.icon;
              return (
                <div
                  key={category.id}
                  onClick={() => handleCategoryClick(category.id)}
                  className="flex-shrink-0 w-[140px] cursor-pointer group"
                >
                  <div className={`bg-gradient-to-br ${category.color} rounded-2xl p-6 h-[140px] flex flex-col items-center justify-center text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all`}>
                    <Icon className="w-10 h-10 mb-2" />
                    <span className="text-sm font-semibold text-center">{category.name}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Featured products */}
      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <h2 className="mb-4 text-xl font-bold">สินค้าแนะนำ</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[240px] rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {featuredProducts.map((product) => (
                <div
                  key={product.id}
                  className="rounded-xl bg-white border border-gray-200 overflow-hidden cursor-pointer hover:shadow-lg transition-all group"
                  onClick={() => router.push(`/products/${product.id}`)}
                >
                  <div className="relative h-[180px]">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                        <span className="text-sm">ไม่มีรูปภาพ</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-sm font-medium truncate mb-1">{product.name}</div>
                    <div className="text-lg font-bold text-blue-600">฿{product.price.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>ไม่มีสินค้าแนะนำในขณะนี้</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}