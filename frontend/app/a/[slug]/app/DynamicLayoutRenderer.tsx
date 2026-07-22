'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Package, ShoppingCart, Database,
  Settings, LogOut, Search, Plus, Pencil, Trash2, X, ChevronDown,
  Download, Upload, FileText, FileSpreadsheet, MessageSquare, Mail, MessageCircle,
  Settings2, Menu, TrendingUp, AlertTriangle, Star, StarHalf, Heart, HeartPulse,
  BarChart3, Activity, Globe, MapPin, Calendar as CalendarIcon, Clock, CheckCircle,
  XCircle, Tag, Code, BookOpen, HelpCircle, ExternalLink, Copy, RefreshCw
} from 'lucide-react';
import { TableDef, fieldName } from './table-definitions';
import { DesignLayout, DesignComponent } from './DesignParser';
import { getDesignTokens, type DesignTokens } from '@/lib/designTokens';

// ─── Props Interface ───────────────────────────────────────────────────────

interface DynamicLayoutRendererProps {
  layoutType: 'docs' | 'ecommerce' | 'saas' | 'recipe' | 'restaurant' | 'custom';
  primaryColor: string;
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  companyName: string;
  logoUrl: string;
  tables: TableDef[];
  activeView: string;
  setActiveView: (view: string) => void;
  onLogout: () => void;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  session?: any;
  customTables?: any[];
  activeCustomTable?: any;
  records?: any[];
  recordsLoading?: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  loadRecords?: (tableName: string) => void;
  designComponents?: DesignComponent[];
  onEditTable?: (table: TableDef) => void;
}

// ─── Theme Helpers ───────────────────────────────────────────────────────────

function getThemeVars(theme: 'dark' | 'light', primaryColor: string) {
  const isDark = theme === 'dark';
  return {
    bg: isDark ? '#0a0e1a' : '#f8fafc',
    text: isDark ? '#ffffff' : '#0f172a',
    textSecondary: isDark ? '#94a3b8' : '#64748b',
    cardBg: isDark ? '#1e293b' : '#ffffff',
    cardBgAlt: isDark ? '#162032' : '#f1f5f9',
    border: isDark ? '#334155' : '#e2e8f0',
    sidebarBg: isDark ? '#0f172a' : '#1e293b',
    sidebarText: '#e2e8f0',
    sidebarHover: isDark ? '#1e293b' : '#334155',
    inputBg: isDark ? '#0f172a' : '#f1f5f9',
    inputBorder: isDark ? '#334155' : '#cbd5e1',
    primary: primaryColor,
    primaryHover: primaryColor + 'dd',
    danger: '#ef4444',
    success: '#22c55e',
    warning: '#f59e0b',
  };
}

// ─── Icon Resolver (module-level: usato anche dai *LayoutContent sotto) ─────

