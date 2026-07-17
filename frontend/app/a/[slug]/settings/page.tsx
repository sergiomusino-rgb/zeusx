'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CreditCard, XCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import ZeusXBrandingFooter from '@/components/ZeusXBrandingFooter';

type AppStatus = 'trial' | 'active' | 'expired';

interface AppInfo {
  id: string;
  name: string;
  status: AppStatus;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/a/${slug}`);
        return;
      }
      setUser(user);

      // Get app info
      const { data: app } = await supabase
        .from('apps')
        .select('id, name, status, trial_ends_at, stripe_subscription_id')
        .eq('slug', slug)
        .single();
      
      setAppInfo(app);
      setLoading(false);
    };
    init();
  }, [slug, router]);

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/a/${slug}/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Errore durante la creazione della sessione di checkout');
      }
    } catch (err) {
      alert('Errore di connessione');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Sei sicuro di voler disdire l\'abbonamento? L\'app continuerà a funzionare fin al prossimo rinnovo.')) {
      return;
    }
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/a/${slug}/cancel-subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (data.success) {
        alert('Abbonamento disdetto con successo');
        setAppInfo(prev => prev ? { ...prev, status: 'active' } : null);
      } else {
        alert(data.error || 'Errore durante la disdetta');
      }
    } catch (err) {
      alert('Errore di connessione');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!appInfo) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-gray-400">App non trovata</p>
      </div>
    );
  }

  const isTrial = appInfo.status === 'trial';
  const isActive = appInfo.status === 'active';
  const isExpired = appInfo.status === 'expired';

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Impostazioni</h1>
          <p className="text-gray-400">Gestisci il tuo abbonamento per {appInfo.name}</p>
        </div>

        {/* Status Card */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400">Stato abbonamento</span>
            <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
              isActive ? 'bg-green-500/20 text-green-400' :
              isTrial ? 'bg-violet-500/20 text-violet-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {isActive ? 'Attivo' : isTrial ? 'Prova' : 'Scaduto'}
            </span>
          </div>
          
          {isTrial && appInfo.trial_ends_at && (
            <div className="text-sm text-gray-400">
              Periodo di prova termina il: {new Date(appInfo.trial_ends_at).toLocaleDateString('it-IT')}
            </div>
          )}
        </div>

        {/* Subscription Management */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4">Gestione Abbonamento</h2>
          
          {isTrial || isExpired ? (
            <button
              onClick={handleSubscribe}
              disabled={actionLoading}
              className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-gray-600 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CreditCard className="w-5 h-5" />
              )}
              {isExpired ? 'Rinnova Abbonamento' : 'Attiva Abbonamento'}
            </button>
          ) : (
            <button
              onClick={handleCancelSubscription}
              disabled={actionLoading}
              className="w-full border border-red-500/30 text-red-400 hover:bg-red-950/20 disabled:opacity-50 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              Disdici Abbonamento
            </button>
          )}
        </div>
      </div>
      
      <ZeusXBrandingFooter />
    </div>
  );
}