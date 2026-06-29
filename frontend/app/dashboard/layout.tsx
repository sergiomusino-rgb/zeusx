'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  
  // Controlla se siamo esattamente nella pagina del generatore
  const isGeneratorPage = pathname === '/dashboard/generator';

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
    <div className="flex h-screen bg-slate-950 text-white font-sans overflow-hidden">
      
      {/* SIDEBAR FISSA - Mostrata solo se NON siamo nel generatore */}
      {!isGeneratorPage && (
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
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
            {/* Pulsante "Torna alla Dashboard" aggiunto se siamo nel generatore */}
            {isGeneratorPage ? (
              <Link href="/dashboard" className="text-sm font-medium text-slate-400 hover:text-white flex items-center gap-2 transition">
                ← Torna alla Dashboard
              </Link>
            ) : (
              <span className="text-xl font-black md:hidden tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
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
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-slate-950">
          {children}
        </main>

      </div>
    </div>
  );
}