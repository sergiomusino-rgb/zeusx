'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// LoginForm Component (inner, uses useSearchParams)
// ═══════════════════════════════════════════════════════════════════════════

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');

  // Messaggio di redirect dopo registrazione
  useEffect(() => {
    const registered = searchParams.get('registered');
    if (registered === 'true') {
      setSuccessMsg('Registrazione completata! Accedi con le tue credenziali.');
    }
  }, [searchParams]);

  // ─── Handle Login ────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        if (loginError.message.includes('Invalid login credentials')) {
          setError('Email o password non validi.');
        } else if (loginError.message.includes('Email not confirmed')) {
          setError('Email non confermata. Controlla la tua casella di posta.');
        } else {
          setError(loginError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Login riuscito: redirect alla dashboard o alla returnUrl
        const returnUrl = searchParams.get('returnUrl');
        const target = returnUrl ? decodeURIComponent(returnUrl) : '/dashboard';
        router.push(`${target}?t=${Date.now()}`);
      }
    } catch (err) {
      setError('Errore di connessione. Riprova più tardi.');
      setLoading(false);
    }
  };

  // ── Handle Register ─────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    if (password.length < 6) {
      setError('La password deve contenere almeno 6 caratteri.');
      setLoading(false);
      return;
    }

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login?registered=true`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('Un account con questa email esiste già. Prova ad accedere.');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        // Se l'email confirmation è disabilitata, l'utente è già loggato
        if (data.session) {
          router.push('/dashboard?t=' + Date.now());
        } else {
          setSuccessMsg(
            'Registrazione completata! Controlla la tua email per confermare l\'account, poi accedi.'
          );
          setMode('login');
        }
      }
    } catch (err) {
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Handle Password Reset ───────────────────────────────────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo: `${window.location.origin}/login` }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccessMsg('Email di recupero inviata! Controlla la tua casella di posta.');
      }
    } catch (err) {
      setError('Errore di connessione. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isReset = mode === 'reset';

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo */}
        <div className="text-center">
          <Link
            href="/"
            className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-4xl font-black tracking-tighter text-transparent"
          >
            ZEUSX
          </Link>
          <p className="mt-2 text-sm text-slate-400">
            {isLogin && 'Accedi al tuo account'}
            {isRegister && 'Crea un nuovo account'}
            {isReset && 'Recupera la tua password'}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 backdrop-blur">
          {/* Error Message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
              <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-400">
              <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={isLogin ? handleLogin : isRegister ? handleRegister : handleResetPassword}
            className="space-y-5"
          >
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Password (non mostrata in modalità reset) */}
            {!isReset && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={isRegister ? 'Minimo 6 caratteri' : 'Inserisci la password'}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 py-3 pl-4 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-slate-300"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isLogin && (loading ? 'Accesso in corso...' : 'Accedi')}
              {isRegister && (loading ? 'Registrazione...' : 'Crea Account')}
              {isReset && (loading ? 'Invio in corso...' : 'Invia Email di Recupero')}
            </button>
          </form>

          {/* Mode Switcher */}
          <div className="mt-6 space-y-3 text-center text-sm">
            {isLogin && (
              <>
                <button
                  onClick={() => { setMode('reset'); setError(''); setSuccessMsg(''); }}
                  className="block w-full text-slate-400 transition-colors hover:text-indigo-400"
                >
                  Password dimenticata?
                </button>
                <p className="text-slate-500">
                  Non hai un account?{' '}
                  <button
                    onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                    className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    Registrati
                  </button>
                </p>
              </>
            )}

            {isRegister && (
              <p className="text-slate-500">
                Hai già un account?{' '}
                <button
                  onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                  className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                >
                  Accedi
                </button>
              </p>
            )}

            {isReset && (
              <button
                onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                className="font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
              >
                ← Torna al Login
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600">
          © {new Date().getFullYear()} ZeusX by MUSINO. Tutti i diritti riservati.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LoginPage (outer, wraps LoginForm in Suspense)
// ═══════════════════════════════════════════════════════════════════════════

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}