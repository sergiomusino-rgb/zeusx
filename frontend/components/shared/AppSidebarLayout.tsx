'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import AuthGuard from '@/components/layout/AuthGuard';
import { Menu, X } from 'lucide-react';

interface AppSidebarLayoutProps {
  children: React.ReactNode;
  /** Se true, mostra la navigazione delle tabelle */
  showTableNavigation?: boolean;
  /** Callback per tornare alla dashboard */
  onBackToDashboard?: () => void;
}

export default function AppSidebarLayout({
  children,
  showTableNavigation = false,
  onBackToDashboard,
}: AppSidebarLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chiudi sidebar quando cambia route su mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleBack = useCallback(() => {
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      router.push('/dashboard');
    }
  }, [onBackToDashboard, router]);

  return (
    <AuthGuard requireTenant redirectTo="/login">
      {/* Meta tag per disabilitare cache browser */}
      <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
      <meta httpEquiv="Pragma" content="no-cache" />
      <meta httpEquiv="Expires" content="0" />

      <div className="flex min-h-screen bg-slate-950 text-white">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <div
          className={`
            fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:hidden
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex h-full flex-col border-r border-slate-800 bg-slate-900">
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                showTableNavigation={showTableNavigation}
                onBackToDashboard={handleBack}
                onLinkClick={() => setSidebarOpen(false)}
              />
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-2 top-2 rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800 bg-slate-900">
          <div className="flex-1 overflow-y-auto">
            <Sidebar
              showTableNavigation={showTableNavigation}
              onBackToDashboard={handleBack}
              onLinkClick={() => setSidebarOpen(false)}
            />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 lg:ml-64">
          {/* Header fisso */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 backdrop-blur lg:px-6">
            <div className="flex items-center gap-4">
              {/* Hamburger menu button - visible only on mobile */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
                aria-label="Apri menu"
              >
                <Menu size={24} />
              </button>

              <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-lg font-black tracking-wider text-transparent lg:text-xl">
                ⚡ ZEUSX
              </span>
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

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto bg-slate-950 p-4 lg:p-6 xl:p-8">
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
