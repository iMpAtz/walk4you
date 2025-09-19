export default function MainPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-200 gap-4 p-6">
      <h1 className="text-4xl font-bold">Welcome to the Main Page!</h1>
      {/* Demo Cloudinary upload */}
      {/* @ts-expect-error Async Server Component wrapper allowing client child */}
      <ClientUploaderWrapper />
    </div>
  );
}

// Wrapper server component to render a client component without changing page to 'use client'
async function ClientUploaderWrapper() {
  const CloudinaryUploadButton = (await import('@/components/CloudinaryUploadButton')).default;
  return <CloudinaryUploadButton folder="walk4you" />;
}
