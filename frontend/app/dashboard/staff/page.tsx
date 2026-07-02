'use client';

import { useState, useEffect } from 'react';
import { supabaseBrowser } from '@/src/lib/supabase-browser';
import { 
  Users, Shield, Key, Copy, Check, ChevronDown, ChevronUp, 
  Save, Loader2, AlertCircle, CheckCircle2, ExternalLink, X
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────

interface StaffMember {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  profileRole: string;
  createdAt: string;
  permissions: PermissionConfig[];
  accessTokens: AccessToken[];
}

interface PermissionConfig {
  id: string;
  role: string;
  visible_tables: string[];
  enabled_features: string[];
  description: string;
}

interface AccessToken {
  id?: string;
  profile_id: string;
  token: string;
  is_used: boolean;
  expires_at: string;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────

const ALL_TABLES = [
  { id: 'profiles', label: 'Profili Utente' },
  { id: 'tenants', label: 'Tenant' },
  { id: 'tenant_members', label: 'Membri Tenant' },
  { id: 'blueprints', label: 'Blueprint' },
  { id: 'apps', label: 'App' },
  { id: 'app_definitions', label: 'Definizioni App' },
  { id: 'app_records', label: 'Record App' },
  { id: 'subscriptions', label: 'Abbonamenti' },
  { id: 'permissions_config', label: 'Configurazione Permessi' },
];

const ALL_FEATURES = [
  { id: 'create_app', label: 'Creazione App' },
  { id: 'edit_app', label: 'Modifica App' },
  { id: 'delete_app', label: 'Eliminazione App' },
  { id: 'manage_members', label: 'Gestione Membri' },
  { id: 'manage_billing', label: 'Gestione Fatturazione' },
  { id: 'manage_permissions', label: 'Gestione Permessi' },
  { id: 'export_data', label: 'Esportazione Dati' },
  { id: 'import_data', label: 'Importazione Dati' },
  { id: 'view_analytics', label: 'Visualizzazione Analisi' },
  { id: 'manage_settings', label: 'Gestione Impostazioni' },
  { id: 'manage_company', label: 'Gestione Azienda' },
  { id: 'voice_input', label: 'Input Vocale' },
  { id: 'view_pricing', label: 'Visualizzazione Prezzi' },
];

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin', color: 'text-purple-400 bg-purple-500/10' },
  { value: 'manager', label: 'Manager', color: 'text-blue-400 bg-blue-500/10' },
  { value: 'editor', label: 'Editor', color: 'text-emerald-400 bg-emerald-500/10' },
  { value: 'viewer', label: 'Viewer', color: 'text-amber-400 bg-amber-500/10' },
  { value: 'member', label: 'Membro', color: 'text-slate-400 bg-slate-500/10' },
];

// ─── Component ────────────────────────────────────────────────────────────

export default function StaffManagerPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [permissions, setPermissions] = useState<PermissionConfig[]>([]);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [generatingToken, setGeneratingToken] = useState<string | null>(null);
  const [tokenResult, setTokenResult] = useState<{ userId: string; link: string } | null>(null);
  const [customPerms, setCustomPerms] = useState<Record<string, { tables: string[]; features: string[] }>>({});

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) { setDenied(true); setLoading(false); return; }

      const token = session.access_token;
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com'}/api/staff/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 403) { setDenied(true); setLoading(false); return; }
      if (!res.ok) throw new Error('Errore caricamento');

      const data = await res.json();
      setMembers(data.members || []);
      setPermissions(data.permissions || []);

      // Inizializza permessi personalizzati
      const perms: Record<string, { tables: string[]; features: string[] }> = {};
      data.members?.forEach((m: StaffMember) => {
        const rolePerms = data.permissions?.find((p: PermissionConfig) => p.role === m.profileRole);
        perms[m.userId] = {
          tables: rolePerms?.visible_tables || [],
          features: rolePerms?.enabled_features || [],
        };
      });
      setCustomPerms(perms);
    } catch (err) {
      console.error('Errore:', err);
      setDenied(true);
    } finally {
      setLoading(false);
    }
  }

  async function savePermissions(userId: string) {
    setSaving(userId);
    setSaveMsg(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) return;

      const perms = customPerms[userId];
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com'}/api/staff/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          visibleTables: perms?.tables || [],
          enabledFeatures: perms?.features || [],
        }),
      });

      if (!res.ok) throw new Error('Errore salvataggio');
      setSaveMsg({ type: 'success', text: 'Permessi salvati con successo!' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg({ type: 'error', text: err instanceof Error ? err.message : 'Errore' });
    } finally {
      setSaving(null);
    }
  }

  async function generateAccess(userId: string) {
    setGeneratingToken(userId);
    setTokenResult(null);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (!session) return;

      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com'}/api/staff/generate-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error('Errore generazione token');
      const data = await res.json();
      setTokenResult({ userId, link: data.accessLink });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore');
    } finally {
      setGeneratingToken(null);
    }
  }

  function toggleTable(userId: string, tableId: string) {
    setCustomPerms(prev => {
      const current = prev[userId] || { tables: [], features: [] };
      const tables = current.tables.includes(tableId)
        ? current.tables.filter(t => t !== tableId)
        : [...current.tables, tableId];
      return { ...prev, [userId]: { ...current, tables } };
    });
  }

  function toggleFeature(userId: string, featureId: string) {
    setCustomPerms(prev => {
      const current = prev[userId] || { tables: [], features: [] };
      const features = current.features.includes(featureId)
        ? current.features.filter(f => f !== featureId)
        : [...current.features, featureId];
      return { ...prev, [userId]: { ...current, features } };
    });
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  // ─── Loading ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-indigo-400" />
      </div>
    );
  }

  if (denied) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Accesso Negato</h2>
          <p className="text-slate-400">Solo gli amministratori possono accedere a questa sezione.</p>
        </div>
      </div>
    );
  }

  // ─── Main UI ──────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <Shield size={24} className="text-indigo-400" />
            <h1 className="text-2xl font-bold">Staff Manager</h1>
          </div>
          <p className="text-slate-400 text-sm">Gestisci utenti, permessi e accessi della tua azienda</p>
        </div>
      </div>

      {/* Save Message */}
      {saveMsg && (
        <div className={`max-w-7xl mx-auto mt-4 px-6`}>
          <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
            saveMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {saveMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{saveMsg.text}</span>
          </div>
        </div>
      )}

      {/* Token Result */}
      {tokenResult && (
        <div className="max-w-7xl mx-auto mt-4 px-6">
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-indigo-400">Link di Accesso Generato</h3>
              <button onClick={() => setTokenResult(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-3">
              <code className="text-sm text-emerald-400 flex-1 break-all">{tokenResult.link}</code>
              <button
                onClick={() => copyToClipboard(tokenResult.link)}
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                title="Copia link"
              >
                <Copy size={16} className="text-slate-400" />
              </button>
              <a
                href={tokenResult.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-slate-700 rounded-lg transition"
                title="Apri link"
              >
                <ExternalLink size={16} className="text-slate-400" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        {members.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Users size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nessun membro trovato</p>
          </div>
        ) : (
          members.map((member) => {
            const isExpanded = expandedUser === member.userId;
            const perms = customPerms[member.userId] || { tables: [], features: [] };
            const roleInfo = ROLE_OPTIONS.find(r => r.value === member.profileRole) || ROLE_OPTIONS[4];

            return (
              <div key={member.userId} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                {/* Member Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition"
                  onClick={() => setExpandedUser(isExpanded ? null : member.userId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                      {(member.fullName || member.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium">{member.fullName || 'Utente'}</div>
                      <div className="text-sm text-slate-400">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${roleInfo.color}`}>
                      {roleInfo.label}
                    </span>
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Panel */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4 space-y-6">
                    {/* Tabelle Visibili */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Shield size={16} className="text-indigo-400" />
                        Tabelle Visibili
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                        {ALL_TABLES.map(table => (
                          <label
                            key={table.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                              perms.tables.includes(table.id)
                                ? 'bg-indigo-500/15 border border-indigo-500/30'
                                : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={perms.tables.includes(table.id)}
                              onChange={() => toggleTable(member.userId, table.id)}
                              className="w-4 h-4 rounded accent-indigo-500"
                            />
                            <span className="text-sm">{table.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Funzionalità Abilitate */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <Key size={16} className="text-emerald-400" />
                        Funzionalità Abilitate
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {ALL_FEATURES.map(feature => (
                          <label
                            key={feature.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition ${
                              perms.features.includes(feature.id)
                                ? 'bg-emerald-500/15 border border-emerald-500/30'
                                : 'bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={perms.features.includes(feature.id)}
                              onChange={() => toggleFeature(member.userId, feature.id)}
                              className="w-4 h-4 rounded accent-emerald-500"
                            />
                            <span className="text-sm">{feature.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => savePermissions(member.userId)}
                        disabled={saving === member.userId}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 rounded-lg text-sm font-semibold transition"
                      >
                        {saving === member.userId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Save size={16} />
                        )}
                        Salva Permessi
                      </button>
                      <button
                        onClick={() => generateAccess(member.userId)}
                        disabled={generatingToken === member.userId}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 rounded-lg text-sm font-semibold transition"
                      >
                        {generatingToken === member.userId ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Key size={16} />
                        )}
                        Genera Accesso
                      </button>
                    </div>

                    {/* Token History */}
                    {member.accessTokens && member.accessTokens.length > 0 && (
                      <div className="pt-2">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Token generati</h4>
                        <div className="space-y-1">
                          {member.accessTokens.slice(0, 3).map((t, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs text-slate-500">
                              <span className={`w-2 h-2 rounded-full ${t.is_used ? 'bg-slate-600' : 'bg-emerald-500'}`} />
                              <code className="font-mono">{t.token.substring(0, 16)}...</code>
                              <span>{t.is_used ? 'Usato' : 'Attivo'}</span>
                              <span>· {new Date(t.created_at).toLocaleDateString('it-IT')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}