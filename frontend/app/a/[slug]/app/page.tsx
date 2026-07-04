'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SYSTEM_TABLES, getTableByName, createEmptyRecord } from './table-definitions';
import DynamicDataTable from './DynamicDataTable';
import DynamicRecordModal from './DynamicRecordModal';
import CreateCustomTableModal from './CreateCustomTableModal';
import CustomTableRenderer from './CustomTableRenderer';
import CustomRecordModal from './CustomRecordModal';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  LayoutDashboard, Settings, LogOut, Search, Plus, Pencil, Trash2,
  X, ChevronDown, Users, ShoppingCart, Package, DollarSign, TrendingUp,
  AlertTriangle, Calendar, CheckCircle, Clock, XCircle, Menu,
  Download, Upload, Download as InstallIcon, MessageSquare, Mail, MessageCircle,
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

// ─── Interfaces ───────────────────────────────────────────────────────────────

// Re-export types from table-definitions for local use
import type { FieldDef as TableFieldDef, TableDef as TableDefType } from './table-definitions';
type FieldDef = TableFieldDef;
type TableDef = TableDefType;

// Helper per ottenere il nome del campo (supporta sia name che id)
function fieldName(f: FieldDef): string {
  return f.name || f.id || '';
}

interface AppConfig {
  id: string;
  slug: string;
  appName?: string;
  name?: string;
  logo?: string;
  blocked?: boolean;
  // La struttura reale: { id, slug, name, config: { schema: { tables }, ... } }
  config?: {
    schema?: {
      tables: TableDef[];
    };
    blueprint?: {
      schema?: {
        tables: TableDef[];
      };
      tables?: TableDef[];
    };
    tables?: TableDef[];
    branding?: {
      company_name?: string;
      logo_url?: string;
      primary_color?: string;
      theme?: 'dark' | 'light';
    };
    appName?: string;
    logo?: string;
    [key: string]: unknown;
  };
  // Fallback per strutture piatte
  schema?: { tables: TableDef[] };
  branding?: {
    company_name?: string;
    logo_url?: string;
    primary_color?: string;
    theme?: 'dark' | 'light';
  };
  blueprint?: { schema?: { tables: TableDef[] }; tables?: TableDef[] };
  tables?: TableDef[];
  [key: string]: unknown;
}

interface AppSession {
  slug: string;
  password: string;
  appInfo: AppConfig;
}

interface AppRecord {
  id: string;
  [key: string]: unknown;
}

interface UserPrefs {
  layout: 'corporate' | 'modern' | 'compact' | 'tablet' | 'smartphone';
  theme: 'dark' | 'light';
  primaryColor: string;
  companyName: string;
  logoUrl: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={18} />,
  orders: <ShoppingCart size={18} />,
  products: <Package size={18} />,
  invoices: <DollarSign size={18} />,
  default: <LayoutDashboard size={18} />,
};

const LAYOUT_CONFIG = {
  corporate:  { sidebarWidth: 'w-72', padding: 'p-8', radius: 'rounded-2xl', shadow: 'shadow-2xl' },
  modern:     { sidebarWidth: 'w-64', padding: 'p-6', radius: 'rounded-xl',  shadow: 'shadow-xl' },
  compact:    { sidebarWidth: 'w-56', padding: 'p-4', radius: 'rounded-lg',  shadow: 'shadow-lg' },
  tablet:     { sidebarWidth: 'w-64', padding: 'p-5', radius: 'rounded-xl',  shadow: 'shadow-xl' },
  smartphone: { sidebarWidth: 'w-full', padding: 'p-3', radius: 'rounded-none', shadow: 'none', sidebarCollapsible: true },
};

const SIDEBAR_WIDTHS = {
  corporate: '288px',
  modern: '256px',
  compact: '224px',
  tablet: '256px',
  smartphone: '280px',
};

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6'];

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MONTHLY_REVENUE = [
  { month: 'Gen', revenue: 12400 }, { month: 'Feb', revenue: 15800 },
  { month: 'Mar', revenue: 14200 }, { month: 'Apr', revenue: 18900 },
  { month: 'Mag', revenue: 21300 }, { month: 'Giu', revenue: 19700 },
  { month: 'Lug', revenue: 23100 }, { month: 'Ago', revenue: 20500 },
  { month: 'Set', revenue: 25800 }, { month: 'Ott', revenue: 28400 },
  { month: 'Nov', revenue: 26200 }, { month: 'Dic', revenue: 31500 },
];

const ORDERS_BY_STATUS = [
  { name: 'Completati', value: 145, color: '#22c55e' },
  { name: 'In corso', value: 67, color: '#f59e0b' },
  { name: 'In attesa', value: 23, color: '#ef4444' },
];

const UPCOMING_DEADLINES = [
  { id: '1', date: '2026-07-05', client: 'Rossi Srl', amount: 2450.00 },
  { id: '2', date: '2026-07-08', client: 'Bianchi SpA', amount: 1890.50 },
  { id: '3', date: '2026-07-12', client: 'Verdi & Co', amount: 3200.00 },
  { id: '4', date: '2026-07-15', client: 'Neri Group', amount: 980.75 },
  { id: '5', date: '2026-07-20', client: 'Gialli Ltd', amount: 4100.00 },
];

// ─── Theme Helpers ────────────────────────────────────────────────────────────

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

// ─── Utility: Icon Resolver ──────────────────────────────────────────────────

function resolveIcon(iconName: string): React.ReactNode {
  const key = iconName?.toLowerCase() || 'default';
  return ICON_MAP[key] || ICON_MAP.default;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  colors: ReturnType<typeof getThemeVars>;
  radius: string;
}

