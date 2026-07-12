'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/src/lib/LanguageContext';

// Lingue supportate
const LANGUAGES = [
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'fr', label: 'FR', flag: '🇫🇷' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
] as const;

export default function LangSelector() {
  const { locale, setLocale } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Protezione anti-hydration: attendi il mount client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLanguageChange = (newLocale: string) => {
    setLocale(newLocale as 'it' | 'en' | 'fr' | 'de' | 'es');
    // Chiudi il dropdown
    setIsOpen(false);
  };

  // Placeholder per prevenire hydration mismatch
  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  return (
    <div className="relative">
      {/* Pulsante principale con bandierina attiva */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/50 border border-white/20 hover:scale-105 transition-all duration-200 shadow-lg"
        aria-label="Seleziona lingua"
      >
        <span className="text-xl emoji-flag">
          {LANGUAGES.find(l => l.code === locale)?.flag || '🇮🇹'}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown con bandierine orizzontali */}
          <div className="absolute right-0 top-full mt-2 z-20 rounded-xl border border-white/20 bg-slate-900/95 backdrop-blur-md p-2 min-w-[140px] shadow-xl">
            <div className="flex flex-col gap-1">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => handleLanguageChange(lang.code)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 ${
                    locale === lang.code
                      ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-lg emoji-flag">{lang.flag}</span>
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}