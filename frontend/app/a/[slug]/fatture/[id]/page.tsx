'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

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
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';
        const res = await fetch(`${backendUrl}/api/invoices/${fatturaId}`, {
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

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ color: '#64748b', fontSize: '16px' }}>Caricamento fattura...</div>
      </div>
    );
  }

  if (error || !fattura) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center', color: '#ef4444' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Errore</h2>
          <p style={{ fontSize: '14px', color: '#64748b' }}>{error || 'Fattura non trovata'}</p>
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
    <div className="min-h-screen bg-gray-100">
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
      <div className="print:p-0 print:shadow-none mx-auto mt-8 mb-8 bg-white shadow-lg" style={{ maxWidth: '210mm', minHeight: '297mm', padding: '20mm' }}>
        {/* Header Fattura */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">FATTURA</h1>
            <div className="text-sm text-gray-600">
              <p><strong>Numero:</strong> {fattura.numero_fattura}/{fattura.anno}</p>
              <p><strong>Data:</strong> {formatDate(fattura.data_emissione)}</p>
              <p><strong>Stato:</strong> {fattura.stato.toUpperCase()}</p>
              {fattura.metodo_pagamento && (
                <p><strong>Pagamento:</strong> {fattura.metodo_pagamento}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">
              <p>Emessa il: {formatDate(fattura.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Dati Cliente */}
        <div className="mb-8 p-4 bg-gray-50 rounded">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Dati Cliente</h2>
          <div className="text-sm text-gray-700">
            <p className="font-medium">{fattura.cliente_nome}</p>
            {fattura.cliente_piva && <p>P.IVA: {fattura.cliente_piva}</p>}
            {fattura.cliente_indirizzo && <p>{fattura.cliente_indirizzo}</p>}
          </div>
        </div>

        {/* Tabella Righe */}
        <div className="mb-8">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold text-gray-700" style={{ width: '40%' }}>
                  Descrizione
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700" style={{ width: '15%' }}>
                  Quantità
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700" style={{ width: '20%' }}>
                  Prezzo Unitario
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700" style={{ width: '15%' }}>
                  IVA %
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right text-sm font-semibold text-gray-700" style={{ width: '20%' }}>
                  Totale
                </th>
              </tr>
            </thead>
            <tbody>
              {righe.map((riga, index) => {
                const totaleRiga = riga.quantita * riga.prezzo_unitario;
                return (
                  <tr key={riga.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-gray-900">
                      {riga.descrizione}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                      {riga.quantita}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                      {formatCurrency(riga.prezzo_unitario)}
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right text-gray-900">
                      {riga.aliquota_iva}%
                    </td>
                    <td className="border border-gray-300 px-4 py-3 text-sm text-right font-medium text-gray-900">
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
            <div className="flex justify-between py-2 text-sm text-gray-700">
              <span>Imponibile:</span>
              <span className="font-medium">{formatCurrency(imponibile)}</span>
            </div>
            <div className="flex justify-between py-2 text-sm text-gray-700">
              <span>IVA:</span>
              <span className="font-medium">{formatCurrency(totaleIva)}</span>
            </div>
            <div className="flex justify-between py-3 text-lg font-bold text-gray-900 border-t-2 border-gray-900">
              <span>TOTALE:</span>
              <span>{formatCurrency(totaleGenerale)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
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