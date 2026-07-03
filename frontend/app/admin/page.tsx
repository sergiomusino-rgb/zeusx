'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';

const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 10,
  pro: 25,
  business: 50,
};

const PLAN_COLORS: Record<string, string> = {
  free: '#64748b',
  starter: '#10b981',
  pro: '#3b82f6',
  business: '#8b5cf6',
};

const PIE_COLORS = ['#64748b', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'];

function KpiCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-xl p-5`}>
      <div className="text-xs opacity-80 uppercase font-medium">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState('dash');

  useEffect(() => { boot(); }, []);

  async function boot() {
    const { data: { user } } = await supabaseBrowser.auth.getUser();
    if (!user || user.id !== ADMIN_USER_ID) { setDenied(true); setLoading(false); return; }
    await loadData();
  }

  async function loadData() {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const token = session?.access_token;
      if (!token) return;

      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Errore caricamento');
      const json = await res.json();
      setData(json);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl">Caricamento...</div>;
  if (denied) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl text-red-400">Accesso negato</div>;
  if (!data) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xl">Errore caricamento dati</div>;

  const { totals, dist, chartData, recentApps } = data;
  const pieData = Object.entries(dist).map(([name, value]) => ({ name, value }));
  const fmtEur = (n: number) => new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
  const estimatedRevenue = Object.entries(dist).reduce((sum, [plan, count]) => sum + (Number(count) || 0) * (PLAN_PRICES[plan] || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">ZeusX Admin</h1>
            <p className="text-slate-400 text-sm">Panoramica piattaforma</p>
          </div>
          <Link href="/dashboard" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-semibold transition-all">
            ← Dashboard
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex gap-1">
          {[
            { id: 'dash', label: 'Panoramica' },
            { id: 'revenue', label: 'Ricavi' },
            { id: 'plans', label: 'Piani' },
            { id: 'apps', label: 'App' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${
                tab === t.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* PANORAMICA */}
        {tab === 'dash' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard label="Ricavi Totali" value={fmtEur(totals.revenue || 0)} color="from-emerald-600 to-emerald-700" />
              <KpiCard label="Ricavi Stimati/mese" value={fmtEur(estimatedRevenue)} color="from-blue-600 to-blue-700" />
              <KpiCard label="Tenant Totali" value={totals.tenants} color="from-purple-600 to-purple-700" />
              <KpiCard label="App Attive" value={totals.activeApps} color="from-amber-600 to-amber-700" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Ricavi Mensili</h3>
                {chartData.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nessun dato</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                      <YAxis stroke="#64748b" fontSize={12} />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                        formatter={(v: any) => fmtEur(v)}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Distribuzione Piani</h3>
                {pieData.length === 0 ? (
                  <p className="text-slate-500 text-sm">Nessun dato</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value">
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {pieData.map((d: any, i: number) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="text-sm text-slate-300">{d.name}</span>
                          <span className="text-sm font-bold ml-auto">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-4">Stato App</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Attive</span>
                      <span className="font-bold text-emerald-400">{totals.activeApps}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${totals.apps ? (totals.activeApps / totals.apps) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Scadute</span>
                      <span className="font-bold text-red-400">{totals.expiredApps}</span>
                    </div>
                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: `${totals.apps ? (totals.expiredApps / totals.apps) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Sub. Attivi</span>
                      <span className="font-bold text-blue-400">{totals.activeSubs}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">App Recenti</h3>
              <div className="space-y-2">
                {recentApps.slice(0, 8).map((a: any) => {
                  const expired = a.expires_at && new Date(a.expires_at) < new Date();
                  return (
                    <div key={a.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-4 py-3">
                      <div>
                        <div className="font-medium text-sm">{a.name}</div>
                        <div className="text-xs text-slate-500">{new Date(a.created_at).toLocaleDateString('it-IT')}</div>
                      </div>
                      <div className="flex items-center gap-4">
                        {a.slug && (
                          <a href={`/a/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300">
                            /a/{a.slug}
                          </a>
                        )}
                        <span className={`text-xs font-medium ${expired ? 'text-red-400' : 'text-emerald-400'}`}>
                          {expired ? 'Scaduta' : 'Attiva'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {recentApps.length === 0 && <p className="text-slate-500 text-center py-4">Nessuna app</p>}
              </div>
            </div>
          </div>
        )}

        {/* RICAVI */}
        {tab === 'revenue' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard label="Ricavi Totali" value={fmtEur(totals.revenue || 0)} color="from-emerald-600 to-emerald-700" />
              <KpiCard label="Ricavi Stimati/mese" value={fmtEur(estimatedRevenue)} color="from-blue-600 to-blue-700" />
              <KpiCard label="App Scadute" value={totals.expiredApps} color="from-red-600 to-red-700" />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Andamento Ricavi per Mese</h3>
              {chartData.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">Nessun dato di pagamento registrato</p>
                  <p className="text-slate-600 text-sm mt-2">I dati verranno mostrati qui dopo i primi pagamenti Stripe</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(v: any) => fmtEur(v)}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Transazioni per Mese</h3>
              {chartData.length === 0 ? (
                <p className="text-slate-500 text-sm">Nessun dato</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* PIANI */}
        {tab === 'plans' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(dist).map(([plan, count]) => (
                <div key={plan} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: PLAN_COLORS[plan] || '#64748b' }}>
                      {plan.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-slate-400 uppercase">Piano</div>
                      <div className="text-lg font-bold">{plan}</div>
                    </div>
                  </div>
                  <div className="text-3xl font-bold">{count as number}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {fmtEur((count as number) * (PLAN_PRICES[plan] || 0))}/mese stimato
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Distribuzione Piani</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(dist).map(([name, value]) => ({ name, value: value as number }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {Object.entries(dist).map(([name], i) => (
                      <Cell key={name} fill={PLAN_COLORS[name] || PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* APP */}
        {tab === 'apps' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-300">Tutte le App ({totals.apps})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Nome</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Stato</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Scadenza</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Creato</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-300">Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {recentApps.map((a: any) => {
                    const expired = a.expires_at && new Date(a.expires_at) < new Date();
                    return (
                      <tr key={a.id} className="hover:bg-slate-800/50">
                        <td className="px-5 py-3 font-medium">{a.name}</td>
                        <td className="px-5 py-3">
                          {expired ? (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-red-600/20 text-red-400">Scaduta</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-600/20 text-emerald-400">Attiva</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-slate-400">{a.expires_at ? new Date(a.expires_at).toLocaleDateString('it-IT') : '-'}</td>
                        <td className="px-5 py-3 text-slate-400">{new Date(a.created_at).toLocaleDateString('it-IT')}</td>
                        <td className="px-5 py-3">
                          {a.slug && (
                            <a href={`/a/${a.slug}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs">
                              /a/{a.slug}
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {recentApps.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">Nessuna app</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

