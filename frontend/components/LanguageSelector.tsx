'use client';

import { useState } from 'react';
import { useLanguage, SUPPORTED_LOCALES, type Locale } from '@/src/lib/LanguageContext';

const LANGUAGE_NAMES: Record<Locale, string> = {
  it: 'Italiano',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  es: 'Español',
};

export default function LanguageSelector() {
  const { locale, setLocale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/50 border border-white/20 hover:scale-105 transition-all duration-200 shadow-lg"
        aria-label="Seleziona lingua"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-bold text-white">{locale.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop per chiudere al click esterno */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div
            role="listbox"
            className="absolute right-0 top-full mt-2 z-20 rounded-xl border border-white/20 bg-slate-900/95 backdrop-blur-md p-2 min-w-[180px] shadow-xl"
          >
            <div className="flex flex-col gap-1">
              {SUPPORTED_LOCALES.map((code) => (
                <button
                  key={code}
                  role="option"
                  aria-selected={locale === code}
                  onClick={() => {
                    setLocale(code);
                    setIsOpen(false);
                  }}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    locale === code
                      ? 'bg-indigo-500/20 text-white'
                      : 'text-slate-300 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="font-mono text-xs text-slate-400 w-8">{code.toUpperCase()}</span>
                  <span className="text-slate-200">-</span>
                  <span className="ml-2 text-slate-200">{LANGUAGE_NAMES[code]}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}