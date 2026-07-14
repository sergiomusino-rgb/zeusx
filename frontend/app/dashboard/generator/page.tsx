'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/src/lib/LanguageContext';
import { MessageSquare, Send } from 'lucide-react';

// Pattern per riconoscere richieste di creazione app
const CREATE_APP_PATTERNS = [
  /crea\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /genera\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /fai\s+(?:un'?\s+)?app\s+(?:per\s+)?(.+)/i,
  /create\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
  /generate\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
  /make\s+(?:an?\s+)?app\s+(?:for\s+)?(.+)/i,
];

export default function GeneratorPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<{role: string, text: string, isAppLink?: boolean, appUrl?: string}[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Estrae nome attività e tipo dalla richiesta
  const parseAppRequest = (text: string): { activityName: string; activityType: string } | null => {
    const lowerText = text.toLowerCase();
    
    // Riconosci il tipo di attività
    let activityType = 'custom';
    if (lowerText.includes('ecommerce') || lowerText.includes('e-commerce') || lowerText.includes('shop') || lowerText.includes('negozio') || lowerText.includes('store')) {
      activityType = 'ecommerce';
    } else if (lowerText.includes('ristorante') || lowerText.includes('restaurant') || lowerText.includes('cibo') || lowerText.includes('food')) {
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

    // Controlla se è una richiesta di creazione app
    const appRequest = parseAppRequest(text);
    
    if (appRequest) {
      // Chiama il proxy ZEUSX
      try {
        const response = await fetch('/api/zeusx-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'createApp',
            activityName: appRequest.activityName,
            activityType: appRequest.activityType
          })
        });

        const data = await response.json();
        
        if (data.success && data.appUrl) {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            text: t('zeusx_generator_app_created'),
            isAppLink: true,
            appUrl: data.appUrl
          }]);
        } else {
          setMessages(prev => [...prev, { 
            role: 'ai', 
            text: data.error || t('zeusx_generator_error_create')
          }]);
        }
      } catch (err) {
        console.error("Errore creazione app:", err);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: t('zeusx_generator_error_connection')
        }]);
      }
    } else {
      // Chat normale - risposta AI
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: t('zeusx_generator_chat_response')
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
              className="flex-1 p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-indigo-500"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={t('zeusx_generator_chat_placeholder')}
              disabled={isProcessing}
            />
            <button 
              onClick={() => handleSendMessage()} 
              disabled={isProcessing || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
