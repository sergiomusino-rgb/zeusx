'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FieldDef { id: string; type: string; label: string; required: boolean; options: string[]; }
interface TableDef { name: string; label: string; labelPlural: string; icon: string; fields: FieldDef[]; }
interface Blueprint { appName: string; description: string; logo: string; schema: { tables: TableDef[] }; ui: { primaryColor: string }; }
interface AppInfo { id: string; name: string; config: Blueprint; expires_at: string | null; }
interface Record { id: string; data: Record<string, any>; created_at: string; updated_at?: string; }

// Layout presets
const LAYOUT_PRESETS = {
  corporate: {
    sidebarWidth: 'w-72',
    cardPadding: 'p-8',
    tableRowHeight: 'py-4',
    borderRadius: 'rounded-2xl',
    shadow: 'shadow-2xl',
  },
  modern: {
    sidebarWidth: 'w-64',
    cardPadding: 'p-6',
    tableRowHeight: 'py-3',
    borderRadius: 'rounded-xl',
    shadow: 'shadow-xl',
  },
  compact: {
    sidebarWidth: 'w-48',
    cardPadding: 'p-4',
    tableRowHeight: 'py-2',
    borderRadius: 'rounded-lg',
    shadow: 'shadow-lg',
  },
};

export default function ClientViewerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [password, setPassword] = useState('');
  const [selectedTable, setSelectedTable] = useState('');
  const [records, setRecords] = useState<Record[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [layout, setLayout] = useState('corporate');
  const [theme, setTheme] = useState('dark');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [activeView, setActiveView] = useState('dashboard');

  const sessionKey = `app_session_${slug}`;
  const preset = LAYOUT_PRESETS[layout as keyof typeof LAYOUT_PRESETS] || LAYOUT_PRESETS.corporate;
  const isDark = theme === 'dark';

  useEffect(() => {
    const saved = localStorage.getItem(`${sessionKey}_prefs`);
    if (saved) {
      const prefs = JSON.parse(saved);
      setLayout(prefs.layout || 'corporate');
      setTheme(prefs.theme || 'dark');
      setPrimaryColor(prefs.primaryColor || '#6366f1');
    }
  }, [sessionKey]);

  useEffect(() => {
    async function checkSession() {
      try {
        const raw = localStorage.getItem(sessionKey);
        if (!raw) { router.replace(`/a/${slug}`); return; }
        const session = JSON.parse(raw);
        if (!session.password) { localStorage.removeItem(sessionKey); router.replace(`/a/${slug}`); return; }

        const { data: appData, error } = await supabase.from('apps').select('id, client_password, client_active, expires_at, config').eq('slug', slug).single();
        if (error || !appData) { localStorage.removeItem(sessionKey); router.replace(`/a/${slug}`); return; }
        if (!appData.client_active) { router.replace(`/a/${slug}/blocked`); return; }
        if (appData.client_password !== session.password) { localStorage.removeItem(sessionKey); router.replace(`/a/${slug}`); return; }

        setPassword(session.password);
        setAppInfo({ id: appData.id, config: appData.config, expires_at: appData.expires_at });
        setAuthenticated(true);

        // Load branding from config
        const branding = appData.config?.branding;
        if (branding) {
          setCompanyName(branding.company_name || appData.config.appName);
          setLogoUrl(branding.logo_url || '');
          setPrimaryColor(branding.primary_color || '#6366f1');
          if (branding.layout) setLayout(branding.layout);
          if (branding.theme) setTheme(branding.theme);
        } else {
          setCompanyName(appData.config?.appName || '');
          setLogoUrl(appData.config?.logo || '');
          setPrimaryColor(appData.config?.ui?.primaryColor || '#6366f1');
        }

        const tables = appData.config?.schema?.tables;
        if (tables?.length > 0) setSelectedTable(tables[0].name);
      } catch { localStorage.removeItem(sessionKey); router.replace(`/a/${slug}`); }
      finally { setChecking(false); }
    }
    checkSession();
  }, [slug, router, sessionKey]);

  const loadRecords = useCallback(async (tableName: string) => {
    if (!tableName || !appInfo) return;
    setLoadingRecords(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo.id}/records?table=${tableName}`, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      const data = await res.json();
      setRecords(data.records || []);
    } catch { setRecords([]); }
    finally { setLoadingRecords(false); }
  }, [password, appInfo]);

  useEffect(() => {
    if (authenticated && selectedTable) loadRecords(selectedTable);
  }, [authenticated, selectedTable, loadRecords]);

  async function handleCreateRecord(data: Record<string, any>) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo!.id}/records`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
      body: JSON.stringify({ table: selectedTable, data }),
    });
    if (res.ok) { setShowFormModal(false); setEditingRecord(null); loadRecords(selectedTable); }
  }

  async function handleUpdateRecord(recordId: string, data: Record<string, any>) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo!.id}/records/${recordId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
      body: JSON.stringify({ data }),
    });
    if (res.ok) { setShowFormModal(false); setEditingRecord(null); loadRecords(selectedTable); }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!confirm('Eliminare questo record?')) return;
    const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo!.id}/records/${recordId}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${password}` },
    });
    if (res.ok) loadRecords(selectedTable);
  }

  function handleLogout() {
    localStorage.removeItem(sessionKey);
    router.replace(`/a/${slug}`);
  }

  function handleSaveBranding() {
    const prefs = { layout, theme, primaryColor, companyName, logoUrl };
    localStorage.setItem(`${sessionKey}_prefs`, JSON.stringify(prefs));
    setShowSettings(false);
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center text-white" style={{ backgroundColor: '#0a0e1a' }}><div>Caricamento...</div></div>;
  }

  if (!authenticated || !appInfo) return null;

  const blueprint = appInfo.config;
  const tables = blueprint?.schema?.tables || [];
  const currentTable = tables.find((t) => t.name === selectedTable);

  // Generate fake data for dashboard
  const monthlyRevenue = Array.from({ length: 12 }, (_, i) => ({ name: `M${i + 1}`, revenue: Math.floor(Math.random() * 50000) + 10000 }));
  const ordersByStatus = [{ name: 'Completati', value: 45 }, { name: 'In corso', value: 23 }, { name: 'In attesa', value: 12 }];
  const COLORS = [primaryColor, '#10b981', '#f59e0b'];

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: isDark ? '#0a0e1a' : '#f8fafc', color: isDark ? '#ffffff' : '#0f172a' }}>
      {/* Sidebar */}
      <aside className={`${preset.sidebarWidth} flex flex-col shrink-0 transition-all duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} fixed lg:static h-screen z-40 ${isDark ? 'bg-slate-900 border-r border-slate-800' : 'bg-white border-r border-gray-200'}`}>
        <div className="p-6 border-b" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          {logoUrl && <img src={logoUrl} alt="Logo" className="w-12 h-12 rounded-xl mb-3 object-contain" />}
          <h1 className="text-xl font-bold">{companyName || 'Gestionale'}</h1>
          <p className="text-xs opacity-60 mt-1">{slug}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button onClick={() => { setActiveView('dashboard'); setSidebarOpen(false); }} className={`w-full px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${activeView === 'dashboard' ? 'text-white' : ''}`} style={activeView === 'dashboard' ? { backgroundColor: primaryColor } : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Dashboard
          </button>

          {tables.map((table) => (
            <button key={table.name} onClick={() => { setSelectedTable(table.name); setActiveView('table'); setSidebarOpen(false); }} className={`w-full px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 ${selectedTable === table.name && activeView === 'table' ? 'text-white' : ''}`} style={selectedTable === table.name && activeView === 'table' ? { backgroundColor: primaryColor } : { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
              <span>{table.icon || '📋'}</span>
              {table.labelPlural || table.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t space-y-2" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
          <button onClick={() => setShowSettings(true)} className={`w-full px-4 py-3 rounded-xl font-medium transition flex items-center gap-3`} style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Impostazioni
          </button>
          <button onClick={handleLogout} className="w-full px-4 py-3 rounded-xl font-medium transition flex items-center gap-3 text-red-500" style={{ backgroundColor: isDark ? '#7f1d1d20' : '#fee2e2' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Esci
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className={`h-16 border-b flex items-center justify-between px-6 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <h2 className="text-2xl font-bold">{activeView === 'dashboard' ? 'Dashboard' : currentTable?.labelPlural || current
// PART 2 - Helper Components
// Append to viewer_pro.tsx

function DataTable({ records, fields, primaryColor, isDark, preset, onEdit, onDelete }: any) {
  const [search, setSearch] = useState('');
  const filtered = records.filter((r: any) => {
    const s = search.toLowerCase();
    return Object.values(r.data || {}).some((v: any) => String(v).toLowerCase().includes(s));
  });

  return (
    <div>
      <div className="mb-4">
        <input type="text" placeholder="Cerca..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', color: isDark ? '#fff' : '#0f172a' }} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b" style={{ borderColor: isDark ? '#1e293b' : '#e2e8f0' }}>
              {fields.map((f: any) => (
                <th key={f.id} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider opacity-60">{f.label}</th>
              ))}
              <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wider opacity-60">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={fields.length + 1} className="text-center py-16 opacity-50">Nessun record</td></tr>
            ) : filtered.map((r: any) => (
              <tr key={r.id} className={`border-b ${preset.tableRowHeight}`} style={{ borderColor: isDark ? '#1e293b20' : '#e2e8f020' }}>
                {fields.map((f: any) => (
                  <td key={f.id} className="px-4 py-3 text-sm max-w-[200px] truncate">{renderVal(r.data?.[f.id], f)}</td>
                ))}
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onEdit(r)} className="mr-3 text-sm" style={{ color: primaryColor }}>Modifica</button>
                  <button onClick={() => onDelete(r.id)} className="text-sm text-red-400">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={`mt-4 px-4 py-3 border-t text-xs opacity-50 ${isDark ? 'border-slate-800' : 'border-gray-200'}`}>
        {filtered.length} record
      </div>
    </div>
  );
}

function renderVal(v: any, f: any) {
  if (v == null || v === '') return '—';
  if (f.type === 'currency') return `€${parseFloat(v).toFixed(2)}`;
  if (f.type === 'boolean') return v ? '✓' : '✗';
  if (f.type === 'date' || f.type === 'datetime') return new Date(v).toLocaleDateString('it-IT');
  return String(v);
}

function RecordModal({ table, record, primaryColor, isDark, onSave, onClose }: any) {
  const [form, setForm] = useState<Record<string, any>>(record ? { ...record.data } : {});
  const update = (id: string, v: any) => setForm(p => ({ ...p, [id]: v }));

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-8" style={{ backgroundColor: isDark ? '#0f172a' : '#fff' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6">{record ? 'Modifica' : 'Nuovo'} {table.label}</h3>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
          {table.fields.map((f: any) => (
            <div key={f.id}>
              <label className="block text-sm font-medium mb-1 opacity-80">{f.label}</label>
              {f.type === 'textarea' ? <textarea value={form[f.id] || ''} onChange={e => update(f.id, e.target.value)} rows={3} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} /> :
               f.type === 'select' ? <select value={form[f.id] || ''} onChange={e => update(f.id, e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>{f.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}</select> :
               f.type === 'boolean' ? <input type="checkbox" checked={!!form[f.id]} onChange={e => update(f.id, e.target.checked)} className="w-5 h-5 rounded" /> :
               <input type={f.type === 'number' || f.type === 'currency' ? 'number' : f.type === 'date' ? 'date' : f.type === 'email' ? 'email' : 'text'} value={form[f.id] || ''} onChange={e => update(f.id, e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />}
            </div>
          ))}
          <div className="flex gap-3 pt-4">
            <button type="submit" className="flex-1 py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: primaryColor }}>Salva</button>
            <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl font-semibold" style={{ backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }}>Annulla</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SettingsModal({ primaryColor, isDark, layout, setLayout, theme, setTheme, setPrimaryColor, onClose, onPasswordChange, onLogout, onChangeLogo, onChangeName }: any) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [msg, setMsg] = useState('');
  const layouts = ['corporate', 'modern', 'compact'];

  async function handlePwd(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch(`/api/a/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }) });
      const data = await res.json();
      if (res.ok) { onPasswordChange(newPwd); setMsg('Password aggiornata!'); } else setMsg(data.error || 'Errore');
    } catch { setMsg('Errore di connessione'); }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl p-8 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: isDark ? '#0f172a' : '#fff' }} onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-bold mb-6">Impostazioni</h3>

        {/* Layout */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-3 opacity-80">Layout</h4>
          <div className="grid grid-cols-3 gap-3">
            {layouts.map(l => (
              <button key={l} onClick={() => setLayout(l)} className="p-4 rounded-xl border-2 text-center text-sm font-medium capitalize transition" style={{ borderColor: layout === l ? primaryColor : isDark ? '#1e293b' : '#e2e8f0', backgroundColor: layout === l ? primaryColor + '20' : 'transparent' }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Theme */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-3 opacity-80">Tema</h4>
          <div className="flex gap-3">
            <button onClick={() => setTheme('dark')} className="flex-1 py-3 rounded-xl font-medium" style={{ backgroundColor: theme === 'dark' ? '#1e293b' : isDark ? '#1e293b' : '#f1f5f9' }}>Scuro</button>
            <button onClick={() => setTheme('light')} className="flex-1 py-3 rounded-xl font-medium" style={{ backgroundColor: theme === 'light' ? '#fff' : isDark ? '#1e293b' : '#f1f5f9' }}>Chiaro</button>
          </div>
        </div>

        {/* Color */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-3 opacity-80">Colore primario</h4>
          <div className="flex gap-3 items-center">
            <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-12 rounded-xl cursor-pointer border-0" />
            <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 px-4 py-3 rounded-xl text-sm font-mono focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
          </div>
        </div>

        {/* Branding */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-3 opacity-80">Brand</h4>
          <input type="text" placeholder="Nome azienda" onChange={e => onChangeName(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm mb-3 focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
          <input type="text" placeholder="URL logo" onChange={e => onChangeLogo(e.target.value)} className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
        </div>

        {/* Password */}
        <div className="mb-8">
          <h4 className="text-sm font-semibold mb-3 opacity-80">Cambia password</h4>
          {msg && <div className="mb-3 p-3 rounded-xl text-sm">{msg}</div>}
          <form onSubmit={handlePwd} className="space-y-3">
            <input type="password" placeholder="Password attuale" value={oldPwd} onChange={e => setOldPwd(e.target.value)} required className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
            <input type="password" placeholder="Nuova password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }} />
            <button type="submit" className="w-full py-3 rounded-xl font-semibold text-white" style={{ backgroundColor: primaryColor }}>Aggiorna password</button>
          </form>
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="w-full py-3 rounded-xl font-semibold text-red-500 border border-red-500/30">Esci dall&apos;app</button>
      </div>
    </div>
  );
}
