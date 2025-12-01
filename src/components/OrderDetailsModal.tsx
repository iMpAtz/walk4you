'use client';

import React, { ReactElement } from 'react';
import { X, Calendar, ShoppingCart, Package } from 'lucide-react';

interface OrderDetail {
  orderId: string;
  orderDate: string;
  status: string;
  total: number;
  itemCount: number;
  productNames: string;
  customerName?: string;
  products: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: OrderDetail[];
  title: string;
  loading: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusBadge: (status: string) => ReactElement;
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orders,
  title,
  loading,
  formatCurrency,
  formatDate,
  getStatusBadge
}: OrderDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-[#0B44A3] to-[#1a5fd4]">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-white" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0B44A3] mx-auto"></div>
                <p className="mt-4 text-gray-600">กำลังโหลดคำสั่งซื้อ...</p>
              </div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg">ไม่มีคำสั่งซื้อที่สำเร็จในช่วงเวลานี้</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-medium">จำนวนคำสั่งซื้อ</p>
                    <p className="text-2xl font-bold text-gray-900">{orders.length} คำสั่งซื้อ</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">รายได้รวม</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
                    </p>
                  </div>
                </div>
              </div>

              {/* Orders List */}
              <div className="space-y-3">
                {orders.map((order, index) => (
                  <div
                    key={order.orderId}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <span className="text-sm font-bold text-green-700">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">คำสั่งซื้อ: {order.orderId}</p>
                          <p className="text-sm text-gray-500">{formatDate(order.orderDate)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(order.status)}
                        <p className="text-lg font-bold text-[#0B44A3] mt-1">
                          {formatCurrency(order.total)}
                        </p>
                      </div>
                    </div>

                    {/* Products */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Package className="w-4 h-4" />
                        <span className="font-medium">{order.itemCount} รายการ:</span>
                        <span>{order.productNames}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
