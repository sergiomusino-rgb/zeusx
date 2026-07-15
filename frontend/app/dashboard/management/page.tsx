'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AppRegistryItem {
  id: string;
  app_name: string;
  app_url: string;
  status: string;
  monthly_fee: number;
  zeusx_share: number;
  created_at: string;
  total_zeusx_due: number;
}

export default function ManagementConsolePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AppRegistryItem[]>([]);
  const [totalZeusxDue, setTotalZeusxDue] = useState(0);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPlanAndLoadData();
  }, []);

  const checkPlanAndLoadData = async () => {
    setLoading(true);
    
    // Verifica autenticazione
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push('/login');
      return;
    }

    // Verifica piano utente
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan')
      .eq('owner_id', session.user.id)
      .single();

    if (tenantError || !tenant) {
      setError('Impossibile verificare il piano utente');
      setLoading(false);
      return;
    }

    const plan = tenant.plan || 'free';
    setUserPlan(plan);

    // Controllo accesso: solo PRO o BUSINESS
    if (plan !== 'pro' && plan !== 'business') {
      router.push('/pricing');
      return;
    }

    // Carica le app del rivenditore
    const { data, error: appsError } = await supabase.rpc('get_reseller_apps_with_total', {
      p_reseller_id: session.user.id
    });

    if (appsError) {
      setError(appsError.message);
    } else {
      setApps(data || []);
      if (data && data.length > 0) {
        setTotalZeusxDue(data[0].total_zeusx_due || 0);
      }
    }

    setLoading(false);
  };

  const toggleAppStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    const { error } = await supabase
      .from('app_registry')
      .update({ status: newStatus })
      .eq('id', id);

    if (!error) {
      // Ricarica i dati
      checkPlanAndLoadData();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-6 bg-red-50 rounded-lg">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Torna alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Management Console</h1>
        <p className="text-gray-600 mt-1">Gestisci le app dei tuoi clienti e le quote ZEUSX</p>
      </div>

      {/* Card Totale ZEUSX */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 mb-6 text-white">
        <h2 className="text-lg font-medium">Totale Dovuto a ZEUSX</h2>
        <p className="text-3xl font-bold mt-2">€ {totalZeusxDue.toFixed(2)}</p>
        <p className="text-indigo-100 text-sm mt-1">Somma delle quote ZEUSX per tutte le app attive</p>
      </div>

      {/* Tabella App */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nome App
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                URL
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Stato
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quota Mensile
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quota ZEUSX
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Azioni
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {apps.map((app) => (
              <tr key={app.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {app.app_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a 
                    href={app.app_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    {app.app_url}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    app.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {app.status === 'active' ? 'Attiva' : 'Sospesa'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  € {app.monthly_fee.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  € {app.zeusx_share.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => toggleAppStatus(app.id, app.status)}
                    className={`px-3 py-1 rounded text-sm ${
                      app.status === 'active'
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {app.status === 'active' ? 'Sospendi' : 'Attiva'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {apps.length === 0 && (
          <div className="p-6 text-center text-gray-500">
            Nessuna app registrata. Registra la tua prima app dalla dashboard.
          </div>
        )}
      </div>
    </div>
  );
}