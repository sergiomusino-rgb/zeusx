'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, CreditCard } from 'lucide-react';
import ZeusXBrandingFooter from '@/components/ZeusXBrandingFooter';

interface TrialPaywallProps {
  appName: string;
  trialEndsAt: string;
}

export default function TrialPaywall({ appName, trialEndsAt }: TrialPaywallProps) {
  const router = useRouter();

  const handleSubscribe = () => {
    router.push(`/a/${window.location.pathname.split('/')[2]}/settings`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Paywall Card - Atomic Dark Style */}
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-white mb-4">
            Periodo di prova scaduto
          </h1>
          
          <p className="text-gray-400 mb-6">
            Il periodo di prova di 30 giorni per "{appName}" è terminato il{' '}
            {new Date(trialEndsAt).toLocaleDateString('it-IT')}.
          </p>
          
          <p className="text-gray-300 text-sm mb-8">
            Attiva l'abbonamento per continuare ad accedere ai tuoi dati ed utilizzare l'applicazione.
          </p>
          
          <button
            onClick={handleSubscribe}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <CreditCard className="w-5 h-5" />
            Attiva Abbonamento
          </button>
        </div>
      </div>
      
      <ZeusXBrandingFooter />
    </div>
  );
}