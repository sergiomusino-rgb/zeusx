'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

interface Fattura {
  id: string;
  tenant_id: string;
  numero_fattura: string;
  anno: number;
  data_emissione: string;
  cliente_nome: string;
  cliente_piva?: string;
  cliente_indirizzo?: string;
  stato: string;
  metodo_pagamento?: string;
  created_at: string;
  updated_at: string;
}

export default function FatturePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [fatture, setFatture] = useState<Fattura[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Recupera la password dalla sessione
  const getPassword = (): string | null => {
    if (typeof window === 'undefined') return null;
    const sessionKey = `app_session_${slug}`;
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return parsed.password || null;
    } catch {
      return null;
    }
  };

  // Carica le fatture
  useEffect(() => {
    const loadFatture = async () => {
      setLoading(true);
      setError(null);

      const password = getPassword();
      if (!password) {
        setError('Password mancante. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/a/${slug}/invoices`, {
          headers: {
            Authorization: `Bearer ${password}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Errore ${res.status}`);
        }

        const data = await res.json();
        setFatture(data.fatture || []);
      } catch (err) {
        console.error('Errore caricamento fatture:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle fatture');
      } finally {
        setLoading(false);
      }
    };

    loadFatture();
  }, [slug]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('it-IT');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Stati per filtri
  const [filterStato, setFilterStato] = useState<string>('tutti');
  const [filterAnno, setFilterAnno] = useState<string>('tutti');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fatture filtrate
  const fattureFiltrate = fatture.filter((fattura) => {
    const matchStato = filterStato === 'tutti' || fattura.stato === filterStato;
    const matchAnno = filterAnno === 'tutti' || fattura.anno.toString() === filterAnno;
    const matchSearch = searchTerm === '' || 
      fattura.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fattura.numero_fattura.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fattura.cliente_piva && fattura.cliente_piva.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchStato && matchAnno && matchSearch;
  });

  // Statistiche
  const stats = {
    totale: fattureFiltrate.length,
    bozze: fattureFiltrate.filter(f => f.stato === 'bozza').length,
    emesse: fattureFiltrate.filter(f => f.stato === 'emessa').length,
    pagate: fattureFiltrate.filter(f => f.stato === 'pagata').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Caricamento fatture...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Errore</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Fatture</h1>
            <p className="text-sm text-gray-600">Gestisci le tue fatture</p>
          </div>
          <button
            onClick={() => router.push(`/a/${slug}/fatture/nuova`)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
            style={{ fontSize: '14px', fontWeight: 600 }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Nuova Fattura
          </button>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.totale}</div>
            <div className="text-sm text-gray-600">Totale Fatture</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.bozze}</div>
            <div className="text-sm text-gray-600">Bozze</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-green-600">{stats.emesse}</div>
            <div className="text-sm text-gray-600">Emesse</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.pagate}</div>
            <div className="text-sm text-gray-600">Pagate</div>
          </div>
        </div>

        {/* Filtri */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:w-auto">
              <label className="block text-xs font-medium text-gray-700 mb-1">Cerca</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cliente, numero fattura, P.IVA..."
                  className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Stato</label>
              <select
                value={filterStato}
                onChange={(e) => setFilterStato(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="tutti">Tutti</option>
                <option value="bozza">Bozza</option>
                <option value="emessa">Emessa</option>
                <option value="pagata">Pagata</option>
                <option value="annullata">Annullata</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Anno</label>
              <select
                value={filterAnno}
                onChange={(e) => setFilterAnno(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              >
                <option value="tutti">Tutti</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabella Fatture */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Numero
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Data
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  Cliente
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-left text-sm font-semibold text-gray-700">
                  P.IVA
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Stato
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-right text-sm font-semibold text-gray-700">
                  Totale
                </th>
                <th className="border-b border-gray-300 px-4 py-3 text-center text-sm font-semibold text-gray-700">
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {fattureFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    Nessuna fattura trovata
                  </td>
                </tr>
              ) : (
                fattureFiltrate.map((fattura, index) => (
                  <tr key={fattura.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {fattura.numero_fattura}/{fattura.anno}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {formatDate(fattura.data_emissione)}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-900">
                      {fattura.cliente_nome}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-sm text-gray-600">
                      {fattura.cliente_piva || '-'}
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        fattura.stato === 'emessa' 
                          ? 'bg-green-100 text-green-800' 
                          : fattura.stato === 'pagata'
                          ? 'bg-blue-100 text-blue-800'
                          : fattura.stato === 'annullata'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {fattura.stato.toUpperCase()}
                      </span>
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-sm text-right text-gray-900">
                      -
                    </td>
                    <td className="border-b border-gray-200 px-4 py-3 text-center">
                      <button
                        onClick={() => router.push(`/a/${slug}/fatture/${fattura.id}`)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        Visualizza
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}