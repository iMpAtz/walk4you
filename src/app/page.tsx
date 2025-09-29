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

interface SearchSuggestion {
  text: string;
  type: 'product' | 'category';
  count: number;
}

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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/search?q=${encodeURIComponent(searchQuery)}&limit=20&fuzzy=true`);
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
      // Debounce suggestions fetch
      const timeoutId = setTimeout(() => {
        fetchSearchSuggestions(value);
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    // Trigger search immediately
    setTimeout(() => {
      handleSearch();
    }, 100);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <TopBar />

      {/* Header with logo + search */}
      <div className="mx-auto max-w-[1200px] px-4 py-4">
        <div className="text-3xl font-semibold">Logo</div>
        <div className="mt-3 flex items-center gap-2 relative">
          <div className="w-full relative">
            <input 
              className="w-full rounded border border-gray-300 px-3 py-2" 
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
                // Delay hiding suggestions to allow clicking
                setTimeout(() => setShowSuggestions(false), 200);
              }}
            />
            
            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
                {searchSuggestions.map((suggestion, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
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
                      <span className="text-xs text-gray-500">
                        {suggestion.count} รายการ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <button 
            className="rounded bg-black px-4 py-2 text-white disabled:bg-gray-400 whitespace-nowrap" 
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>
      </div>

      {/* Search Results */}
      {showSearchResults && (
        <div className="mx-auto max-w-[1200px] px-4 py-4">
          <div className="rounded border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">
                ผลการค้นหา: "{searchQuery}" ({searchResults.length} รายการ)
              </h2>
              <div className="text-xs text-gray-500 bg-blue-50 px-2 py-1 rounded">
                ค้นหาแบบใกล้เคียง
              </div>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {searchResults.map((product) => (
                  <div key={product.id} className="h-[120px] rounded bg-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
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
                        {product.category && (
                          <div className="text-xs opacity-75">{product.category}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>ไม่พบสินค้าที่ตรงกับการค้นหา</p>
                <p className="text-sm mt-2">ลองใช้คำค้นหาอื่น หรือตรวจสอบการสะกด</p>
              </div>
            )}
          </div>
        </div>
      )}

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
