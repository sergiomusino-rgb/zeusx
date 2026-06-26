'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Sistemato il percorso relativo uscendo da app/login per entrare in src/lib
import { supabase } from '../../src/lib/supabase'; 

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    console.log('[Login] handleAuth started, isRegistering:', isRegistering);

    try {
      if (isRegistering) {
        // Registrazione nuovo utente
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Registrazione completata con successo! Ora puoi accedere.');
        setIsRegistering(false);
      } else {
        // Accesso utente esistente
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        console.log('[Login] signIn result:', { error: error?.message, session: !!data.session, user: data.user?.id });
        if (error) throw error;
        // Aspetta che la sessione venga salvata prima del redirect
        setTimeout(() => {
          console.log('[Login] redirect to dashboard');
          window.location.href = '/dashboard';
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore durante l\'autenticazione.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-8 backdrop-blur-md">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
            ZEUSX PLATFORM
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isRegistering ? 'Crea il tuo account di sviluppo' : 'Accedi al tuo pannello di controllo'}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <label className="text-xs font-semibold text-slate-400">Email aziendale</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-400">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
            >
              {loading ? 'Elaborazione...' : isRegistering ? 'Registrati' : 'Accedi'}
            </button>
          </div>
        </form>

        <div className="text-center text-sm">
          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-indigo-400 hover:underline text-xs font-medium"
          >
            {isRegistering ? 'Hai già un account? Accedi' : 'Non hai un account? Registrati ora'}
          </button>
        </div>

      </div>
    </div>
  );
}