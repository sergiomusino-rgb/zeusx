'use client';

import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard, Users, Package, ShoppingCart, Database,
  Settings, LogOut, Menu, X, ChevronDown, Search, Plus,
  Pencil, Trash2, Download, Upload, FileText, FileSpreadsheet,
  MessageSquare, Mail, MessageCircle, Settings2, Calendar,
  CheckCircle, Clock, XCircle, TrendingUp, AlertTriangle
} from 'lucide-react';
import { TableDef, fieldName } from './table-definitions';
import { DesignLayout } from './DesignParser';

interface DocsLayoutProps {
  companyName: string;
  logoUrl: string;
  primaryColor: string;
  colors: ReturnType<typeof getThemeVars>;
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
}

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

export default function DocsLayout({
  companyName, logoUrl, primaryColor, colors, tables,
  activeView, setActiveView, onLogout, showSettings, setShowSettings,
  session, customTables = [], activeCustomTable, records = [], recordsLoading = false,
  searchQuery, setSearchQuery, onEdit, onDelete, onAddNew, loadRecords
}: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [importazioniOpen, setImportazioniOpen] = useState(false);
  const [comunicazioniOpen, setComunicazioniOpen] = useState(false);

  const theme = 'dark';
  const layoutCfg = { radius: 'rounded-2xl', shadow: 'shadow-2xl' };

  // Detect mobile
  React.useEffect(() => {
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

  const activeTable = tables.find((t) => t.name === activeView) || null;
  const activeCustomTableData = customTables.find((t: any) => `custom_${t.name}` === activeView) || null;

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

  const resolveIcon = (iconName: string) => {
    const ICON_MAP: Record<string, React.ReactNode> = {
      users: <Users size={18} />,
      orders: <ShoppingCart size={18} />,
      products: <Package size={18} />,
      invoices: <FileText size={18} />,
      dashboard: <LayoutDashboard size={18} />,
      default: <LayoutDashboard size={18} />,
    };
    return ICON_MAP[iconName?.toLowerCase() || 'default'] || ICON_MAP.default;
  };

  const handleTableClick = (tableName: string) => {
    setActiveView(tableName);
    if (loadRecords) {
      loadRecords(tableName);
    }
  };

  return (
    <div id="docs-layout-container" style={{ display: 'flex', minHeight: '100vh', background: colors.bg, transition: 'background 0.3s', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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
          className="w-[280px]"
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
            ...(isMobile ? {
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              width: '280px',
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
                    // Edit table logic would go here
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
                  <SidebarItem
                    icon={<FileText size={18} />}
                    label="Importa PDF"
                    active={activeView === 'import_pdf'}
                    onClick={() => setActiveView('import_pdf')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<FileText size={18} />}
                    label="Esporta PDF"
                    active={activeView === 'export_pdf'}
                    onClick={() => setActiveView('export_pdf')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<FileSpreadsheet size={18} />}
                    label="Importa Excel"
                    active={activeView === 'import_excel'}
                    onClick={() => setActiveView('import_excel')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<FileSpreadsheet size={18} />}
                    label="Esporta Excel"
                    active={activeView === 'export_excel'}
                    onClick={() => setActiveView('export_excel')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<FileText size={18} />}
                    label="Importa JSON"
                    active={activeView === 'import_json'}
                    onClick={() => setActiveView('import_json')}
                    colors={colors}
                    primaryColor={primaryColor}
                  />
                  <SidebarItem
                    icon={<FileText size={18} />}
                    label="Esporta JSON"
                    active={activeView === 'export_json'}
                    onClick={() => setActiveView('export_json')}
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
            {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || activeCustomTableData?.labelPlural || (activeView.startsWith('import_') || activeView.startsWith('export_') ? getViewLabel(activeView) : companyName)}
          </div>
          <div style={{ width: '30px', position: 'absolute', right: '24px' }} />
        </header>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: '24px' }}>
            {/* Dashboard Content */}
            {activeView === 'dashboard' ? (
              <DashboardContent
                companyName={companyName}
                tables={tables}
                colors={colors}
                primaryColor={primaryColor}
              />
            ) : activeTable ? (
              <TableContent
                table={activeTable}
                records={records}
                loading={recordsLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddNew={onAddNew}
                colors={colors}
                primaryColor={primaryColor}
              />
            ) : activeCustomTableData ? (
              <CustomTableContent
                table={activeCustomTableData}
                records={records}
                loading={recordsLoading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onEdit={onEdit}
                onDelete={onDelete}
                onAddNew={() => {}}
                colors={colors}
                primaryColor={primaryColor}
              />
            ) : activeView.startsWith('import_') || activeView.startsWith('export_') ? (
              <ImportExportPanel
                view={activeView}
                colors={colors}
                primaryColor={primaryColor}
              />
            ) : (
              <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
                Seleziona una voce dal menu
              </div>
            )}
          </div>
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

// ─── Dashboard Content Component ─────────────────────────────────────────────

interface DashboardContentProps {
  companyName: string;
  tables: TableDef[];
  colors: ReturnType<typeof getThemeVars>;
  primaryColor: string;
}

function DashboardContent({ companyName, tables, colors, primaryColor }: DashboardContentProps) {
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const appEl = document.querySelector('[data-app-id]');
        if (!appEl) { setLoading(false); return; }
        const appId = appEl.getAttribute('data-app-id');
        const password = appEl.getAttribute('data-password');
        if (!appId || !password) { setLoading(false); return; }

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
      setLoading(false);
    }
    loadDashboardData();
  }, [tables]);

  if (loading) {
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
        <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
          Caricamento...
        </div>
      </div>
    );
  }

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
              title="Tabelle"
              value={String(tables.length)}
              icon={<LayoutDashboard size={22} />}
              colors={colors}
            />
            <KpiCard
              title="Record Totali"
              value={String(totalRecords)}
              icon={<Database size={22} />}
              colors={colors}
            />
          </div>

          {/* Tables overview */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #F4F4F5',
              borderRadius: '8px',
              padding: '24px',
            }}
          >
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
              Le tue Tabelle
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tables.map((table) => (
                <div
                  key={table.name}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', borderRadius: '8px',
                    background: '#FFFFFF', border: '1px solid #F4F4F5',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {resolveIcon(table.icon || '')}
                    <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: '#18181B', fontSize: '14px', fontWeight: 500 }}>
                      {table.labelPlural || table.label}
                    </span>
                  </div>
                  <span style={{ color: colors.textSecondary, fontSize: '13px' }}>
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

// ─── KPI Card Component ───────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  colors: ReturnType<typeof getThemeVars>;
}

function KpiCard({ title, value, icon, colors }: KpiCardProps) {
  return (
    <div
      style={{
        background: colors.cardBg,
        border: '1px solid ' + colors.border,
        borderRadius: '12px',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'transform 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: colors.textSecondary, fontSize: '14px', fontWeight: 500 }}>{title}</span>
        <div style={{ color: colors.primary, opacity: 0.8 }}>{icon}</div>
      </div>
      <span style={{ color: colors.text, fontSize: '28px', fontWeight: 700 }}>{value}</span>
    </div>
  );
}

// ─── Table Content Component ─────────────────────────────────────────────────

interface TableContentProps {
  table: TableDef;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  colors: ReturnType<typeof getThemeVars>;
  primaryColor: string;
}

function TableContent({ table, records, loading, searchQuery, setSearchQuery, onEdit, onDelete, onAddNew, colors, primaryColor }: TableContentProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!session?.appInfo?.id || !session?.password) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/export?table=${table.name}`, {
        headers: { Authorization: `Bearer ${session.password}` },
      });
      if (!res.ok) throw new Error('Errore esportazione');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${table.name}-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore esportazione');
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !session?.appInfo?.id || !session?.password) return;

    setImporting(true);
    setImportMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', table.name);

      const res = await fetch(`/api/client/apps/${session.appInfo.id}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.password}` },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Errore importazione');
      }

      setImportMsg(`${data.imported} record importati`);
      e.target.value = '';
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Errore importazione');
    } finally {
      setImporting(false);
    }
  };

  const session = (document.querySelector('[data-app-id]')?.getAttribute('data-app-id') as any) ? {
    appInfo: { id: document.querySelector('[data-app-id]')?.getAttribute('data-app-id') || '' },
    password: document.querySelector('[data-password]')?.getAttribute('data-password') || ''
  } : null;

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      for (const f of table.fields) {
        const fn = fieldName(f);
        const val = r[fn];
        if (val != null && String(val).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [records, searchQuery, table.fields]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {table.labelPlural}
          </h2>
          {table.color && (
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: table.color,
            }} />
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: colors.cardBg,
              color: colors.textSecondary, fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Upload size={15} /> {importing ? 'Importando...' : 'Importa CSV'}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 16px', borderRadius: '10px',
              border: `1px solid ${colors.border}`, background: colors.cardBg,
              color: colors.textSecondary, fontSize: '13px', fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            <Download size={15} /> {exporting ? 'Esportando...' : 'Esporta CSV'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
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
      </div>

      {/* Import message */}
      {importMsg && (
        <div style={{
          padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
          background: primaryColor + '15', color: primaryColor,
        }}>
          {importMsg}
        </div>
      )}

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
            placeholder={`Cerca in ${table.labelPlural}...`}
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
                {table.fields.map((field) => (
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
                    colSpan={table.fields.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Caricamento records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.fields.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => (
                  <tr
                    key={record.id || idx}
                    style={{
                      borderBottom: `1px solid ${colors.border}`,
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    {table.fields.map((field) => (
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
            {filteredRecords.length} di {records.length} record
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Table Content Component ───────────────────────────────────────────

interface CustomTableContentProps {
  table: any;
  records: any[];
  loading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onEdit: (record: any) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  colors: ReturnType<typeof getThemeVars>;
  primaryColor: string;
}

function CustomTableContent({ table, records, loading, searchQuery, setSearchQuery, onEdit, onDelete, onAddNew, colors, primaryColor }: CustomTableContentProps) {
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) => {
      const data = r.data || r;
      for (const col of table.columns) {
        const val = data[col.name];
        if (val != null && String(val).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [records, searchQuery, table.columns]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
            {table.labelPlural || table.label + 'i'}
          </h2>
          {table.color && (
            <div style={{
              width: '12px', height: '12px', borderRadius: '50%',
              background: table.color,
            }} />
          )}
          <span style={{
            padding: '2px 8px', borderRadius: '4px',
            background: primaryColor + '15', color: primaryColor,
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
          }}>
            Personalizzata
          </span>
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
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            padding: '10px 16px',
          }}
        >
          <Search size={18} style={{ color: colors.textSecondary }} />
          <input
            type="text"
            placeholder={`Cerca in ${table.labelPlural || table.label + 'i'}...`}
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
                {table.columns.map((col: any) => (
                  <th
                    key={col.name}
                    style={{
                      textAlign: 'left', padding: '12px 16px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary, fontSize: '12px',
                      fontWeight: 600, textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}
                  >
                    {col.label}
                    {col.required && (
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
                    colSpan={table.columns.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    Caricamento records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={table.columns.length + 1}
                    style={{ padding: '40px', textAlign: 'center', color: colors.textSecondary }}
                  >
                    {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record, idx) => {
                  const data = (record.data || record) as Record<string, unknown>;
                  return (
                    <tr
                      key={record.id || idx}
                      style={{
                        borderBottom: `1px solid ${colors.border}`,
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      {table.columns.map((col: any) => (
                        <td
                          key={col.name}
                          style={{
                            padding: '12px 16px', color: colors.text,
                            fontSize: '14px', whiteSpace: 'nowrap',
                            maxWidth: '200px', overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {renderCellValue(data, col.name, col.type)}
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Import/Export Panel Component ────────────────────────────────────────────

interface ImportExportPanelProps {
  view: string;
  colors: ReturnType<typeof getThemeVars>;
  primaryColor: string;
}

function ImportExportPanel({ view, colors, primaryColor }: ImportExportPanelProps) {
  const isImport = view.startsWith('import_');
  const format = view.replace(/^(import|export)_/, '').toUpperCase();
  const IconComponent = isImport ? Upload : Download;

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: '0 0 8px 0' }}>
          {getViewLabel(view)}
        </h2>
        <p style={{ color: colors.textSecondary, fontSize: '14px', margin: 0 }}>
          {isImport
            ? `Seleziona un file ${format} da importare nei tuoi dati`
            : `Esporta i tuoi dati in formato ${format}`}
        </p>
      </div>

      <div style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
        borderRadius: '16px',
        padding: '48px',
        textAlign: 'center',
        maxWidth: '480px',
        margin: '0 auto',
      }}>
        <div style={{ padding: '40px 24px', marginBottom: '24px' }}>
          <IconComponent size={64} style={{ color: primaryColor, marginBottom: '16px' }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: colors.text, marginBottom: '8px' }}>
            {isImport ? 'Importa un file' : 'Esporta i tuoi dati'}
          </div>
          <div style={{ fontSize: '13px', color: colors.textSecondary }}>
            Formato: {format}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helper per il rendering delle celle ─────────────────────────────────────

function renderCellValue(record: Record<string, unknown>, fieldName: string, type: string): React.ReactNode {
  const val = record[fieldName];
  if (type === 'checkbox') {
    return val ? 'Si' : 'No';
  }
  if (type === 'number') {
    const n = Number(val);
    if (!isNaN(n) && fieldName.toLowerCase().includes('prezzo') || fieldName.toLowerCase().includes('totale')) {
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