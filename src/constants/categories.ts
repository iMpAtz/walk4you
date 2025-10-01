import { Smartphone, Laptop, Shirt, Home as HomeIcon, Book, Gift, Utensils, Dumbbell, Tag } from "lucide-react";
import { useState, useEffect } from 'react';

export interface Category {
  id: string;
  name: string;
  icon: any;
  color: string;
  count: number;
}

export interface CategoryWithCount {
  category: string;
  count: number;
}

export const categories: Category[] = [
  { id: "electronics", name: "อิเล็กทรอนิกส์", icon: Smartphone, color: "from-blue-500 to-cyan-500", count: 0 },
  { id: "computers", name: "คอมพิวเตอร์", icon: Laptop, color: "from-purple-500 to-pink-500", count: 0 },
  { id: "fashion", name: "แฟชั่น", icon: Shirt, color: "from-pink-500 to-rose-500", count: 0 },
  { id: "home", name: "บ้านและสวน", icon: HomeIcon, color: "from-green-500 to-emerald-500", count: 0 },
  { id: "books", name: "หนังสือ", icon: Book, color: "from-amber-500 to-orange-500", count: 0 },
  { id: "gifts", name: "ของขวัญ", icon: Gift, color: "from-red-500 to-pink-500", count: 0 },
  { id: "food", name: "อาหารและเครื่องดื่ม", icon: Utensils, color: "from-yellow-500 to-amber-500", count: 0 },
  { id: "sports", name: "กีฬา", icon: Dumbbell, color: "from-indigo-500 to-blue-500", count: 0 },
  { id: "beauty", name: "ความงาม", icon: Tag, color: "from-fuchsia-500 to-purple-500", count: 0 },
  { id: "toys", name: "ของเล่น", icon: Gift, color: "from-cyan-500 to-blue-500", count: 0 }
];

// Helper function to get category options for forms
export const getCategoryOptions = () => {
  return categories.map(category => ({
    value: category.name,
    label: category.name
  }));
};

// Function to fetch category counts from API
export const fetchCategoryCounts = async (): Promise<CategoryWithCount[]> => {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/category-counts`);
    if (response.ok) {
      const counts = await response.json();
      return counts;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch category counts:', error);
    return [];
  }
};

// Function to update categories with real counts from API
export const getCategoriesWithCounts = async (): Promise<Category[]> => {
  try {
    const counts = await fetchCategoryCounts();
    
    // Map the counts to our categories
    const updatedCategories = categories.map(category => {
      const countData = counts.find(c => c.category === category.id);
      return {
        ...category,
        count: countData ? countData.count : 0
      };
    });
    
    return updatedCategories;
  } catch (error) {
    console.error('Failed to fetch categories with counts:', error);
    // Fallback to original categories if API fails
    return categories;
  }
};

// Custom hook for managing categories with counts
export const useCategoriesWithCounts = () => {
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<Category[]>(categories);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const updatedCategories = await getCategoriesWithCounts();
        setCategoriesWithCounts(updatedCategories);
      } catch (err) {
        setError('Failed to load category counts');
        console.error('Error loading categories:', err);
        // Fallback to original categories
        setCategoriesWithCounts(categories);
      } finally {
        setIsLoading(false);
      }
    };

    loadCategories();
  }, []);

  const refreshCategories = async () => {
    try {
      setError(null);
      const updatedCategories = await getCategoriesWithCounts();
      setCategoriesWithCounts(updatedCategories);
    } catch (err) {
      setError('Failed to refresh category counts');
      console.error('Error refreshing categories:', err);
    }
  };

  return {
    categories: categoriesWithCounts,
    isLoading,
    error,
    refreshCategories
  };
};
