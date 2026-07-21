'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/src/lib/LanguageContext';
import { Send } from 'lucide-react';
import { supabaseBrowser } from '@/src/lib/supabase-browser';

type SectorType = 'food' | 'saas' | 'industrial';

export default function CreatorPage() {
  const { t, locale } = useLanguage();
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [selectedSector, setSelectedSector] = useState<SectorType | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    
    try {
      // Get auth session
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      
      if (!session?.access_token) {
        alert('Devi effettuare il login per generare un\'app');
        router.push('/login');
        return;
      }
      
      // Call the creator generate API (Groq)
      const response = await fetch('/api/creator/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userPrompt: prompt,
          lang: locale
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.projectId) {
        // Redirect to app-create page
        router.push(`/dashboard/app-create?projectId=${data.data.projectId}`);
      } else {
        alert('Errore nella generazione: ' + (data.error || 'Errore sconosciuto'));
      }
    } catch (err) {
      console.error('Errore generazione:', err);
      alert('Errore di connessione. Riprova più tardi.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{t('Creator.title')}</h1>
          <p className="text-gray-400 text-lg">{t('Creator.subtitle')}</p>
        </div>

        {/* Main Box */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          {/* Prompt Area */}
          <div className="mb-6">
            <textarea
              value={prompt}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              placeholder={t('Creator.prompt_placeholder')}
              className="w-full h-32 bg-gray-800 text-white rounded-lg border border-gray-700 focus:border-amber-500 resize-none p-4"
            />
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="w-full bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {t('Creator.generate_button')}
          </button>
        </div>
      </div>
    </div>
  );
}
