'use client';

import useSWR from "swr";
import { useParams } from "next/navigation";

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

// fetcher สำหรับ SWR
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  const data = await res.json();
  return data.product ?? data; // รองรับทั้ง { product: {...} } หรือ {...}
};

export default function ProductPage() {
  const params = useParams<{ id: string }>();
  const { id } = params;

  const { data: product, error, isLoading } = useSWR<Product>(
    id ? `${process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000"}/products/${id}` : null,
    fetcher
  );

  if (isLoading) {
    return <div className="p-4">กำลังโหลดสินค้า...</div>;
  }

  if (error || !product) {
    return <div className="p-4 text-red-500">ไม่พบสินค้า</div>;
  }

  return (
    <div className="mx-auto max-w-[800px] p-4">
      <div className="rounded border p-4">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-64 object-cover rounded"
          />
        ) : (
          <div className="w-full h-64 flex items-center justify-center bg-gray-200 rounded">
            ไม่มีรูปภาพ
          </div>
        )}
        <h1 className="mt-4 text-2xl font-bold">{product.name}</h1>
        <p className="mt-2 text-gray-700">
          {product.description || "ไม่มีคำอธิบายสินค้า"}
        </p>
        <p className="mt-2 text-xl font-semibold">
          ฿{(product.price ?? 0).toLocaleString()}
        </p>
        <p className="mt-1 text-gray-500">
          คงเหลือ: {product.quantity ?? 0}
        </p>
      </div>
    </div>
  );
}

