'use client';

import { useState, useEffect } from 'react';

// Interfaccia per un record generico
export interface EntityRecord {
  id: string;
  [key: string]: unknown;
}

// Interfaccia per le props del componente
export interface EntityTableProps {
  tableName: string;
  apiUrl?: string;
}

// Interfaccia per la risposta API
export interface EntityTableResponse {
  records: EntityRecord[];
  fields: string[];
  error?: string;
}

// Componente EntityTable - legge le tabelle da ZEUSX
export default function EntityTable({ tableName, apiUrl }: EntityTableProps) {
  const [records, setRecords] = useState<EntityRecord[]>([]);
  const [fields, setFields] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // URL API (usa quello passato o il default da env)
  const baseUrl = apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5005';

  // Fetch dei dati della tabella
  useEffect(() => {
    const fetchTableData = async () => {
      if (!tableName) return;
      
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`${baseUrl}/api/tables/${tableName}`);
        
        if (!response.ok) {
          throw new Error(`Errore ${response.status}: Impossibile caricare la tabella`);
        }

        const data: EntityTableResponse = await response.json();
        setRecords(data.records || []);
        setFields(data.fields || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore di connessione');
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [tableName, baseUrl]);

  // Filtra i record in base alla ricerca
  const filteredRecords = records.filter((record) => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    return fields.some((field) => {
      const value = record[field];
      return value != null && String(value).toLowerCase().includes(query);
    });
  });

  // Renderizza il valore di una cella
  const renderCellValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'Sì' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  if (!tableName) {
    return (
      <div className="p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10">
        <p className="text-slate-400">Inserisci il nome di una tabella per visualizzare i dati</p>
      </div>
    );
  }

  return (
    <div className="w-full p-6 bg-slate-900/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white">
          Tabella: {tableName}
        </h2>
        <div className="text-sm text-slate-400">
          {filteredRecords.length} record
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca nei record..."
          className="w-full max-w-md px-4 py-2 bg-slate-800/50 border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Messaggio di errore */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 mb-4">
          {error}
        </div>
      )}

      {/* Tabella */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full border-collapse">
          <thead className="bg-slate-800/50">
            <tr>
              {fields.map((field) => (
                <th
                  key={field}
                  className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider border-b border-white/10"
                >
                  {field}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-slate-900/30">
            {loading ? (
              <tr>
                <td
                  colSpan={fields.length || 1}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Caricamento record...
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td
                  colSpan={fields.length || 1}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  {searchQuery ? 'Nessun risultato per la ricerca' : 'Nessun record presente'}
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => (
                <tr
                  key={record.id || index}
                  className="border-b border-white/5 hover:bg-slate-800/30 transition-colors"
                >
                  {fields.map((field) => (
                    <td
                      key={field}
                      className="px-4 py-3 text-sm text-slate-200 whitespace-nowrap"
                    >
                      {renderCellValue(record[field])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}