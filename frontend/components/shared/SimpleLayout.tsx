'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';

interface SimpleLayoutProps {
  children: React.ReactNode;
  showBackButton?: boolean;
  backHref?: string;
  title?: string;
}

export default function SimpleLayout({
  children,
  showBackButton = false,
  backHref = '/dashboard',
  title,
}: SimpleLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-slate-400">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/40 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Apri menu"
          >
            <Menu size={24} />
          </button>
          <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-lg font-black tracking-wider text-transparent">
            ⚡ ZEUSX
          </span>
        </div>
      </header>

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
          <div className="flex h-16 items-center justify-between border-b border-slate-800/60 px-5">
            <Link href="/dashboard" className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent">
              ⚡ ZEUSX
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {showBackButton && (
              <Link
                href={backHref}
                className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                ← Torna alla Dashboard
              </Link>
            )}
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                Piani e Abbonamento
              </Link>
            </div>
          </nav>
          <div className="border-t border-slate-800/60 bg-slate-950/40 p-4">
            <div className="flex flex-col items-center gap-2">
              <img src="/favicon.png" alt="ZeusX" className="h-12 w-12 rounded-full object-cover" />
              <p className="text-xs font-semibold text-slate-400">by MUSINO</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-slate-800 bg-slate-900">
          <div className="flex h-16 items-center border-b border-slate-800/60 px-5">
            <Link href="/dashboard" className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent">
              ⚡ ZEUSX
            </Link>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {showBackButton && (
              <Link
                href={backHref}
                className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                ← Torna alla Dashboard
              </Link>
            )}
            <div className="space-y-1">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                Dashboard
              </Link>
              <Link
                href="/pricing"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
              >
                Piani e Abbonamento
              </Link>
            </div>
          </nav>
          <div className="border-t border-slate-800/60 bg-slate-950/40 p-4">
            <div className="flex flex-col items-center gap-2">
              <img src="/favicon.png" alt="ZeusX" className="h-12 w-12 rounded-full object-cover" />
              <p className="text-xs font-semibold text-slate-400">by MUSINO</p>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64">
          <div className="min-h-screen">
            {title && (
              <div className="hidden lg:block border-b border-slate-800 bg-slate-900/40 px-8 py-4 backdrop-blur">
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
            )}
            <div className="p-4 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}