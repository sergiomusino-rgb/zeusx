"use client";

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase, getAccessTokenFromStorage } from '@/src/lib/supabase';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

function SyncPlanBanner() {
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

  if (!syncMessage) return null;

  return (
    <div className="max-w-6xl mx-auto mb-8 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-center font-medium">
      {syncMessage}
    </div>
  );
}

export default function DashboardPage() {
  const [chatInput, setChatInput] = useState('');
  const coreFeatures = [
    { 
      title: "Crea il tuo gestionale", 
      desc: "Seleziona un settore e lascia che ZeusX generi la tua app personalizzata",
      link: "/create", 
      color: "bg-gradient-to-br from-indigo-600 to-purple-600",
      icon: "🚀",
      highlighted: true
    },
    { 
      title: "I tuoi Progetti", 
      desc: "Gestisci e monitora le tue app esistenti",
      link: "/dashboard/projects", 
      color: "bg-blue-600",
      icon: "",
      highlighted: false
    },
    { 
      title: "Vision AI", 
      desc: "Analisi avanzata e modifica immagini",
      link: "/dashboard/vision", 
      color: "bg-emerald-600",
      icon: "👁️",
      highlighted: false
    },
  ];

  const utilityFeatures = [
    { title: "Chat AI", desc: "Assistente virtuale", link: "/dashboard/chat", color: "bg-cyan-600", icon: "" },
    { title: "Statistiche", desc: "Monitoraggio dei tuoi processi", link: "/dashboard/stats", color: "bg-purple-600", icon: "📊" },
    { title: "Impostazioni", desc: "Gestione API e profilo", link: "/dashboard/settings", color: "bg-gray-600", icon: "️" },
  ];

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      window.location.href = `/dashboard/chat?q=${encodeURIComponent(chatInput.trim())}`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <header className="max-w-6xl mx-auto mb-12">
        <div>
          <h1 className="text-4xl font-extrabold text-white">ZeusX Dashboard</h1>
          <p className="text-gray-400 mt-2">Bentornato, Sergio. Cosa vuoi fare oggi?</p>
        </div>
      </header>

      <Suspense fallback={null}>
        <SyncPlanBanner />
      </Suspense>

      {/* Core Business Features */}
      <main className="max-w-6xl mx-auto space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {coreFeatures.map((item, index) => (
            <Link href={item.link} key={index} className="group">
              <div className={`p-8 rounded-2xl border transition-all hover:scale-105 ${
                item.highlighted 
                  ? 'border-indigo-500/50 bg-gradient-to-br from-indigo-950/50 to-purple-950/50 shadow-lg shadow-indigo-500/20' 
                  : 'border-gray-800 bg-gray-900 hover:border-gray-500'
              }`}>
                <div className={`w-12 h-12 ${item.color} rounded-xl mb-6 flex items-center justify-center shadow-lg`}>
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{item.title}</h2>
                <p className="text-gray-400 mb-6">{item.desc}</p>
                <span className="text-blue-400 font-semibold group-hover:underline">Accedi →</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Chat AI Bar */}
        <div className="pt-8">
          <form onSubmit={handleChatSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Chiedi qualcosa a ZeusX AI..."
                className="w-full bg-gray-900 border border-gray-700 rounded-2xl px-6 py-5 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-lg"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold transition-all"
              >
                Invia
              </button>
            </div>
          </form>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto mt-20 pt-8 border-t border-gray-900 text-center text-gray-600">
        <p>ZeusX System Control v1.0.0</p>
      </footer>
    </div>
  );
}
