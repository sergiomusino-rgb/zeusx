'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';

export default function DashboardClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // La sidebar è visibile su tutte le pagine della dashboard tranne il generatore
  const showSidebar = !pathname.startsWith('/dashboard/generator');
  
  // Controlla se siamo in una pagina secondaria della dashboard
  const isSubPage = pathname.startsWith('/dashboard/') && pathname !== '/dashboard';

  // Forza un caricamento fresco se arriviamo da un login
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isFreshLogin = searchParams.has('t');
    
    if (isFreshLogin) {
      // Siamo appena arrivati dal login - pulisci il parametro e forza reload se necessario
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }

    // Prima lettura sincrona da localStorage
    let localUser = null;
    try {
      const raw = localStorage.getItem('sb-zeusx-auth-token');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.access_token) {
          localUser = { id: parsed.user?.id };
        }
      }
    } catch (e) {}

    // Se abbiamo un utente in localStorage, mostra subito la sidebar
    if (localUser) {
      setUser(localUser);
      setLoading(false);
    }

    // Verifica asincrona con Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else if (isFreshLogin && !localUser) {
        // Siamo arrivati da un login ma Supabase non vede la sessione - forza reload
        window.location.reload();
        return;
      }
      setLoading(false);
    });

    // Ascolta i cambiamenti di autenticazione
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Voci del menu della Sidebar
  const navigation = [
    { name: '📊 Dashboard', href: '/dashboard' },
    { name: '✨ Generatore AI', href: '/dashboard/generator' },
    { name: '💬 Chat AI', href: '/dashboard/chat' },
    { name: '📅 Calendario', href: '/dashboard/vision' },
    { name: '🚀 App Create', href: '/dashboard/projects' },
    { name: '💎 Piani e Abbonamento', href: '/pricing' },
    { name: '⚙️ Impostazioni', href: '/dashboard/settings' },
  ];

  return (
    <>
      {/* Meta tag per disabilitare cache browser */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />
      <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* SIDEBAR FISSA - Mostrata su tutte le pagine della dashboard tranne il generatore */}
      {showSidebar && (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Logo */}
            <div className="h-16 flex items-center px-6 border-b border-slate-800/60">
              <Link href="/" className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                ⚡ ZEUSX
              </Link>
            </div>

            {/* Menu di Navigazione */}
            <nav className="p-4 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border border-blue-500/30'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Info Utente */}
          <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
            <div className="flex flex-col items-center gap-2 px-2 py-1">
              <img src="/favicon.png" alt="ZeusX" className="w-16 h-16 rounded-full object-cover" />
              <p className="text-sm font-semibold">by MUSINO</p>
              <span className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded">
                Piano PRO
              </span>
            </div>
          </div>
        </aside>
      )}

      {/* CONTENITORE PRINCIPALE */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER SUPERIORE */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            {/* Pulsante "Torna alla Dashboard" aggiunto se siamo in una pagina secondaria */}
            {isSubPage ? (
              <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition">
                ← Torna alla Dashboard
              </Link>
            ) : (
              <span className="text-xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
                ⚡ ZEUSX
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-white transition">
              Esci
            </Link>
          </div>
        </header>

        {/* AREA DEL CONTENUTO DINAMICO */}
        <main className={`flex-1 overflow-y-auto ${pathname.startsWith('/dashboard/generator') ? 'p-0' : 'p-6 lg:p-8'} bg-slate-950`}>
          {children}
        </main>

      </div>
    </div>
    </>
  );
}