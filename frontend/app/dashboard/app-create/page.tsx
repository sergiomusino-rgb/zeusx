'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/src/lib/LanguageContext';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function AppCreatePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      router.push('/dashboard/creator');
      return;
    }
    
    setLoading(false);
  }, [projectId, router]);

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Caricamento schema...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/creator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al Creator AI
          </button>
          <h1 className="text-4xl font-bold mb-4">App Generata con Successo!</h1>
          <p className="text-gray-400 text-lg">
            Il tuo schema è stato generato e salvato.
          </p>
        </div>

        {/* Success Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-6 h-6 text-green-500" />
            <h2 className="text-xl font-bold">Progetto Creato</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">ID App</p>
              <p className="font-mono text-amber-400">{projectId}</p>
            </div>
            
            <div>
              <p className="text-sm text-gray-500">Stato</p>
              <p className="text-green-400">Creato con successo - Visibile in "Le mie App"</p>
            </div>
            
            <div className="pt-4 border-t border-gray-800">
              <button
                onClick={() => router.push('/dashboard/projects')}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-semibold transition"
              >
                Vai alle App Create
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
