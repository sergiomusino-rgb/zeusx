'use client';

import { useState } from 'react';
import EntityTable from '../components/EntityTable';

export default function HomePage() {
  const [tableName, setTableName] = useState<string>('');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-6">
        Mia Nuova App - ZEUSX
      </h1>
      
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Nome Tabella
        </label>
        <input
          type="text"
          value={tableName}
          onChange={(e) => setTableName(e.target.value)}
          placeholder="Inserisci il nome della tabella (es. clienti, prodotti)"
          className="w-full max-w-md px-4 py-2 bg-slate-800/50 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      <EntityTable tableName={tableName} />
    </div>
  );
}