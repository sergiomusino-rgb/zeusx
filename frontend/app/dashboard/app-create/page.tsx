'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/src/lib/supabase-browser';
import { CheckCircle, ArrowLeft, ExternalLink, Copy, Check } from 'lucide-react';

interface AppTable {
  name: string;
  label: string;
  fields?: unknown[];
}

interface AppDetails {
  id: string;
  name: string;
  slug: string;
  status?: string;
  trial_ends_at?: string;
  client_email?: string;
  client_password?: string;
  config?: { schema?: { tables?: AppTable[] } };
}

export default function AppCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [app, setApp] = useState<AppDetails | null>(null);
  const [copied, setCopied] = useState<'email' | 'password' | null>(null);

  useEffect(() => {
    if (!projectId) {
      router.push('/dashboard/creator');
      return;
    }

    (async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session?.access_token) {
          router.push('/login');
          return;
        }

        const res = await fetch(`/api/apps/${projectId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const data = await res.json();

        if (!res.ok || !data.app) {
          setError(data.error || 'App non trovata');
        } else {
          setApp(data.app);
        }
      } catch (err) {
        console.error('Errore caricamento app:', err);
        setError('Errore di connessione. Riprova più tardi.');
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId, router]);

  const copyToClipboard = (value: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(field);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-400">Caricamento app...</p>
          </div>
        </div>
      </div>
    );
  }

  const appUrl = app ? `${window.location.origin}/a/${app.slug}` : '';
  const tables = app?.config?.schema?.tables || [];

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/dashboard/creator')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna al Creator AI
          </button>
          <h1 className="text-4xl font-bold mb-4">App Generata con Successo!</h1>
          <p className="text-gray-400 text-lg">
            La tua app è pronta. Ecco come accedervi.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6 text-red-400">
            {error}
          </div>
        )}

        {app && (
          <>
            {/* Success Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-500" />
                <h2 className="text-xl font-bold">{app.name}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">URL della tua app</p>
                  <a
                    href={appUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-amber-400 hover:text-amber-300 font-mono text-sm break-all"
                  >
                    {appUrl}
                    <ExternalLink className="w-4 h-4 flex-shrink-0" />
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email cliente</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-gray-200">{app.client_email || '—'}</p>
                      {app.client_email && (
                        <button
                          onClick={() => copyToClipboard(app.client_email!, 'email')}
                          className="text-gray-500 hover:text-white"
                          title="Copia"
                        >
                          {copied === 'email' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Password iniziale</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-gray-200">{app.client_password || '—'}</p>
                      {app.client_password && (
                        <button
                          onClick={() => copyToClipboard(app.client_password!, 'password')}
                          className="text-gray-500 hover:text-white"
                          title="Copia"
                        >
                          {copied === 'password' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-4">
                Tabelle generate ({tables.length})
              </h3>
              {tables.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuna tabella nello schema.</p>
              ) : (
                <div className="space-y-2">
                  {tables.map((table) => (
                    <div key={table.name} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-4 py-2.5">
                      <span className="text-gray-200 text-sm">{table.label || table.name}</span>
                      <span className="text-gray-500 text-xs">{table.fields?.length || 0} campi</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => router.push('/dashboard/projects')}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white py-3 rounded-lg font-semibold transition"
            >
              Vai alle App Create
            </button>
          </>
        )}
      </div>
    </div>
  );
}
