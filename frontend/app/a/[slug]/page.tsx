'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ClientLoginPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [app, setApp] = useState<{ name: string; client_email: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    async function loadApp() {
      const { data, error } = await supabase
        .from('apps')
        .select('name, client_email')
        .eq('slug', slug)
        .eq('client_active', true)
        .single();

      if (error || !data) {
        // App non trovata o bloccata
        window.location.href = `/a/${slug}/blocked`;
        return;
      }

      setApp(data);
      setLoading(false);
    }
    loadApp();
  }, [slug]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // Verifica password direttamente da Supabase (policy RLS permette lettura pubblica)
      const { data: appData, error: appError } = await supabase
        .from('apps')
        .select('id, client_password, client_active, expires_at, config')
        .eq('slug', slug)
        .single();

      if (appError || !appData) {
        setError('App non trovata');
        setSubmitting(false);
        return;
      }

      if (!appData.client_active) {
        setError('App bloccata');
        setSubmitting(false);
        return;
      }

      if (appData.client_password !== password) {
        setError('Password errata');
        setSubmitting(false);
        return;
      }

      // Se primo accesso, salva email
      if (!app?.client_email && email.trim()) {
        const { error: updateError } = await supabase
          .from('apps')
          .update({ client_email: email.trim() })
          .eq('id', appData.id);

        if (updateError) {
          console.error('Errore salvataggio email:', updateError);
          // Continuiamo comunque il login anche se l'email non si salva
        }
      }

      // Carica le info dell'app per la sessione
      const { data: appInfoData } = await supabase
        .from('apps')
        .select('config')
        .eq('id', appData.id)
        .single();

      // Salva sessione con appInfo
      const sessionData = {
        slug,
        password,
        appInfo: appInfoData?.config || {},
      };
      localStorage.setItem(`app_session_${slug}`, JSON.stringify(sessionData));
      window.location.href = `/a/${slug}/app`;
    } catch {
      setError('Errore di connessione');
      setSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMessage('');
    setResetting(true);

    try {
      const res = await fetch(`/api/a/${slug}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await res.json();

      if (!res.ok) {
        setResetMessage(`Errore: ${data.error}`);
        setResetting(false);
        return;
      }

      setResetMessage(`Nuova password generata: ${data.new_password}`);
      setResetting(false);
    } catch {
      setResetMessage('Errore di connessione');
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            ZEUSX
          </h1>
          <p className="mt-2 text-lg font-semibold text-white">{app?.name}</p>
          <p className="mt-1 text-sm text-slate-400">
            {app?.client_email ? 'Inserisci la tua password' : 'Configura il tuo accesso'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          {!app?.client_email && (
            <div>
              <label className="text-xs font-semibold text-slate-400">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-400">Password</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Inserisci la password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 pr-11 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {app?.client_email && (
            <button
              type="button"
              onClick={() => {
                setShowReset(true);
                setResetEmail(app.client_email || '');
              }}
              className="text-xs text-slate-400 hover:text-indigo-400 transition underline"
            >
              Password dimenticata?
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? 'Verifica...' : 'Accedi'}
          </button>
        </form>

        {showReset && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold mb-4">Recupera Password</h3>
              <p className="text-sm text-slate-400 mb-6">
                Inserisci la tua email per generare una nuova password
              </p>
              
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">Email</label>
                  <input
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="nome@esempio.com"
                    className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
                  />
                </div>

                {resetMessage && (
                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                    {resetMessage}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowReset(false);
                      setResetMessage('');
                    }}
                    className="flex-1 rounded-xl border border-slate-800 py-3 text-sm font-medium text-slate-400 hover:bg-slate-800 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {resetting ? 'Generazione...' : 'Genera Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
