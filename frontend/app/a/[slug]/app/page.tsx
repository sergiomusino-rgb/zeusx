'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface FieldDef {
  id: string;
  type: string;
  label: string;
  required: boolean;
  options: string[];
}

interface TableDef {
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  fields: FieldDef[];
}

interface Blueprint {
  appName: string;
  description: string;
  logo: string;
  schema: { tables: TableDef[] };
  ui: { primaryColor: string };
}

interface AppInfo {
  id: string;
  name: string;
  config: Blueprint;
  expires_at: string | null;
}

interface Record {
  id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at?: string;
}

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

  const sessionKey = `app_session_${slug}`;

  // --- Expiry helpers ---
  function getExpiryStatus(expiresAt: string | null): { expired: boolean; expiringSoon: boolean; daysLeft: number } {
    if (!expiresAt) return { expired: false, expiringSoon: false, daysLeft: 999 };
    const now = new Date();
    const exp = new Date(expiresAt);
    const diffMs = exp.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      expired: daysLeft <= 0,
      expiringSoon: daysLeft > 0 && daysLeft <= 5,
      daysLeft,
    };
  }

  // --- Auth flow ---
  useEffect(() => {
    async function checkSession() {
      try {
        const raw = localStorage.getItem(sessionKey);
        if (!raw) {
          router.replace(`/a/${slug}`);
          return;
        }
        const session = JSON.parse(raw);
        const storedPassword = session.password;
        if (!storedPassword) {
          localStorage.removeItem(sessionKey);
          router.replace(`/a/${slug}`);
          return;
        }

        const { data: appData, error: appError } = await supabase
          .from('apps')
          .select('id, client_password, client_active, expires_at, config')
          .eq('slug', slug)
          .single();

        if (appError || !appData) {
          localStorage.removeItem(sessionKey);
          router.replace(`/a/${slug}`);
          return;
        }

        if (!appData.client_active) {
          router.replace(`/a/${slug}/blocked`);
          return;
        }

        if (appData.client_password !== storedPassword) {
          localStorage.removeItem(sessionKey);
          router.replace(`/a/${slug}`);
          return;
        }

        const app = {
          id: appData.id,
          config: appData.config,
          expires_at: appData.expires_at,
        };

        setPassword(storedPassword);
        setAppInfo(app);
        setAuthenticated(true);

        const tables = appData.config?.schema?.tables;
        if (tables?.length > 0) {
          setSelectedTable(tables[0].name);
        }
      } catch {
        localStorage.removeItem(sessionKey);
        router.replace(`/a/${slug}`);
      } finally {
        setChecking(false);
      }
    }
    checkSession();
  }, [slug, router, sessionKey]);

  // --- Load records ---
  const loadRecords = useCallback(async (tableName: string) => {
    if (!tableName || !appInfo) return;
    setLoadingRecords(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo.id}/records?table=${tableName}`, {
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (!res.ok) throw new Error('Failed to load records');
      const data = await res.json();
      setRecords(data.records || []);
    } catch (err) {
      console.error('Load records error:', err);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [password, appInfo]);

  useEffect(() => {
    if (authenticated && selectedTable) {
      loadRecords(selectedTable);
    }
  }, [authenticated, selectedTable, loadRecords]);

  // --- CRUD handlers ---
  async function handleCreateRecord(data: Record<string, any>) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo.id}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
        body: JSON.stringify({ table: selectedTable, data }),
      });
      if (!res.ok) throw new Error('Create failed');
      setShowFormModal(false);
      setEditingRecord(null);
      loadRecords(selectedTable);
    } catch (err) {
      console.error('Create record error:', err);
      alert('Errore durante la creazione del record');
    }
  }

  async function handleUpdateRecord(recordId: string, data: Record<string, any>) {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo.id}/records/${recordId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${password}` },
        body: JSON.stringify({ data }),
      });
      if (!res.ok) throw new Error('Update failed');
      setShowFormModal(false);
      setEditingRecord(null);
      loadRecords(selectedTable);
    } catch (err) {
      console.error('Update record error:', err);
      alert('Errore durante la modifica del record');
    }
  }

  async function handleDeleteRecord(recordId: string) {
    if (!confirm('Eliminare questo record?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/apps/${appInfo.id}/records/${recordId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${password}` },
      });
      if (!res.ok) throw new Error('Delete failed');
      loadRecords(selectedTable);
    } catch (err) {
      console.error('Delete record error:', err);
      alert('Errore durante l\'eliminazione del record');
    }
  }

  function handleLogout() {
    localStorage.removeItem(sessionKey);
    router.replace(`/a/${slug}`);
  }

  // --- Render helpers ---
  function renderFieldValue(value: any, field: FieldDef) {
    if (value == null || value === '') return <span className="text-slate-600">&mdash;</span>;
    switch (field.type) {
      case 'currency':
        return <span>&euro;{parseFloat(value).toFixed(2)}</span>;
      case 'boolean':
        return value ? <span className="text-emerald-400">S&igrave;</span> : <span className="text-red-400">No</span>;
      case 'date':
      case 'datetime':
        return <span>{new Date(value).toLocaleDateString('it-IT')}</span>;
      default:
        return <span>{String(value)}</span>;
    }
  }

  // --- Loading state ---
  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-xl text-slate-400">Caricamento...</div>
      </div>
    );
  }

  if (!authenticated || !appInfo) {
    return null;
  }

  const blueprint = appInfo.config;
  const tables = blueprint?.schema?.tables || [];
  const currentTable = tables.find((t) => t.name === selectedTable);
  const expiry = getExpiryStatus(appInfo.expires_at);
  const primaryColor = blueprint?.ui?.primaryColor || '#6366f1';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Expiry Banner */}
      {expiry.expired && (
        <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-semibold">
          Questa app &egrave; scaduta. I dati sono visibili in sola lettura. Contatta il tuo gestionale per rinnovare l&apos;accesso.
        </div>
      )}
      {expiry.expiringSoon && !expiry.expired && (
        <div className="bg-orange-500 text-white text-center py-2 px-4 text-sm font-semibold">
          Questa app scade tra {expiry.daysLeft} giorno{expiry.daysLeft !== 1 ? 'i' : ''}. Contatta il tuo gestionale per rinnovare.
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-200 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              {blueprint.logo && (
                <img src={blueprint.logo} alt="Logo" className="w-10 h-10 rounded-lg object-contain" />
              )}
              <div>
                <h1 className="text-lg font-bold truncate">{blueprint.appName}</h1>
                <p className="text-xs text-slate-500 truncate">{slug}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {tables.map((table) => (
              <button
                key={table.name}
                onClick={() => {
                  setSelectedTable(table.name);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
                  selectedTable === table.name
                    ? 'text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                style={selectedTable === table.name ? { backgroundColor: primaryColor } : undefined}
              >
                {table.icon && <span>{table.icon}</span>}
                <span className="truncate">{table.labelPlural || table.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-slate-800 space-y-1">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Impostazioni
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Esci
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-14 border-b border-slate-800 flex items-center justify-between px-4 lg:px-6 shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1.5 rounded-lg hover:bg-slate-800 text-slate-400"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              </button>
              <h2 className="text-lg font-semibold truncate">
                {currentTable?.icon && <span className="mr-2">{currentTable.icon}</span>}
                {currentTable?.labelPlural || currentTable?.label || 'Seleziona una tabella'}
              </h2>
            </div>
            {!expiry.expired && currentTable && (
              <button
                onClick={() => { setEditingRecord(null); setShowFormModal(true); }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                + Nuovo
              </button>
            )}
          </header>

          {/* Records table */}
          <div className="flex-1 overflow-auto p-4 lg:p-6">
            {loadingRecords ? (
              <div className="flex items-center justify-center h-64 text-slate-500">Caricamento record...</div>
            ) : !currentTable ? (
              <div className="flex items-center justify-center h-64 text-slate-500">Nessuna tabella disponibile</div>
            ) : (
              <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-800/60">
                      <tr>
                        {currentTable.fields.map((field) => (
                          <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                            {field.label}
                          </th>
                        ))}
                        {!expiry.expired && (
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Azioni</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={currentTable.fields.length + (expiry.expired ? 0 : 1)} className="px-4 py-16 text-center text-slate-500">
                            Nessun record presente.
                          </td>
                        </tr>
                      ) : (
                        records.map((record) => (
                          <tr key={record.id} className="hover:bg-slate-800/40 transition">
                            {currentTable.fields.map((field) => (
                              <td key={field.id} className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                                {renderFieldValue(record.data?.[field.id], field)}
                              </td>
                            ))}
                            {!expiry.expired && (
                              <td className="px-4 py-3 text-right whitespace-nowrap">
                                <button
                                  onClick={() => { setEditingRecord(record); setShowFormModal(true); }}
                                  className="text-sm text-blue-400 hover:text-blue-300 mr-4 transition"
                                >
                                  Modifica
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(record.id)}
                                  className="text-sm text-red-400 hover:text-red-300 transition"
                                >
                                  Elimina
                                </button>
                              </td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 border-t border-slate-800 text-xs text-slate-500">
                  {records.length} record{records.length !== 1 ? 'i' : 'o'}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Record Form Modal */}
      {showFormModal && currentTable && (
        <RecordFormModal
          table={currentTable}
          record={editingRecord}
          primaryColor={primaryColor}
          onClose={() => { setShowFormModal(false); setEditingRecord(null); }}
          onSave={(data) => {
            if (editingRecord) {
              handleUpdateRecord(editingRecord.id, data);
            } else {
              handleCreateRecord(data);
            }
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          slug={slug}
          password={password}
          primaryColor={primaryColor}
          onClose={() => setShowSettings(false)}
          onPasswordChanged={(newPassword) => {
            setPassword(newPassword);
            localStorage.setItem(sessionKey, JSON.stringify({ slug, password: newPassword }));
            setShowSettings(false);
          }}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

// ===================== Record Form Modal =====================

function RecordFormModal({
  table,
  record,
  primaryColor,
  onClose,
  onSave,
}: {
  table: TableDef;
  record: Record | null;
  primaryColor: string;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void;
}) {
  const [formData, setFormData] = useState<Record<string, any>>(
    record ? { ...record.data } : {}
  );
  const [saving, setSaving] = useState(false);

  function updateField(fieldId: string, value: any) {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      onSave(formData);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {record ? `Modifica ${table.label}` : `Nuovo ${table.label}`}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {table.fields.map((field) => (
            <div key={field.id}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              <FieldInput field={field} value={formData[field.id] ?? ''} onChange={(val) => updateField(field.id, val)} />
            </div>
          ))}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: primaryColor }}
            >
              {saving ? 'Salvataggio...' : record ? 'Salva modifiche' : 'Crea record'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-slate-800 hover:bg-slate-700 transition"
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===================== Field Input =====================

function FieldInput({ field, value, onChange }: { field: FieldDef; value: any; onChange: (val: any) => void }) {
  const baseClass = 'w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none transition';

  switch (field.type) {
    case 'textarea':
      return (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className={baseClass} placeholder={field.label} />
      );
    case 'select':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} className={baseClass}>
          <option value="">Seleziona...</option>
          {field.options?.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'boolean':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value === true || value === 'true'}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded bg-slate-800 border-slate-600 text-indigo-500 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-300">{field.label}</span>
        </label>
      );
    case 'number':
    case 'currency':
      return (
        <input type="number" value={value} onChange={(e) => onChange(e.target.value)} step={field.type === 'currency' ? '0.01' : '1'} className={baseClass} placeholder={field.label} />
      );
    case 'date':
      return (
        <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />
      );
    case 'datetime':
      return (
        <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} />
      );
    case 'email':
      return (
        <input type="email" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} placeholder="email@esempio.com" />
      );
    case 'phone':
      return (
        <input type="tel" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} placeholder="+39 ..." />
      );
    default:
      return (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} className={baseClass} placeholder={field.label} />
      );
  }
}

// ===================== Settings Modal =====================

function SettingsModal({
  slug,
  password,
  primaryColor,
  onClose,
  onPasswordChanged,
  onLogout,
}: {
  slug: string;
  password: string;
  primaryColor: string;
  onClose: () => void;
  onPasswordChanged: (newPassword: string) => void;
  onLogout: () => void;
}) {
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (oldPwd !== password) {
      setError('Password attuale non corretta');
      return;
    }
    if (newPwd.length < 6) {
      setError('La nuova password deve avere almeno 6 caratteri');
      return;
    }
    if (newPwd !== confirmPwd) {
      setError('Le password non coincidono');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/a/${slug}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Errore durante il cambio password');
        return;
      }

      setSuccess('Password cambiata con successo!');
      onPasswordChanged(newPwd);
    } catch {
      setError('Errore di connessione');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-slate-900 rounded-xl border border-slate-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-xl font-bold">Impostazioni</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Change Password */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Cambia password</h4>

            {error && (
              <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-sm text-red-400">{error}</div>
            )}
            {success && (
              <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-sm text-emerald-400">{success}</div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Password attuale</label>
                <input
                  type="password"
                  required
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Nuova password</label>
                <input
                  type="password"
                  required
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Conferma nuova password</label>
                <input
                  type="password"
                  required
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:border-indigo-500 focus:outline-none transition"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: primaryColor }}
              >
                {saving ? 'Salvataggio...' : 'Cambia password'}
              </button>
            </form>
          </div>

          <hr className="border-slate-800" />

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition"
          >
            Esci dall&apos;app
          </button>
        </div>
      </div>
    </div>
  );
}
