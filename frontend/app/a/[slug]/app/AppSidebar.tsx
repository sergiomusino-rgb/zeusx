'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/src/lib/AuthContext';
import { useLanguage } from '@/src/lib/LanguageContext';
import type { TableDef } from './table-definitions';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Database,
  ArrowLeft,
  X,
  ChevronRight,
  Settings,
} from 'lucide-react';

// ============================================================================
// Icons
// ============================================================================

const TABLE_ICONS: Record<string, React.ReactNode> = {
  ordini: <ShoppingCart size={18} />,
  prodotti: <Package size={18} />,
  clienti: <Users size={18} />,
  magazzino: <Database size={18} />,
};

// ============================================================================
// Props
// ============================================================================

interface AppSidebarProps {
  tables: TableDef[];
  showTableNavigation?: boolean;
  onBackToDashboard?: () => void;
  onClose?: () => void;
}

// ============================================================================
// Component
// ============================================================================

export default function AppSidebar({
  tables,
  showTableNavigation = false,
  onBackToDashboard,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { role } = useAuth();

  // Filtra le tabelle in base al ruolo
  const filteredTables = useMemo(() => {
    if (!role) return [];
    
    // Permessi per ruolo
    const ROLE_PERMISSIONS: Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>> = {
      admin: {
        clienti: { read: true, write: true, delete: true },
        prodotti: { read: true, write: true, delete: true },
        ordini: { read: true, write: true, delete: true },
        magazzino: { read: true, write: true, delete: true },
      },
      agent: {
        ordini: { read: true, write: true, delete: true },
        prodotti: { read: true, write: false, delete: false },
        clienti: { read: true, write: false, delete: false },
        magazzino: { read: false, write: false, delete: false },
      },
      viewer: {
        clienti: { read: true, write: false, delete: false },
        prodotti: { read: true, write: false, delete: false },
        ordini: { read: true, write: false, delete: false },
        magazzino: { read: true, write: false, delete: false },
      },
      editor: {
        clienti: { read: true, write: true, delete: true },
        prodotti: { read: true, write: true, delete: true },
        ordini: { read: true, write: true, delete: true },
        magazzino: { read: true, write: true, delete: true },
      },
    };
    
    return tables.filter(table => {
      const perms = ROLE_PERMISSIONS[role]?.[table.name];
      return perms?.read === true;
    });
  }, [tables, role]);

  // Verifica se una tabella è in sola lettura
  const isTableReadOnly = (tableName: string): boolean => {
    if (!role) return true;
    
    const ROLE_PERMISSIONS: Record<string, Record<string, { read: boolean; write: boolean; delete: boolean }>> = {
      admin: {
        clienti: { read: true, write: true, delete: true },
        prodotti: { read: true, write: true, delete: true },
        ordini: { read: true, write: true, delete: true },
        magazzino: { read: true, write: true, delete: true },
      },
      agent: {
        ordini: { read: true, write: true, delete: true },
        prodotti: { read: true, write: false, delete: false },
        clienti: { read: true, write: false, delete: false },
        magazzino: { read: false, write: false, delete: false },
      },
      viewer: {
        clienti: { read: true, write: false, delete: false },
        prodotti: { read: true, write: false, delete: false },
        ordini: { read: true, write: false, delete: false },
        magazzino: { read: true, write: false, delete: false },
      },
      editor: {
        clienti: { read: true, write: true, delete: true },
        prodotti: { read: true, write: true, delete: true },
        ordini: { read: true, write: true, delete: true },
        magazzino: { read: true, write: true, delete: true },
      },
    };
    
    const perms = ROLE_PERMISSIONS[role]?.[tableName];
    return perms ? !perms.write : true;
  };

  // Estrai lo slug dalla pathname
  const slug = useMemo(() => {
    const match = pathname.match(/\/a\/([^/]+)/);
    return match?.[1] || '';
  }, [pathname]);

  return (
    <>
      <style jsx>{`
        .scrollbar-dark::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-dark::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-dark::-webkit-scrollbar-thumb {
          background: rgba(71, 85, 105, 0.5);
          border-radius: 3px;
        }
        .scrollbar-dark::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 116, 139, 0.7);
        }
        .scrollbar-dark {
          scrollbar-width: thin;
          scrollbar-color: rgba(71, 85, 105, 0.5) transparent;
        }
      `}</style>
      
      <aside className="flex h-full w-64 flex-col border-r border-slate-800 bg-slate-900">
        {/* Mobile Close Button */}
        {onClose && (
          <div className="flex items-center justify-between border-b border-slate-800/60 px-5 py-4 md:hidden">
            <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-lg font-black tracking-wider text-transparent">
              ⚡ ZEUSX
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
              aria-label={t('sidebar_close_menu')}
            >
              <X size={22} />
            </button>
          </div>
        )}

        {/* Logo (desktop) */}
        <div className="hidden h-16 items-center gap-2 border-b border-slate-800/60 px-5 md:flex">
          <Link
            href={`/a/${slug}/app`}
            className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-xl font-black tracking-wider text-transparent"
          >
            ⚡ ZEUSX
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 scrollbar-dark">
          {/* Back button when in table view */}
          {showTableNavigation && onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800/50 hover:text-white"
            >
              <ArrowLeft size={16} />
              {t('sidebar_back_to_dashboard')}
            </button>
          )}

          {/* Table Navigation */}
          {showTableNavigation && (
            <div className="space-y-4">
              {/* Divider */}
              <div className="flex items-center gap-2 px-3 pt-2">
                <Database size={14} className="text-slate-500" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {t('sidebar_tables')}
                </span>
              </div>

              {/* Table Links */}
              {filteredTables.map((table) => {
                const tablePath = `/a/${slug}/app/${table.name}`;
                const isActive = pathname === tablePath;
                const readOnly = isTableReadOnly(table.name);

                return (
                  <Link
                    key={table.name}
                    href={tablePath}
                    onClick={onClose ? () => setTimeout(() => onClose(), 150) : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                      isActive
                        ? 'border-l-2 border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium'
                        : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                    }`}
                  >
                    <span className="flex-shrink-0 text-base">
                      {TABLE_ICONS[table.name] || <Database size={18} />}
                    </span>
                    <span className="truncate">{table.labelPlural}</span>
                    {readOnly && (
                      <span className="ml-auto text-[10px] text-slate-500">(Sola Lettura)</span>
                    )}
                  </Link>
                );
              })}

              {/* Empty state */}
              {filteredTables.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-slate-500">
                    {t('sidebar_no_tables_access')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Admin Settings Link */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2 px-3 pt-2">
              <Settings size={14} className="text-slate-500" />
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                Amministrazione
              </span>
            </div>
            <Link
              href={`/a/${slug}/admin`}
              onClick={onClose ? () => setTimeout(() => onClose(), 150) : undefined}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all ${
                pathname === `/a/${slug}/admin`
                  ? 'border-l-2 border-indigo-500 bg-indigo-500/10 text-indigo-400 font-medium'
                  : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
              }`}
            >
              <Settings size={18} />
              <span>Configurazione Aziendale</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}