'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import AppSidebarLayout from '@/components/shared/AppSidebarLayout';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // Controlla se siamo in una pagina [table] della dashboard
  const isTablePage = pathname.match(/^\/dashboard\/(patients|appointments|customers|vehicles|jobs|dishes|reservations)$/);
  const showTableNav = Boolean(isTablePage);
  const isSubPage = pathname.startsWith('/dashboard/') && pathname !== '/dashboard';

  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <AppSidebarLayout
      showTableNavigation={showTableNav}
      onBackToDashboard={handleBackToDashboard}
    >
      {/* Header personalizzato per dashboard */}
      <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 backdrop-blur lg:px-6">
        <div className="flex items-center gap-4">
          {isSubPage ? (
            <button
              onClick={handleBackToDashboard}
              className="flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
            >
              ← Torna alla Dashboard
            </button>
          ) : (
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-lg font-black tracking-wider text-transparent lg:text-xl">
              ⚡ ZEUSX
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="text-xs text-slate-400 transition-colors hover:text-white"
          >
            Esci
          </button>
        </div>
      </header>

      {/* Contenuto della pagina */}
      <main
        className={`flex-1 overflow-y-auto bg-slate-950 ${
          pathname.startsWith('/dashboard/generator') ? 'p-0' : 'p-4 lg:p-6 xl:p-8'
        }`}
      >
        {children}
      </main>
    </AppSidebarLayout>
  );
}
