'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTheme } from '@/src/lib/ThemeContext';

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

interface RigaFattura {
  id: string;
  fattura_id: string;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  aliquota_iva: number;
}

export default function FatturaViewPage() {
  const params = useParams();
  const slug = params.slug as string;
  const fatturaId = params.id as string;
  
  // Usa il tema dal context globale
  const { theme } = useTheme();

  const [fattura, setFattura] = useState<Fattura | null>(null);
  const [righe, setRighe] = useState<RigaFattura[]>([]);
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

  useEffect(() => {
    const loadFattura = async () => {
      setLoading(true);
      setError(null);

      const password = getPassword();
      if (!password) {
        setError('Password mancante. Effettua nuovamente il login.');
        setLoading(false);
        return;
      }

      try {
        console.log('Chiamando API:', `${BACKEND_URL}/api/invoices/${fatturaId}`);
        const res = await fetch(`${BACKEND_URL}/api/invoices/${fatturaId}`, {
          headers: {
            Authorization: `Bearer ${password}`,
          },
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Errore ${res.status}`);
        }

        const data = await res.json();
        setFattura(data.fattura);
        setRighe(data.righe || []);
      } catch (err) {
        console.error('Errore caricamento fattura:', err);
        setError(err instanceof Error ? err.message : 'Errore nel caricamento della fattura');
      } finally {
        setLoading(false);
      }
    };

    if (fatturaId) {
      loadFattura();
    }
  }, [slug, fatturaId]);

  // Calcoli totali
  const calcolaTotali = () => {
    let imponibile = 0;
    let totaleIva = 0;

    righe.forEach((riga) => {
      const totaleRiga = riga.quantita * riga.prezzo_unitario;
      imponibile += totaleRiga;
      totaleIva += totaleRiga * (riga.aliquota_iva / 100);
    });

    const totaleGenerale = imponibile + totaleIva;

    return { imponibile, totaleIva, totaleGenerale };
  };

  const { imponibile, totaleIva, totaleGenerale } = calcolaTotali();

  const handlePrint = () => {
    window.print();
  };

  // Colori in base al tema
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-950' : 'bg-slate-100';
  const cardBg = isDark ? 'bg-slate-900' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const border = isDark ? 'border-slate-800' : 'border-slate-200';

  if (loading) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className={textSecondary}>Caricamento fattura...</div>
      </div>
    );
  }

  if (error || !fattura) {
    return (
      <div className={`min-h-screen ${bgColor} flex items-center justify-center`}>
        <div className="text-center" style={{ color: '#ef4444' }}>
          <h2 className="text-xl font-semibold mb-2">Errore</h2>
          <p className={`text-sm ${textSecondary}`}>{error || 'Fattura non trovata'}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className={`min-h-screen ${bgColor}`}>
      {/* Bottone Stampa - Nascosto in stampa */}
      <div className="no-print fixed top-4 right-4 z-50">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
          style={{ fontSize: '14px', fontWeight: 600 }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Stampa o Salva PDF
        </button>
      </div>

      {/* Contenitore Fattura A4 */}
      <div className="print:p-0 print:shadow-none mx-auto mt-8 mb-8 shadow-lg" style={{ maxWidth: '210mm', minHeight: '297mm', padding: '20mm', background: isDark ? '#1e293b' : '#ffffff' }}>
        {/* Intestazione Azienda Emettitrice */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b-2 border-blue-600">
          <div className="flex items-start gap-4">
            {/* Logo Azienda */}
            <div className="w-20 h-20 bg-blue-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold">
              ZX
            </div>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary} mb-1`}>ZeusX Srl</h2>
              <div className={`text-sm ${textSecondary}`}>
                <p>P.IVA: 01234567890</p>
                <p>Via Roma 1, 00100 Roma (RM)</p>
                <p>Tel: +39 06 1234567</p>
                <p>Email: info@zeusx.it</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-bold text-blue-600 mb-2">FATTURA</h1>
            <div className={`text-sm ${textSecondary}`}>
              <p><strong>Numero:</strong> {fattura.numero_fattura}/{fattura.anno}</p>
              <p><strong>Stato:</strong> {fattura.stato.toUpperCase()}</p>
              {fattura.metodo_pagamento && (
                <p><strong>Pagamento:</strong> {fattura.metodo_pagamento}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dati Cliente */}
        <div className={`mb-8 p-4 ${isDark ? 'bg-slate-800' : 'bg-gray-50'} rounded`}>
          <h2 className={`text-lg font-semibold ${textPrimary} mb-3`}>Dati Cliente</h2>
          <div className={`text-sm ${textSecondary}`}>
            <p className="font-medium">{fattura.cliente_nome}</p>
            {fattura.cliente_piva && <p>P.IVA: {fattura.cliente_piva}</p>}
            {fattura.cliente_indirizzo && <p>{fattura.cliente_indirizzo}</p>}
          </div>
        </div>

        {/* Tabella Righe */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className={isDark ? 'bg-slate-800' : 'bg-gray-100'}>
                <th className={`border ${border} px-4 py-2 text-left text-sm font-semibold ${textSecondary}`} style={{ width: '40%' }}>
                  Descrizione
                </th>
                <th className={`border ${border} px-4 py-2 text-right text-sm font-semibold ${textSecondary}`} style={{ width: '15%' }}>
                  Quantità
                </th>
                <th className={`border ${border} px-4 py-2 text-right text-sm font-semibold ${textSecondary}`} style={{ width: '20%' }}>
                  Prezzo Unitario
                </th>
                <th className={`border ${border} px-4 py-2 text-right text-sm font-semibold ${textSecondary}`} style={{ width: '15%' }}>
                  IVA %
                </th>
                <th className={`border ${border} px-4 py-2 text-right text-sm font-semibold ${textSecondary}`} style={{ width: '20%' }}>
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga, index) => {
                const totaleRiga = riga.quantita * riga.prezzo_unitario;
                return (
                  <tr key={riga.id} className={index % 2 === 0 ? (isDark ? 'bg-slate-900' : 'bg-white') : (isDark ? 'bg-slate-800' : 'bg-gray-50')}>
                    <td className={`border ${border} px-4 py-3 text-sm ${textPrimary}`}>
                      {riga.descrizione}
                    </td>
                    <td className={`border ${border} px-4 py-3 text-sm text-right ${textPrimary}`}>
                      {riga.quantita}
                    </td>
                    <td className={`border ${border} px-4 py-3 text-sm text-right ${textPrimary}`}>
                      {formatCurrency(riga.prezzo_unitario)}
                    </td>
                    <td className={`border ${border} px-4 py-3 text-sm text-right ${textPrimary}`}>
                      {riga.aliquota_iva}%
                    </td>
                    <td className={`border ${border} px-4 py-3 text-sm text-right font-medium ${textPrimary}`}>
                      {formatCurrency(totaleRiga)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Riepilogo Totali */}
        <div className="flex justify-end">
          <div className="w-80">
            <div className={`flex justify-between py-2 text-sm ${textSecondary}`}>
              <span>Imponibile:</span>
              <span className="font-medium">{formatCurrency(imponibile)}</span>
            </div>
            <div className={`flex justify-between py-2 text-sm ${textSecondary}`}>
              <span>IVA:</span>
              <span className="font-medium">{formatCurrency(totaleIva)}</span>
            </div>
            <div className={`flex justify-between py-3 text-lg font-bold ${textPrimary} border-t-2 ${border}`}>
              <span>TOTALE:</span>
              <span>{formatCurrency(totaleGenerale)}</span>
            </div>
          </div>
        </div>

        {/* Data Emissione - In basso */}
        <div className="mb-4 text-right">
          <span className={`text-sm ${textSecondary}`}>Data Emissione: </span>
          <span className={`text-sm font-medium ${textPrimary}`}>{formatDate(fattura.data_emissione)}</span>
        </div>

        {/* Footer */}
        <div className={`mt-12 pt-6 border-t ${border} text-center text-xs ${textSecondary}`}>
          <p>Documento generato da ZeusX - by MUSINO</p>
        </div>
      </div>

      {/* Stili per la stampa */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .no-print {
            display: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  );
}