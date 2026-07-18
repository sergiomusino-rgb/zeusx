'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

interface App {
  id: string;
  name: string;
  config: any;
  trial_ends_at: string;
  is_active: boolean;
  created_at: string;
  blueprint_id: string;
  tenant_id: string;
  slug?: string;
  client_password?: string;
  client_email?: string;
  client_active?: boolean;
  expires_at?: string;
}

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<App | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [extending, setExtending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    async function loadApp() {
      if (!appId) return;

      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      const { data, error } = await supabase
        .from('apps')
        .select('id, name, config, trial_ends_at, is_active, created_at, blueprint_id, tenant_id, slug, client_password, client_email, client_active, expires_at')
        .eq('id', appId)
        .single();

      if (error || !data) {
        setError('App non trovata o accesso negato');
      } else {
        setApp(data);
      }

      setLoading(false);
    }

    loadApp();
  }, [appId]);

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('it-IT');
  };

  const isTrialExpired = (iso: string) => {
    if (!iso) return false;
    return new Date(iso) < new Date();
  };

  async function handleDelete() {
    if (!appId) return;
    if (!confirm('Sei sicuro di voler eliminare questa app? L\'azione è irreversibile.')) return;

    setDeleting(true);
    const { error: deleteError } = await supabase
      .from('apps')
      .delete()
      .eq('id', appId);

    if (deleteError) {
      console.error('[AppDetail] delete error:', deleteError);
      setError(`Errore eliminazione: ${deleteError.message}`);
      setDeleting(false);
      return;
    }

    // Decrementa fee mensile per l'app eliminata
    try {
      const { data: membershipData } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user?.id)
        .single();

      if (membershipData?.tenant_id) {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';
        const token = process.env.BACKEND_SERVICE_TOKEN;
        
        await fetch(`${backendUrl}/api/update-app-fee`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'X-User-ID': user?.id || '',
            'X-User-Email': user?.email || '',
          },
          body: JSON.stringify({ tenantId: membershipData.tenant_id, action: 'decrement' }),
        });
      }
    } catch (err) {
      console.error('[AppDetail] errore decrement fee:', err);
      // Non bloccare l'eliminazione se fallisce il decrement
    }

    router.push('/dashboard/projects');
  }

  async function handleClientAccess(action: string) {
    if (!appId) return;
    if (action === 'toggle') setToggling(true);
    if (action === 'regenerate-password') setRegenerating(true);
    if (action === 'extend-expiry') setExtending(true);

    try {
      const res = await fetch(`/api/apps/${appId}/client-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Errore');
        return;
      }

      // Aggiorna lo stato locale dell'app
      if (action === 'toggle') {
        setApp(prev => prev ? { ...prev, client_active: data.client_active } : prev);
      } else if (action === 'regenerate-password') {
        setApp(prev => prev ? { ...prev, client_password: data.new_password } : prev);
        alert(`Nuova password generata: ${data.new_password}\nConsegnala al cliente.`);
      } else if (action === 'extend-expiry') {
        setApp(prev => prev ? { ...prev, expires_at: data.new_expires_at, client_active: true } : prev);
      }
    } catch (err) {
      setError('Errore di connessione');
    } finally {
      setToggling(false);
      setRegenerating(false);
      setExtending(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert('Copiato negli appunti!');
    } catch {
      // Fallback per browser che non supportano clipboard API
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('Copiato negli appunti!');
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-slate-400">
        Caricamento...
      </div>
    );
  }

  if (error || !app) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error || 'App non trovata'}
        </div>
        <Link href="/dashboard/projects" className="text-blue-400 hover:underline">
          ← Torna ai progetti
        </Link>
      </div>
    );
  }

  const tables = app.config?.schema?.tables || [];
  const primaryColor = app.config?.ui?.primaryColor || '#6366f1';
  const expired = isTrialExpired(app.trial_ends_at);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/projects" className="text-slate-400 hover:text-white transition">
            ←
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{app.name}</h1>
            <p className="text-slate-400 mt-1">
              Settore: <span className="capitalize text-slate-200">{app.config?.sector || 'custom'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/app/${app.id}`}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Usa App
          </Link>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 text-white px-4 py-2 rounded-xl text-xs font-medium transition"
          >
            {deleting ? 'Eliminazione...' : 'Elimina App'}
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${expired ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
            {expired ? 'Trial scaduto' : 'Attiva'}
          </span>
        </div>
      </div>

      {expired && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span>⚠️ Il trial di questa app è scaduto. Rinnova il piano per continuare.</span>
          <Link href="/dashboard/pricing" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition text-center">
            Vai ai Piani
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info app */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Dettagli App</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Creata il</span>
              <span>{formatDate(app.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Trial fino al</span>
              <span>{formatDate(app.trial_ends_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Stato</span>
              <span>{app.is_active ? 'Attiva' : 'Disattivata'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ID App</span>
              <span className="font-mono text-xs">{app.id.slice(0, 8)}...</span>
            </div>
          </div>
        </div>

        {/* Tabelle */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">Tabelle del Gestionale</h2>
          
          {tables.length === 0 ? (
            <p className="text-slate-500 text-sm">Nessuna tabella definita nel blueprint.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {tables.map((table: any) => (
                <div key={table.name} className="border border-slate-800 rounded-xl p-4 hover:border-slate-600 transition">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{table.icon || '📄'}</span>
                    <div>
                      <h3 className="font-medium">{table.label || table.name}</h3>
                      <p className="text-xs text-slate-500">{table.fields?.length || 0} campi</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {(table.fields || []).slice(0, 4).map((field: any) => (
                      <div key={field.id} className="text-xs text-slate-400 flex justify-between">
                        <span>{field.label || field.id}</span>
                        <span className="text-slate-600 uppercase">{field.type}</span>
                      </div>
                    ))}
                    {(table.fields || []).length > 4 && (
                      <p className="text-xs text-slate-500 mt-2">+ altri campi...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accesso Cliente */}
      {app.slug && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">🔐 Accesso Cliente</h2>
          
          <div className="space-y-4">
            {/* Link di accesso */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Link di accesso</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/a/${app.slug}`}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(`${window.location.origin}/a/${app.slug}`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Copia
                </button>
                <a
                  href={`${window.location.origin}/a/${app.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Vai
                </a>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Password iniziale</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={app.client_password || '-'}
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 font-mono focus:outline-none"
                />
                <button
                  onClick={() => copyToClipboard(app.client_password ?? '')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition"
                >
                  Copia
                </button>
                <button
                  onClick={() => handleClientAccess('regenerate-password')}
                  disabled={regenerating}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-900/50 text-white rounded-lg text-sm font-medium transition"
                >
                  {regenerating ? 'Generazione...' : 'Rigenera'}
                </button>
              </div>
              <p className="text-xs text-slate-500">
                 Il cliente può cambiare la password in qualsiasi momento dall'interno dell'app.
              </p>
            </div>

            {/* QR Code per accesso mobile */}
            <div className="flex flex-col items-center pt-4">
              <div className="bg-white p-4 rounded-xl mb-2">
                <QRCodeSVG 
                  value={`${window.location.origin}/a/${app.slug}`}
                  size={100}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>
              <p className="text-xs text-slate-400">
                Scansiona per aprire su smartphone
              </p>
            </div>

            {/* Stato e scadenza */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Toggle attivo/bloccato */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Stato accesso</label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleClientAccess('toggle')}
                    disabled={toggling}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      app.client_active ? 'bg-emerald-600' : 'bg-red-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        app.client_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className={`text-sm font-medium ${app.client_active ? 'text-emerald-400' : 'text-red-400'}`}>
                    {app.client_active ? 'Attivo' : 'Bloccato'}
                  </span>
                </div>
              </div>

              {/* Data scadenza */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Scadenza</label>
                <p className="text-sm text-slate-300">{formatDate(app.expires_at)}</p>
              </div>

              {/* Email cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Email cliente</label>
                <p className="text-sm text-slate-300">{app.client_email || '-'}</p>
              </div>
            </div>

            {/* Pulsante estendi scadenza */}
            <div className="pt-2">
              <button
                onClick={() => handleClientAccess('extend-expiry')}
                disabled={extending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900/50 text-white rounded-lg text-sm font-medium transition"
              >
                {extending ? 'Estensione...' : '🔄 Estendi scadenza di 30 giorni'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Anteprima colore */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold mb-4">Anteprima Brand</h2>
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-xl shadow-lg"
            style={{ backgroundColor: primaryColor }}
          />
          <div className="text-sm text-slate-400">
            <p>Colore primario: <span className="font-mono text-slate-200">{primaryColor}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
