"use client";

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const appSlug = searchParams.get('appSlug');
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<string>('');

  useEffect(() => {
    if (sessionId || appSlug) {
      console.log("Pagamento completato con sessione:", sessionId, "o appSlug:", appSlug);
      
      // Se abbiamo session_id, sincronizza il piano con Stripe
      if (sessionId && !appSlug) {
        setSyncStatus('Sincronizzazione del piano in corso...');
        
        fetch('/api/sync-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId }),
        })
        .then(res => res.json())
        .then(data => {
          console.log('[Sync Plan] Risultato:', data);
          if (data.success) {
            setSyncStatus(`Piano ${data.plan} attivato con ${data.app_limit} slot!`);
          } else if (data.paid === false) {
            setSyncStatus('Attendi la conferma del pagamento...');
          } else {
            setSyncStatus('Piano sincronizzato con successo!');
          }
        })
        .catch(err => {
          console.error('[Sync Plan] Errore:', err);
          setSyncStatus('Errore nella sincronizzazione del piano');
        })
        .finally(() => {
          setLoading(false);
        });
      } else {
        setLoading(false);
      }

      // Reindirizzamento automatico dopo 4 secondi (per dare tempo alla sync)
      const timer = setTimeout(() => {
        // Se abbiamo appSlug, reindirizza al dettaglio dell'app
        if (appSlug) {
          router.push(`/dashboard/projects/${appSlug}`);
        } else {
          router.push('/dashboard');
        }
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [sessionId, appSlug, router]);

  // Determina l'URL del pulsante principale
  const buttonHref = appSlug ? `/dashboard/projects/${appSlug}` : '/dashboard';

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
          {appSlug 
            ? "L'app è stata creata con successo! Verrai reindirizzato ai dettagli dell'app a breve..."
            : "Grazie per aver acquistato i crediti ZEUSX. Il tuo account è stato aggiornato. Verrai reindirizzato alla dashboard a breve..."
          }
        </p>

        {syncStatus && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">{syncStatus}</p>
          </div>
        )}

        <Link 
          href={buttonHref}
          className="block w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
        >
          {appSlug ? "Vai ai dettagli dell'app" : "Vai subito alla Dashboard"}
        </Link>
      </div>
      
      <p className="mt-6 text-sm text-gray-400">
        {sessionId 
          ? `ID Transazione: ${sessionId.substring(0, 15)}...` 
          : appSlug 
            ? `App Slug: ${appSlug}` 
            : "N/A"
        }
      </p>
    </div>
  );
}