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
        <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <AlertTriangle className="w-6 h-6 sm:w-8 sm:h-8 text-red-400" />
          </div>
          
          <h1 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">
            Periodo di prova scaduto
          </h1>
          
          <p className="text-gray-400 mb-4 sm:mb-6 text-sm">
            Il periodo di prova di 30 giorni per "{appName}" è terminato il{' '}
            {new Date(trialEndsAt).toLocaleDateString('it-IT')}.
          </p>
          
          <p className="text-gray-300 text-xs sm:text-sm mb-6 sm:mb-8">
            Attiva l'abbonamento per continuare ad accedere ai tuoi dati ed utilizzare l'applicazione.
          </p>
          
          <button
            onClick={handleSubscribe}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
            Attiva Abbonamento
          </button>
        </div>
      </div>
      
      <ZeusXBrandingFooter />
    </div>
  );
}