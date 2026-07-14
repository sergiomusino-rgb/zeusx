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
  totale?: number;
}

export default function FatturePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  // Leggi il tema dalle impostazioni
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  useEffect(() => {
    // Leggi le preferenze dal localStorage
    const loadTheme = () => {
      const savedPrefs = localStorage.getItem(`app_session_${slug}_prefs`);
      if (savedPrefs) {
        try {
          const parsed = JSON.parse(savedPrefs);
          if (parsed.theme) {
            setTheme(parsed.theme);
          }
        } catch {
          // Usa il tema di default
        }
      }
    };
    
    loadTheme();
    
    // Ascolta i cambiamenti nel localStorage (stesso tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `app_session_${slug}_prefs`) {
        loadTheme();
      }
    };
    
    // Ascolta il custom event per cambiamenti nello stesso tab
    const handleCustomEvent = () => {
      loadTheme();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('theme-change', handleCustomEvent);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('theme-change', handleCustomEvent);
    };
  }, [slug]);

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
        // Calcola il totale per ogni fattura caricando le righe
        const fattureConTotali = await Promise.all(
          (data.fatture || []).map(async (fattura: Fattura) => {
            try {
              const righeRes = await fetch(`${BACKEND_URL}/api/invoices/${fattura.id}`, {
                headers: {
                  Authorization: `Bearer ${password}`,
                },
              });
              if (righeRes.ok) {
                const righeData = await righeRes.json();
                const totale = (righeData.righe || []).reduce((sum: number, riga: any) => {
                  return sum + (riga.quantita * riga.prezzo_unitario * (1 + (riga.aliquota_iva || 0) / 100));
                }, 0);
                return { ...fattura, totale };
              }
            } catch (err) {
              console.error(`Errore caricamento righe fattura ${fattura.id}:`, err);
            }
            return { ...fattura, totale: 0 };
          })
        );
        setFatture(fattureConTotali);
      } catch (err) {
        console.error('Errore caricamento fatture:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento delle fatture');
      } finally {
        setLoading(false);
      }
    };

    loadFatture();
  }, [slug]);

  // Aggiorna stato fattura
  const updateStato = async (fatturaId: string, nuovoStato: string) => {
    const password = getPassword();
    if (!password) {
      alert('Password mancante. Effettua nuovamente il login.');
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/invoices/${fatturaId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${password}`,
        },
        body: JSON.stringify({ stato: nuovoStato }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }

      const data = await res.json();
      // Aggiorna la fattura nella lista
      setFatture(fatture.map(f => f.id === fatturaId ? { ...f, stato: data.fattura.stato } : f));
    } catch (err) {
      console.error('Errore aggiornamento stato:', err);
      alert(err instanceof Error ? err.message : 'Errore aggiornamento stato');
    }
  };

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

  // Colori in base al tema
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-950' : 'bg-gray-100';
  const cardBg = isDark ? 'bg-slate-900' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-gray-500';
  const borderColor = isDark ? 'border-slate-800' : 'border-gray-300';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={textSecondary}>Caricamento fatture...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Errore</h2>
          <p className={textSecondary}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${bgColor} min-h-screen py-8 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Fatture</h1>
            <p className={`text-sm ${textSecondary}`}>Gestisci le tue fatture</p>
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
          <div className={`${cardBg} rounded-lg shadow-md p-4`}>
            <div className={`text-2xl font-bold ${textPrimary}`}>{stats.totale}</div>
            <div className={`text-sm ${textMuted}`}>Totale Fatture</div>
          </div>
          <div className={`${cardBg} rounded-lg shadow-md p-4`}>
            <div className={`text-2xl font-bold ${textMuted}`}>{stats.bozze}</div>
            <div className={`text-sm ${textMuted}`}>Bozze</div>
          </div>
          <div className={`${cardBg} rounded-lg shadow-md p-4`}>
            <div className="text-2xl font-bold text-green-600">{stats.emesse}</div>
            <div className={`text-sm ${textMuted}`}>Emesse</div>
          </div>
          <div className={`${cardBg} rounded-lg shadow-md p-4`}>
            <div className="text-2xl font-bold text-blue-600">{stats.pagate}</div>
            <div className={`text-sm ${textMuted}`}>Pagate</div>
          </div>
        </div>

        {/* Filtri */}
        <div className={`${cardBg} rounded-lg shadow-md p-4 mb-6`}>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1 w-full md:w-auto">
              <label className={`block text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-1`}>Cerca</label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Cliente, numero fattura, P.IVA..."
                  className={`w-full px-3 py-2 pl-10 border ${borderColor} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
                />
                <svg className={`absolute left-3 top-2.5 w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
              </div>
            </div>
            <div>
              <label className={`block text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-1`}>Stato</label>
              <select
                value={filterStato}
                onChange={(e) => setFilterStato(e.target.value)}
                className={`px-3 py-2 border ${borderColor} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
              >
                <option value="tutti">Tutti</option>
                <option value="bozza">Bozza</option>
                <option value="emessa">Emessa</option>
                <option value="pagata">Pagata</option>
                <option value="annullata">Annullata</option>
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'} mb-1`}>Anno</label>
              <select
                value={filterAnno}
                onChange={(e) => setFilterAnno(e.target.value)}
                className={`px-3 py-2 border ${borderColor} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-gray-900'}`}
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
        <div className={`${cardBg} rounded-lg shadow-md overflow-hidden`}>
          <table className="w-full border-collapse">
            <thead>
              <tr className={isDark ? 'bg-slate-800' : 'bg-gray-100'}>
                <th className={`border-b ${borderColor} px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Numero
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Data
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Cliente
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-left text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  P.IVA
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Stato
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-right text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Totale
                </th>
                <th className={`border-b ${borderColor} px-4 py-3 text-center text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  Azioni
                </th>
              </tr>
            </thead>
            <tbody>
              {fattureFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={7} className={`px-4 py-8 text-center ${textMuted}`}>
                    Nessuna fattura trovata
                  </td>
                </tr>
              ) : (
                fattureFiltrate.map((fattura, index) => (
                  <tr key={fattura.id} className={index % 2 === 0 ? (isDark ? 'bg-slate-900' : 'bg-white') : (isDark ? 'bg-slate-800' : 'bg-gray-50')}>
                    <td className={`border-b ${borderColor} px-4 py-3 text-sm ${textPrimary}`}>
                      {fattura.numero_fattura}/{fattura.anno}
                    </td>
                    <td className={`border-b ${borderColor} px-4 py-3 text-sm ${textPrimary}`}>
                      {formatDate(fattura.data_emissione)}
                    </td>
                    <td className={`border-b ${borderColor} px-4 py-3 text-sm ${textPrimary}`}>
                      {fattura.cliente_nome}
                    </td>
                    <td className={`border-b ${borderColor} px-4 py-3 text-sm ${textMuted}`}>
                      {fattura.cliente_piva || '-'}
                    </td>
                    <td className={`border-b ${borderColor} px-4 py-3 text-center`}>
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
                    <td className={`border-b ${borderColor} px-4 py-3 text-sm text-right ${textPrimary}`}>
                      {fattura.totale ? formatCurrency(fattura.totale) : '-'}
                    </td>
                    <td className={`border-b ${borderColor} px-4 py-3 text-center`}>
                      <select
                        value={fattura.stato}
                        onChange={(e) => updateStato(fattura.id, e.target.value)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          fattura.stato === 'emessa' 
                            ? 'bg-green-100 text-green-800 border border-green-300' 
                            : fattura.stato === 'pagata'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : fattura.stato === 'annullata'
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : 'bg-gray-100 text-gray-800 border border-gray-300'
                        }`}
                      >
                        <option value="bozza">Bozza</option>
                        <option value="emessa">Emessa</option>
                        <option value="pagata">Pagata</option>
                        <option value="annullata">Annullata</option>
                      </select>
                      <button
                        onClick={() => router.push(`/a/${slug}/fatture/${fattura.id}`)}
                        className="ml-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
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