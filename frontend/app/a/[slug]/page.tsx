'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '@/src/lib/LanguageContext';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ClientLoginPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { t } = useLanguage();

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

      console.log('[Login] loadApp:', { data, error: error?.message });

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
        .select('id, slug, name, client_password, client_active, expires_at, config')
        .eq('slug', slug)
        .single();

      if (appError || !appData) {
        setError(t('login_error_not_found'));
        setSubmitting(false);
        return;
      }

      if (!appData.client_active) {
        setError(t('login_error_blocked'));
        setSubmitting(false);
        return;
      }

      if (appData.client_password !== password) {
        setError(t('login_error_wrong_password'));
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

      // Carica TUTTE le info dell'app per la sessione (apps + app_definitions)
      const { data: appInfoData } = await supabase
        .from('apps')
        .select('id, slug, name, config')
        .eq('id', appData.id)
        .single();

      // Carica anche app_definitions per avere le tabelle
      const { data: appDefData, error: appDefError } = await supabase
        .from('app_definitions')
        .select('schema, ui_config')
        .eq('app_id', appData.id)
        .maybeSingle();

      console.log('[Login] appInfoData:', appInfoData?.config);
      console.log('[Login] appDefData:', appDefData);
      console.log('[Login] appDefError:', appDefError?.message);

      // Combina i dati - metti le tabelle da app_definitions in config
      // La struttura deve essere: config.schema.tables per la app page
      // IMPORTANTE: non sovrascrivere schema con {} quando appDefData è null
      const combinedConfig = {
        ...(appInfoData?.config || {}),
        ...(appDefData?.schema ? { schema: appDefData.schema } : {}),
        ...(appDefData?.ui_config ? { ui_config: appDefData.ui_config } : {}),
      };
      
      console.log('[Login] combinedConfig:', combinedConfig);

      // Salva sessione con appInfo completo (tutti i dati)
      const sessionData = {
        slug,
        password,
        appInfo: {
          id: appData.id,
          slug,
          name: appData.name,
          config: combinedConfig,
        },
      };
      
      console.log('[Login] Saving session with appInfo:', sessionData.appInfo);
      localStorage.setItem(`app_session_${slug}`, JSON.stringify(sessionData));
      window.location.href = `/a/${slug}/app`;
    } catch {
      setError(t('login_error_connection'));
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
        setResetMessage(`${t('login_error')}: ${data.error}`);
        setResetting(false);
        return;
      }

      setResetMessage(`${t('login_new_password')}: ${data.new_password}`);
      setResetting(false);
    } catch {
      setResetMessage(t('login_error_connection'));
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="text-xl">{t('login_loading')}</div>
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
            {app?.client_email ? t('login_enter_password') : t('login_configure_access')}
          </p>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="text-xs font-semibold text-slate-400">{t('login_email')}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@esempio.com"
              autoComplete="username"
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400">{t('login_password')}</label>
            <div className="relative mt-1">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login_password_placeholder')}
                autoComplete="current-password"
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
              {t('login_forgot_password')}
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20 disabled:opacity-50"
          >
            {submitting ? t('login_verifying') : t('login_access')}
          </button>
        </form>

        {showReset && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold mb-4">{t('login_recover_password')}</h3>
              <p className="text-sm text-slate-400 mb-6">
                {t('login_recover_password_desc')}
              </p>
              
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400">{t('login_email')}</label>
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
                    {t('login_cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                  >
                    {resetting ? t('login_generating') : t('login_generate_password')}
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