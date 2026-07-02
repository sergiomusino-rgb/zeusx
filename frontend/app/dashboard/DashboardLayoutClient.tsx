'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/layout/AuthGuard';
import { Menu, X } from 'lucide-react';

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Controlla se siamo in una pagina [table] della dashboard
  const isTablePage = pathname.match(/^\/dashboard\/(patients|appointments|customers|vehicles|jobs|dishes|reservations)$/);
  const showTableNav = Boolean(isTablePage);
  const isSubPage = pathname.startsWith('/dashboard/') && pathname !== '/dashboard';

  // Evita hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Chiudi sidebar quando cambia route su mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - Desktop: always visible, Mobile: slide-in */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
            lg:relative lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          {/* Close button for mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute right-2 top-2 z-10 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <X size={20} />
          </button>

          <Sidebar
            showTableNavigation={showTableNav}
            onBackToDashboard={handleBackToDashboard}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/40 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-4">
              {/* Hamburger menu button - visible only on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                aria-label="Apri menu"
              >
                <Menu size={24} />
              </button>

              {isSubPage ? (
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-white"
                >
                  ← Torna alla Dashboard
                </Link>
              ) : (
                <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-lg font-black tracking-wider text-transparent lg:text-xl">
                  ⚡ ZEUSX
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

          {/* Scrollable Content */}
          <main
            className={`flex-1 overflow-y-auto bg-slate-950 ${
              pathname.startsWith('/dashboard/generator') ? 'p-0' : 'p-4 lg:p-6 xl:p-8'
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
