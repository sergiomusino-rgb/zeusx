'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';
import { AuthProvider } from '@/src/lib/AuthContext';
import { ThemeProvider } from '@/src/lib/ThemeContext';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import TrialPaywall from './app/TrialPaywall';
import ZeusXBrandingFooter from '@/components/ZeusXBrandingFooter';
import Link from 'next/link';

type AppStatus = 'trial' | 'active' | 'expired';

interface AppInfo {
  id: string;
  name: string;
  status: AppStatus;
  trial_ends_at: string | null;
}

interface Profile {
  role: 'admin' | 'reseller' | 'viewer' | 'editor' | null;
}

export default function AppLayout({ children }: PropsWithChildren) {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<'admin' | 'reseller' | null>(null);
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Get app info first (needed for back link)
      const { data: app } = await supabase
        .from('apps')
        .select('id, name, status, trial_ends_at')
        .eq('slug', slug)
        .single();
      
      setAppInfo(app);

      if (!user) {
        setShowAuth(true);
        setLoading(false);
        return;
      }

      // Get user profile to check role (admin/reseller)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (profile && (profile as any).role === 'admin' || (profile as any).role === 'reseller') {
        setUserRole((profile as any).role);
      }

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
            {/* Back to Dashboard button - visible only for admin/reseller sessions */}
            {userRole && appInfo && (
              <div className="p-4">
                <Link
                  href={`/dashboard/projects/${appInfo.id}`}
                  className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-violet-400 transition-colors"
                >
                  <span className="text-violet-500">←</span>
                  <span>Torna alla Dashboard</span>
                </Link>
              </div>
            )}
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