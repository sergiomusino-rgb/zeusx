'use client';

import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';

// Lingue supportate
const LANGUAGES = [
  { code: 'it', label: 'IT', flag: '🇮🇹' },
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'es', label: 'ES', flag: '🇪🇸' },
  { code: 'de', label: 'DE', flag: '🇩🇪' },
] as const;

export default function LangSelector() {
  const locale = useLocale();
  const [mounted, setMounted] = useState(false);
  const [currentLocale, setCurrentLocale] = useState(locale);
  const [isOpen, setIsOpen] = useState(false);

  // Protezione anti-hydration: attendi il mount client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sincronizza con la locale corrente
  useEffect(() => {
    setCurrentLocale(locale);
  }, [locale]);

  const handleLanguageChange = (newLocale: string) => {
    setCurrentLocale(newLocale);
    // Imposta il cookie NEXT_LOCALE
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=lax`;
    // Chiudi il dropdown
    setIsOpen(false);
    // Forza il reload completo della pagina
    // Rimuoviamo eventuali cache aggiungendo un timestamp
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('_t', Date.now().toString());
    window.location.href = currentUrl.toString();
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
        <span className="text-xl">
          {LANGUAGES.find(l => l.code === currentLocale)?.flag || '🇮🇹'}
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
                    currentLocale === lang.code
                      ? 'bg-indigo-500/20 text-white border border-indigo-500/30'
                      : 'text-slate-300 hover:bg-slate-800/50 opacity-70 hover:opacity-100'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
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
