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
  sidebarBg?: string;
  sidebarText?: string;
  sidebarHoverBg?: string;
}

// ============================================================================
// Component
// ============================================================================

export default function AppSidebar({
  tables,
  showTableNavigation = false,
  onBackToDashboard,
  onClose,
  sidebarBg = '#1e293b',
  sidebarText = '#e2e8f0',
  sidebarHoverBg = '#334155',
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
      
      <aside 
        className="flex h-full w-64 flex-col border-r"
        style={{
          backgroundColor: sidebarBg,
          borderColor: sidebarBg === '#1e293b' ? '#334155' : `${sidebarBg}40`,
          color: sidebarText,
        }}
      >
        {/* Mobile Close Button */}
        {onClose && (
          <div 
            className="flex items-center justify-between border-b px-5 py-4 md:hidden"
            style={{ borderColor: `${sidebarText}20` }}
          >
            <span 
              className="text-lg font-black tracking-wider"
              style={{ 
                background: `linear-gradient(to right, ${sidebarText}, ${sidebarText}99)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              ⚡ ZEUSX
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 transition-colors"
              style={{ 
                color: `${sidebarText}99`,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${sidebarText}20`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              aria-label={t('sidebar_close_menu')}
            >
              <X size={22} />
            </button>
          </div>
        )}

        {/* Logo (desktop) */}
        <div 
          className="hidden h-16 items-center gap-2 border-b px-5 md:flex"
          style={{ borderColor: `${sidebarText}20` }}
        >
          <Link
            href={`/a/${slug}/app`}
            className="text-xl font-black tracking-wider"
            style={{ 
              background: `linear-gradient(to right, ${sidebarText}, ${sidebarText}99)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
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
              className="mb-3 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
              style={{ 
                color: `${sidebarText}99`,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${sidebarText}15`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
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
                <Database size={14} style={{ color: `${sidebarText}60` }} />
                <span 
                  className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: `${sidebarText}60` }}
                >
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
                    className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all"
                    style={{
                      borderLeft: isActive ? `2px solid ${sidebarText}` : '2px solid transparent',
                      backgroundColor: isActive ? `${sidebarText}15` : 'transparent',
                      color: isActive ? sidebarText : `${sidebarText}99`,
                      fontWeight: isActive ? 500 : 400,
                    }}
                    onMouseEnter={(e) => { 
                      if (!isActive) e.currentTarget.style.backgroundColor = `${sidebarText}15`; 
                    }}
                    onMouseLeave={(e) => { 
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; 
                    }}
                  >
                    <span className="flex-shrink-0 text-base">
                      {TABLE_ICONS[table.name] || <Database size={18} />}
                    </span>
                    <span className="truncate">{table.labelPlural}</span>
                    {readOnly && (
                      <span 
                        className="ml-auto text-[10px]"
                        style={{ color: `${sidebarText}60` }}
                      >
                        (Sola Lettura)
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Empty state */}
              {filteredTables.length === 0 && (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs" style={{ color: `${sidebarText}60` }}>
                    {t('sidebar_no_tables_access')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Admin Settings Link */}
          <div className="mt-4 space-y-1">
            <div className="flex items-center gap-2 px-3 pt-2">
              <Settings size={14} style={{ color: `${sidebarText}60` }} />
              <span 
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: `${sidebarText}60` }}
              >
                Amministrazione
              </span>
            </div>
            <Link
              href={`/a/${slug}/admin`}
              onClick={onClose ? () => setTimeout(() => onClose(), 150) : undefined}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all"
              style={{
                borderLeft: pathname === `/a/${slug}/admin` ? `2px solid ${sidebarText}` : '2px solid transparent',
                backgroundColor: pathname === `/a/${slug}/admin` ? `${sidebarText}15` : 'transparent',
                color: pathname === `/a/${slug}/admin` ? sidebarText : `${sidebarText}99`,
                fontWeight: pathname === `/a/${slug}/admin` ? 500 : 400,
              }}
              onMouseEnter={(e) => { 
                if (pathname !== `/a/${slug}/admin`) e.currentTarget.style.backgroundColor = `${sidebarText}15`; 
              }}
              onMouseLeave={(e) => { 
                if (pathname !== `/a/${slug}/admin`) e.currentTarget.style.backgroundColor = 'transparent'; 
              }}
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