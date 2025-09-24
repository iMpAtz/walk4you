'use client';

import { useState } from 'react';
import Image from 'next/image';

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

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => Promise<void>;
}

export default function ProductFormModal({ isOpen, onClose, onSubmit }: ProductFormModalProps) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: '',
    quantity: '',
    category: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<ProductFormData>>({});

  const handleInputChange = (field: keyof ProductFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
      // Get Cloudinary signature
      const signatureResponse = await fetch('/api/uploads/cloudinary-sign');
      const { timestamp, signature, apiKey, cloudName, folder } = await signatureResponse.json();

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder || 'products');

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
    const newErrors: Partial<ProductFormData> = {};

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
      image_url: undefined,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">เพิ่มสินค้าใหม่</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              รูปภาพสินค้า *
            </label>
            <div className="space-y-4">
              {/* Image Preview */}
              {formData.imagePreview ? (
                <div className="relative w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden">
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
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  รองรับไฟล์ JPG, PNG, GIF ขนาดไม่เกิน 5MB
                  {isSubmitting && <span className="text-blue-600 ml-2">กำลังอัปโหลด...</span>}
                </p>
              </div>
            </div>
            {errors.image && (
              <p className="text-red-500 text-sm mt-1">{errors.image}</p>
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="กรอกชื่อสินค้า"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
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
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="กรอกคำอธิบายสินค้า"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Price and Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-red-500 text-sm mt-1">{errors.price}</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent ${
                  errors.quantity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.quantity && (
                <p className="text-red-500 text-sm mt-1">{errors.quantity}</p>
              )}
            </div>
          </div>

          {/* Category */}
          <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                หมวดหมู่
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="">เลือกหมวดหมู่</option>
                <option value="อาหาร">อาหาร</option>
                <option value="เครื่องดื่ม">เครื่องดื่ม</option>
                <option value="ของใช้">ของใช้</option>
                <option value="เสื้อผ้า">เสื้อผ้า</option>
                <option value="อิเล็กทรอนิกส์">อิเล็กทรอนิกส์</option>
                <option value="หนังสือ">หนังสือ</option>
                <option value="กีฬา">กีฬา</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกสินค้า'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