function resolveIcon(iconName: string) {
  const ICON_MAP: Record<string, React.ReactNode> = {
    users: <Users size={18} />,
    orders: <ShoppingCart size={18} />,
    products: <Package size={18} />,
    invoices: <FileText size={18} />,
    dashboard: <LayoutDashboard size={18} />,
    default: <LayoutDashboard size={18} />,
    docs: <BookOpen size={18} />,
    api: <Code size={18} />,
    method: <Tag size={18} />,
    endpoint: <Globe size={18} />,
    product: <Package size={18} />,
    cart: <ShoppingCart size={18} />,
    recipe: <Heart size={18} />,
    ingredient: <List size={18} />,
    step: <CheckCircle size={18} />,
    restaurant: <Utensils size={18} />,
    menu: <Menu size={18} />,
    dish: <Utensils size={18} />,
  };
  return ICON_MAP[iconName?.toLowerCase() || 'default'] || ICON_MAP.default;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function DynamicLayoutRenderer({
  layoutType,
  primaryColor,
  colors,
  designTokens = getDesignTokens(),
  companyName,
  logoUrl,
  tables,
  activeView,
  setActiveView,
  onLogout,
  showSettings,
  setShowSettings,
  session,
  customTables = [],
  activeCustomTable,
  records = [],
  recordsLoading = false,
  searchQuery,
  setSearchQuery,
  onEdit,
  onDelete,
  onAddNew,
  loadRecords,
  designComponents = [],
  onEditTable,
}: DynamicLayoutRendererProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [importazioniOpen, setImportazioniOpen] = useState(false);
  const [comunicazioniOpen, setComunicazioniOpen] = useState(false);

  const activeTable = tables.find((t) => t.name === activeView) || null;
  const activeCustomTableData = customTables.find((t: any) => `custom_${t.name}` === activeView) || null;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const getViewLabel = (view: string): string => {
    const labels: Record<string, string> = {
      import_csv: 'Importa CSV',
      export_csv: 'Esporta CSV',
      import_pdf: 'Importa PDF',
      export_pdf: 'Esporta PDF',
      import_excel: 'Importa Excel',
      export_excel: 'Esporta Excel',
      import_json: 'Importa JSON',
      export_json: 'Esporta JSON',
    };
    return labels[view] || view;
  };


  const handleTableClick = (tableName: string) => {
    setActiveView(tableName);
    if (loadRecords) {
      loadRecords(tableName);
    }
  };

  // Render based on layout type
  const renderContent = () => {
    switch (layoutType) {
      case 'docs':
        return (
          <DocsLayoutContent
            companyName={companyName}
            tables={tables}
            colors={colors}
            designTokens={designTokens}
            primaryColor={primaryColor}
            activeView={activeView}
            setActiveView={setActiveView}
            activeTable={activeTable}
            activeCustomTableData={activeCustomTableData}
            records={records}
            loading={recordsLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
            designComponents={designComponents}
          />
        );
      case 'ecommerce':
        return (
          <EcommerceLayoutContent
            companyName={companyName}
            tables={tables}
            colors={colors}
            designTokens={designTokens}
            primaryColor={primaryColor}
            activeView={activeView}
            setActiveView={setActiveView}
            activeTable={activeTable}
            activeCustomTableData={activeCustomTableData}
            records={records}
            loading={recordsLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
          />
        );
      case 'recipe':
        return (
          <RecipeLayoutContent
            companyName={companyName}
            tables={tables}
            colors={colors}
            designTokens={designTokens}
            primaryColor={primaryColor}
            activeView={activeView}
            activeTable={activeTable}
            records={records}
            loading={recordsLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
          />
        );
      case 'restaurant':
        return (
          <RestaurantLayoutContent
            companyName={companyName}
            tables={tables}
            colors={colors}
            designTokens={designTokens}
            primaryColor={primaryColor}
            activeView={activeView}
            activeTable={activeTable}
            records={records}
            loading={recordsLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
          />
        );
      default:
        return (
          <SaaSLayoutContent
            companyName={companyName}
            tables={tables}
            colors={colors}
            designTokens={designTokens}
            primaryColor={primaryColor}
            activeView={activeView}
            setActiveView={setActiveView}
            activeTable={activeTable}
            activeCustomTableData={activeCustomTableData}
            records={records}
            loading={recordsLoading}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddNew={onAddNew}
          />
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, transition: 'background 0.3s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 15, transition: 'opacity 0.3s',
          }}
        />
      )}

      {/* Sidebar */}
      {(!isMobile || sidebarOpen) && (
        <aside
          style={{
            background: colors.sidebarBg,
            borderRight: '1px solid #334155',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: colors.sidebarText,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.3s, transform 0.3s',
            position: 'relative',
            zIndex: 20,
            flexShrink: 0,
            width: '280px',
            ...(isMobile ? {
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              boxShadow: '4px 0 24px rgba(0,0,0,0.3)',
            } : {}),
          }}
        >
          {/* Logo */}
          <div style={{
            padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ height: '80px', width: '80px', borderRadius: '12px', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '80px', height: '80px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '32px',
              }}>
                {companyName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Nav Items */}
          <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {/* Dashboard */}
            <SidebarItem
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              active={activeView === 'dashboard'}
              onClick={() => setActiveView('dashboard')}
              colors={colors}
              primaryColor={primaryColor}
            />

            {/* Tables */}
            {tables.map((table) => (
              <div key={table.name} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <SidebarItem
                    icon={resolveIcon(table.icon || '')}
                    label={table.labelPlural}
                    active={activeView === table.name}
                    onClick={() => handleTableClick(table.name)}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTable?.(table);
                  }}
                  title="Modifica tabella"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none', borderRadius: '6px',
                    padding: '4px', cursor: 'pointer',
                    color: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center',
                    marginRight: '8px', flexShrink: 0,
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
                >
                  <Settings2 size={14} />
                </button>
              </div>
            ))}

            {/* Custom Tables */}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ padding: '0 14px 8px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Personalizzate
              </div>
              {customTables?.map((ct: any) => (
                <SidebarItem
                  key={`custom_${ct.name}`}
                  icon={<LayoutDashboard size={18} />}
                  label={ct.labelPlural || ct.label + 'i'}
                  active={activeView === `custom_${ct.name}`}
                  onClick={() => setActiveView(`custom_${ct.name}`)}
                  colors={colors}
                  primaryColor={primaryColor}
                />
              ))}
            </div>

            {/* Comunicazioni - Collapsible */}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <button
                onClick={() => setComunicazioniOpen(!comunicazioniOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: 'transparent', color: colors.sidebarText,
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  width: '100%', textTransform: 'uppercase',
                  letterSpacing: '0.05em', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <MessageSquare size={14} />
                <span style={{ flex: 1, textAlign: 'left' }}>Comunicazioni</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: comunicazioniOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
              {comunicazioniOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  <SidebarItem
                    icon={<MessageSquare size={18} />}
                    label="Provider SDI"
                    active={false}
                    onClick={() => window.open('https://www.sdi.agenziaentrate.gov.it', '_blank')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<Mail size={18} />}
                    label="Email"
                    active={false}
                    onClick={() => window.open('https://mail.google.com', '_blank')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<MessageCircle size={18} />}
                    label="WhatsApp"
                    active={false}
                    onClick={() => window.open('https://wa.me/393331234567', '_blank')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                </div>
              )}
            </div>

            {/* Importazioni - Collapsible */}
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
              <button
                onClick={() => setImportazioniOpen(!importazioniOpen)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 14px', borderRadius: '8px', border: 'none',
                  background: 'transparent', color: colors.sidebarText,
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  width: '100%', textTransform: 'uppercase',
                  letterSpacing: '0.05em', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Upload size={14} />
                <span style={{ flex: 1, textAlign: 'left' }}>Importazioni</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: importazioniOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s',
                  }}
                />
              </button>
              {importazioniOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  <SidebarItem
                    icon={<Upload size={18} />}
                    label="Importa CSV"
                    active={activeView === 'import_csv'}
                    onClick={() => setActiveView('import_csv')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<Download size={18} />}
                    label="Esporta CSV"
                    active={activeView === 'export_csv'}
                    onClick={() => setActiveView('export_csv')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                </div>
              )}
            </div>
          </nav>

          {/* Bottom actions */}
          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <SidebarItem
              icon={<Settings size={18} />}
              label="Impostazioni"
              active={false}
              onClick={() => setShowSettings(true)}
              colors={colors}
              primaryColor={primaryColor}
            />
            <SidebarItem
              icon={<LogOut size={18} />}
              label="Logout"
              active={false}
              onClick={onLogout}
              colors={colors}
              primaryColor={colors.danger}
            />
          </div>

          {/* Brand Footer */}
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.2)', textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600, margin: 0 }}>
              ZeusX <span style={{ color: 'rgba(255,255,255,0.6)' }}>by</span> <span style={{ color: '#ffffff', fontWeight: 700 }}>MUSINO</span>
            </p>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar (mobile toggle) */}
        <header style={{
          padding: '16px 24px', borderBottom: `2px solid ${primaryColor}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: colors.cardBg,
          position: 'relative',
        }}>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textSecondary, padding: '4px',
              display: 'block',
              position: 'absolute',
              left: '24px',
            }}
          >
            <Menu size={22} />
          </button>
          <div style={{ color: colors.text, fontSize: '16px', fontWeight: 700 }}>
            {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || activeCustomTable?.labelPlural || (activeView.startsWith('import_') || activeView.startsWith('export_') ? getViewLabel(activeView) : companyName)}
          </div>
          <div style={{ width: '30px', position: 'absolute', right: '24px' }} />
        </header>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

// ─── SidebarItem Component ────────────────────────────────────────────────────

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  colors: ReturnType<typeof getThemeVars>;
  primaryColor: string;
}

function SidebarItem({ icon, label, active, onClick, colors, primaryColor }: SidebarItemProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '10px 14px', borderRadius: '8px', border: 'none',
        background: active
          ? '#EFF6FF'
          : hovered
            ? '#F4F4F5'
            : 'transparent',
        color: active ? '#2563EB' : '#18181B',
        fontSize: '14px', fontWeight: active ? 600 : 500,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '2px', height: '20px', borderRadius: '0 2px 2px 0',
          background: '#2563EB',
        }} />
      )}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}

// ─── Docs Layout Content Component ───────────────────────────────────────────

interface DocsLayoutContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  primaryColor: string;
  activeView: string;
  setActiveView: (view: string) => void;
  activeTable: TableDef | null;
  activeCustomTableData: any;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  designComponents: DesignComponent[];
}

function DocsLayoutContent({
  companyName, tables, colors, designTokens = getDesignTokens(), primaryColor,
  activeView, setActiveView, activeTable, activeCustomTableData,
  records, loading, searchQuery, setSearchQuery,
  onEdit, onDelete, onAddNew, designComponents
}: DocsLayoutContentProps) {
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const appEl = document.querySelector('[data-app-id]');
        if (!appEl) return;
        const appId = appEl.getAttribute('data-app-id');
        const password = appEl.getAttribute('data-password');
        if (!appId || !password) return;

        let total = 0;
        for (const table of tables) {
          try {
            const res = await fetch(`/api/client/apps/${appId}/records?table=${table.name}`, {
              headers: { Authorization: `Bearer ${password}` },
            });
            if (res.ok) {
              const data = await res.json();
              const recs: any[] = Array.isArray(data) ? data : data.records || data.data || [];
              total += recs.length;
            }
          } catch { /* skip table */ }
        }
        setTotalRecords(total);
      } catch { /* ignore */ }
    }
    loadDashboardData();
  }, [tables]);

  if (activeView === 'dashboard') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '28px', fontWeight: 700, margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
            Overview {companyName}
          </p>
        </div>

        {tables.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #F4F4F5',
              borderRadius: '8px',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <LayoutDashboard size={48} style={{ color: primaryColor, marginBottom: '16px' }} />
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0' }}>
              Benvenuto in {companyName}!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' }}>
              La tua app è pronta per essere utilizzata. Crea tabelle e record per iniziare a gestire i tuoi dati.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <KpiCard
                title="Sezioni attive"
                value={String(tables.length)}
                icon={<LayoutDashboard size={22} />}
                colors={colors}
                designTokens={designTokens}
              />
              <KpiCard
                title="Record Totali"
                value={String(totalRecords)}
                icon={<Database size={22} />}
                colors={colors}
                designTokens={designTokens}
              />
            </div>

            {/* Panoramica sezioni: nomi reali delle entità, mai la parola generica "Tabelle" */}
            <div
              style={{
                background: designTokens.colors['card-bg'] || '#FFFFFF',
                border: `1px solid ${designTokens.colors['border'] || '#F4F4F5'}`,
                borderRadius: designTokens.radii['lg'] || '12px',
                padding: '24px',
                boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)',
              }}
            >
              <h3 style={{ fontFamily: designTokens.fonts.headline, color: designTokens.colors['text'] || '#18181B', fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
                Le tue sezioni
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tables.map((table) => (
                  <div
                    key={table.name}
                    onClick={() => setActiveView(table.name)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: designTokens.radii['md'] || '8px',
                      background: designTokens.colors['card-bg-alt'] || '#FAFAFA',
                      border: `1px solid ${designTokens.colors['border-light'] || '#F4F4F5'}`,
                      cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,24,40,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: designTokens.radii['md'] || '8px',
                        background: `${designTokens.colors['primary'] || primaryColor}1A`,
                        color: designTokens.colors['primary'] || primaryColor,
                      }}>
                        {resolveIcon(table.icon || '')}
                      </div>
                      <span style={{ fontFamily: designTokens.fonts.headline, color: designTokens.colors['text'] || '#18181B', fontSize: '14px', fontWeight: 600 }}>
                        {table.labelPlural || table.label}
                      </span>
                    </div>
                    <span style={{ color: designTokens.colors['text-secondary'] || colors.textSecondary, fontFamily: designTokens.fonts.body, fontSize: '13px' }}>
                      {table.fields?.length || 0} campi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Table view
  if (activeTable) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
              {activeTable.labelPlural}
            </h2>
            {activeTable.color && (
              <div style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: activeTable.color,
              }} />
            )}
          </div>
          <button
            onClick={onAddNew}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '10px', border: 'none',
              background: primaryColor, color: '#fff', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
          >
            <Plus size={16} /> Nuovo
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
              background: designTokens.colors['card-bg'] || colors.cardBg,
              border: `1px solid ${designTokens.colors['border'] || colors.border}`,
              borderRadius: designTokens.radii['md'] || '10px',
              padding: '10px 16px',
            }}
          >
            <Search size={18} style={{ color: colors.textSecondary }} />
            <input
              type="text"
              placeholder={`Cerca in ${activeTable.labelPlural}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                flex: 1, border: 'none', outline: 'none', background: 'transparent',
                color: colors.text, fontSize: '14px',
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '2px' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div
          style={{
            background: designTokens.colors['card-bg'] || colors.cardBg,
            border: `1px solid ${designTokens.colors['border'] || colors.border}`,
            borderRadius: designTokens.radii['lg'] || '12px',
            boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr style={{ background: colors.cardBgAlt }}>
                  {activeTable.fields.map((field) => (
                    <th
                      key={fieldName(field)}
                      style={{
                        textAlign: 'left', padding: '12px 16px',
                        borderBottom: `2px solid ${colors.border}`,
                        color: colors.textSecondary, fontSize: '12px',
                        fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}
                    >
                      {field.label}
                      {field.required && (
                        <span style={{ color: colors.danger, marginLeft: '2px' }}>*</span>
                      )}
                    </th>
                  ))}
                  <th
                    style={{
                      textAlign: 'center', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', width: '100px',
                    }}
                  >
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={(activeTable.fields?.length || 0) + 1}
                      style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                    >
                      Caricamento records...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td
                      colSpan={(activeTable.fields?.length || 0) + 1}
                      style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                    >
                      {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                    </td>
                  </tr>
                ) : (
                  records.map((record, idx) => (
                    <tr
                      key={record.id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {activeTable.fields.map((field) => (
                        <td
                          key={fieldName(field)}
                          style={{
                            padding: '12px 16px', color: colors.text,
                            fontSize: '14px', whiteSpace: 'nowrap',
                            maxWidth: '200px', overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {renderCellValue(record, fieldName(field), field.type)}
                        </td>
                      ))}
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                          <button
                            onClick={() => onEdit(record)}
                            title="Modifica"
                            style={{
                              background: primaryColor + '20', border: 'none',
                              borderRadius: '8px', padding: '6px', cursor: 'pointer',
                              color: primaryColor, display: 'flex', alignItems: 'center',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = primaryColor + '40'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = primaryColor + '20'; }}
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => onDelete(record.id)}
                            title="Elimina"
                            style={{
                              background: colors.danger + '20', border: 'none',
                              borderRadius: '8px', padding: '6px', cursor: 'pointer',
                              color: colors.danger, display: 'flex', alignItems: 'center',
                              transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger + '40'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = colors.danger + '20'; }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer counter */}
          <div
            style={{
              padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}
          >
            <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
              {records.length} record
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Default: show placeholder
  return (
    <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
      Seleziona una voce dal menu
    </div>
  );
}

// ─── KPI Card Component ───────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
}

function KpiCard({ title, value, icon, colors, designTokens = getDesignTokens() }: KpiCardProps) {
  return (
    <div
      style={{
        background: designTokens.colors['card-bg'] || colors.cardBg,
        border: `1px solid ${designTokens.colors['border'] || colors.border}`,
        borderRadius: designTokens.radii['lg'] || '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(16,24,40,0.06), 0 8px 20px rgba(16,24,40,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: designTokens.colors['text-secondary'] || colors.textSecondary, fontFamily: designTokens.fonts.body, fontSize: '14px', fontWeight: 500 }}>{title}</span>
        <div style={{ color: designTokens.colors['primary'] || colors.primary, opacity: 0.85 }}>{icon}</div>
      </div>
      <span style={{ color: designTokens.colors['text'] || colors.text, fontFamily: designTokens.fonts.headline, fontSize: '28px', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ─── E-commerce Layout Content Component ────────────────────────────────────

interface EcommerceLayoutContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  primaryColor: string;
  activeView: string;
  setActiveView: (view: string) => void;
  activeTable: TableDef | null;
  activeCustomTableData: any;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
}

function EcommerceLayoutContent({
  companyName, tables, colors, designTokens = getDesignTokens(), primaryColor,
  activeView, setActiveView, activeTable, activeCustomTableData,
  records, loading, searchQuery, setSearchQuery,
  onEdit, onDelete, onAddNew
}: EcommerceLayoutContentProps) {
  // E-commerce specific layout with product grid
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '28px', fontWeight: 700, margin: 0 }}>
          {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || 'Prodotti'}
        </h1>
      </div>

      {activeView === 'dashboard' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <KpiCard
            title="Prodotti"
            value={String(tables.find(t => t.name === 'prodotti') ? records.length : 0)}
            icon={<Package size={22} />}
            colors={colors}
          />
          <KpiCard
            title="Ordini"
            value={String(tables.find(t => t.name === 'ordini') ? records.length : 0)}
            icon={<ShoppingCart size={22} />}
            colors={colors}
          />
          <KpiCard
            title="Clienti"
            value={String(tables.find(t => t.name === 'clienti') ? records.length : 0)}
            icon={<Users size={22} />}
            colors={colors}
          />
        </div>
      ) : activeTable ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filters */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                style={{
                  padding: '8px 12px', borderRadius: '8px',
                  border: `1px solid ${colors.border}`, background: colors.cardBg,
                  color: colors.text, fontSize: '13px',
                }}
              >
                <option>Tutte le categorie</option>
                <option>Prodotti</option>
                <option>Ordini</option>
                <option>Clienti</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '20px',
          }}>
            {records.slice(0, 12).map((record) => (
              <div
                key={record.id}
                style={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: colors.textSecondary, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                    {activeTable.color ? (
                      <span style={{
                        display: 'inline-block',
                        width: '8px', height: '8px',
                        borderRadius: '50%',
                        background: activeTable.color,
                        marginRight: '6px',
                      }} />
                    ) : null}
                    {activeTable.labelPlural || activeTable.label}
                  </span>
                </div>
                <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>
                  {record.data?.[fieldName(activeTable.fields[0])] || record.id}
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {activeTable.fields.slice(1, 4).map((field) => {
                    const val = record.data?.[fieldName(field)];
                    if (!val) return null;
                    return (
                      <span
                        key={fieldName(field)}
                        style={{
                          padding: '2px 8px', borderRadius: '4px',
                          background: primaryColor + '15', color: primaryColor,
                          fontSize: '11px', fontWeight: 600,
                        }}
                      >
                        {String(val)}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
          Seleziona una tabella per iniziare
        </div>
      )}
    </div>
  );
}

// ─── SaaS Layout Content Component ───────────────────────────────────────────

interface SaaSLayoutContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  primaryColor: string;
  activeView: string;
  setActiveView: (view: string) => void;
  activeTable: TableDef | null;
  activeCustomTableData: any;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
}

function SaaSLayoutContent({
  companyName, tables, colors, designTokens = getDesignTokens(), primaryColor,
  activeView, setActiveView, activeTable, activeCustomTableData,
  records, loading, searchQuery, setSearchQuery,
  onEdit, onDelete, onAddNew
}: SaaSLayoutContentProps) {
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const appEl = document.querySelector('[data-app-id]');
        if (!appEl) return;
        const appId = appEl.getAttribute('data-app-id');
        const password = appEl.getAttribute('data-password');
        if (!appId || !password) return;

        let total = 0;
        for (const table of tables) {
          try {
            const res = await fetch(`/api/client/apps/${appId}/records?table=${table.name}`, {
              headers: { Authorization: `Bearer ${password}` },
            });
            if (res.ok) {
              const data = await res.json();
              const recs: any[] = Array.isArray(data) ? data : data.records || data.data || [];
              total += recs.length;
            }
          } catch { /* skip table */ }
        }
        setTotalRecords(total);
      } catch { /* ignore */ }
    }
    loadDashboardData();
  }, [tables]);

  if (activeView === 'dashboard') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '28px', fontWeight: 700, margin: 0 }}>
            Dashboard
          </h1>
          <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
            Overview {companyName}
          </p>
        </div>

        {tables.length === 0 ? (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #F4F4F5',
              borderRadius: '8px',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <LayoutDashboard size={48} style={{ color: primaryColor, marginBottom: '16px' }} />
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '22px', fontWeight: 700, margin: '0 0 12px 0' }}>
              Benvenuto in {companyName}!
            </h2>
            <p style={{ color: colors.textSecondary, fontSize: '14px', lineHeight: 1.6, maxWidth: '500px', margin: '0 auto' }}>
              La tua app è pronta per essere utilizzata. Crea tabelle e record per iniziare a gestire i tuoi dati.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              <KpiCard
                title="Sezioni attive"
                value={String(tables.length)}
                icon={<LayoutDashboard size={22} />}
                colors={colors}
                designTokens={designTokens}
              />
              <KpiCard
                title="Record Totali"
                value={String(totalRecords)}
                icon={<Database size={22} />}
                colors={colors}
                designTokens={designTokens}
              />
            </div>

            {/* Panoramica sezioni: nomi reali delle entità, mai la parola generica "Tabelle" */}
            <div
              style={{
                background: designTokens.colors['card-bg'] || '#FFFFFF',
                border: `1px solid ${designTokens.colors['border'] || '#F4F4F5'}`,
                borderRadius: designTokens.radii['lg'] || '12px',
                padding: '24px',
                boxShadow: '0 1px 2px rgba(16,24,40,0.04), 0 4px 12px rgba(16,24,40,0.06)',
              }}
            >
              <h3 style={{ fontFamily: designTokens.fonts.headline, color: designTokens.colors['text'] || '#18181B', fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
                Le tue sezioni
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {tables.map((table) => (
                  <div
                    key={table.name}
                    onClick={() => setActiveView(table.name)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 16px', borderRadius: designTokens.radii['md'] || '8px',
                      background: designTokens.colors['card-bg-alt'] || '#FAFAFA',
                      border: `1px solid ${designTokens.colors['border-light'] || '#F4F4F5'}`,
                      cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(16,24,40,0.08)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: '36px', height: '36px', borderRadius: designTokens.radii['md'] || '8px',
                        background: `${designTokens.colors['primary'] || primaryColor}1A`,
                        color: designTokens.colors['primary'] || primaryColor,
                      }}>
                        {resolveIcon(table.icon || '')}
                      </div>
                      <span style={{ fontFamily: designTokens.fonts.headline, color: designTokens.colors['text'] || '#18181B', fontSize: '14px', fontWeight: 600 }}>
                        {table.labelPlural || table.label}
                      </span>
                    </div>
                    <span style={{ color: designTokens.colors['text-secondary'] || colors.textSecondary, fontFamily: designTokens.fonts.body, fontSize: '13px' }}>
                      {table.fields?.length || 0} campi
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Table view - standard CRUD table
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
          {activeTable?.labelPlural || 'Tabella'}
        </h2>
        <button
          onClick={onAddNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: primaryColor, color: '#fff', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <Plus size={16} /> Nuovo
        </button>
      </div>

      {/* Search Bar */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <div
          style={{
            flex: 1, display: 'flex', alignItems: 'center', gap: '8px',
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            padding: '10px 16px',
          }}
        >
          <Search size={18} style={{ color: colors.textSecondary }} />
          <input
            type="text"
            placeholder={`Cerca in ${activeTable?.labelPlural || 'dati'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: colors.text, fontSize: '14px',
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '2px' }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: colors.cardBgAlt }}>
                {activeTable?.fields.map((field) => (
                  <th
                    key={fieldName(field)}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}
                  >
                    {field.label}
                    {field.required && (
                      <span style={{ color: colors.danger, marginLeft: '2px' }}>*</span>
                    )}
                  </th>
                ))}
                <th
                  style={{
                    textAlign: 'center', padding: '12px 16px',
                    borderBottom: `2px solid ${colors.border}`,
                    color: colors.textSecondary, fontSize: '12px',
                    fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.05em', width: '100px',
                  }}
                >
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={(activeTable?.fields?.length || 0) + 1} style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                    Caricamento records...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={(activeTable?.fields?.length || 0) + 1} style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}>
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                  </td>
                </tr>
              ) : (
                records.map((record, idx) => (
                  <tr
                    key={record.id || idx}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {activeTable?.fields.map((field) => (
                      <td
                        key={fieldName(field)}
                        style={{
                          padding: '12px 16px', color: colors.text,
                          fontSize: '14px', whiteSpace: 'nowrap',
                          maxWidth: '200px', overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {renderCellValue(record, fieldName(field), field.type)}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onEdit(record)}
                          title="Modifica"
                          style={{
                            background: primaryColor + '20', border: 'none',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                            color: primaryColor, display: 'flex', alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = primaryColor + '40'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = primaryColor + '20'; }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => onDelete(record.id)}
                          title="Elimina"
                          style={{
                            background: colors.danger + '20', border: 'none',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                            color: colors.danger, display: 'flex', alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger + '40'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = colors.danger + '20'; }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer counter */}
        <div
          style={{
            padding: '12px 16px', borderTop: `1px solid ${colors.border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
            {records.length} record
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Recipe Layout Content Component ─────────────────────────────────────────

interface RecipeLayoutContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  primaryColor: string;
  activeView: string;
  activeTable: TableDef | null;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
}

function RecipeLayoutContent({
  companyName, tables, colors, designTokens = getDesignTokens(), primaryColor,
  activeView, activeTable,
  records, loading, searchQuery, setSearchQuery,
  onEdit, onDelete, onAddNew
}: RecipeLayoutContentProps) {
  // Recipe-specific layout with step-by-step view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '28px', fontWeight: 700, margin: 0 }}>
          {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || 'Ricette'}
        </h1>
      </div>

      {activeView === 'dashboard' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <KpiCard
            title="Ricette"
            value={String(records.length)}
            icon={<Heart size={22} />}
            colors={colors}
          />
          <KpiCard
            title="Ingredienti"
            value={String(tables.find(t => t.name === 'ingredienti') ? records.length : 0)}
            icon={<List size={22} />}
            colors={colors}
          />
        </div>
      ) : activeTable ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Step-by-step view for recipes */}
          <div style={{
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '24px',
          }}>
            <h3 style={{ color: colors.text, fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>
              Procedimento
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {records.slice(0, 5).map((record, idx) => (
                <div
                  key={record.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                    padding: '16px', borderRadius: '8px',
                    background: colors.cardBgAlt,
                    border: `1px solid ${colors.border}`,
                  }}
                >
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: primaryColor, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 600, fontSize: '12px',
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ color: colors.text, fontSize: '14px', fontWeight: 600, margin: '0 0 8px 0' }}>
                      {record.data?.[fieldName(activeTable.fields[0])] || `Passo ${idx + 1}`}
                    </h4>
                    <p style={{ color: colors.textSecondary, fontSize: '13px', margin: 0 }}>
                      {record.data?.descrizione || record.data?.note || 'Descrizione non disponibile'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
          Seleziona una ricetta per vedere i dettagli
        </div>
      )}
    </div>
  );
}

// ─── Restaurant Layout Content Component ────────────────────────────────────

interface RestaurantLayoutContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  designTokens?: DesignTokens;
  primaryColor: string;
  activeView: string;
  activeTable: TableDef | null;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
}

function RestaurantLayoutContent({
  companyName, tables, colors, designTokens = getDesignTokens(), primaryColor,
  activeView, activeTable,
  records, loading, searchQuery, setSearchQuery,
  onEdit, onDelete, onAddNew
}: RestaurantLayoutContentProps) {
  // Restaurant-specific layout with menu cards
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '28px', fontWeight: 700, margin: 0 }}>
          {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || 'Menu'}
        </h1>
      </div>

      {activeView === 'dashboard' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <KpiCard
            title="Piatti"
            value={String(records.length)}
            icon={<Utensils size={22} />}
            colors={colors}
          />
          <KpiCard
            title="Ordini"
            value={String(tables.find(t => t.name === 'ordini') ? records.length : 0)}
            icon={<ShoppingCart size={22} />}
            colors={colors}
          />
        </div>
      ) : activeTable ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {records.map((record) => (
            <div
              key={record.id}
              style={{
                background: colors.cardBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>
                    {record.data?.[fieldName(activeTable.fields[0])] || 'Piatto'}
                  </h3>
                  {activeTable.color && (
                    <span style={{
                      padding: '2px 8px', borderRadius: '4px',
                      background: activeTable.color + '15', color: activeTable.color,
                      fontSize: '11px', fontWeight: 600,
                    }}>
                      {record.data?.categoria || 'Piatto'}
                    </span>
                  )}
                </div>
                <p style={{ color: colors.textSecondary, fontSize: '13px', marginTop: '8px' }}>
                  {record.data?.descrizione || record.data?.note || 'Descrizione non disponibile'}
                </p>
                {record.data?.prezzo && (
                  <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: primaryColor }}>
                      € {Number(record.data.prezzo).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
          Seleziona una categoria dal menu
        </div>
      )}
    </div>
  );
}

// ─── Helper Functions ───────────────────────────────────────────────────────

// ─── Status Badge (per campi "select" tipo stato ordine/prenotazione) ───────
const STATUS_STYLES: { keywords: string[]; bg: string; color: string }[] = [
  { keywords: ['consegnat', 'complet', 'pagat', 'confermat', 'pronto', 'attivo', 'disponibile', 'evaso', 'delivered', 'completed', 'paid', 'confirmed', 'ready', 'done', 'active'], bg: '#DCFCE7', color: '#166534' },
  { keywords: ['preparazione', 'corso', 'attesa', 'lavorazione', 'sospes', 'pending', 'processing', 'progress', 'in attesa'], bg: '#FEF3C7', color: '#92400E' },
  { keywords: ['annullat', 'rifiutat', 'scadut', 'bloccat', 'cancellat', 'cancelled', 'canceled', 'rejected', 'expired', 'blocked'], bg: '#FEE2E2', color: '#991B1B' },
];

function getStatusBadgeStyle(value: string): { bg: string; color: string } {
  const v = value.toLowerCase();
  for (const s of STATUS_STYLES) {
    if (s.keywords.some((k) => v.includes(k))) return { bg: s.bg, color: s.color };
  }
  return { bg: '#E0E7FF', color: '#3730A3' }; // neutro/informativo di default
}

function StatusBadge({ value }: { value: string }) {
  const { bg, color } = getStatusBadgeStyle(value);
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
      background: bg, color, fontSize: '12px', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  );
}

function renderCellValue(record: Record<string, unknown>, fieldName: string, type: string): React.ReactNode {
  const val = record[fieldName];
  if (type === 'checkbox') {
    return val ? 'Si' : 'No';
  }
  if (type === 'select' && val) {
    return <StatusBadge value={String(val)} />;
  }
  if (type === 'currency') {
    const n = Number(val);
    return isNaN(n) ? String(val ?? '') : `€ ${n.toFixed(2)}`;
  }
  if (type === 'number') {
    const n = Number(val);
    const looksLikePrice = fieldName.toLowerCase().includes('prezzo') || fieldName.toLowerCase().includes('totale') || fieldName.toLowerCase().includes('importo');
    if (!isNaN(n) && looksLikePrice) {
      return `€ ${n.toFixed(2)}`;
    }
    return String(val ?? '');
  }
  if (type === 'date' && val) {
    try {
      return new Date(val as string).toLocaleDateString('it-IT');
    } catch {
      return String(val);
    }
  }
  return String(val ?? '');
}

// Import Utensils for restaurant layout
import { Utensils, List } from 'lucide-react';