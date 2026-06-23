'use client';

import Link from 'next/link';

export default function DashboardHome() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* BENVENUTO CON BOTTONE ACQUISTA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pannello di Controllo</h1>
          <p className="text-slate-400 mt-1">Bentornato su ZEUSX. Seleziona uno strumento AI per iniziare a lavorare.</p>
        </div>
        
        <Link 
          href="/checkout" 
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl transition shadow-lg shadow-blue-900/20"
        >
          <span className="mr-2">💳</span> Acquista Crediti
        </Link>
      </div>

      {/* GRIGLIA CARDS DELLE FUNZIONALITÀ */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* CARD CHAT */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-blue-500/40 transition group flex flex-col justify-between">
          <div>
            <div className="text-2xl mb-4">💬</div>
            <h3 className="text-lg font-bold group-hover:text-blue-400 transition">Chat AI Avanzata</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Interagisci con i modelli più veloci del mondo (Groq/OpenAI) con supporto per lo streaming in tempo reale.
            </p>
          </div>
          <Link href="/dashboard/chat" className="mt-6 block text-center bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium py-2.5 rounded-xl transition">
            Apri Chat →
          </Link>
        </div>

        {/* CARD VISION */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/40 transition group flex flex-col justify-between">
          <div>
            <div className="text-2xl mb-4">👁️</div>
            <h3 className="text-lg font-bold group-hover:text-indigo-400 transition">Vision & Documenti</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Invia immagini per estrarre dati, analizzare schemi elettrici o elaborare interi documenti PDF complessi.
            </p>
          </div>
          <Link href="/dashboard/vision" className="mt-6 block text-center bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium py-2.5 rounded-xl transition">
            Analizza File →
          </Link>
        </div>

        {/* CARD PROGETTI */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl hover:border-purple-500/40 transition group flex flex-col justify-between">
          <div>
            <div className="text-2xl mb-4">📁</div>
            <h3 className="text-lg font-bold group-hover:text-purple-400 transition">I tuoi Progetti</h3>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              Accedi alla cronologia completa dei tuoi lavori, delle chat salvate e dei dati elaborati dal motore AI.
            </p>
          </div>
          <Link href="/dashboard/projects" className="mt-6 block text-center bg-slate-950 border border-slate-800 hover:bg-slate-800 text-xs font-medium py-2.5 rounded-xl transition">
            Vedi Archivio →
          </Link>
        </div>

      </div>

      {/* SEZIONE ATTIVITÀ RECENTI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-base font-bold mb-4">Ultime operazioni effettuate</h3>
        <div className="divide-y divide-slate-800/60 text-sm">
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-300">Generazione script automazione business</span>
            <span className="text-xs text-slate-500">Oggi, 11:45</span>
          </div>
          <div className="py-3 flex justify-between items-center">
            <span className="text-slate-300">Analisi layout d&apos;interfaccia SaaS</span>
            <span className="text-xs text-slate-500">Ieri, 18:20</span>
          </div>
        </div>
      </div>

    </div>
  );
}