function KpiCard({ title, value, icon, trend, trendUp, colors, radius }: KpiCardProps) {
  return (
    <div
      className={`${radius} ${LAYOUT_CONFIG.corporate.shadow}`}
      style={{
        background: colors.cardBg,
        border: `1px solid ${colors.border}`,
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
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
          <TrendingUp
            size={14}
            style={{ color: trendUp ? colors.success : colors.danger, transform: trendUp ? 'none' : 'rotate(180deg)' }}
          />
          <span style={{ color: trendUp ? colors.success : colors.danger }}>{trend}</span>
          <span style={{ color: colors.textSecondary }}>vs mese scorso</span>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Component ──────────────────────────────────────────────────────

interface DashboardProps {
  colors: ReturnType<typeof getThemeVars>;
  radius: string;
  shadow: string;
  companyName: string;
}

function Dashboard({ colors, radius, shadow, companyName }: DashboardProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ color: colors.text, fontSize: '28px', fontWeight: 700, margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: colors.textSecondary, fontSize: '14px', marginTop: '4px' }}>
          Panoramica attivita per {companyName}
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        <KpiCard
          title="Fatturato Oggi"
          value="EUR 4.280"
          icon={<DollarSign size={22} />}
          trend="+12.5%"
          trendUp={true}
          colors={colors}
          radius={radius}
        />
        <KpiCard
          title="Nuovi Clienti"
          value="23"
          icon={<Users size={22} />}
          trend="+8.1%"
          trendUp={true}
          colors={colors}
          radius={radius}
        />
        <KpiCard
          title="Ordini Aperti"
          value="67"
          icon={<ShoppingCart size={22} />}
          trend="-3.2%"
          trendUp={false}
          colors={colors}
          radius={radius}
        />
        <KpiCard
          title="Stock Critico"
          value="5"
          icon={<AlertTriangle size={22} />}
          trend="+2"
          trendUp={false}
          colors={colors}
          radius={radius}
        />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Line Chart - Monthly Revenue */}
        <div
          className={`${radius} ${shadow}`}
          style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, padding: '24px' }}
        >
          <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
            Fatturato Mensile
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={MONTHLY_REVENUE}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
              <XAxis dataKey="month" stroke={colors.textSecondary} fontSize={12} />
              <YAxis stroke={colors.textSecondary} fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                }}
                formatter={(value: number) => [`EUR ${value.toLocaleString()}`, 'Fatturato']}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={colors.primary}
                strokeWidth={3}
                dot={{ fill: colors.primary, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Orders by Status */}
        <div
          className={`${radius} ${shadow}`}
          style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, padding: '24px' }}
        >
          <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
            Ordini per Stato
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={ORDERS_BY_STATUS}
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
              >
                {ORDERS_BY_STATUS.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: colors.cardBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  color: colors.text,
                }}
              />
              <Legend
                verticalAlign="bottom"
                formatter={(value) => <span style={{ color: colors.textSecondary, fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Upcoming Deadlines Table */}
      <div
        className={`${radius} ${shadow}`}
        style={{ background: colors.cardBg, border: `1px solid ${colors.border}`, padding: '24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calendar size={18} style={{ color: colors.primary }} />
          <h3 style={{ color: colors.text, fontSize: '16px', fontWeight: 600, margin: 0 }}>
            Agenda
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Data', 'Cliente', 'Importo', 'Stato'].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderBottom: `2px solid ${colors.border}`,
                      color: colors.textSecondary,
                      fontSize: '12px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {UPCOMING_DEADLINES.map((d) => {
                const daysUntil = Math.ceil((new Date(d.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                const statusColor = daysUntil <= 5 ? colors.danger : daysUntil <= 10 ? colors.warning : colors.success;
                const statusLabel = daysUntil <= 5 ? 'Urgente' : daysUntil <= 10 ? 'Prossima' : 'Pianificata';
                return (
                  <tr key={d.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px', color: colors.text, fontSize: '14px' }}>
                      {new Date(d.date).toLocaleDateString('it-IT')}
                    </td>
                    <td style={{ padding: '12px', color: colors.text, fontSize: '14px', fontWeight: 500 }}>
                      {d.client}
                    </td>
                    <td style={{ padding: '12px', color: colors.text, fontSize: '14px' }}>
                      EUR {d.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          borderRadius: '9999px',
                          fontSize: '12px',
                          fontWeight: 600,
                          background: statusColor + '20',
                          color: statusColor,
                        }}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── DataTable Component ──────────────────────────────────────────────────────

interface DataTableProps {
  table: TableDef;
  records: AppRecord[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onEdit: (record: AppRecord) => void;
  onDelete: (recordId: string) => void;
  onAddNew: () => void;
  colors: ReturnType<typeof getThemeVars>;
  radius: string;
  shadow: string;
}

function DataTable({
  table, records, loading, searchQuery, onSearchChange,
  onEdit, onDelete, onAddNew, colors, radius, shadow,
  appId, password,
}: DataTableProps & { appId?: string; password?: string }) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [exporting, setExporting] = useState(false);
  const handleExport = async () => {
    if (!appId || !password) return;
    setExporting(true);
    try {
      const res = await fetch(`/api/client/apps/${appId}/export?table=${table.name}`, {
        headers: { Authorization: `Bearer ${password}` },
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
    if (!file || !appId || !password) return;

    setImporting(true);
    setImportMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('table', table.name);

      const res = await fetch(`/api/client/apps/${appId}/import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${password}` },
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

  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return records;
    const q = searchQuery.toLowerCase();
    return records.filter((r) =>
      table.fields.some((f) => {
        const fn = fieldName(f);
        const val = r.data?.[fn];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [records, searchQuery, table.fields]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h2 style={{ color: colors.text, fontSize: '24px', fontWeight: 700, margin: 0 }}>
          {table.labelPlural}
        </h2>
        <button
          onClick={onAddNew}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', borderRadius: '10px', border: 'none',
            background: colors.primary, color: '#fff', fontSize: '14px',
            fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          <Plus size={16} /> Nuovo
        </button>
      </div>

      {/* Search Bar */}
      <div
        className={`${radius}`}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          padding: '10px 16px',
        }}
      >
        <Search size={18} style={{ color: colors.textSecondary }} />
        <input
          type="text"
          placeholder={`Cerca in ${table.labelPlural}...`}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: colors.text, fontSize: '14px',
          }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '2px' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Table */}
      <div
        className={`${radius} ${shadow}`}
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
                        {field.type === 'checkbox'
                          ? ((record.data?.[fieldName(field)]) ? 'Si' : 'No')
                          : field.type === 'select'
                            ? String(record.data?.[fieldName(field)] ?? '')
                            : String(record.data?.[fieldName(field)] ?? '')}
                      </td>
                    ))}
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                        <button
                          onClick={() => onEdit(record)}
                          title="Modifica"
                          style={{
                            background: colors.primary + '20', border: 'none',
                            borderRadius: '8px', padding: '6px', cursor: 'pointer',
                            color: colors.primary, display: 'flex', alignItems: 'center',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = colors.primary + '40'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = colors.primary + '20'; }}
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

// ─── RecordModal Component ────────────────────────────────────────────────────

interface RecordModalProps {
  table: TableDef;
  record: AppRecord | null; // null = new record
  onSave: (data: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
  colors: ReturnType<typeof getThemeVars>;
}

function RecordModal({ table, record, onSave, onClose, saving, colors }: RecordModalProps) {
  const isEdit = record !== null;
  const [formData, setFormData] = useState<Record<string, unknown>>(() => {
    if (record) {
      const data: Record<string, unknown> = {};
      table.fields.forEach((f) => { const fn = fieldName(f); data[fn] = record.data?.[fn] ?? ''; });
      return data;
    }
    const data: Record<string, unknown> = {};
    table.fields.forEach((f) => {
      data[fieldName(f)] = f.type === 'checkbox' ? false : '';
    });
    return data;
  });

  const handleChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.text, fontSize: '14px', outline: 'none',
    transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: '6px', fontSize: '13px',
    fontWeight: 600, color: colors.textSecondary,
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl"
        style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          width: '100%', maxWidth: '560px', maxHeight: '85vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ color: colors.text, fontSize: '20px', fontWeight: 700, margin: 0 }}>
            {isEdit ? `Modifica ${table.label}` : `Nuovo ${table.label}`}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: colors.textSecondary, padding: '4px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {table.fields.map((field) => {
            const fn = fieldName(field);
            return (
            <div key={fn}>
              <label style={labelStyle}>
                {field.label}
                {field.required && <span style={{ color: colors.danger, marginLeft: '4px' }}>*</span>}
              </label>

              {field.type === 'textarea' ? (
                <textarea
                  value={String(formData[fn] ?? '')}
                  onChange={(e) => handleChange(fn, e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : field.type === 'select' ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={String(formData[fn] ?? '')}
                    onChange={(e) => handleChange(fn, e.target.value)}
                    style={{ ...inputStyle, appearance: 'none', paddingRight: '36px' }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                  >
                    <option value="">Seleziona...</option>
                    {(field.options || []).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <ChevronDown
                    size={16}
                    style={{
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)', color: colors.textSecondary,
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              ) : field.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(formData[fn])}
                    onChange={(e) => handleChange(fn, e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: colors.primary }}
                  />
                  <span style={{ color: colors.text, fontSize: '14px' }}>
                    {formData[fn] ? 'Attivo' : 'Non attivo'}
                  </span>
                </label>
              ) : field.type === 'number' ? (
                <input
                  type="number"
                  value={String(formData[fn] ?? '')}
                  onChange={(e) => handleChange(fn, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : field.type === 'date' ? (
                <input
                  type="date"
                  value={String(formData[fn] ?? '')}
                  onChange={(e) => handleChange(fn, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              ) : (
                <input
                  type="text"
                  value={String(formData[fn] ?? '')}
                  onChange={(e) => handleChange(fn, e.target.value)}
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.borderColor = colors.primary; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = colors.inputBorder; }}
                />
              )}
            </div>
            );
          })}

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px', borderRadius: '10px',
                border: `1px solid ${colors.border}`, background: 'transparent',
                color: colors.textSecondary, fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = colors.cardBgAlt; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: '10px', border: 'none',
                background: saving ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer', transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = '0.85'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              {saving ? 'Salvataggio...' : 'Salva'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ColorPicker Component ────────────────────────────────────────────────────

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

function ColorPicker({ value, onChange, colors }: ColorPickerProps & { colors?: ReturnType<typeof getThemeVars> }) {
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw hue gradient
    for (let x = 0; x < width; x++) {
      const hue = (x / width) * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(x, 0, 1, height);
    }
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newHue = Math.round((x / rect.width) * 360);
    const newSaturation = Math.round(100 - (y / rect.height) * 100);

    setHue(newHue);
    setSaturation(newSaturation);
    updateColor(newHue, newSaturation, lightness);
  };

  const handleCanvasMouseDown = () => {
    setIsDragging(true);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    handleCanvasClick(e);
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const updateColor = (h: number, s: number, l: number) => {
    const hex = hslToHex(h, s, l);
    onChange(hex);
  };

  const hslToHex = (h: number, s: number, l: number): string => {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  };

  const canvasWidth = 280;
  const canvasHeight = 60;
  const cursorX = (hue / 360) * canvasWidth;
  const cursorY = ((100 - saturation) / 100) * canvasHeight;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            background: value,
            border: '2px solid rgba(255,255,255,0.2)',
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ color: colors.text, fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>
            Colore Attuale
          </div>
          <div style={{ color: colors.textSecondary, fontSize: '12px', fontFamily: 'monospace' }}>
            {value.toUpperCase()}
          </div>
        </div>
      </div>

      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          onClick={handleCanvasClick}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
          style={{
            width: '100%',
            height: '60px',
            borderRadius: '8px',
            cursor: 'crosshair',
            border: `2px solid ${colors.border}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `${cursorX - 10}px`,
            top: `${cursorY - 10}px`,
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: 'white',
            border: '2px solid black',
            pointerEvents: 'none',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', color: colors.textSecondary }}>
          Luminosità: {lightness}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          value={lightness}
          onChange={(e) => {
            const newLightness = Number(e.target.value);
            setLightness(newLightness);
            updateColor(hue, saturation, newLightness);
          }}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {COLOR_PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => {
              onChange(preset);
              const h = hexToHsl(preset).h;
              const s = hexToHsl(preset).s;
              const l = hexToHsl(preset).l;
              setHue(h);
              setSaturation(s);
              setLightness(l);
            }}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              background: preset,
              border: value === preset ? '2px solid white' : '2px solid transparent',
              cursor: 'pointer',
              boxShadow: value === preset ? `0 0 0 2px ${preset}` : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}

function hexToHsl(hex: string) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

const COLOR_PRESETS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#ef4444', '#f59e0b', '#10b981', '#06b6d4',
  '#3b82f6', '#64748b', '#1e293b', '#ffffff',
];

// ─── SettingsModal Component ──────────────────────────────────────────────────

interface SettingsModalProps {
  prefs: UserPrefs;
  onPrefsChange: (prefs: UserPrefs) => void;
  onClose: () => void;
  onLogout: () => void;
  onChangePassword: (oldPw: string, newPw: string) => Promise<void>;
  colors: ReturnType<typeof getThemeVars>;
  slug: string;
}

function SettingsModal({ prefs, onPrefsChange, onClose, onLogout, onChangePassword, colors, slug }: SettingsModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [changingPw, setChangingPw] = useState(false);

  const updatePref = <K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) => {
    onPrefsChange({ ...prefs, [key]: value });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ text: 'Compila tutti i campi', type: 'error' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: 'Le password non coincidono', type: 'error' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: 'La nuova password deve avere almeno 6 caratteri', type: 'error' });
      return;
    }

    setChangingPw(true);
    try {
      await onChangePassword(oldPassword, newPassword);
      setPasswordMsg({ text: 'Password cambiata con successo!', type: 'success' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordMsg({ text: err instanceof Error ? err.message : 'Errore nel cambio password', type: 'error' });
    } finally {
      setChangingPw(false);
    }
  };

  const sectionTitle: React.CSSProperties = {
    color: colors.text, fontSize: '15px', fontWeight: 700,
    marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };

  const sectionBox: React.CSSProperties = {
    background: colors.cardBgAlt, borderRadius: '12px',
    padding: '20px', marginBottom: '20px',
    border: `1px solid ${colors.border}`,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: '8px',
    border: `1px solid ${colors.inputBorder}`, background: colors.inputBg,
    color: colors.text, fontSize: '14px', outline: 'none',
    boxSizing: 'border-box',
  };

  const layouts: Array<{ key: UserPrefs['layout']; label: string; desc: string }> = [
    { key: 'corporate', label: 'Corporate', desc: 'Ampio e spazioso' },
    { key: 'modern', label: 'Modern', desc: 'Bilanciato' },
    { key: 'compact', label: 'Compact', desc: 'Compatto e denso' },
    { key: 'tablet', label: 'Tablet', desc: 'Schermo tablet' },
    { key: 'smartphone', label: 'Smartphone', desc: 'Schermo mobile con sidebar a scomparsa' },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-2xl"
        style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          width: '100%', maxWidth: '640px', maxHeight: '85vh',
          overflow: 'auto', padding: '32px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
          <h2 style={{ color: colors.text, fontSize: '22px', fontWeight: 700, margin: 0 }}>Impostazioni</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: colors.textSecondary, padding: '4px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Layout Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Layout</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {layouts.map(({ key, label, desc }) => {
              const isActive = prefs.layout === key;
              const cfg = LAYOUT_CONFIG[key];
              return (
                <button
                  key={key}
                  onClick={() => updatePref('layout', key)}
                  style={{
                    padding: '16px 12px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${isActive ? colors.primary : colors.border}`,
                    background: isActive ? colors.primary + '15' : 'transparent',
                    transition: 'all 0.2s', textAlign: 'center',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '100%', height: '48px', borderRadius: '8px',
                      background: colors.cardBg, border: `1px solid ${colors.border}`,
                      marginBottom: '10px', display: 'flex', overflow: 'hidden',
                    }}
                  >
                    <div style={{
                      width: key === 'corporate' ? '35%' : key === 'modern' ? '28%' : key === 'compact' ? '22%' : key === 'tablet' ? '25%' : '100%',
                      background: isActive ? colors.primary : colors.textSecondary + '40',
                      borderRadius: '4px', margin: '4px',
                    }} />
                    <div style={{ flex: 1, padding: '6px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ height: '6px', borderRadius: '3px', background: colors.border }} />
                      <div style={{ height: '4px', borderRadius: '2px', background: colors.border, width: '70%' }} />
                      <div style={{ height: '4px', borderRadius: '2px', background: colors.border, width: '50%' }} />
                    </div>
                  </div>
                  <div style={{ color: colors.text, fontSize: '13px', fontWeight: 600 }}>{label}</div>
                  <div style={{ color: colors.textSecondary, fontSize: '11px', marginTop: '2px' }}>{desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Theme Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Tema</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {(['dark', 'light'] as const).map((t) => {
              const isActive = prefs.theme === t;
              return (
                <button
                  key={t}
                  onClick={() => updatePref('theme', t)}
                  style={{
                    padding: '14px', borderRadius: '12px', cursor: 'pointer',
                    border: `2px solid ${isActive ? colors.primary : colors.border}`,
                    background: isActive ? colors.primary + '15' : 'transparent',
                    display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: t === 'dark' ? '#0a0e1a' : '#f8fafc',
                    border: `1px solid ${t === 'dark' ? '#334155' : '#e2e8f0'}`,
                  }} />
                  <span style={{ color: colors.text, fontSize: '14px', fontWeight: 600 }}>
                    {t === 'dark' ? 'Scuro' : 'Chiaro'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Colore Primario</div>
          <ColorPicker 
            value={prefs.primaryColor} 
            onChange={(color) => updatePref('primaryColor', color)} 
            colors={colors}
          />
        </div>

        {/* Brand Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Brand</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>
                Nome Azienda
              </label>
              <input
                type="text"
                value={prefs.companyName}
                onChange={(e) => updatePref('companyName', e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: colors.textSecondary }}>
                Logo Azienda
              </label>
              {prefs.logoUrl && (
                <div style={{ marginBottom: '8px' }}>
                  <img
                    src={prefs.logoUrl}
                    alt="Logo preview"
                    style={{ height: '48px', maxWidth: '160px', objectFit: 'contain', borderRadius: '8px', border: `1px solid ${colors.border}` }}
                  />
                </div>
              )}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label
                  style={{
                    padding: '8px 16px', borderRadius: '8px', border: `1px solid ${colors.border}`,
                    background: colors.cardBg, color: colors.text, fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                  }}
                >
                  📁 Sfoglia...
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          updatePref('logoUrl', ev.target?.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
                {prefs.logoUrl && (
                  <button
                    type="button"
                    onClick={() => updatePref('logoUrl', '')}
                    style={{
                      padding: '8px 12px', borderRadius: '8px', border: 'none',
                      background: colors.danger + '15', color: colors.danger,
                      fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Rimuovi
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>Cambia Password</div>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              placeholder="Password attuale"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Nuova password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Conferma nuova password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={inputStyle}
            />
            {passwordMsg && (
              <div style={{
                padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: passwordMsg.type === 'success' ? colors.success + '20' : colors.danger + '20',
                color: passwordMsg.type === 'success' ? colors.success : colors.danger,
              }}>
                {passwordMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={changingPw}
              style={{
                padding: '10px 20px', borderRadius: '10px', border: 'none',
                background: changingPw ? colors.textSecondary : colors.primary,
                color: '#fff', fontSize: '14px', fontWeight: 600,
                cursor: changingPw ? 'not-allowed' : 'pointer', alignSelf: 'flex-end',
              }}
            >
              {changingPw ? 'Salvataggio...' : 'Cambia Password'}
            </button>
          </form>
        </div>

        {/* QR Code Section */}
        <div style={sectionBox}>
          <div style={sectionTitle}>QR Code Accesso</div>
          <p style={{ color: colors.textSecondary, fontSize: '13px', marginBottom: '16px' }}>
            Scansiona questo codice QR per accedere all'app da smartphone
          </p>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            padding: '16px', 
            background: '#ffffff', 
            borderRadius: '12px',
            marginBottom: '12px'
          }}>
            <QRCodeCanvas 
              value={`${typeof window !== 'undefined' ? window.location.origin : ''}/a/${slug}`}
              size={160}
              level="M"
              includeMargin={false}
            />
          </div>
          <div style={{ 
            textAlign: 'center',
            padding: '12px',
            background: colors.cardBg,
            borderRadius: '8px',
            border: `1px solid ${colors.border}`
          }}>
            <a 
              href={`/a/${slug}`}
              style={{ 
                color: colors.primary, 
                fontSize: '14px', 
                fontWeight: 600,
                textDecoration: 'none',
                wordBreak: 'break-all'
              }}
            >
              {typeof window !== 'undefined' ? window.location.origin : ''}/a/{slug}
            </a>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
            background: colors.danger + '15', color: colors.danger,
            fontSize: '15px', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = colors.danger + '30'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = colors.danger + '15'; }}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </div>
  );
}

// ─── Login Screen ─────────────────────────────────────────────────────────────

interface LoginScreenProps {
  slug: string;
  appName: string;
  logoUrl: string;
  primaryColor: string;
  onLogin: (password: string) => Promise<void>;
}

function LoginScreen({ slug, appName, logoUrl, primaryColor, onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Inserisci la password');
      return;
    }
    setLoading(true);
    try {
      await onLogin(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Password errata');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e1a', padding: '20px',
      }}
    >
      <div
        className="rounded-2xl"
        style={{
          background: '#1e293b', border: '1px solid #334155', padding: '40px',
          width: '100%', maxWidth: '400px', textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        }}
      >
        {logoUrl && (
          <img src={logoUrl} alt={appName} style={{ height: '48px', marginBottom: '16px', objectFit: 'contain' }} />
        )}
        <h1 style={{ color: '#ffffff', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>{appName}</h1>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '28px' }}>Inserisci la password per accedere</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%', padding: '12px 16px', borderRadius: '10px',
              border: '1px solid #334155', background: '#0f172a',
              color: '#ffffff', fontSize: '15px', outline: 'none',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
              background: '#ef444420', color: '#ef4444',
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px', borderRadius: '10px', border: 'none',
              background: loading ? '#64748b' : primaryColor,
              color: '#fff', fontSize: '15px', fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verifica...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Main App Component ───────────────────────────────────────────────────────

export default function ViewerProFinal() {
  const slug = useMemo(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/a\/([^/]+)/);
      return match?.[1] || '';
    }
    return '';
  }, []);

  const sessionKey = `app_session_${slug}`;
  const prefsKey = `${sessionKey}_prefs`;

  // State
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | string>('dashboard');
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalRecord, setModalRecord] = useState<AppRecord | null | 'new'>(null);
  const [saving, setSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Record per relazioni tra tabelle
  const [clientiRecords, setClientiRecords] = useState<AppRecord[]>([]);
  const [prodottiRecords, setProdottiRecords] = useState<AppRecord[]>([]);
  const [ordiniRecords, setOrdiniRecords] = useState<AppRecord[]>([]);
  // Tabelle personalizzate create dall'utente
  const [customTables, setCustomTables] = useState<any[]>([]);
  const [customTablesLoading, setCustomTablesLoading] = useState(false);
  const [customRecords, setCustomRecords] = useState<any[]>([]);
  const [customRecordsLoading, setCustomRecordsLoading] = useState(false);
  const [showCreateCustomTable, setShowCreateCustomTable] = useState(false);
  const [creatingCustomTable, setCreatingCustomTable] = useState(false);
  const [customModalRecord, setCustomModalRecord] = useState<any | null | 'new'>(null);
  const [customSaving, setCustomSaving] = useState(false);

  const [prefs, setPrefs] = useState<UserPrefs>({
    layout: 'modern',
    theme: 'dark',
    primaryColor: '#6366f1',
    companyName: '',
    logoUrl: '',
  });

  // Derived values
  const appInfo = session?.appInfo;
  // L'appInfo ha struttura: { id, slug, name, config: { schema: { tables }, ... } }
  const config = appInfo;
  const innerConfig = config?.config;
  
  // Estrai tabelle da blueprint — cerca in config.config.schema.tables (la struttura reale)
  // e mantieni tutti i fallback per compatibilità
  const tables = innerConfig?.schema?.tables 
    || config?.schema?.tables 
    || innerConfig?.blueprint?.schema?.tables 
    || config?.blueprint?.schema?.tables 
    || innerConfig?.blueprint?.tables 
    || config?.blueprint?.tables 
    || innerConfig?.tables 
    || config?.tables 
    || [];
  
  console.log('[Viewer] Config:', config);
  console.log('[Viewer] Config keys:', config ? Object.keys(config) : 'null');
  console.log('[Viewer] innerConfig (config.config):', innerConfig);
  console.log('[Viewer] innerConfig keys:', innerConfig ? Object.keys(innerConfig) : 'null');
  console.log('[Viewer] innerConfig.schema:', innerConfig?.schema);
  console.log('[Viewer] Blueprint:', config?.blueprint);
  console.log('[Viewer] Tables found:', tables.length, tables);
  
  const activeTable = tables.find((t) => t.name === activeView) || null;

  const companyName = prefs.companyName
    || config?.branding?.company_name
    || config?.appName
    || 'App';

  const logoUrl = prefs.logoUrl
    || config?.branding?.logo_url
    || config?.logo
    || '';

  const primaryColor = prefs.primaryColor
    || config?.branding?.primary_color
    || '#6366f1';

  const theme = prefs.theme || config?.branding?.theme || 'dark';
  const colors = useMemo(() => getThemeVars(theme, primaryColor), [theme, primaryColor]);
  const layoutCfg = LAYOUT_CONFIG[prefs.layout];

  // ─── Load preferences from localStorage ──────────────────────────────────

  useEffect(() => {
    try {
      const saved = localStorage.getItem(prefsKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<UserPrefs>;
        setPrefs((prev) => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
  }, [prefsKey]);

  // ─── Save preferences to localStorage ────────────────────────────────────

  useEffect(() => {
    try {
      localStorage.setItem(prefsKey, JSON.stringify(prefs));
    } catch { /* ignore */ }
  }, [prefs, prefsKey]);

  // ─── Register service worker on mount ───────────────────────────────────

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
    // Aggiungi link manifest dinamicamente
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = `/a/${slug}/manifest`;
    document.head.appendChild(link);
  }, [slug]);

  // ─── Detect mobile viewport ──────────────────────────────────────────────

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

  // ─── Check session on mount ──────────────────────────────────────────────

  useEffect(() => {
    const checkSession = () => {
      try {
        const raw = localStorage.getItem(sessionKey);
        if (raw) {
          const parsed: AppSession = JSON.parse(raw);
          // Verifica che la sessione abbia appInfo (struttura nuova)
          if (!parsed.appInfo) {
            // Sessione vecchia, pulisci e mostra login
            localStorage.removeItem(sessionKey);
            setShowLogin(true);
            return;
          }
          if (parsed.appInfo?.blocked) {
            window.location.href = `/a/${slug}/blocked`;
            return;
          }
          setSession(parsed);
          setShowLogin(false);
        } else {
          setShowLogin(true);
        }
      } catch {
        setShowLogin(true);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [sessionKey, slug]);

  // ─── Load records when table changes ─────────────────────────────────────

  const loadRecords = useCallback(async (tableName: string, password: string, appId: string) => {
    setRecordsLoading(true);
    try {
      const res = await fetch(`/api/client/apps/${appId}/records?table=${tableName}`, {
        headers: { Authorization: `Bearer ${password}` },
      });
      if (!res.ok) throw new Error('Failed to load records');
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : data.records || data.data || []);
    } catch (err) {
      console.error('Error loading records:', err);
      setRecords([]);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTable && session) {
      loadRecords(activeTable.name, session.password, session.appInfo.id);
    } else {
      setRecords([]);
    }
    setSearchQuery('');
  }, [activeTable, session, loadRecords]);

  // ─── Load custom tables from backend ────────────────────────────────────

  const loadCustomTables = useCallback(async () => {
    if (!session) return;
    setCustomTablesLoading(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-tables`, {
        headers: { Authorization: `Bearer ${session.password}` },
      });
      if (!res.ok) throw new Error('Failed to load custom tables');
      const data = await res.json();
      setCustomTables(data.tables || []);
    } catch (err) {
      console.error('Error loading custom tables:', err);
      setCustomTables([]);
    } finally {
      setCustomTablesLoading(false);
    }
  }, [session]);

  // Load custom tables on session change
  useEffect(() => {
    if (session) {
      loadCustomTables();
    } else {
      setCustomTables([]);
    }
  }, [session, loadCustomTables]);

  // ─── Load custom records when activeView is a custom table ──────────────

  const activeCustomTable = useMemo(() => {
    return customTables.find((t: any) => `custom_${t.name}` === activeView) || null;
  }, [customTables, activeView]);

  const loadCustomRecords = useCallback(async (tableName: string) => {
    if (!session) return;
    setCustomRecordsLoading(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-records/${tableName}`, {
        headers: { Authorization: `Bearer ${session.password}` },
      });
      if (!res.ok) throw new Error('Failed to load custom records');
      const data = await res.json();
      setCustomRecords(data.records || []);
    } catch (err) {
      console.error('Error loading custom records:', err);
      setCustomRecords([]);
    } finally {
      setCustomRecordsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (activeCustomTable && session) {
      loadCustomRecords(activeCustomTable.name);
    } else {
      setCustomRecords([]);
    }
    setSearchQuery('');
  }, [activeCustomTable, session, loadCustomRecords]);

  // ─── Custom table CRUD handlers ─────────────────────────────────────────

  const handleCreateCustomTable = useCallback(async (tableData: any) => {
    if (!session) return;
    setCreatingCustomTable(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.password}`,
        },
        body: JSON.stringify(tableData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Errore creazione tabella');
      }
      setShowCreateCustomTable(false);
      await loadCustomTables();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setCreatingCustomTable(false);
    }
  }, [session, loadCustomTables]);

  const handleCreateCustomRecord = useCallback(async (formData: Record<string, unknown>) => {
    if (!session || !activeCustomTable) return;
    setCustomSaving(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-records/${activeCustomTable.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.password}`,
        },
        body: JSON.stringify({ data: formData }),
      });
      if (!res.ok) throw new Error('Errore nella creazione');
      setCustomModalRecord(null);
      await loadCustomRecords(activeCustomTable.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setCustomSaving(false);
    }
  }, [session, activeCustomTable, loadCustomRecords]);

  const handleUpdateCustomRecord = useCallback(async (formData: Record<string, unknown>) => {
    if (!session || !activeCustomTable || !customModalRecord || customModalRecord === 'new') return;
    setCustomSaving(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-records/${activeCustomTable.name}/${customModalRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.password}`,
        },
        body: JSON.stringify({ data: formData }),
      });
      if (!res.ok) throw new Error('Errore nella modifica');
      setCustomModalRecord(null);
      await loadCustomRecords(activeCustomTable.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setCustomSaving(false);
    }
  }, [session, activeCustomTable, customModalRecord, loadCustomRecords]);

  const handleDeleteCustomRecord = useCallback(async (recordId: string) => {
    if (!session || !activeCustomTable) return;
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/custom-records/${activeCustomTable.name}/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.password}` },
      });
      if (!res.ok) throw new Error('Errore nella eliminazione');
      await loadCustomRecords(activeCustomTable.name);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  }, [session, activeCustomTable, loadCustomRecords]);

  const handleCustomModalSave = useCallback((data: Record<string, unknown>) => {
    if (customModalRecord === 'new') {
      handleCreateCustomRecord(data);
    } else {
      handleUpdateCustomRecord(data);
    }
  }, [customModalRecord, handleCreateCustomRecord, handleUpdateCustomRecord]);

  // ─── Login handler ──────────────────────────────────────────────────────

  const handleLogin = useCallback(async (password: string) => {
    // Fetch app config from backend to validate password
    const res = await fetch(`/api/a/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Password errata');
    }

    const data = await res.json();

    if (data.blocked) {
      window.location.href = `/a/${slug}/blocked`;
      return;
    }

    const appSession: AppSession = {
      slug,
      password,
      appInfo: data.appInfo || data,
    };

    localStorage.setItem(sessionKey, JSON.stringify(appSession));
    setSession(appSession);
    setShowLogin(false);
  }, [slug, sessionKey]);

  // ─── CRUD handlers ──────────────────────────────────────────────────────

  const handleCreateRecord = useCallback(async (formData: Record<string, unknown>) => {
    if (!session || !activeTable) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/records`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.password}`,
        },
        body: JSON.stringify({ table: activeTable.name, data: formData }),
      });
      if (!res.ok) throw new Error('Errore nella creazione');
      setModalRecord(null);
      await loadRecords(activeTable.name, session.password, session.appInfo.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }, [session, activeTable, loadRecords]);

  const handleUpdateRecord = useCallback(async (formData: Record<string, unknown>) => {
    if (!session || !activeTable || !modalRecord || modalRecord === 'new') return;
    setSaving(true);
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/records/${modalRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.password}`,
        },
        body: JSON.stringify({ data: formData }),
      });
      if (!res.ok) throw new Error('Errore nella modifica');
      setModalRecord(null);
      await loadRecords(activeTable.name, session.password, session.appInfo.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setSaving(false);
    }
  }, [session, activeTable, modalRecord, loadRecords]);

  const handleDeleteRecord = useCallback(async (recordId: string) => {
    if (!session || !activeTable) return;
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;
    try {
      const res = await fetch(`/api/client/apps/${session.appInfo.id}/records/${recordId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.password}` },
      });
      if (!res.ok) throw new Error('Errore nella eliminazione');
      await loadRecords(activeTable.name, session.password, session.appInfo.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    }
  }, [session, activeTable, loadRecords]);

  const handleChangePassword = useCallback(async (oldPw: string, newPw: string) => {
    const res = await fetch(`/api/a/${slug}/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Errore nel cambio password');
    }
    // Update session with new password
    if (session) {
      const updated = { ...session, password: newPw };
      localStorage.setItem(sessionKey, JSON.stringify(updated));
      setSession(updated);
    }
  }, [slug, session, sessionKey]);

  const handleLogout = useCallback(() => {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(prefsKey);
    setSession(null);
    setShowLogin(true);
    setActiveView('dashboard');
    setRecords([]);
  }, [sessionKey, prefsKey]);

  // ─── Record modal save dispatcher ───────────────────────────────────────

  const handleModalSave = useCallback((data: Record<string, unknown>) => {
    if (modalRecord === 'new') {
      handleCreateRecord(data);
    } else {
      handleUpdateRecord(data);
    }
  }, [modalRecord, handleCreateRecord, handleUpdateRecord]);

  // ─── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#0a0e1a',
      }}>
        <div style={{ color: '#94a3b8', fontSize: '16px' }}>Caricamento...</div>
      </div>
    );
  }

  // ─── Login screen ───────────────────────────────────────────────────────

  if (showLogin || !session) {
    return (
      <LoginScreen
        slug={slug}
        appName={companyName}
        logoUrl={logoUrl}
        primaryColor={primaryColor}
        onLogin={handleLogin}
      />
    );
  }

  // ─── Main layout ────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.bg, transition: 'background 0.3s' }}>
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
      <aside
        className={`${layoutCfg.sidebarWidth}`}
        style={{
          background: colors.primary,
          borderRight: `1px solid ${colors.border}`,
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.3s, transform 0.3s',
          position: 'relative',
          zIndex: 20,
          flexShrink: 0,
          // Mobile: off-canvas by default
          ...(isMobile ? {
            position: 'fixed',
            left: sidebarOpen ? '0' : '-280px',
            top: 0,
            bottom: 0,
            width: '280px',
            boxShadow: sidebarOpen ? '4px 0 24px rgba(0,0,0,0.3)' : 'none',
          } : {}),
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '24px 20px', borderBottom: `1px solid rgba(255,255,255,0.2)`,
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

          {/* Tables fisse */}
          {tables.map((table) => (
            <SidebarItem
              key={table.name}
              icon={resolveIcon(table.icon)}
              label={table.labelPlural}
              active={activeView === table.name}
              onClick={() => setActiveView(table.name)}
              colors={colors}
              primaryColor={primaryColor}
            />
          ))}

          {/* Tabelle personalizzate */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid rgba(255,255,255,0.2)` }}>
            <div style={{ padding: '0 14px 8px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Personalizzate
            </div>
            {customTables.map((ct: any) => (
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
            <button
              onClick={() => setShowCreateCustomTable(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 14px', borderRadius: '8px', border: 'none',
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                width: '100%', justifyContent: 'center', marginTop: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            >
              <Plus size={14} /> Nuova Tabella
            </button>
          </div>

          {/* Comunicazioni */}
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid rgba(255,255,255,0.2)` }}>
            <div style={{ padding: '0 14px 8px', fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Comunicazioni
            </div>
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
        </nav>

        {/* Bottom actions */}
        <div style={{ padding: '12px 10px', borderTop: `1px solid rgba(255,255,255,0.2)`, display: 'flex', flexDirection: 'column', gap: '4px' }}>
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
            onClick={handleLogout}
            colors={colors}
            primaryColor={colors.danger}
          />
        </div>

        {/* Brand Footer */}
        <div style={{ padding: '16px 20px', borderTop: `1px solid rgba(255,255,255,0.2)`, textAlign: 'center' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '11px', fontWeight: 600, margin: 0 }}>
            ZeusX <span style={{ color: 'rgba(255,255,255,0.6)' }}>by</span> <span style={{ color: '#ffffff', fontWeight: 700 }}>MUSINO</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar (mobile toggle) */}
        <header style={{
          padding: '16px 24px', borderBottom: `2px solid ${colors.primary}`,
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
            {activeView === 'dashboard' ? companyName : activeTable?.labelPlural || activeCustomTable?.labelPlural || companyName}
          </div>
          <div style={{ width: '30px', position: 'absolute', right: '24px' }} />
        </header>

        {/* Content area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <div style={{ padding: prefs.layout === 'corporate' ? '32px' : prefs.layout === 'modern' ? '24px' : '16px' }}>
            {activeView === 'dashboard' ? (
              <Dashboard
                colors={colors}
                radius={layoutCfg.radius}
                shadow={layoutCfg.shadow}
                companyName={companyName}
              />
            ) : activeTable ? (
              <DynamicDataTable
                table={activeTable}
                records={records}
                loading={recordsLoading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onEdit={(r) => setModalRecord(r)}
                onDelete={handleDeleteRecord}
                onAddNew={() => setModalRecord('new')}
                colors={colors}
                radius={layoutCfg.radius}
                shadow={layoutCfg.shadow}
                appId={session?.appInfo?.id}
                password={session?.password}
              />
            ) : activeCustomTable ? (
              <CustomTableRenderer
                tableDef={activeCustomTable}
                records={customRecords}
                loading={customRecordsLoading}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onEdit={(r) => setCustomModalRecord(r)}
                onDelete={handleDeleteCustomRecord}
                onAddNew={() => setCustomModalRecord('new')}
                colors={colors}
                radius={layoutCfg.radius}
                shadow={layoutCfg.shadow}
              />
            ) : (
              <div style={{ color: colors.textSecondary, textAlign: 'center', padding: '60px' }}>
                Seleziona una voce dal menu
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Record Modal con colonne dinamiche */}
      {modalRecord !== null && activeTable && (
        <DynamicRecordModal
          table={activeTable}
          record={modalRecord === 'new' ? null : modalRecord}
          onSave={handleModalSave}
          onClose={() => setModalRecord(null)}
          saving={saving}
          colors={colors}
          clientiRecords={clientiRecords}
          prodottiRecords={prodottiRecords}
          ordiniRecords={ordiniRecords}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          prefs={prefs}
          onPrefsChange={setPrefs}
          onClose={() => setShowSettings(false)}
          onLogout={handleLogout}
          onChangePassword={handleChangePassword}
          colors={colors}
          slug={slug}
        />
      )}

      {/* Create Custom Table Modal */}
      {showCreateCustomTable && (
        <CreateCustomTableModal
          onSave={handleCreateCustomTable}
          onClose={() => setShowCreateCustomTable(false)}
          saving={creatingCustomTable}
          colors={colors}
        />
      )}

      {/* Custom Record Modal */}
      {customModalRecord !== null && activeCustomTable && (
        <CustomRecordModal
          columns={activeCustomTable.columns}
          record={customModalRecord === 'new' ? null : customModalRecord}
          onSave={handleCustomModalSave}
          onClose={() => setCustomModalRecord(null)}
          saving={customSaving}
          colors={colors}
          tableLabel={activeCustomTable.label}
        />
      )}
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
        padding: '10px 14px', borderRadius: '10px', border: 'none',
        background: active
          ? primaryColor + '25'
          : hovered
            ? colors.sidebarHover
            : 'transparent',
        color: active ? primaryColor : colors.sidebarText,
        fontSize: '14px', fontWeight: active ? 600 : 500,
        cursor: 'pointer', width: '100%', textAlign: 'left',
        transition: 'all 0.15s',
        position: 'relative',
      }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: '3px', height: '20px', borderRadius: '0 3px 3px 0',
          background: primaryColor,
        }} />
      )}
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  );
}
