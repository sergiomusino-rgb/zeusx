'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
// Sistemato il percorso relativo uscendo da app/login per entrare in src/lib
import { supabase } from '../../src/lib/supabase'; 
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email, 
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
          }
        });
        if (signUpError) throw signUpError;

        // Login automatico dopo registrazione (senza richiedere conferma email)
        if (signUpData.user && !signUpData.session) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            // Se il login automatico fallisce, probabilmente serve conferma email
            alert('Registrazione completata! Controlla la tua email per confermare l\'account, poi accedi.');
            setIsRegistering(false);
            setLoading(false);
            return;
          }
        }

        // Crea tenant per il nuovo utente
        if (signUpData.user) {
          const userId = signUpData.user.id;
          try {
            // Usa un token per autenticare la richiesta
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            const token = currentSession?.access_token;
            
            if (token) {
              // Crea tenant tramite API
              await fetch('/api/tenants/create', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ 
                  name: email.split('@')[0] + "'s Team",
                  slug: `tenant-${userId.slice(0, 8)}` 
                }),
              });
            }
          } catch (tenantErr) {
            console.warn('[Login] Errore creazione tenant (non bloccante):', tenantErr);
          }
        }

        // Cache busting redirect - forza un caricamento fresco
        window.location.replace('/dashboard?t=' + Date.now());
      } else {
        // Accesso utente esistente
        const { error, data } = await supabase.auth.signInWithPassword({ email, password });
        console.log('[Login] signIn result:', { error: error?.message, session: !!data.session, user: data.user?.id });
        if (error) throw error;

        // Usa direttamente la sessione restituita da signInWithPassword
        if (data.session) {
          // Cache busting redirect - window.location.replace evita cache del browser
          window.location.replace('/dashboard?t=' + Date.now());
        } else {
          setError('Sessione non stabilita. Riprova.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Si è verificato un errore durante l\'autenticazione.');
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
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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