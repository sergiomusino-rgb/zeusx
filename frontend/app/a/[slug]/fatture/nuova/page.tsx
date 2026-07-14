'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/src/lib/ThemeContext';

interface RigaFattura {
  id: string;
  descrizione: string;
  quantita: number;
  prezzo_unitario: number;
  aliquota_iva: number;
}

export default function NuovaFatturaPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  
  // Usa il tema dal context globale
  const { theme } = useTheme();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dati testata fattura
  const [clienteNome, setClienteNome] = useState('');
  const [clientePiva, setClientePiva] = useState('');
  const [clienteIndirizzo, setClienteIndirizzo] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState('');

  // Righe fattura
  const [righe, setRighe] = useState<RigaFattura[]>([
    { id: '1', descrizione: '', quantita: 1, prezzo_unitario: 0, aliquota_iva: 22 }
  ]);

  // Recupera tenant_id dalla sessione
  const getSessionData = (): { tenantId: string; password: string } | null => {
    if (typeof window === 'undefined') return null;
    const sessionKey = `app_session_${slug}`;
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return {
        tenantId: parsed.appInfo?.id || parsed.appInfo?.tenant_id,
        password: parsed.password
      };
    } catch {
      return null;
    }
  };

  // Calcoli totali in tempo reale
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

  // Aggiungi riga
  const aggiungiRiga = () => {
    const newId = Date.now().toString();
    setRighe([...righe, {
      id: newId,
      descrizione: '',
      quantita: 1,
      prezzo_unitario: 0,
      aliquota_iva: 22
    }]);
  };

  // Rimuovi riga
  const rimuoviRiga = (id: string) => {
    if (righe.length === 1) {
      setError('Deve essere presente almeno una riga');
      return;
    }
    setRighe(righe.filter(r => r.id !== id));
    setError(null);
  };

  // Aggiorna campo riga
  const aggiornaRiga = (id: string, campo: keyof RigaFattura, valore: string | number) => {
    setRighe(righe.map(r => {
      if (r.id !== id) return r;
      return { ...r, [campo]: valore };
    }));
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validazioni
    if (!clienteNome.trim()) {
      setError('Il nome del cliente è obbligatorio');
      return;
    }

    const righeValide = righe.filter(r => r.descrizione.trim() && r.quantita > 0 && r.prezzo_unitario > 0);
    if (righeValide.length === 0) {
      setError('Inserire almeno una riga valida');
      return;
    }

    const sessionData = getSessionData();
    if (!sessionData) {
      setError('Sessione scaduta. Effettua nuovamente il login.');
      return;
    }

    setSaving(true);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

      // Genera numero fattura (semplice: timestamp)
      const numeroFattura = Date.now().toString();
      const anno = new Date().getFullYear();
      const dataEmissione = new Date().toISOString().split('T')[0];

      const payload = {
        tenant_id: sessionData.tenantId,
        numero_fattura: numeroFattura,
        anno: anno,
        data_emissione: dataEmissione,
        cliente_nome: clienteNome,
        cliente_piva: clientePiva || null,
        cliente_indirizzo: clienteIndirizzo || null,
        stato: 'bozza',
        metodo_pagamento: metodoPagamento || null,
        righe: righeValide.map(r => ({
          descrizione: r.descrizione,
          quantita: r.quantita,
          prezzo_unitario: r.prezzo_unitario,
          aliquota_iva: r.aliquota_iva
        }))
      };

      const res = await fetch(`/a/${slug}/api/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionData.password}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Errore ${res.status}`);
      }

      const data = await res.json();
      
      // Redirect alla pagina della fattura creata
      router.push(`/a/${slug}/fatture/${data.fattura.id}`);
    } catch (err) {
      console.error('Errore creazione fattura:', err);
      setError(err instanceof Error ? err.message : 'Errore nella creazione della fattura');
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Colori in base al tema
  const isDark = theme === 'dark';
  const bgColor = isDark ? 'bg-slate-950' : 'bg-slate-100';
  const cardBg = isDark ? 'bg-slate-900' : 'bg-white';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-400' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-500' : 'text-slate-400';
  const border = isDark ? 'border-slate-800' : 'border-slate-200';
  const inputBg = isDark ? 'bg-slate-900' : 'bg-white';

  return (
    <div className={`min-h-screen ${bgColor} transition-colors duration-300 py-8`}>
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${textPrimary} mb-2`}>Nuova Fattura</h1>
          <p className={`text-sm ${textSecondary}`}>Compila i dati della fattura e aggiungi le righe</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className={`mb-6 p-4 bg-red-500/10 border border-red-500/20 ${isDark ? 'text-red-400' : 'text-red-700'} rounded-lg text-sm`}>
              {error}
            </div>
          )}

          {/* Dati Cliente */}
          <div className={`${cardBg} rounded-lg shadow-md p-6 mb-6 border ${border}`}>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Dati Cliente</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Nome Cliente *
                </label>
                <input
                  type="text"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                  className={`w-full px-4 py-2 border ${border} ${inputBg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${textPrimary}`}
                  placeholder="Mario Rossi"
                  required
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Partita IVA / Codice Fiscale
                </label>
                <input
                  type="text"
                  value={clientePiva}
                  onChange={(e) => setClientePiva(e.target.value)}
                  className={`w-full px-4 py-2 border ${border} ${inputBg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${textPrimary}`}
                  placeholder="IT12345678901"
                />
              </div>
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Indirizzo
                </label>
                <input
                  type="text"
                  value={clienteIndirizzo}
                  onChange={(e) => setClienteIndirizzo(e.target.value)}
                  className={`w-full px-4 py-2 border ${border} ${inputBg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${textPrimary}`}
                  placeholder="Via Roma 123, 00100 Roma (RM)"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${textSecondary} mb-2`}>
                  Metodo di Pagamento
                </label>
                <select
                  value={metodoPagamento}
                  onChange={(e) => setMetodoPagamento(e.target.value)}
                  className={`w-full px-4 py-2 border ${border} ${inputBg} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${textPrimary}`}
                >
                  <option value="">Seleziona...</option>
                  <option value="bonifico">Bonifico Bancario</option>
                  <option value="carta">Carta di Credito</option>
                  <option value="contanti">Contanti</option>
                  <option value="assegno">Assegno</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>
            </div>
          </div>

          {/* Righe Fattura */}
          <div className={`${cardBg} rounded-lg shadow-md p-6 mb-6 border ${border}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-xl font-semibold ${textPrimary}`}>Righe Fattura</h2>
              <button
                type="button"
                onClick={aggiungiRiga}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                style={{ fontSize: '14px', fontWeight: 600 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Aggiungi Riga
              </button>
            </div>

            <div className="space-y-3">
              {righe.map((riga, index) => (
                <div key={riga.id} className={`grid grid-cols-12 gap-3 items-start p-4 ${isDark ? 'bg-slate-800' : 'bg-gray-50'} rounded-lg`}>
                  <div className="col-span-12 md:col-span-5">
                    <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Descrizione</label>
                    <input
                      type="text"
                      value={riga.descrizione}
                      onChange={(e) => aggiornaRiga(riga.id, 'descrizione', e.target.value)}
                      className={`w-full px-3 py-2 border ${border} ${inputBg} rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${textPrimary}`}
                      placeholder="Descrizione prodotto/servizio"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Quantità</label>
                    <input
                      type="number"
                      value={riga.quantita}
                      onChange={(e) => aggiornaRiga(riga.id, 'quantita', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border ${border} ${inputBg} rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${textPrimary}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`block text-xs font-medium ${textSecondary} mb-1`}>Prezzo Unitario</label>
                    <input
                      type="number"
                      value={riga.prezzo_unitario}
                      onChange={(e) => aggiornaRiga(riga.id, 'prezzo_unitario', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border ${border} ${inputBg} rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${textPrimary}`}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <label className={`block text-xs font-medium ${textSecondary} mb-1`}>IVA %</label>
                    <input
                      type="number"
                      value={riga.aliquota_iva}
                      onChange={(e) => aggiornaRiga(riga.id, 'aliquota_iva', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 border ${border} ${inputBg} rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm ${textPrimary}`}
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-1 flex items-end">
                    <button
                      type="button"
                      onClick={() => rimuoviRiga(riga.id)}
                      className="w-full px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      style={{ fontSize: '12px' }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Totali */}
          <div className={`${cardBg} rounded-lg shadow-md p-6 mb-6 border ${border}`}>
            <h2 className={`text-xl font-semibold ${textPrimary} mb-4`}>Riepilogo Totali</h2>
            <div className="space-y-2">
              <div className={`flex justify-between text-sm ${textSecondary}`}>
                <span>Imponibile:</span>
                <span className="font-medium">{formatCurrency(imponibile)}</span>
              </div>
              <div className={`flex justify-between text-sm ${textSecondary}`}>
                <span>IVA:</span>
                <span className="font-medium">{formatCurrency(totaleIva)}</span>
              </div>
              <div className={`flex justify-between text-lg font-bold ${textPrimary} border-t-2 ${border} pt-2`}>
                <span>TOTALE:</span>
                <span>{formatCurrency(totaleGenerale)}</span>
              </div>
            </div>
          </div>

          {/* Bottoni */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-6 py-3 border ${border} ${textSecondary} rounded-lg hover:${isDark ? 'bg-slate-800' : 'bg-gray-50'} transition-colors`}
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
              style={{ fontSize: '14px', fontWeight: 600 }}
            >
              {saving ? 'Salvataggio...' : 'Salva e Genera Fattura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}