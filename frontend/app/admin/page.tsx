'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import Link from 'next/link';

const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [tenants, setTenants] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [tab, setTab] = useState('dash');

  useEffect(() => { boot(); }, []);

  async function boot() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.id !== ADMIN_USER_ID) { setDenied(true); setLoading(false); return; }
    await loadData();
  }

  async function loadData() {
    try {
      const [tRes, aRes, sRes] = await Promise.all([
        supabase.from('tenants').select('*').order('created_at', { ascending: false }),
        supabase.from('apps').select('*').order('created_at', { ascending: false }),
        supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      ]);
      if (tRes.error) throw tRes.error;
      if (aRes.error) throw aRes.error;
      if (sRes.error) throw sRes.error;
      setTenants(tRes.data || []);
      setApps(aRes.data || []);
      setSubs(sRes.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl">Caricamento...</div>;
  if (denied) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl text-red-400">Accesso negato</div>;

  const expiredApps = apps.filter(a => new Date(a.trial_ends_at) < new Date()).length;
  const activeSubs = subs.filter(s => s.status === 'active').length;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const expiring = apps.filter(a => { const e = new Date(a.trial_ends_at); return e > now && e <= in7; }).length;
  const dist: Record<string, number> = {};
  tenants.forEach(t => { dist[t.plan || 'free'] = (dist[t.plan || 'free'] || 0) + 1; });

  const stats = [
    { label: 'Tenant', value: tenants.length, color: 'bg-blue-600' },
    { label: 'App Totali', value: apps.length, color: 'bg-emerald-600' },
    { label: 'Abbonamenti Attivi', value: activeSubs, color: 'bg-purple-600' },
    { label: 'Trial Scadono (7gg)', value: expiring, color: 'bg-red-600' },
    { label: 'App Trial Scaduto', value: expiredApps, color: 'bg-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black">ZeusX Admin</h1>
            <p className="text-slate-400 mt-1">Gestione piattaforma</p>
          </div>
          <Link href="/dashboard" className="px-5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition">Dashboard</Link>
        </div>

        <div className="flex gap-2 mb-8 border-b border-slate-800 pb-4 overflow-x-auto">
          {[
            { id: 'dash', label: 'Panoramica' },
            { id: 'tenants', label: 'Tenant' },
            { id: 'apps', label: 'App' },
            { id: 'subs', label: 'Abbonamenti' },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-5 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'dash' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.map((s, i) => (
                <div key={i} className={`${s.color} rounded-xl p-5`}>
                  <div className="text-xs opacity-80 uppercase">{s.label}</div>
                  <div className="text-3xl font-bold mt-1">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">Distribuzione Piani</h3>
              {Object.keys(dist).length === 0 ? <p className="text-slate-500">Nessun dato</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {Object.entries(dist).map(([plan, count]) => (
                    <div key={plan} className="bg-slate-800 rounded-xl p-5">
                      <div className="text-xs text-slate-400 uppercase mb-1">{plan}</div>
                      <div className="text-3xl font-bold">{count}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">App Recenti</h3>
              <div className="space-y-2">
                {apps.slice(0, 5).map(a => (
                  <div key={a.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                    <div>
                      <div className="font-medium text-sm">{a.name}</div>
                      <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString('it-IT')}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-medium ${a.is_active ? 'text-emerald-400' : 'text-red-400'}`}>{a.is_active ? 'Attiva' : 'Inattiva'}</div>
                      <div className="text-xs text-slate-500">Trial: {new Date(a.trial_ends_at).toLocaleDateString('it-IT')}</div>
                    </div>
                  </div>
                ))}
                {apps.length === 0 && <p className="text-slate-500 text-center py-4">Nessuna app</p>}
              </div>
            </div>
          </div>
        )}

        {tab === 'tenants' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800"><h3 className="text-lg font-bold">Tenant ({tenants.length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Nome</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Piano</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Slot</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Creato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {tenants.map(t => {
                    const pc: Record<string, string> = { business: 'bg-purple-600/20 text-purple-400', pro: 'bg-blue-600/20 text-blue-400', starter: 'bg-emerald-600/20 text-emerald-400' };
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/50">
                        <td className="px-5 py-3"><div className="font-medium">{t.name || '-'}</div><div className="text-xs text-slate-500 font-mono">{t.id.slice(0, 8)}</div></td>
                        <td className="px-5 py-3"><span className={`px-2 py-1 rounded text-xs font-bold uppercase ${pc[t.plan] || 'bg-slate-700 text-slate-400'}`}>{t.plan || 'free'}</span></td>
                        <td className="px-5 py-3">{t.app_limit || 1}</td>
                        <td className="px-5 py-3 text-slate-400">{new Date(t.created_at).toLocaleDateString('it-IT')}</td>
                      </tr>
                    );
                  })}
                  {tenants.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Nessun tenant</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'apps' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800"><h3 className="text-lg font-bold">App ({apps.length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Nome</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Stato</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Trial</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Creato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {apps.map(a => {
                    const expired = new Date(a.trial_ends_at) < new Date();
                    return (
                      <tr key={a.id} className="hover:bg-slate-800/50">
                        <td className="px-5 py-3 font-medium">{a.name}</td>
                        <td className="px-5 py-3">
                          {expired ? <span className="px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400">Scaduto</span> : <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-600/20 text-emerald-400">Attiva</span>}
                        </td>
                        <td className="px-5 py-3 text-slate-400">{new Date(a.trial_ends_at).toLocaleDateString('it-IT')}</td>
                        <td className="px-5 py-3 text-slate-400">{new Date(a.created_at).toLocaleDateString('it-IT')}</td>
                      </tr>
                    );
                  })}
                  {apps.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Nessuna app</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'subs' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800"><h3 className="text-lg font-bold">Abbonamenti Stripe ({subs.length})</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Tenant</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Status</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Stripe ID</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Scadenza</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Creato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {subs.map(s => (
                    <tr key={s.id} className="hover:bg-slate-800/50">
                      <td className="px-5 py-3 text-xs font-mono">{s.tenant_id?.slice(0, 8)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${s.status === 'active' ? 'bg-emerald-600/20 text-emerald-400' : s.status === 'trialing' ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-700'}`}>{s.status}</span>
                      </td>
                      <td className="px-5 py-3 text-xs font-mono text-slate-400">{s.stripe_subscription_id?.slice(0, 20)}</td>
                      <td className="px-5 py-3 text-slate-400">{s.current_period_end ? new Date(s.current_period_end).toLocaleDateString('it-IT') : '-'}</td>
                      <td className="px-5 py-3 text-slate-400">{new Date(s.created_at).toLocaleDateString('it-IT')}</td>
                    </tr>
                  ))}
                  {subs.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Nessun abbonamento</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
