'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/src/lib/supabase';

interface App {
  id: string;
  name: string;
  sector: string;
  trial_ends_at: string;
  is_active: boolean;
  created_at: string;
  blueprint_id: string;
}

export default function ProjectsPage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadApps() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: memberships, error: membershipError } = await supabase
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1);

      if (membershipError) {
        console.error('[Projects] membership error:', membershipError);
        setError('Errore caricamento membership');
        setLoading(false);
        return;
      }

      const tenantId = memberships?.[0]?.tenant_id;
      if (!tenantId) {
        setLoading(false);
        return;
      }

      const { data: appsData, error: appsError } = await supabase
        .from('apps')
        .select('id, name, trial_ends_at, is_active, created_at, blueprint_id, blueprints(sector)')
        .eq('tenant_id', tenantId);

      if (appsError) {
        console.error('[Projects] load apps error:', appsError);
        setError('Errore caricamento app');
      } else {
        setApps((appsData || []).map((a: any) => ({
          ...a,
          sector: a.blueprints?.sector || 'custom',
        })));
      }

      setLoading(false);
    }

    loadApps();
  }, []);

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('it-IT');
  };

  const isTrialExpired = (iso: string) => {
    if (!iso) return false;
    return new Date(iso) < new Date();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Le tue App</h1>
          <p className="text-slate-400 mt-1">Gestisci le app generate con ZeusX.</p>
        </div>
        <Link
          href="/create"
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition text-center"
        >
          + Nuova App
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Nome App</th>
                <th className="py-4 px-6">Settore</th>
                <th className="py-4 px-6">Creata il</th>
                <th className="py-4 px-6">Trial fino al</th>
                <th className="py-4 px-6">Stato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">Caricamento...</td>
                </tr>
              ) : apps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    Nessuna app trovata.{' '}
                    <Link href="/create" className="text-blue-400 hover:underline">Crea la prima app</Link>
                  </td>
                </tr>
              ) : (
                apps.map((app) => {
                  const expired = isTrialExpired(app.trial_ends_at);
                  return (
                    <tr key={app.id} className="hover:bg-slate-800/30 transition group cursor-pointer">
                      <td className="py-4 px-6 font-medium text-slate-200 group-hover:text-blue-400 transition">
                        {app.name}
                      </td>
                      <td className="py-4 px-6 text-slate-400 capitalize">{app.sector}</td>
                      <td className="py-4 px-6 text-slate-400">{formatDate(app.created_at)}</td>
                      <td className="py-4 px-6 text-slate-400">{formatDate(app.trial_ends_at)}</td>
                      <td className="py-4 px-6">
                        <span className={`flex items-center gap-1.5 ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${expired ? 'bg-red-500' : 'bg-emerald-500'}`} />
                          {app.is_active ? (expired ? 'Trial scaduto' : 'Attiva') : 'Disattivata'}
                        </span>
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
