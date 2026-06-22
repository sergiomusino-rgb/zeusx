'use client';

import { useState } from 'react';

interface Project {
  id: string;
  title: string;
  type: 'Chat' | 'Vision' | 'Documento';
  date: string;
  status: 'Completato' | 'In Corso' | 'Bozza';
  tokens: number;
}

export default function ProjectsPage() {
  // Lista iniziale mockata dei lavori effettuati
  const [projects] = useState<Project[]>(
    [
      { id: '1', title: 'Generazione Script Automazione Business', type: 'Chat', date: 'Oggi, 11:45', status: 'Completato', tokens: 1240 },
      { id: '2', title: 'Analisi Layout Interfaccia SaaS', type: 'Vision', date: 'Ieri, 18:20', status: 'Completato', tokens: 3450 },
      { id: '3', title: 'Estrazione Tabelle Finanziarie Q2', type: 'Documento', date: '14 Giu 2026', status: 'Completato', tokens: 5120 },
      { id: '4', title: 'Ottimizzazione Prompt Llama 3', type: 'Chat', date: '10 Giu 2026', status: 'Bozza', tokens: 420 },
    ]
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">I tuoi Progetti</h1>
          <p className="text-slate-400 mt-1">Gestisci la cronologia completa dei tuoi lavori e dei dati elaborati.</p>
        </div>
        
        {/* Barra di ricerca rapida (estetica) */}
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Cerca progetto..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 transition"
          />
        </div>
      </div>

      {/* TABELLA / LISTA DEI PROGETTI */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Nome Progetto</th>
                <th className="py-4 px-6">Tipo</th>
                <th className="py-4 px-6">Data Elaborazione</th>
                <th className="py-4 px-6">Stato</th>
                <th className="py-4 px-6 text-right">Risorse AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-sm">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-slate-800/30 transition group cursor-pointer">
                  <td className="py-4 px-6 font-medium text-slate-200 group-hover:text-blue-400 transition">
                    {project.title}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`text-xs px-2.5 py-1 rounded-lg font-medium border ${
                      project.type === 'Chat' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                      project.type === 'Vision' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400' :
                      'bg-purple-500/10 border-purple-500/20 text-purple-400'
                    }`}>
                      {project.type}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-400">
                    {project.date}
                  </td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        project.status === 'Completato' ? 'bg-emerald-500' :
                        project.status === 'In Corso' ? 'bg-amber-500 animate-pulse' :
                        'bg-slate-500'
                      }`} />
                      {project.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-mono text-xs text-slate-400">
                    {project.tokens.toLocaleString()} tkn
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Messaggio se la tabella è vuota */}
        {projects.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Nessun progetto trovato.
          </div>
        )}
      </div>
    </div>
  );
}