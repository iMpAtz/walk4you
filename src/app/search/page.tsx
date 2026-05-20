'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import SearchBar from '@/components/Searchbar';
import TopBar from '@/components/TopBar';
import { useEffect, useState, Suspense } from 'react';
import { AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { getApiBase } from '@/lib/config';

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('query') || '';
  const [results, setResults] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`${getApiBase()}/products/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Failed');
        const data: Product[] = await res.json();
        setResults(data);
      } catch (err: unknown) {
        console.error(err);
        setError('ไม่สามารถโหลดผลลัพธ์ได้');
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [query]);

  return (
    <div className="min-h-screen bg-[#F5F7FA]">
      <TopBar />
      <div className="bg-white shadow-sm border-b border-[#E2E8F0]">
        <div className="mx-auto max-w-[1200px] px-4 py-4">
          <SearchBar initialQuery={query} />
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-6">
        <h2 className="text-xl font-bold text-[#1B2A47] mb-3">ผลลัพธ์การค้นหา &quot;{query}&quot;</h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array(8).fill(null).map((_, i) => <div key={i} className="h-[240px] bg-gray-200 rounded-lg animate-pulse"></div>)}
          </div>
        ) : error ? (
          <div className="text-red-500 flex items-center gap-2"><AlertCircle size={20} /> {error}</div>
        ) : results.length === 0 ? (
          <div className="text-gray-500">ไม่พบสินค้าที่ตรงกับการค้นหา</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {results.map(p => (
              <div 
                key={p.id} 
                onClick={() => router.push(`/products/${p.id}`)}
                className="bg-white border rounded-lg shadow-sm hover:shadow-lg cursor-pointer transition"
              >
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
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F7FA]">
        <TopBar />
        <div className="mx-auto max-w-[1200px] px-4 py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">กำลังโหลด...</p>
          </div>
        </div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
