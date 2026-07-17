'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/src/lib/LanguageContext';
import { supabase } from '@/src/lib/supabase';
import { MessageSquare, Send, Loader2 } from 'lucide-react';

// Pattern per riconoscere richieste di creazione app
const CREATE_APP_PATTERNS = [
  /crea\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /genera\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /fai\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /create\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
  /generate\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
  /make\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
];

// Messaggi di caricamento dinamici
const LOADING_MESSAGES = [
  "Sto configurando il database...",
  "Generando l'interfaccia con Tailwind...",
  "Ottimizzando le tabelle...",
  "Creando i campi personalizzati...",
  "Impostando i colori ATOMIC DARK...",
  "Finalizzando la tua app..."
];

export default function GeneratorPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: string, text: string, isAppLink?: boolean, appUrl?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Ottieni l'utente corrente
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    getUser();
  }, [supabase]);

  // Gestione messaggi di caricamento rotanti
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showLoadingOverlay) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 4000);
    }
    return () => clearInterval(interval);
  }, [showLoadingOverlay]);

  // Estrae nome attività e tipo dalla richiesta
  const parseAppRequest = (text: string): { activityName: string; activityType: string } | null => {
    const lowerText = text.toLowerCase();
    
    // Riconosci il tipo di attività
    let activityType = 'custom';
    if (lowerText.includes('ecommerce') || lowerText.includes('e-commerce') || lowerText.includes('shop') || lowerText.includes('negozio') || lowerText.includes('store')) {
      activityType = 'ecommerce';
    } else if (lowerText.includes('ristorante') || lowerText.includes('restaurant') || lowerText.includes('cibo') || lowerText.includes('food') || lowerText.includes('pizzeria')) {
      activityType = 'restaurant';
    } else if (lowerText.includes('negozio') || lowerText.includes('retail') || lowerText.includes('shop')) {
      activityType = 'retail';
    } else if (lowerText.includes('servizio') || lowerText.includes('service')) {
      activityType = 'service';
    } else if (lowerText.includes('professionale') || lowerText.includes('professional') || lowerText.includes('studio') || lowerText.includes('office')) {
      activityType = 'professional';
    } else if (lowerText.includes('immobiliare') || lowerText.includes('real estate') || lowerText.includes('property')) {
      activityType = 'realestate';
    } else if (lowerText.includes('palestra') || lowerText.includes('fitness') || lowerText.includes('gym')) {
      activityType = 'fitness';
    } else if (lowerText.includes('hotel') || lowerText.includes('hospitality') || lowerText.includes('albergo')) {
      activityType = 'hospitality';
    } else if (lowerText.includes('associazione') || lowerText.includes('association') || lowerText.includes('organization')) {
      activityType = 'association';
    }

    // Estrai il nome dell'attività
    for (const pattern of CREATE_APP_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return {
          activityName: match[1].trim(),
          activityType
        };
      }
    }

    // Se non c'è pattern ma contiene parole come "app" e un nome
    if (lowerText.includes('app') && !lowerText.includes('ai')) {
      const words = text.split(/\s+/);
      const nameWords = words.filter(w => !['crea', 'genera', 'fai', 'app', 'per', 'create', 'generate', 'make', 'for', 'an', 'a', 'the'].includes(w.toLowerCase()));
      if (nameWords.length > 0) {
        return {
          activityName: nameWords.join(' '),
          activityType
        };
      }
    }

    return null;
  };

  const handleSendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if (text.trim() === '') return;

    const userMessage = text;
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setInput('');
    setIsProcessing(true);

    // Mostra overlay di caricamento Atomic Dark SEMPRE
    setShowLoadingOverlay(true);
    setLoadingMessageIndex(0);

    try {
      // Chiama la rotta /api/generate con userPrompt
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userPrompt: text
        })
      });

      const data = await response.json();
      
      if (data.success && data.data) {
        // Salva su Supabase
        const saveResponse = await fetch('/api/generate/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schema: data.data,
            appName: data.data.appName || 'app-generata',
            sector: data.data.sector || 'custom',
            userId: userId
          })
        });

        const saveData = await saveResponse.json();
        
        if (saveData.success) {
          // Redirect alla pagina di successo
          router.push(`/dashboard/generator/success?appSlug=${saveData.slug}&title=${encodeURIComponent(saveData.appName || 'App Generata')}`);
        } else {
          setShowLoadingOverlay(false);
          setMessages(prev => [...prev, { 
            role: 'ai', 
            text: saveData.error || "Errore nel salvataggio dell'app"
          }]);
        }
      } else {
        setShowLoadingOverlay(false);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: data.error || "Errore nella generazione dell'interfaccia"
        }]);
      }
    } catch (err) {
      console.error("Errore generazione app:", err);
      setShowLoadingOverlay(false);
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: "Errore di connessione. Riprova più tardi."
      }]);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">{t('zeusx_generator_title')}</h1>
          <p className="text-gray-400 text-lg">{t('zeusx_generator_subtitle')}</p>
        </div>

        {/* Chat Interface */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold">{t('zeusx_generator_chat_title')}</h2>
          </div>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto mb-4 p-4 bg-gray-800/50 rounded-xl">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-16">
                <p className="mb-2">{t('zeusx_generator_chat_empty')}</p>
                <p className="text-sm">{t('zeusx_generator_chat_examples')}</p>
                <ul className="text-xs mt-2 space-y-1">
                  <li>• "Crea un'app per il mio ristorante"</li>
                  <li>• "Genera un gestionale per la mia attività di ecommerce"</li>
                  <li>• "Fai un'app per la palestra"</li>
                </ul>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <span className={`inline-block px-4 py-2 rounded-xl max-w-[80%] ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-gray-700 text-gray-100'
                }`}>
                  {m.isAppLink ? (
                    <div>
                      <p className="mb-2">{m.text}</p>
                      <a 
                        href={m.appUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 underline text-sm break-all"
                      >
                        {m.appUrl}
                      </a>
                    </div>
                  ) : (
                    m.text
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input 
              className="flex-1 p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-violet-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('zeusx_generator_chat_placeholder')}
              disabled={isProcessing}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={isProcessing || !input.trim()}
              className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Overlay - Atomic Dark Style */}
      {showLoadingOverlay && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md flex items-center justify-center z-50">
          <div className="text-center">
            {/* Pulsating violet circle animation */}
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-violet-600/30 rounded-full animate-pulse"></div>
              <div className="absolute inset-2 bg-violet-600/50 rounded-full animate-ping"></div>
              <div className="absolute inset-4 bg-violet-600 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
              </div>
            </div>
            
            {/* Dynamic loading message */}
            <h2 className="text-2xl font-bold text-white mb-4">
              {LOADING_MESSAGES[loadingMessageIndex]}
            </h2>
            
            <p className="text-gray-400">
              Stiamo generando la tua interfaccia...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}