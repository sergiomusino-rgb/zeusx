'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getTablesBySector, SECTOR_LABELS, getAllTables, UITable } from '@/lib/table-config';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LayoutDashboard,
  Sparkles,
  MessageSquare,
  Eye,
  FolderKanban,
  Settings,
  Crown,
  ChevronRight,
  Database,
  ArrowLeft,
  Mic,
  Menu,
  X,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════

const SECTOR_ICONS: Record<string, string> = {
  oculista: '👁️',
  officina: '🔧',
  ristorante: '🍽️',
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface SidebarProps {
  /** ID dell'app selezionata (per filtrare i dati) */
  appId?: string;
  /** Se true, mostra il menu delle tabelle dati */
  showTableNavigation?: boolean;
  /** Callback per tornare alla dashboard principale */
  onBackToDashboard?: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  isActive: boolean;
  isPrimary?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: Check if a path matches the current pathname
// ═══════════════════════════════════════════════════════════════════════════

function isPathActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname.startsWith(href);
}

// ═══════════════════════════════════════════════════════════════════════════
// Sidebar Component
// ═══════════════════════════════════════════════════════════════════════════

export default function Sidebar({
  appId,
  showTableNavigation = false,
  onBackToDashboard,
}: SidebarProps) {
  const pathname = usePathname();
  const { hasFeatureAccess, hasTableAccess } = usePermissions();

  // ─── Main Navigation Items ──────────────────────────────────────────────
  const mainNavItems: NavItem[] = useMemo(
    () => [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: <LayoutDashboard size={18} />,
        isActive: isPathActive(pathname, '/dashboard') && !showTableNavigation,
        isPrimary: true,
      },
      ...(hasFeatureAccess('create_app') ? [{
        label: 'Generatore AI',
        href: '/dashboard/generator',
        icon: <Sparkles size={18} />,
        isActive: isPathActive(pathname, '/dashboard/generator'),
      }] : []),
      ...(hasFeatureAccess('view_analytics') ? [{
        label: 'Chat AI',
        href: '/dashboard/chat',
        icon: <MessageSquare size={18} />,
        isActive: isPathActive(pathname, '/dashboard/chat'),
      }] : []),
      ...(hasFeatureAccess('view_analytics') ? [{
        label: 'Vision AI',
        href: '/dashboard/vision',
        icon: <Eye size={18} />,
        isActive: isPathActive(pathname, '/dashboard/vision'),
      }] : []),
      ...(hasFeatureAccess('view_analytics') ? [{
        label: 'App Create',
        href: '/dashboard/projects',
        icon: <FolderKanban size={18} />,
        isActive: isPathActive(pathname, '/dashboard/projects'),
      }] : []),
      ...(hasFeatureAccess('manage_settings') ? [{
        label: 'Impostazioni',
        href: '/dashboard/settings',
        icon: <Settings size={18} />,
        isActive: isPathActive(pathname, '/dashboard/settings'),
      }] : []),
    ],
    [pathname, showTableNavigation, hasFeatureAccess]
  );

  // ─── Table Navigation Items ─────────────────────────────────────────────
  const sectors = useMemo(() => getTablesBySector(), []);
  const allTables = useMemo(() => getAllTables(), []);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900">
      {/* ── Logo ──────────────────────────────────────────────────────── */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-800/60 px-5">
        <Link
          href="/dashboard"
          className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent"
        >
          ⚡ ZEUSX
        </Link>
        {appId && (
          <span className="ml-auto rounded-md bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
            App
          </span>
        )}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto p-3">
        {/* Back button when in table view */}
        {showTableNavigation && onBackToDashboard && (
          <button
            onClick={onBackToDashboard}
            className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
          >
            <ArrowLeft size={16} />
            Torna alla Dashboard
          </button>
        )}

        {/* Main Navigation */}
        {!showTableNavigation && (
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  item.isActive
                    ? 'border border-indigo-500/30 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-400 shadow-sm shadow-indigo-500/10'
                    : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                <span className="truncate">{item.label}</span>
                {item.isPrimary && item.isActive && (
                  <ChevronRight size={14} className="ml-auto text-indigo-400" />
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Table Navigation (divider + sectors) */}
        {showTableNavigation && (
          <div className="space-y-4">
            {/* Divider */}
            <div className="flex items-center gap-2 px-3 pt-2">
              <Database size={14} className="text-slate-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Tabelle Dati
              </span>
            </div>

            {/* Sectors */}
            {Object.entries(sectors).map(([sector, tables]) => {
              // Filtra le tabelle in base ai permessi dell'utente
              const visibleTables = tables.filter(table => hasTableAccess(table.name));
              
              if (visibleTables.length === 0) return null;

              return (
                <div key={sector} className="space-y-1">
                  {/* Sector Header */}
                  <div className="flex items-center gap-2 px-3 py-1">
                    <span className="text-sm">{SECTOR_ICONS[sector] || '📊'}</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      {SECTOR_LABELS[sector] || sector}
                    </span>
                  </div>

                  {/* Table Links */}
                  {visibleTables.map((table) => {
                    const tablePath = `/dashboard/${table.name}`;
                    const isActive = pathname === tablePath;

                    return (
                      <Link
                        key={table.name}
                        href={tablePath}
                        className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                          isActive
                            ? 'border-l-2 border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium'
                            : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex-shrink-0 text-base">{table.icon}</span>
                        <span className="truncate">{table.labelPlural}</span>
                      </Link>
                    );
                  })}
                </div>
              );
            })}

            {/* Empty state */}
            {allTables.length === 0 && (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-slate-500">
                  Nessuna tabella disponibile.
                  <br />
                  Crea un'app dal Generatore AI.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Quick access to Pricing when not in table view */}
        {!showTableNavigation && (
          <div className="mt-4 border-t border-slate-800/60 pt-3">
            <Link
              href="/pricing"
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                isPathActive(pathname, '/pricing')
                  ? 'border border-amber-500/30 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-400'
                  : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-white'
              }`}
            >
              <Crown size={18} />
              <span>Piani e Abbonamento</span>
            </Link>
          </div>
        )}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className="border-t border-slate-800/60 bg-slate-950/40 p-4">
        <div className="flex flex-col items-center gap-2">
          <img
            src="/favicon.png"
            alt="ZeusX"
            className="h-14 w-14 rounded-full object-cover"
          />
          <p className="text-xs font-semibold text-slate-400">by MUSINO</p>
          <span className="rounded-md bg-indigo-500/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            Piano PRO
          </span>
        </div>
      </div>
    </aside>
  );
}