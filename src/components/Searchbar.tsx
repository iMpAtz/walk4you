'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { getApiBase } from '@/lib/config';

interface SearchSuggestion {
  text: string;
  type: 'product' | 'category';
  count: number;
}

interface SearchBarProps {
  initialQuery?: string;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({
  initialQuery = '',
  placeholder = "ค้นหาสินค้า...",
  className = ''
}: SearchBarProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // --- Fetch suggestions with debounce ---
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = searchQuery.trim();
    if (!query) {
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${getApiBase()}/products/search/suggestions?q=${encodeURIComponent(query)}&limit=5`);
        if (!res.ok) throw new Error('Failed to fetch suggestions');
        const data: SearchSuggestion[] = await res.json();
        setSuggestions(data);
        setShowSuggestions(data.length > 0);
        setSelectedIndex(-1);
      } catch (err) {
        console.error(err);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQuery]);

  // --- Click outside ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (query?: string) => {
  const searchTerm = query || searchQuery.trim();
  if (!searchTerm) return;
  router.push(`/search?query=${encodeURIComponent(searchTerm)}`);
};


  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0) handleSearch(suggestions[selectedIndex].text);
      else handleSearch();
    }
  };

  return (
    <div className={`relative flex gap-2 ${className}`} ref={wrapperRef}>
      <input
        type="text"
        className="flex-1 rounded-lg border-2 px-4 py-3 pr-10 border-[#CBD5E1] focus:border-[#1B2A47] outline-none transition"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />

      <button
        className="rounded-lg px-6 bg-[#1B2A47] text-white font-semibold hover:bg-[#314E72] flex items-center gap-2 transition"
        onClick={() => handleSearch()}
      >
        <Search size={20} /> ค้นหา
      </button>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          {suggestions.map((s, idx) => (
            <div
              key={idx}
              className={`px-4 py-2 cursor-pointer hover:bg-[#1B2A47] hover:text-white transition ${idx === selectedIndex ? 'bg-[#1B2A47] text-white' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSearch(s.text)}
            >
              {s.text} {s.type === 'category' && `(${s.count})`}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
