export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <div className="min-h-screen flex flex-col items-center gap-6 p-8">
      <h1 className="text-3xl font-semibold">Cloudinary Upload Test</h1>
      <ClientUploaderWrapper />
      <p className="text-sm text-gray-600">หลังอัปโหลด รูปจะพรีวิวและคุณสามารถเก็บ secure_url ไปใช้ต่อได้</p>
    </div>
  );
}

async function ClientUploaderWrapper() {
  const UploadTestClient = (await import('./UploadTestClient')).default;
  return <UploadTestClient />;
}


