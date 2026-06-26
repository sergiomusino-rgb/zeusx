"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getAccessTokenFromStorage } from '@/src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    async function syncPlan() {
      const sessionId = searchParams.get('session_id');
      if (!sessionId) return;

      const { data: { session } } = await supabase.auth.getSession();
      let token = session?.access_token || getAccessTokenFromStorage();
      if (!token) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/sync-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ sessionId }),
        });

        const data = await res.json().catch(() => ({}));
        if (res.ok && data.paid) {
          setSyncMessage(`Piano ${data.plan.toUpperCase()} attivato con successo! 🎉`);
        } else if (!data.paid) {
          setSyncMessage('Pagamento non completato. Riprova.');
        } else {
          setSyncMessage('Errore durante l\'attivazione del piano.');
        }
      } catch (err) {
        console.error('[Dashboard] sync-plan error:', err);
      }
    }

    syncPlan();
  }, [searchParams]);

  const features = [
    { title: "Vision & AI Edit", desc: "Analisi avanzata e modifica immagini", link: "/dashboard/vision", color: "bg-blue-600" },
    { title: "Statistiche", desc: "Monitoraggio dei tuoi processi", link: "/dashboard/stats", color: "bg-purple-600" },
    { title: "Impostazioni", desc: "Gestione API e profilo", link: "/dashboard/settings", color: "bg-gray-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-12 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-extrabold text-white">ZeusX Dashboard</h1>
          <p className="text-gray-400">Bentornato, Sergio. Cosa vuoi fare oggi?</p>
        </div>
        <Link href="/" className="px-6 py-2 bg-gray-800 rounded-full hover:bg-gray-700 transition">
          Torna alla Home
        </Link>
      </header>

      {syncMessage && (
        <div className="max-w-6xl mx-auto mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center font-medium">
          {syncMessage}
        </div>
      )}

      {/* Grid delle Pagine */}
      <main className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        {features.map((item, index) => (
          <Link href={item.link} key={index} className="group">
            <div className={`p-8 rounded-2xl border border-gray-800 bg-gray-900 transition-all hover:border-gray-500 hover:scale-105`}>
              <div className={`w-12 h-12 ${item.color} rounded-xl mb-6 flex items-center justify-center`}>
                <span className="text-2xl">⚡</span>
              </div>
              <h2 className="text-xl font-bold mb-2">{item.title}</h2>
              <p className="text-gray-400 mb-6">{item.desc}</p>
              <span className="text-blue-400 font-semibold group-hover:underline">Accedi →</span>
            </div>
          </Link>
        ))}
      </main>

      {/* Footer di sistema */}
      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-gray-900 text-center text-gray-600">
        <p>ZeusX System Control v1.0.0</p>
      </footer>
    </div>
  );
}