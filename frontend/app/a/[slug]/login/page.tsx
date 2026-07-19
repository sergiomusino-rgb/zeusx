'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function AppLoginRedirect() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  useEffect(() => {
    // Reindirizza alla pagina di login principale dell'app
    router.replace(`/a/${slug}`);
  }, [slug, router]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Reindirizzamento...</p>
      </div>
    </div>
  );
}