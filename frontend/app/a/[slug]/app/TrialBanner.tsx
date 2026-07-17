'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AppStatus {
  status: 'trial' | 'active' | 'expired';
  trial_ends_at: string | null;
  totalum_app_id: string | null;
  payment_reset_required: boolean;
}

export default function TrialBanner() {
  const params = useParams();
  const slug = params.slug as string;
  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAppStatus();
  }, [slug]);

  const checkAppStatus = async () => {
    try {
      // Recupera lo slug dell'app dal database
      const { data: app, error } = await supabase
        .from('apps')
        .select('status, trial_ends_at, totalum_app_id, payment_reset_required')
        .eq('slug', slug)
        .single();

      if (!error && app) {
        setAppStatus({
          ...app,
          payment_reset_required: app.payment_reset_required || false,
        });
      }
    } catch (err) {
      console.error('Errore controllo stato app:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDaysRemaining = (trialEndsAt: string | null): number => {
    if (!trialEndsAt) return 0;
    const trialDate = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = Math.max(0, trialDate.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getCheckoutUrl = (totalumAppId: string | null): string => {
    if (!totalumAppId) return '#';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    return `${appUrl}/api/totalum-client/checkout?totalum_app_id=${totalumAppId}`;
  };

  // Se in loading, non mostra nulla
  if (loading) return null;

  // Banner per riattivazione abbonamento (dopo takeover)
  if (appStatus?.payment_reset_required) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="text-center p-8 max-w-md">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Aggiornamento servizio
          </h2>
          <p className="text-gray-400 mb-6">
            Il servizio di questa applicazione è stato aggiornato. Per continuare a usarla, è necessario riattivare l'abbonamento.
          </p>
          <a
            href={getCheckoutUrl(appStatus?.totalum_app_id)}
            className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Riattiva abbonamento ora
          </a>
        </div>
      </div>
    );
  }

  // Se l'app è attiva, non mostra nulla
  if (appStatus?.status === 'active') return null;

  // Se l'app è scaduta o trial terminato
  if (appStatus?.status === 'expired' || 
      (appStatus?.status === 'trial' && getDaysRemaining(appStatus.trial_ends_at) <= 0)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950">
        <div className="text-center p-8 max-w-md">
          <div className="mb-6">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">
            Periodo di prova scaduto
          </h2>
          <p className="text-gray-400 mb-6">
            Il periodo di prova di questa applicazione è scaduto. Per continuare a usarla, attiva subito l'abbonamento.
          </p>
          <a
            href={getCheckoutUrl(appStatus?.totalum_app_id)}
            className="inline-block px-8 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Attiva abbonamento ora
          </a>
        </div>
      </div>
    );
  }

  // Banner trial attivo
  if (appStatus?.status === 'trial') {
    const daysRemaining = getDaysRemaining(appStatus.trial_ends_at);
    
    return (
      <div className="sticky top-0 z-40 bg-gradient-to-r from-yellow-600/90 to-orange-600/90 backdrop-blur-sm border-b border-yellow-500/30">
        <div className="px-4 py-3 flex items-center justify-center gap-3">
          <svg className="w-5 h-5 text-yellow-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-yellow-100 text-sm font-medium">
            Il tuo periodo di prova gratuito scade tra {daysRemaining} giorni.
          </span>
          <a
            href={getCheckoutUrl(appStatus.totalum_app_id)}
            className="ml-2 text-yellow-200 underline text-sm font-semibold hover:text-white transition-colors"
          >
            Clicca qui per attivare l'abbonamento ed evitare interruzioni
          </a>
        </div>
      </div>
    );
  }

  return null;
}