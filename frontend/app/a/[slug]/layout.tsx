'use client';

import { PropsWithChildren, useEffect, useState } from 'react';
import { LanguageProvider } from '@/src/lib/LanguageContext';
import { AuthProvider } from '@/src/lib/AuthContext';
import { ThemeProvider } from '@/src/lib/ThemeContext';
import { useParams, useRouter, usePathname } from 'next/navigation';
import { supabaseBrowser as supabase } from '@/src/lib/supabase-browser';
import TrialPaywall from './app/TrialPaywall';
import ZeusXBrandingFooter from '@/components/ZeusXBrandingFooter';
import Link from 'next/link';
import { AppInfoProvider, type AuthMode } from './AppInfoContext';

type AppStatus = 'trial' | 'active' | 'expired' | 'past_due' | 'canceled';

interface AppInfo {
  id: string;
  name: string;
  status: AppStatus;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  client_subscription_price: number | null;
  auth_mode: AuthMode;
  config: Record<string, unknown> | null;
}

export default function AppLayout({ children }: PropsWithChildren) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname() || '';
  const slug = params.slug as string;

  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'reseller' | null>(null);
  const [gateDenied, setGateDenied] = useState(false);

  // ─── Classificazione della route corrente ───────────────────────────────
  const isRootLanding = pathname === `/a/${slug}`;
  const isBlockedPage = pathname.startsWith(`/a/${slug}/blocked`);
  const isOwnerOnly = pathname.startsWith(`/a/${slug}/settings`) || pathname.startsWith(`/a/${slug}/admin`);
  const isClientProtected =
    pathname.startsWith(`/a/${slug}/dashboard`) ||
    pathname.startsWith(`/a/${slug}/app`) ||
    pathname.startsWith(`/a/${slug}/fatture`);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const [{ data: rawApp }, { data: { user } }] = await Promise.all([
        supabase
          .from('apps')
          .select('id, name, status, trial_ends_at, stripe_subscription_id, client_subscription_price, auth_mode, config')
          .eq('slug', slug)
          .single(),
        supabase.auth.getUser(),
      ]);
      const app = rawApp as unknown as AppInfo | null;

      if (cancelled) return;
      setAppInfo(app);

      // ─── Gate owner-only (/settings, /admin): invariato, richiede sessione
      // Supabase Auth della piattaforma + ruolo admin/reseller su `profiles`.
      if (isOwnerOnly) {
        if (!user) {
          setGateDenied(true);
          setLoading(false);
          return;
        }
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (profile && ((profile as any).role === 'admin' || (profile as any).role === 'reseller')) {
          setUserRole((profile as any).role);
        }
        setLoading(false);
        return;
      }

      // ─── Gate cliente (dashboard/app/fatture) per le app auth_mode='supabase':
      // richiede sessione Supabase Auth + membership attiva in app_users.
      // Le app legacy non hanno alcun gate qui: l'autenticazione a password
      // è gestita dal componente pagina stesso (invariato).
      if (isClientProtected && app?.auth_mode === 'supabase') {
        if (!user) {
          router.replace(`/a/${slug}/login`);
          return;
        }
        const { data: appUser } = await supabase
          .from('app_users')
          .select('id')
          .eq('user_id', user.id)
          .eq('app_id', app.id)
          .eq('is_active', true)
          .maybeSingle();
        if (!appUser) {
          router.replace(`/a/${slug}/login`);
          return;
        }
      }

      // Ruolo owner opzionale (solo per mostrare il link "Torna alla Dashboard"),
      // non blocca mai il rendering delle route pubbliche/cliente.
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        if (profile && ((profile as any).role === 'admin' || (profile as any).role === 'reseller')) {
          setUserRole((profile as any).role);
        }
      }

      setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  }, [slug, pathname, isOwnerOnly, isClientProtected, router]);

  // ─── LOGICA DI BLOCCO ACCESSO ──────────────────────────────────────────────
  // L'app viene bloccata se:
  // 1. Lo status è 'expired' (trial scaduto e nessun abbonamento attivo)
  // 2. Lo status è 'past_due' o 'canceled' (abbonamento non in regola)
  // 3. Lo status è 'trial' E la data di trial è scaduta E non c'è subscription_id attivo
  const isAppBlocked = (() => {
    if (!appInfo) return false;
    if (appInfo.status === 'active') return false;
    if (appInfo.status === 'past_due' || appInfo.status === 'canceled') return true;
    if (appInfo.status === 'expired') return true;
    if (appInfo.status === 'trial') {
      if (appInfo.stripe_subscription_id) return false;
      if (appInfo.trial_ends_at && new Date(appInfo.trial_ends_at) < new Date()) return true;
    }
    return false;
  })();

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

  // Owner-only non autenticato: unico caso che mostra ancora il gate storico
  // "Accedi o Registrati" verso il login della piattaforma.
  if (gateDenied) {
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

  // Paywall: si applica a tutte le route tranne la landing pubblica e la
  // pagina "app sospesa" (che deve restare visibile per spiegare il blocco).
  if (isAppBlocked && appInfo && !isRootLanding && !isBlockedPage) {
    return <TrialPaywall appName={appInfo.name} trialEndsAt={appInfo.trial_ends_at!} appId={appInfo.id} />;
  }

  return (
    <LanguageProvider>
      <ThemeProvider slug={slug}>
        <AuthProvider slug={slug} appId={appInfo?.id}>
          <AppInfoProvider
            value={{
              appId: appInfo?.id || '',
              slug,
              authMode: appInfo?.auth_mode || 'legacy',
              appName: appInfo?.name || '',
              config: appInfo?.config || null,
            }}
          >
            <div className="flex flex-col min-h-screen bg-slate-950">
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
          </AppInfoProvider>
        </AuthProvider>
      </ThemeProvider>
    </LanguageProvider>
  );
}
