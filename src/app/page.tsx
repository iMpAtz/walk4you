import TopBar from "@/components/TopBar";
export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <TopBar />

      {/* Header with logo + search */}
      <div className="mx-auto max-w-[1200px] px-4 py-4">
        <div className="text-3xl font-semibold">Logo</div>
        <div className="mt-3 flex items-center gap-2">
          <input className="w-full rounded border border-gray-300 px-3 py-2" placeholder="Search" />
          <button className="rounded bg-black px-4 py-2 text-white">Search</button>
        </div>
      </div>

      {/* Hero and side banners */}
      <div className="mx-auto grid max-w-[1200px] grid-cols-4 gap-4 px-4">
        <div className="col-span-1 h-[140px] rounded bg-gray-200" />
        <div className="col-span-2 h-[140px] rounded bg-gray-200" />
        <div className="col-span-1 h-[140px] rounded bg-gray-200" />
        <div className="col-span-3 h-[60px] rounded bg-gray-200" />
        <div className="col-span-1 h-[60px] rounded bg-gray-200" />
      </div>

      {/* Featured products */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold">สินค้าแนะนำ</h2>
        <div className="rounded border border-gray-200 p-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[120px] rounded bg-gray-100">
                <div className="flex h-full w-full items-end justify-between rounded bg-gradient-to-r from-gray-100 to-gray-200 p-2 text-xs text-gray-600">
                  <span>Shop</span>
                  <span>{'>'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Categories carousel mock */}
      <div className="mx-auto max-w-[1200px] px-4 pt-6">
        <h2 className="mb-3 text-base font-semibold">หมวดหมู่</h2>
        <div className="relative rounded border border-gray-200 p-4">
          <div className="grid grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-[120px] rounded bg-gray-100" />
            ))}
          </div>
          <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black px-3 py-2 text-white">›</button>
        </div>
      </div>
    </div>
  );
}
