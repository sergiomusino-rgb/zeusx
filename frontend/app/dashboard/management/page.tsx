'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, CreditCard, Loader2, AlertCircle, ExternalLink, Settings, Clock } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface App {
  id: string;
  name: string;
  slug: string;
  totalum_app_id: string | null;
  stripe_connect_id: string | null;
  client_subscription_price: number;
  status: 'trial' | 'active' | 'expired';
  trial_ends_at: string | null;
  is_active: boolean;
  created_at: string;
  client_active: boolean;
  expires_at: string | null;
  client_email?: string;
  client_password?: string;
}

export default function ManagementConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<App[]>([]);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [stripeConnectId, setStripeConnectId] = useState<string | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [savingPrice, setSavingPrice] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    // Verifica autenticazione
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Recupera il piano utente
    const { data: tenant } = await supabase
      .from('tenants')
      .select('plan')
      .eq('owner_id', session.user.id)
      .single();

    const plan = tenant?.plan || 'free';
    setUserPlan(plan);

    // Recupera stripe_connect_id dal profilo
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_connect_id')
      .eq('user_id', session.user.id)
      .single();

    setStripeConnectId(profile?.stripe_connect_id || null);

    // Recupera il tenant_id dell'utente
    const { data: membershipData } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', session.user.id)
      .single();

    const tenantId = membershipData?.tenant_id;

    // Recupera le app del tenant
    const { data: appsData, error: appsError } = await supabase
      .from('apps')
      .select('id, name, slug, totalum_app_id, stripe_connect_id, client_subscription_price, status, trial_ends_at, is_active, client_active, expires_at, client_email, client_password, created_at')
      .eq('tenant_id', tenantId);

    if (appsError) {
      setError(appsError.message);
    } else {
      setApps(appsData || []);
      // Inizializza gli input dei prezzi
      const initialPrices: Record<string, string> = {};
      appsData?.forEach(app => {
        initialPrices[app.id] = app.client_subscription_price?.toString() || '';
      });
      setPriceInputs(initialPrices);
    }

    setLoading(false);
  };

  const connectStripe = async () => {
    setConnectingStripe(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const response = await fetch('/api/user/stripe-connect', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || 'Errore durante la connessione a Stripe');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete');
    } finally {
      setConnectingStripe(false);
    }
  };

  const updatePrice = async (appId: string, totalumAppId: string | null) => {
    if (!totalumAppId) return;

    const price = parseFloat(priceInputs[appId] || '0');
    
    // Validazione prezzo minimo per piano Starter
    if (userPlan === 'starter' && price < 25) {
      setError('Il piano Starter richiede un prezzo minimo di 25.00€');
      return;
    }

    setSavingPrice(prev => ({ ...prev, [appId]: true }));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const response = await fetch('/api/user/update-price', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalum_app_id: totalumAppId,
          client_subscription_price: price,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "Errore durante l'aggiornamento del prezzo");
      } else {
        // Aggiorna lo stato locale
        setApps(prev => prev.map(app => 
          app.id === appId 
            ? { ...app, client_subscription_price: price } 
            : app
        ));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore di rete');
    } finally {
      setSavingPrice(prev => ({ ...prev, [appId]: false }));
    }
  };

  const copyCheckoutLink = (totalumAppId: string | null) => {
    if (!totalumAppId) return;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const checkoutUrl = `${appUrl}/api/totalum-client/checkout?totalum_app_id=${totalumAppId}`;
    navigator.clipboard.writeText(checkoutUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('it-IT');
  };

  const getDaysRemaining = (trialEndsAt: string | null): number => {
    if (!trialEndsAt) return 0;
    const trialDate = new Date(trialEndsAt);
    const now = new Date();
    const diffTime = Math.abs(trialDate.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      trial: 'bg-yellow-500/20 text-yellow-300',
      active: 'bg-green-500/20 text-green-300',
      expired: 'bg-red-500/20 text-red-300',
    };
    const labels = {
      trial: 'In Prova',
      active: 'Attiva',
      expired: 'Scaduta',
    };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-400">Caricamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Management Console</h1>
        <p className="text-gray-400 mt-1">Gestisci le app dei tuoi clienti e le quote ZEUSX</p>
      </div>

      {/* Box Configurazione Stripe Connect */}
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Configurazione Stripe Connect</h2>
        
        {stripeConnectId ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-500/20 text-green-300">
              Configurazione completata
            </span>
            <span className="text-gray-400 text-sm">
              Account ID: {stripeConnectId}
            </span>
          </div>
        ) : (
          <div>
            <p className="text-yellow-400 mb-4">
              Configura il tuo account Stripe per iniziare a ricevere i pagamenti dei tuoi clienti
            </p>
            <button
              onClick={connectStripe}
              disabled={connectingStripe}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <CreditCard size={16} />
              {connectingStripe ? 'Connessione...' : 'Collega Stripe'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-300 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {/* Tabella App */}
      <div className="bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl overflow-hidden">
        <table className="min-w-full divide-y divide-slate-800">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Nome App
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Accesso Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Prezzo Cliente
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Giorni Trial
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-slate-900/40 divide-y divide-slate-800">
            {apps.map((app) => (
              <tr key={app.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                  {app.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  <a 
                    href={`/a/${app.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    /a/{app.slug}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col items-center">
                    <div className="bg-white p-2 rounded-lg">
                      <QRCodeSVG 
                        value={`${window.location.origin}/a/${app.slug}`}
                        size={60}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1 text-center">
                      Scansiona per aprire l'app
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(app.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={priceInputs[app.id] || ''}
                      onChange={(e) => setPriceInputs(prev => ({ ...prev, [app.id]: e.target.value }))}
                      className="w-20 px-2 py-1 bg-slate-800 text-white rounded border border-slate-700 text-sm"
                      placeholder="0.00"
                    />
                    <span className="text-gray-400">€</span>
                    {app.totalum_app_id && (
                      <button
                        onClick={() => updatePrice(app.id, app.totalum_app_id)}
                        disabled={savingPrice[app.id]}
                        className="px-2 py-1 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {savingPrice[app.id] ? '...' : 'Salva'}
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                  {getDaysRemaining(app.trial_ends_at)} giorni
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {app.totalum_app_id && (
                      <button
                        onClick={() => copyCheckoutLink(app.totalum_app_id)}
                        className="px-3 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-600 flex items-center gap-1"
                      >
                        {copied ? <Check size={14} /> : <Copy size={14} />}
                        Link Checkout
                      </button>
                    )}
                    <a
                      href={`/dashboard/projects/${app.id}`}
                      className="px-3 py-1 bg-slate-700 text-white rounded text-sm hover:bg-slate-600 flex items-center gap-1"
                    >
                      <Settings size={14} />
                      Dettagli
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {apps.length === 0 && (
          <div className="p-6 text-center text-gray-400">
            Nessuna app trovata. Genera la tua prima app dal generator.
          </div>
        )}
      </div>
    </div>
  );
}