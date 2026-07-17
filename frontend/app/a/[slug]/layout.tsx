'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';
import { AuthProvider } from '@/src/lib/AuthContext';
import { ThemeProvider } from '@/src/lib/ThemeContext';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import TrialPaywall from './app/TrialPaywall';
import ZeusXBrandingFooter from '@/components/ZeusXBrandingFooter';

type AppStatus = 'trial' | 'active' | 'expired';

interface AppInfo {
  id: string;
  name: string;
  status: AppStatus;
  trial_ends_at: string | null;
}

export default function AppLayout({ children }: PropsWithChildren) {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (!user) {
        setShowAuth(true);
        setLoading(false);
        return;
      }

      // Get app info
      const { data: app } = await supabase
        .from('apps')
        .select('id, name, status, trial_ends_at')
        .eq('slug', slug)
        .single();
      
      setAppInfo(app);
      setLoading(false);
    };
    init();
  }, [slug]);

  // Check trial status
  const isTrialExpired = appInfo?.status === 'trial' && 
    appInfo.trial_ends_at && 
    new Date(appInfo.trial_ends_at) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  // Show auth screen if not logged in
  if (showAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Accedi o Registrati</h1>
          <p className="text-gray-400 mb-6 text-center">
            Accedi per utilizzare questa applicazione
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white py-3 px-6 rounded-xl font-semibold transition-colors"
          >
            Accedi / Registrati
          </button>
        </div>
        <ZeusXBrandingFooter />
      </div>
    );
  }

  // Show paywall if trial expired
  if (isTrialExpired && appInfo) {
    return <TrialPaywall appName={appInfo.name} trialEndsAt={appInfo.trial_ends_at!} />;
  }

  return (
    <LanguageProvider>
      <ThemeProvider slug={slug}>
        <AuthProvider slug={slug}>
          <div className="flex flex-col min-h-screen bg-slate-950">
            <div className="flex-1">
              {children}
            </div>
            <ZeusXBrandingFooter />
          </div>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}