'use client';

import useSWR from "swr";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ShoppingCart, Heart, Share2, Star, Package, Shield, Truck, Bell, User, ThumbsUp, MessageCircle } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useCart } from "@/contexts/CartContext";
import CartIcon from "@/components/CartIcon";

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  quantity?: number;
  image_url?: string;
  category?: string;
  storeId: string;
}

interface RecommendedProduct {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  storeId: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}

interface Store {
  id: string;
  storeName: string;
  storeDescription?: string;
  phoneNumber?: string;
  buMail?: string;
  registerDate: string;
  status: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  registerDate: string;
  avatar?: {
    url?: string;
  };
}

interface Review {
  id: string;
  productId: string;
  userId: string;
  username: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

interface ReviewForm {
  rating: number;
  comment: string;
}



const fetcher = async (url: string): Promise<Product> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data = await res.json();
  return data.product ?? data;
};

const storeFetcher = async (url: string): Promise<Store> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

const recommendedFetcher = async (url: string): Promise<RecommendedProduct[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

const userFetcher = async (url: string): Promise<User> => {
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('No access token');
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
};

export default function ProductPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const [quantity, setQuantity] = useState(1);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  
  const { addToCart } = useCart();

  const { data: product, error, isLoading } = useSWR<Product>(
    id ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/public/products/${id}` : null,
    fetcher
  );

  // Fetch store information
  const { data: store, error: storeError } = useSWR<Store>(
    product?.storeId ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/stores/${product.storeId}` : null,
    storeFetcher
  );

  const { data: recommendedProducts, error: recommendedError } = useSWR<RecommendedProduct[]>(
    `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/products/featured?limit=4`,
    recommendedFetcher
  );

  const { data: currentUser, error: userError } = useSWR<User>(
    typeof window !== 'undefined' && localStorage.getItem('access_token') 
      ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/users/me`
      : null,
    userFetcher
  );

  // Fetch reviews when product is loaded
  useEffect(() => {
    if (id) {
      fetchReviews();
    }
  }, [id]);

  const fetchReviews = async () => {
    if (!id) return;
    
    try {
      setReviewsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/products/${id}/reviews`);
      if (response.ok) {
        const reviewsData = await response.json();
        setReviews(reviewsData);
      } else {
        console.error('Failed to fetch reviews');
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังโหลดสินค้า...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-xl font-semibold mb-2">ไม่พบสินค้า</p>
          <p className="text-gray-500">กรุณาลองใหม่อีกครั้ง</p>
        </div>
      </div>
    );
  }

  const inStock = (product.quantity ?? 0) > 0;

  const handleAddToCart = async () => {
    if (!inStock || !product || !id) return;
    
    try {
      setIsAddingToCart(true);
      await addToCart(id, quantity);
      alert('เพิ่มสินค้าเข้าตระกร้าสำเร็จ!');
    } catch (error) {
      console.error('Failed to add to cart:', error);
      const errorMessage = error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการเพิ่มสินค้าเข้าตระกร้า';
      alert(errorMessage);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!inStock) return;
    console.log(`Buying ${quantity} of ${product.name}`);
  };

  const submitReview = async (reviewData: ReviewForm) => {
    if (!id || !currentUser) return;
    
    try {
      setIsSubmittingReview(true);
      const token = localStorage.getItem('access_token');
      if (!token) {
        alert('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/products/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: reviewData.rating,
          comment: reviewData.comment,
        }),
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews(prev => [newReview, ...prev]);
        setNewComment('');
        setNewRating(5);
        alert('ส่งรีวิวสำเร็จ!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('เกิดข้อผิดพลาดในการส่งรีวิว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleSubmitReview = () => {
    if (!newComment.trim()) {
      alert('กรุณาใส่ความคิดเห็น');
      return;
    }
    
    if (!currentUser) {
      alert('กรุณาเข้าสู่ระบบก่อนเขียนรีวิว');
      return;
    }

    submitReview({
      rating: newRating,
      comment: newComment.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 lg:px-8 py-4 shadow-sm sticky top-0 z-50 backdrop-blur-lg bg-opacity-95">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <a 
            href="/" 
            className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:opacity-80 transition cursor-pointer"
          >
            ShopLogo
          </a>
          <div className="flex items-center gap-3 lg:gap-6">
            <NotificationBell />
            <CartIcon />
            <div className="flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 hover:bg-gray-100 rounded-full transition cursor-pointer">
              {currentUser?.avatar?.url ? (
                <img
                  src={currentUser.avatar.url}
                  alt={currentUser.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="hidden sm:block font-medium text-gray-700">
                {currentUser ? currentUser.username : 'Guest'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Product Detail */}
      <div className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Image */}
            <div className="relative bg-gray-50 p-6 lg:p-8">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-[400px] lg:h-[500px] object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-[400px] lg:h-[500px] flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400 rounded-xl">
                  <Package className="w-20 lg:w-24 h-20 lg:h-24 mb-4" />
                  <p className="text-base lg:text-lg">ไม่มีรูปภาพ</p>
                </div>
              )}
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={`p-2.5 lg:p-3 rounded-full shadow-lg transition ${
                    isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                  aria-label="Add to favorites"
                >
                  <Heart className={`w-4 h-4 lg:w-5 lg:h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                <button 
                  className="p-2.5 lg:p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4 lg:w-5 lg:h-5 text-gray-700" />
                </button>
              </div>
            </div>

            {/* Right: Info */}
            <div className="p-6 lg:p-10 flex flex-col">
              <div className="flex-1">
                {product.category && (
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">
                    {product.category}
                  </span>
                )}

                <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h1>

                <div className="flex items-center gap-2 mb-4">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 lg:w-5 lg:h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <span className="text-sm lg:text-base text-gray-600">(4.9 จาก {reviews.length} รีวิว)</span>
                </div>

                <p className="text-sm lg:text-base text-gray-600 leading-relaxed mb-6">
                  {product.description || "ไม่มีคำอธิบายสินค้า"}
                </p>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-5 lg:p-6 rounded-xl mb-6">
                  <p className="text-xs lg:text-sm text-gray-600 mb-1">ราคา</p>
                  <p className="text-3xl lg:text-4xl font-bold text-green-700">
                    {(product.price ?? 0).toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                  </p>
                  <p className={`mt-2 text-sm font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                    {inStock ? `คงเหลือ ${product.quantity} ชิ้น` : 'สินค้าหมด'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-6">
                  
                  <div className="flex flex-col items-center p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-5 h-5 lg:w-6 lg:h-6 text-green-600 mb-1 lg:mb-2" />
                    <span className="text-xs text-gray-600 text-center">รับประกัน</span>
                  </div>
                  <div className="flex flex-col items-center p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <Package className="w-5 h-5 lg:w-6 lg:h-6 text-purple-600 mb-1 lg:mb-2" />
                    <span className="text-xs text-gray-600 text-center">คืนสินค้าได้</span>
                  </div>
                </div>

                {inStock && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      จำนวน
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-semibold text-lg"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={product.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, Math.min(product.quantity ?? 1, parseInt(e.target.value) || 1)))}
                        className="w-20 h-10 text-center border-2 border-gray-300 rounded-lg font-semibold focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => setQuantity(Math.min(product.quantity ?? 1, quantity + 1))}
                        className="w-10 h-10 flex items-center justify-center border-2 border-gray-300 rounded-lg hover:bg-gray-100 transition font-semibold text-lg"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 lg:gap-4 mb-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={!inStock || isAddingToCart}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 text-sm lg:text-base"
                  >
                    {isAddingToCart ? (
                      <>
                        <div className="w-4 h-4 lg:w-5 lg:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        กำลังเพิ่ม...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-4 h-4 lg:w-5 lg:h-5" />
                        เพิ่มลงตะกร้า
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={!inStock}
                    className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm lg:text-base"
                  >
                    ซื้อเลย
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs for Description and Reviews */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('description')}
                className={`flex-1 px-6 py-4 font-semibold transition ${
                  activeTab === 'description'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                รายละเอียดสินค้า
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`flex-1 px-6 py-4 font-semibold transition flex items-center justify-center gap-2 ${
                  activeTab === 'reviews'
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MessageCircle className="w-5 h-5" />
                รีวิวสินค้า ({reviews.length})
              </button>
            </div>
          </div>

          <div className="p-6 lg:p-8">
            {activeTab === 'description' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">ประเภท:</span>
                    <span className="font-medium text-gray-900">{product.category || "-"}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">ร้านค้า:</span>
                    <span className="font-medium text-gray-900">{store?.storeName || product.storeId}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">รหัสสินค้า:</span>
                    <span className="font-medium text-gray-900">{product.id}</span>
                  </div>
                  <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">สถานะ:</span>
                    <span className={`font-medium ${inStock ? 'text-green-600' : 'text-red-600'}`}>
                      {inStock ? 'มีสินค้า' : 'สินค้าหมด'}
                    </span>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">รายละเอียดเพิ่มเติม</h3>
                  <p className="text-gray-600 leading-relaxed">
                    {product.description || "ไม่มีรายละเอียดเพิ่มเติม"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Write Review */}
                <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">เขียนรีวิวของคุณ</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">คะแนน</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setNewRating(rating)}
                          className="p-1 hover:scale-110 transition"
                        >
                          <Star
                            className={`w-8 h-8 ${
                              rating <= newRating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">ความคิดเห็น</label>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="แบ่งปันประสบการณ์การใช้งานสินค้านี้..."
                      className="w-full p-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 min-h-[100px]"
                    />
                  </div>
                  <button
                    onClick={handleSubmitReview}
                    disabled={isSubmittingReview}
                    className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white font-semibold px-6 py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isSubmittingReview ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        กำลังส่ง...
                      </>
                    ) : (
                      'ส่งรีวิว'
                    )}
                  </button>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">รีวิวจากลูกค้า</h3>
                  {reviewsLoading ? (
                    <div className="text-center py-8">
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-gray-500">กำลังโหลดรีวิว...</p>
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">ยังไม่มีรีวิวสำหรับสินค้านี้</p>
                    </div>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="p-6 border border-gray-200 rounded-xl hover:shadow-md transition">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                              <User className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{review.username}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(review.createdAt).toLocaleDateString('th-TH')}
                              </p>
                            </div>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-700 mb-3">{review.comment}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommended Products */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden p-6 lg:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">สินค้าแนะนำ</h2>
          {recommendedError ? (
            <div className="text-center py-8">
              <p className="text-gray-500">ไม่สามารถโหลดสินค้าแนะนำได้</p>
            </div>
          ) : !recommendedProducts ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-500">กำลังโหลดสินค้าแนะนำ...</p>
            </div>
          ) : recommendedProducts?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">ไม่มีสินค้าแนะนำในขณะนี้</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
              {recommendedProducts?.map((item) => (
                <div
                  key={item.id}
                  className="group cursor-pointer border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition"
                >
                  <div className="relative overflow-hidden bg-gray-50">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-48 object-cover group-hover:scale-110 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-48 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 text-gray-400">
                        <Package className="w-12 h-12 mb-2" />
                        <p className="text-sm">ไม่มีรูปภาพ</p>
                      </div>
                    )}
                    <button className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition">
                      <Heart className="w-4 h-4 text-gray-700" />
                    </button>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{item.name}</h3>
                    {item.category && (
                      <p className="text-xs text-blue-600 mb-2">{item.category}</p>
                    )}
                    <p className="text-lg font-bold text-green-700">
                      {(item.price || 0).toLocaleString("th-TH", { style: "currency", currency: "THB" })}
                    </p>
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