'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  Building2, 
  User, 
  Clipboard, 
  BarChart3, 
  Plus, 
  ImageIcon, 
  Edit3, 
  Trash2, 
  Check, 
  X,
  AlertTriangle,
  Package
} from 'lucide-react';
import ProductFormModal from '@/components/ProductFormModal';
import ProductEditModal from '@/components/ProductEditModal';
import TopBar from '@/components/TopBar';

interface Product {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  description?: string;
  category?: string;
}

interface UserData {
  id: string;
  username: string;
  email: string;
  phone?: string;
  avatar?: {
    url: string;
  };
}

interface StoreData {
  id: string;
  storeName: string;
  logoUrl?: string | null;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  quantity: string;
  image?: File;
  imagePreview?: string;
  image_url?: string;
  category?: string;
}

export default function MyProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasToken, setHasToken] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>('');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }
        setHasToken(true);
        await fetchUserData(token);
        await fetchStoreData(token);
        await fetchProducts(token);
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  const fetchUserData = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUserData(userData);
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    }
  };

  const fetchStoreData = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/users/me/store`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const store = await response.json();
        setStoreData({
          id: store.id,
          storeName: store.storeName,
          logoUrl: store.logoUrl,
        });
      }
    } catch (error) {
      console.error('Failed to fetch store data:', error);
    }
  };

  const fetchProducts = async (token: string) => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/my-products`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const productsData = await response.json();
        // Map API response to Product interface
        const mappedProducts = productsData.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity: product.quantity,
          image: product.image_url || '/placeholder-product.jpg',
          description: product.description,
          category: product.category
        }));
        setProducts(mappedProducts);
      } else if (response.status === 404) {
        // No products found, set empty array
        setProducts([]);
      } else {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      // Set empty array on error
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setShowProductModal(true);
  };

  const handleProductSubmit = async (formData: ProductFormData) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่');
        router.push('/login');
        return;
      }

      // Prepare product data for API
      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        quantity: Number(formData.quantity),
        image_url: formData.image_url || null,
        category: formData.category || null
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      if (response.ok) {
        const newProduct = await response.json();
        
        // Add new product to the list
        setProducts(prev => [...prev, {
          id: newProduct.id,
          name: newProduct.name,
          description: newProduct.description,
          price: newProduct.price,
          quantity: newProduct.quantity,
          image: newProduct.image_url || '/placeholder-product.jpg',
          category: newProduct.category || 'หมวดหมู่ทั่วไป'
        }]);
        
        setShowProductModal(false);
        alert('เพิ่มสินค้าใหม่สำเร็จ!');
      } else if (response.status === 400) {
        // Handle illegal product detection
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'ไม่สามารถเพิ่มสินค้านี้ได้';
        
        // Show popup for illegal product
        if (errorMessage.includes('ตรวจพบสินค้าที่ผิดกฎหมาย')) {
          alert('🚫 ตรวจพบสินค้าที่ผิดกฎหมาย\n\nระบบได้ตรวจจับและป้องกันการขายสินค้าผิดกฎหมายอัตโนมัติ');
        } else {
          alert(errorMessage);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to create product');
      }
    } catch (error) {
      console.error('Failed to add product:', error);
      alert('เกิดข้อผิดพลาดในการเพิ่มสินค้า กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleEditProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setEditingProduct(product);
      setShowEditModal(true);
    }
  };

  const handleUpdateProduct = async (productId: string, updatedData: Partial<Product>) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่');
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        const updatedProduct = await response.json();
        
        // Update product in the list
        setProducts(prev => prev.map(p => 
          p.id === productId 
            ? {
                id: updatedProduct.id,
                name: updatedProduct.name,
                description: updatedProduct.description,
                price: updatedProduct.price,
                quantity: updatedProduct.quantity,
                image: updatedProduct.image_url || '/placeholder-product.jpg',
                category: updatedProduct.category || 'หมวดหมู่ทั่วไป'
              }
            : p
        ));
        
        alert('อัปเดตสินค้าสำเร็จ!');
      } else if (response.status === 400) {
        // Handle illegal product detection
        const errorData = await response.json();
        const errorMessage = errorData.detail || 'ไม่สามารถอัปเดตสินค้านี้ได้';
        
        // Show popup for illegal product
        if (errorMessage.includes('ตรวจพบสินค้าที่ผิดกฎหมาย')) {
          alert('🚫 ตรวจพบสินค้าที่ผิดกฎหมาย\n\nระบบได้ตรวจจับและป้องกันการขายสินค้าผิดกฎหมายอัตโนมัติ');
        } else {
          alert(errorMessage);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update product');
      }
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสินค้า กรุณาลองใหม่อีกครั้ง');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    setDeletingProductId(productId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return;

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบใหม่');
        router.push('/login');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/products/${deletingProductId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove product from the list
        setProducts(prev => prev.filter(p => p.id !== deletingProductId));
        alert('ลบสินค้าสำเร็จ!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert('เกิดข้อผิดพลาดในการลบสินค้า กรุณาลองใหม่อีกครั้ง');
    } finally {
      setShowDeleteConfirm(false);
      setDeletingProductId(null);
    }
  };


  const handleQuickPriceUpdate = async (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    await handleUpdateProduct(productId, { price: newPrice });
  };

  const handleStartPriceEdit = (productId: string, currentPrice: number) => {
    setEditingPriceId(productId);
    setTempPrice(currentPrice.toString());
  };

  const handleSavePriceEdit = async (productId: string) => {
    const newPrice = parseFloat(tempPrice);
    if (isNaN(newPrice) || newPrice < 0) {
      alert('กรุณาใส่ราคาที่ถูกต้อง');
      return;
    }
    
    await handleUpdateProduct(productId, { price: newPrice });
    setEditingPriceId(null);
    setTempPrice('');
  };

  const handleCancelPriceEdit = () => {
    setEditingPriceId(null);
    setTempPrice('');
  };

  if (!hasToken || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <TopBar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-3 sm:p-4 sticky top-20 sm:top-24">
              {/* Store Info */}
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">
                {storeData?.logoUrl ? (
                  <Image 
                    src={storeData.logoUrl} 
                    alt="Store Logo" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm"
                  />
                ) : userData?.avatar?.url ? (
                  <Image 
                    src={userData.avatar.url} 
                    alt="Store Owner" 
                    width={48} 
                    height={48} 
                    className="rounded-xl object-cover w-10 h-10 sm:w-12 sm:h-12 shadow-sm"
                  />
                ) : (
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-[#0B44A3] to-[#1a5fd4] rounded-xl flex items-center justify-center shadow-sm">
                    <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 text-sm sm:text-base truncate">
                    จัดการร้านค้า
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {userData?.username || 'Store Management'}
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="space-y-1">
                <button 
                  onClick={() => router.push('/store-management')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">ข้อมูลร้านค้า</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/dashboard')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">ยอดขายของฉัน</span>
                </button>

                <button className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg shadow-sm touch-manipulation min-h-[44px]">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-semibold text-sm sm:text-base">สินค้าของฉัน</span>
                </button>

                <button 
                  onClick={() => router.push('/store-management/orders')}
                  className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 text-left hover:bg-gray-50 rounded-lg transition-all group touch-manipulation min-h-[44px]"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors flex-shrink-0">
                    <Clipboard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                  </div>
                  <span className="font-medium text-gray-700 group-hover:text-gray-900 text-sm sm:text-base">รายการสั่งซื้อ</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
              {/* Header */}
              <div className="px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 border-b border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-clip-text text-transparent">สินค้าของฉัน</h1>
                  <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">จัดการสินค้าในร้านของคุณ</p>
                </div>
                <button
                  onClick={handleAddNew}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg text-sm sm:text-base min-h-[44px] touch-manipulation"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-semibold">เพิ่มสินค้า</span>
                </button>
              </div>

              {/* Products List */}
              <div className="p-4 sm:p-6 md:p-8">
                {products.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center shadow-inner">
                      <Clipboard className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">ยังไม่มีสินค้า</h3>
                    <p className="text-gray-500 mb-6">เริ่มต้นด้วยการเพิ่มสินค้าแรกของคุณ</p>
                    <button
                      onClick={handleAddNew}
                      className="px-6 py-3 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-xl hover:opacity-90 transition-all shadow-md font-semibold"
                    >
                      เพิ่มสินค้าแรก
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {products.map((product) => (
                    <div key={product.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 md:gap-6 p-4 sm:p-5 md:p-6 border border-gray-200 rounded-xl hover:shadow-md transition-all bg-white">
                      {/* Product Image */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                        {product.image && product.image !== '/placeholder-product.jpg' ? (
                          <Image
                            src={product.image}
                            alt={product.name}
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 w-full sm:w-auto">
                        <h3 className="font-bold text-gray-900 text-base sm:text-lg break-words">{product.name}</h3>
                        {product.description && (
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2 break-words">{product.description}</p>
                        )}
                        {product.category && (
                          <span className="inline-block mt-2 px-2 sm:px-3 py-1 text-xs font-medium bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] bg-opacity-10 text-white rounded-full">
                            {product.category}
                          </span>
                        )}
                      </div>

                      {/* Price & Quantity - Mobile */}
                      <div className="flex sm:hidden w-full justify-between items-center gap-4 pt-3 border-t border-gray-100">
                        <div className="text-center flex-1">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">ราคาต่อหน่วย</div>
                          {editingPriceId === product.id ? (
                            <div className="flex items-center gap-2 justify-center">
                              <input
                                type="number"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                className="w-20 px-2 py-1.5 text-sm border-2 border-[#0B44A3] rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent font-semibold touch-manipulation"
                                min="0"
                                step="0.01"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSavePriceEdit(product.id)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="บันทึก"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleCancelPriceEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                                title="ยกเลิก"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <div 
                              className="font-bold text-[#0B44A3] text-lg cursor-pointer hover:text-[#1a5fd4] transition-colors touch-manipulation"
                              onClick={() => handleStartPriceEdit(product.id, product.price)}
                              title="คลิกเพื่อแก้ไขราคา"
                            >
                              ฿{product.price.toLocaleString()}
                            </div>
                          )}
                        </div>

                        <div className="text-center flex-1">
                          <div className="text-xs font-medium text-gray-500 uppercase mb-1">จำนวน</div>
                          <div className="font-bold text-gray-900 text-lg">{product.quantity}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditProduct(product.id)}
                            className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="แก้ไขสินค้า"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>

                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm hover:shadow touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                            title="ลบสินค้า"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Price - Desktop */}
                      <div className="hidden sm:block text-center min-w-[140px]">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">ราคาต่อหน่วย</div>
                        {editingPriceId === product.id ? (
                          <div className="flex items-center gap-2 justify-center">
                            <input
                              type="number"
                              value={tempPrice}
                              onChange={(e) => setTempPrice(e.target.value)}
                              className="w-20 px-3 py-2 text-sm border-2 border-[#0B44A3] rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent font-semibold"
                              min="0"
                              step="0.01"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSavePriceEdit(product.id)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="บันทึก"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button
                              onClick={handleCancelPriceEdit}
                              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                              title="ยกเลิก"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <div 
                            className="font-bold text-[#0B44A3] text-xl cursor-pointer hover:text-[#1a5fd4] transition-colors"
                            onClick={() => handleStartPriceEdit(product.id, product.price)}
                            title="คลิกเพื่อแก้ไขราคา"
                          >
                            ฿{product.price.toLocaleString()}
                          </div>
                        )}
                      </div>

                      {/* Quantity - Desktop */}
                      <div className="hidden sm:block text-center min-w-[100px]">
                        <div className="text-xs font-medium text-gray-500 uppercase mb-1">จำนวน</div>
                        <div className="font-bold text-gray-900 text-lg">{product.quantity}</div>
                      </div>

                      {/* Action Buttons - Desktop */}
                      <div className="hidden sm:flex items-center gap-2">
                        <button
                          onClick={() => handleEditProduct(product.id)}
                          className="p-3 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm hover:shadow"
                          title="แก้ไขสินค้า"
                        >
                          <Edit3 className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm hover:shadow"
                          title="ลบสินค้า"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleProductSubmit}
        username={userData?.username}
      />

      {/* Product Edit Modal */}
      <ProductEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        onUpdate={handleUpdateProduct}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">ยืนยันการลบสินค้า</h3>
                <p className="text-gray-600">การกระทำนี้ไม่สามารถย้อนกลับได้</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              คุณแน่ใจหรือไม่ว่าต้องการลบสินค้านี้? สินค้าจะถูกทำเครื่องหมายว่าไม่ใช้งาน
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingProductId(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDeleteProduct}
                className="flex-1 px-4 py-2 bg-[#0B44A3] text-white rounded-lg hover:bg-[#093782] transition-colors"
              >
                ลบสินค้า
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
