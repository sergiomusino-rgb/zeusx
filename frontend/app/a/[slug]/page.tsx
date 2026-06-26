'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
      // Se primo accesso (email vuota), salva email
      if (!app?.client_email && email.trim()) {
        const saveRes = await fetch(`/api/a/${slug}/save-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password }),
        });

        if (!saveRes.ok) {
          const err = await saveRes.json();
          setError(err.error || 'Password errata');
          setSubmitting(false);
          return;
        }
      } else {
        // Verifica solo password
        const checkRes = await fetch(`/api/a/${slug}/verify-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password }),
        });

        if (!checkRes.ok) {
          setError('Password errata');
          setSubmitting(false);
          return;
        }
      }

      // Salva sessione
      localStorage.setItem(`app_session_${slug}`, JSON.stringify({ slug, password }));
      window.location.href = `/a/${slug}/app`;
    } catch {
      setError('Errore di connessione');
      setSubmitting(false);
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
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Inserisci la password"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? 'Verifica...' : 'Accedi'}
          </button>
        </form>
      </div>
    </div>
  );
}
