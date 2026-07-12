'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { generateAppAction, type GenerateAppResult } from '@/app/actions/generator';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { useLanguage } from '@/src/lib/LanguageContext';


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
  const { locale: currentLanguage, t } = useLanguage();
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
      setError(t('generator_error_login'));
      return;
    }

    if (!appName.trim()) {
      setError(t('generator_error_name'));
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
        // Lingua attiva nell'interfaccia (LanguageContext) — non altera i campi richiesti dal backend
        lang: currentLanguage,
      });


      if (result.success && result.appId) {
        router.push(`/dashboard/generator/success?appId=${result.appId}&slug=${result.slug}&password=${result.password}&appName=${encodeURIComponent(appName)}`);
      } else {
        setError(result.error || t('generator_error_generic'));
        setStep('details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('generator_error_generic'));
      setStep('details');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 1: Selezione settore
  if (step === 'sector') {
    return (
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl font-bold mb-4">{t('generator_title')}</h1>
            <p className="text-gray-400 text-lg">{t('generator_subtitle')}</p>
          </div>

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
              {t('generator_back_dashboard')}
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
      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setStep('sector')}
            className="text-gray-500 hover:text-white mb-8 flex items-center gap-2"
          >
            {t('generator_back')}
          </button>

          <div className="mb-8">
            <div className="text-4xl mb-4">{selected?.icon}</div>
            <h1 className="text-3xl font-bold mb-2">{selected?.name}</h1>
            <p className="text-gray-400">{selected?.description}</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('generator_app_name')}
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
                  {t('generator_custom_prompt')}
                </label>
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={t('generator_custom_placeholder')}
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
              {t('generator_generate_button')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Generazione in corso
  return (
    <div className="flex items-center justify-center p-8" style={{ minHeight: '60vh' }}>
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        <h2 className="text-2xl font-bold mb-4">{t('generator_generating_title')}</h2>
        <p className="text-gray-400">{t('generator_generating_desc')}</p>
        <p className="text-gray-500 text-sm mt-4">{t('generator_generating_hint')}</p>
      </div>
    </div>
  );
}