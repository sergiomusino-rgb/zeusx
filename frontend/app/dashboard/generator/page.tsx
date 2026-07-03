'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateAppAction, type GenerateAppResult } from '@/app/actions/generator';
import { supabaseBrowser } from '@/lib/supabase-browser';

// Settori disponibili per la generazione
const SECTORS = [
  { id: 'studio-medico', name: 'Studio Medico', icon: '🩺', description: 'Pazienti, appuntamenti, cartelle cliniche' },
  { id: 'ristorante', name: 'Ristorante', icon: '🍽️', description: 'Tavoli, menu, ordini, cucina' },
  { id: 'negozio', name: 'Negozio', icon: '🏪', description: 'Prodotti, vendite, magazzino' },
  { id: 'officina', name: 'Officina', icon: '🔧', description: 'Veicoli, interventi, ricambi' },
  { id: 'studio-legale', name: 'Studio Legale', icon: '⚖️', description: 'Clienti, pratiche, udienze' },
  { id: 'agenzia-immobiliare', name: 'Agenzia Immobiliare', icon: '🏠', description: 'Immobili, clienti, contratti' },
  { id: 'palestra', name: 'Palestra', icon: '💪', description: 'Iscritti, abbonamenti, schede' },
  { id: 'hotel', name: 'Hotel', icon: '🏨', description: 'Camere, prenotazioni, ospiti' },
  { id: 'associazione', name: 'Associazione', icon: '🤝', description: 'Soci, quote, eventi' },
  { id: 'custom', name: 'Personalizzato', icon: '✨', description: 'Descrivi il tuo settore' },
];

export default function GeneratorPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [appName, setAppName] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'sector' | 'details' | 'generating'>('sector');

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
      }
    }
    checkAuth();
  }, []);

  const handleSectorSelect = (sectorId: string) => {
    setSelectedSector(sectorId);
    setStep('details');
  };

  const handleGenerate = async () => {
    if (!userId) {
      setError('Devi effettuare il login per creare un\'app');
      return;
    }

    if (!appName.trim()) {
      setError('Inserisci un nome per l\'app');
      return;
    }

    setIsGenerating(true);
    setError('');
    setStep('generating');

    try {
      const sector = SECTORS.find(s => s.id === selectedSector);
      const prompt = selectedSector === 'custom' 
        ? customPrompt 
        : `Crea un gestionale per ${sector?.name || 'settore generico'}: ${sector?.description || ''}`;

      const result: GenerateAppResult = await generateAppAction({
        prompt,
        appName: appName.trim(),
        sector: sector?.name || 'Gestionale',
        userId,
      });

      if (result.success && result.appId) {
        router.push(`/dashboard/generator/success?appId=${result.appId}&slug=${result.slug}&password=${result.password}&appName=${encodeURIComponent(appName)}`);
      } else {
        setError(result.error || 'Errore nella generazione');
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto');
      setStep('details');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 1: Selezione settore
  if (step === 'sector') {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        {/* Dashboard button top-left */}
        <button
          onClick={() => router.push('/dashboard')}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-indigo-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition-all hover:bg-indigo-500"
        >
          ← Dashboard
        </button>

        <div className="max-w-6xl mx-auto">
          <header className="mb-12">
            <h1 className="text-4xl font-bold mb-4">✨ Crea il tuo Gestionale</h1>
            <p className="text-gray-400 text-lg">Seleziona il settore per il tuo gestionale</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SECTORS.map((sector) => (
              <button
                key={sector.id}
                onClick={() => handleSectorSelect(sector.id)}
                className="p-6 rounded-2xl border border-gray-800 bg-gray-900 hover:border-indigo-500 hover:bg-gray-800 transition-all text-left group"
              >
                <div className="text-4xl mb-4">{sector.icon}</div>
                <h3 className="text-xl font-bold mb-2 group-hover:text-indigo-400">{sector.name}</h3>
                <p className="text-gray-400 text-sm">{sector.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-12 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-gray-500 hover:text-white transition-colors"
            >
              ← Torna al Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Dettagli app
  if (step === 'details') {
    const selected = SECTORS.find(s => s.id === selectedSector);

    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        {/* Dashboard button top-left */}
        <button
          onClick={() => router.push('/dashboard')}
          className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-indigo-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition-all hover:bg-indigo-500"
        >
          ← Dashboard
        </button>

        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setStep('sector')}
            className="text-gray-500 hover:text-white mb-8 flex items-center gap-2"
          >
            ← Indietro
          </button>

          <header className="mb-8">
            <div className="text-4xl mb-4">{selected?.icon}</div>
            <h1 className="text-3xl font-bold mb-2">{selected?.name}</h1>
            <p className="text-gray-400">{selected?.description}</p>
          </header>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome dell'App *
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder={`Il mio ${selected?.name}`}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {selectedSector === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrivi il tuo gestionale *
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Descrivi le funzionalità che ti servono..."
                  rows={4}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={!appName.trim() || (selectedSector === 'custom' && !customPrompt.trim())}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all"
            >
              🚀 Genera il tuo Gestionale
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Generazione in corso
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8 flex items-center justify-center">
      {/* Dashboard button top-left */}
      <button
        onClick={() => router.push('/dashboard')}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-indigo-600/90 px-4 py-2.5 text-sm font-semibold text-white shadow-lg backdrop-blur transition-all hover:bg-indigo-500"
      >
        ← Dashboard
      </button>

      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-2xl font-bold mb-4">Generazione in corso...</h2>
        <p className="text-gray-400">L'AI sta creando il tuo gestionale personalizzato</p>
        <p className="text-gray-500 text-sm mt-4">Questo potrebbe richiedere qualche secondo</p>
      </div>
    </div>
  );
}
