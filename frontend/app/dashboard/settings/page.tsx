'use client';

import { useEffect, useState } from 'react';
import { supabase, getAccessTokenFromStorage } from '@/src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

export default function SettingsPage() {
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    async function loadPlan() {
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

      if (membershipError || !memberships?.[0]?.tenant_id) {
        setLoading(false);
        return;
      }

      const tenantId = memberships[0].tenant_id;

      const { data: tenant } = await supabase
        .from('tenants')
        .select('plan')
        .eq('id', tenantId)
        .single();

      if (tenant?.plan) {
        setPlan(tenant.plan);
      }
      setLoading(false);
    }

    loadPlan();
  }, []);

  const planLabel = loading ? 'Caricamento...' : `Piano ${plan.toUpperCase()} Attivo`;
  const planColor = plan === 'vip'
    ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
    : plan === 'pro'
    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
    : 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  async function openStripePortal() {
    setPortalLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || getAccessTokenFromStorage();
      if (!token) {
        alert('Sessione scaduta. Effettua di nuovo il login.');
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/billing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Errore apertura portale Stripe');
      }
    } catch (err) {
      console.error('[Settings] openStripePortal error:', err);
      alert('Errore di connessione al portale Stripe');
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 6) {
      setPasswordError('La password deve essere di almeno 6 caratteri');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Le password non coincidono');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setPasswordError(error.message);
      } else {
        setPasswordSuccess('Password cambiata con successo!');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Errore durante il cambio password');
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Impostazioni</h1>
        <p className="text-slate-400 mt-1">Gestisci le configurazioni del tuo account, le chiavi API e la fatturazione.</p>
      </div>

      <div className="space-y-6">
        
        {/* SEZIONE 1: PROFILO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800/60 pb-2">Profilo Utente</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Nome</label>
              <input 
                type="text" 
                defaultValue="Sergio" 
                disabled
                className="w-full bg-slate-950 border border-slate-800 text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Account Status</label>
              <div className="w-full bg-slate-950 border border-slate-800 text-emerald-400 rounded-xl px-4 py-2.5 text-sm font-medium flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Attivo
              </div>
            </div>
          </div>
        </div>

        {/* SEZIONE 2: CAMBIO PASSWORD */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800/60 pb-2">Cambia Password</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Nuova Password</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Inserisci nuova password"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">Conferma Password</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Conferma nuova password"
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
              />
            </div>

            {passwordError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">
                {passwordError}
              </div>
            )}
            {passwordSuccess && (
              <div className="text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2">
                {passwordSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading || !newPassword || !confirmPassword}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition"
            >
              {passwordLoading ? 'Cambio in corso...' : 'Cambia Password'}
            </button>
          </form>
        </div>

        {/* SEZIONE 3: PIANO E FATTURAZIONE */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/60 pb-2">
            <h3 className="text-base font-bold text-slate-200">Piano & Abbonamento</h3>
            <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${planColor}`}>
              {planLabel}
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 border border-slate-800 p-4 rounded-xl gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-200">Rinnovo Automatico</p>
              <p className="text-xs text-slate-500 mt-0.5">Il prossimo addebito avverrà tramite Stripe il mese prossimo.</p>
            </div>
            <button 
              type="button"
              disabled={portalLoading || plan === 'free'}
              onClick={openStripePortal}
              className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl transition font-medium whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {portalLoading ? 'Caricamento...' : 'Gestisci su Stripe 💳'}
            </button>
          </div>
        </div>

        {/* SEZIONE 4: SVILUPPO & CHIAVI (SUPABASE INTEGRAZIONE PREVISTA) */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-200 border-b border-slate-800/60 pb-2">Integrazione di Sistema</h3>
          <div className="space-y-2">
            <p className="text-xs text-slate-400">
              L'autenticazione, la sicurezza dei dati e la persistenza dei progetti di questa dashboard sono pronte per essere agganciate a **Supabase**.
            </p>
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl font-mono text-[11px] text-slate-500 space-y-1">
              <div>DB_STATUS: <span className="text-amber-500">READY_FOR_SETUP</span></div>
              <div>AUTH_PROVIDER: <span className="text-indigo-400">Supabase Auth</span></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}