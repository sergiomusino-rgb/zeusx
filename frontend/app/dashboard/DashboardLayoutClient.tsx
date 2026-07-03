'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/layout/AuthGuard';

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

  // Determine if the sidebar should be shown
  const shouldShowSidebar = pathname === '/dashboard';

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleBackToDashboard = useCallback(() => {
    router.push('/dashboard');
  }, [router]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <div className="text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <AuthGuard requireTenant redirectTo="/login">
      {/* Meta tag per disabilitare cache browser */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />

      <div className="flex h-screen overflow-hidden bg-slate-950 text-white">
        {/* Sidebar - Conditionally rendered */}
        {shouldShowSidebar && (
          <Sidebar
            showTableNavigation={showTableNav}
            onBackToDashboard={handleBackToDashboard}
          />
        )}

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          {!(pathname.startsWith('/dashboard/generator') || pathname.startsWith('/dashboard/projects') || pathname.startsWith('/dashboard/vision') || pathname.startsWith('/dashboard/settings')) && (
            <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-6 backdrop-blur">
              <div className="flex items-center gap-4">
                {isSubPage ? (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                  >
                    ← Torna alla Dashboard
                  </Link>
                ) : (
                    <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent">
                      ⚡ Dashboard
                    </span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-xs text-slate-400 transition-colors hover:text-white"
                >
                  Esci
                </Link>
              </div>
            </header>
          )}

          {/* Scrollable Content */}
          <main
            className={`flex-1 overflow-y-auto bg-slate-950 ${
              pathname.startsWith('/dashboard/generator') || pathname.startsWith('/dashboard/projects') || pathname.startsWith('/dashboard/vision') || pathname.startsWith('/dashboard/settings') ? 'p-0' : 'p-6 lg:p-8'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
