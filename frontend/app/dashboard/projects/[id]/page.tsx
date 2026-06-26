'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';

interface App {
  id: string;
  name: string;
  config: any;
  trial_ends_at: string;
  is_active: boolean;
  created_at: string;
  blueprint_id: string;
  tenant_id: string;
}

export default function AppDetailPage() {
  const params = useParams();
  const router = useRouter();
  const appId = params.id as string;

  const [app, setApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadApp() {
      if (!appId) return;

      const { data, error } = await supabase
        .from('apps')
        .select('id, name, config, trial_ends_at, is_active, created_at, blueprint_id, tenant_id')
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
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${expired ? 'bg-red-500/10 text-red-300 border border-red-500/30' : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'}`}>
            {expired ? 'Trial scaduto' : 'Attiva'}
          </span>
        </div>
      </div>

      {expired && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <span>⚠️ Il trial di questa app è scaduto. Rinnova il piano per continuare.</span>
          <Link href="/pricing" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-medium transition text-center">
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
