"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation'; // Aggiunto useRouter
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter(); // Inizializzato il router
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      console.log("Pagamento completato con sessione:", sessionId);
      setLoading(false);

      // Reindirizzamento automatico dopo 3 secondi
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, 3000);

      return () => clearTimeout(timer); // Pulizia del timer
    }
  }, [sessionId, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100 max-w-md w-full">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Pagamento Riuscito!</h1>
        <p className="text-gray-600 mb-6">
          Grazie per aver acquistato i crediti ZEUSX. Il tuo account è stato aggiornato. Verrai reindirizzato alla dashboard a breve...
        </p>

        <Link 
          href="/dashboard" 
          className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          Vai subito alla Dashboard
        </Link>
      </div>
      
      <p className="mt-6 text-sm text-gray-400">
        ID Transazione: {sessionId ? sessionId.substring(0, 15) + "..." : "N/A"}
      </p>
    </div>
  );
}