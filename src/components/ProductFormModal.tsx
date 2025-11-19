'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getCategoryOptions } from '@/constants/categories';

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  quantity: string;
  image?: File;
  imagePreview?: string;
  image_url?: string;
  category?: string;
  shippingCost?: string;
}

interface ProductFormErrors {
  name?: string;
  description?: string;
  price?: string;
  quantity?: string;
  image?: string;
  category?: string;
  shippingCost?: string;
}

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
  username?: string;
}

export default function ProductFormModal({ isOpen, onClose, onSubmit, username }: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
    shippingCost: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  
  const categoryOptions = getCategoryOptions();

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    const errorField = field as keyof ProductFormErrors;
    if (errors[errorField]) {
      setErrors(prev => ({ ...prev, [errorField]: undefined }));
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, image: 'กรุณาเลือกไฟล์รูปภาพเท่านั้น' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, image: 'ขนาดไฟล์ต้องไม่เกิน 5MB' }));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setFormData(prev => ({ 
        ...prev, 
        image: file,
        imagePreview: e.target?.result as string
      }));
    };
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsSubmitting(true);
    try {
      // Get Cloudinary signature with username and type
      const signatureUrl = username 
        ? `/api/uploads/cloudinary-sign?username=${encodeURIComponent(username)}&type=product`
        : '/api/uploads/cloudinary-sign?type=product';
      const signatureResponse = await fetch(signatureUrl);
      const { timestamp, signature, apiKey, cloudName, folder } = await signatureResponse.json();

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);

      // Upload to Cloudinary
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadResponse.json();
      
      if (uploadResult.secure_url) {
        setFormData(prev => ({ 
          ...prev, 
          image: file,
          imagePreview: uploadResult.secure_url,
          image_url: uploadResult.secure_url
        }));
        setErrors(prev => ({ ...prev, image: undefined }));
      } else {
        setErrors(prev => ({ ...prev, image: 'การอัปโหลดรูปภาพล้มเหลว' }));
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setErrors(prev => ({ ...prev, image: 'การอัปโหลดรูปภาพล้มเหลว' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ProductFormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'กรุณากรอกชื่อสินค้า';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'กรุณากรอกคำอธิบายสินค้า';
    }

    if (!formData.price.trim()) {
      newErrors.price = 'กรุณากรอกราคาสินค้า';
    } else if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      newErrors.price = 'กรุณากรอกราคาที่ถูกต้อง';
    }

    if (!formData.quantity.trim()) {
      newErrors.quantity = 'กรุณากรอกจำนวนสินค้า';
    } else if (isNaN(Number(formData.quantity)) || Number(formData.quantity) <= 0) {
      newErrors.quantity = 'กรุณากรอกจำนวนที่ถูกต้อง';
    }

    if (formData.shippingCost && (isNaN(Number(formData.shippingCost)) || Number(formData.shippingCost) < 0)) {
      newErrors.shippingCost = 'กรุณากรอกค่าจัดส่งที่ถูกต้อง';
    }

    if (!formData.image) {
      newErrors.image = 'กรุณาเลือกรูปภาพสินค้า';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form after successful submission
      setFormData({
        name: '',
        description: '',
        price: '',
        quantity: '',
        category: '',
        shippingCost: '',
        image_url: undefined,
      });
      setErrors({});
    } catch (error) {
      console.error('Failed to submit product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      quantity: '',
      category: '',
      shippingCost: '',
      image_url: undefined,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b sticky top-0 bg-white z-10 rounded-t-xl">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">เพิ่มสินค้าใหม่</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="ปิด"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รูปภาพสินค้า *
            </label>
            <div className="space-y-4">
              {/* Image Preview */}
              {formData.imagePreview ? (
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 border-2 border-gray-300 rounded-lg overflow-hidden mx-auto sm:mx-0">
                  <Image
                    src={formData.imagePreview}
                    alt="Product preview"
                    fill
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        image: undefined, 
                        imagePreview: undefined,
                        image_url: undefined
                      }));
                      setErrors(prev => ({ ...prev, image: undefined }));
                    }}
                    disabled={isSubmitting}
                    className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                    aria-label="ลบรูปภาพ"
                  >
                    <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mx-auto sm:mx-0">
                  <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}

              {/* File Input */}
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={isSubmitting}
                  className="block w-full text-xs sm:text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-medium file:bg-[#0B44A3] file:text-white hover:file:bg-[#093782] disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                />
                <p className="text-xs text-gray-500 mt-1">
                  รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB
                  {isSubmitting && <span className="text-[#0B44A3] ml-2">กำลังอัปโหลด...</span>}
                </p>
              </div>
            </div>
            {errors.image && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.image}</p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ชื่อสินค้า *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent touch-manipulation ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="กรอกชื่อสินค้า"
            />
            {errors.name && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Product Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              คำอธิบายสินค้า *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent resize-none touch-manipulation ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="กรอกคำอธิบายสินค้า"
            />
            {errors.description && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Price and Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ราคา (บาท) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => handleInputChange('price', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent touch-manipulation ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.price}</p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                จำนวน *
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => handleInputChange('quantity', e.target.value)}
                className={`w-full px-3 py-2.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent touch-manipulation ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.quantity && (
                <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                หมวดหมู่
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent touch-manipulation"
              >
                <option value="">เลือกหมวดหมู่</option>
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
          </div>

          {/* Shipping Cost */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ค่าจัดส่ง (บาท) 
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.shippingCost}
              onChange={(e) => handleInputChange('shippingCost', e.target.value)}
              className={`w-full px-3 py-2.5 text-sm sm:text-base border rounded-lg focus:ring-2 focus:ring-[#0B44A3] focus:border-transparent touch-manipulation ${
                errors.shippingCost ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.shippingCost && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.shippingCost}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">ตัวเลือก: ใส่ 0 หรือว่างไว้หากไม่มีค่าจัดส่ง</p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 sm:pt-6 border-t sticky bottom-0 bg-white pb-2 sm:pb-0">
            <button
              type="button"
              onClick={handleClose}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px] touch-manipulation"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 sm:py-2 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4] text-white rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px] touch-manipulation shadow-md"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังบันทึก...
                </>
              ) : (
                <div className='text-white'>บันทึกสินค้า</div>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
