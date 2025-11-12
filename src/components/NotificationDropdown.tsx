'use client';

import { Bell, X, Check, Star, ShoppingCart, MessageCircle } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const router = useRouter();
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAsRead, 
    markAllAsRead 
  } = useNotifications();

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'review':
        return <Star className="w-5 h-5 text-yellow-500" />;
      case 'order':
        return <ShoppingCart className="w-5 h-5 text-blue-500" />;
      case 'message':
        return <MessageCircle className="w-5 h-5 text-green-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'เมื่อสักครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชั่วโมงที่แล้ว`;
    return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
  };

  const handleNotificationClick = async (notification: any) => {
    // Mark as read
    await markAsRead(notification.id);

    // Navigate based on notification type, title, and data
    if (notification.data) {
      switch (notification.type) {
        case 'order':
          // Check notification title/message to determine destination
          const isStoreOwnerNotification = 
            notification.title?.includes('มีคำสั่งซื้อใหม่') || 
            notification.title?.includes('ลูกค้ายืนยันได้รับสินค้า');
          
          if (isStoreOwnerNotification) {
            // Store owner notifications - go to store management orders
            router.push(`/store-management/orders`);
          } else {
            // Customer notifications - go to my orders
            router.push(`/my-orders`);
          }
          break;
        
        case 'review':
          // Navigate to product page
          if (notification.data.productId) {
            router.push(`/products/${notification.data.productId}`);
          }
          break;
        
        case 'message':
          // Navigate to messages or store page
          if (notification.data.storeId) {
            router.push(`/stores/${notification.data.storeId}`);
          }
          break;
        
        default:
          // For other types, just mark as read
          break;
      }
    }
    
    // Close dropdown
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      <div className="absolute top-16 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">การแจ้งเตือน</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#0B44A3] border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-500">กำลังโหลด...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">ไม่มีการแจ้งเตือน</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-4 border-t border-gray-200 bg-gray-50">
            <button
              className="w-full text-sm text-[#0B44A3] hover:text-[#093782] font-medium"
              onClick={() => router.push('/notifications')}
            >
              ดูทั้งหมด
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
