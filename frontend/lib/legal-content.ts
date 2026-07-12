// Legal content loader - keeps JSON files clean and avoids token limits
// Place legal text files in: frontend/public/legal/[type].[lang].txt

export type LegalType = 'terms' | 'privacy';
export type Locale = 'it' | 'en' | 'fr' | 'de' | 'es';

// Default placeholder content (used when file not found)
const DEFAULT_CONTENT: Record<LegalType, Record<Locale, string>> = {
  terms: {
    it: 'Inserisci qui il testo dei termini e condizioni di ZeusX...',
    en: 'Insert the terms and conditions text for ZeusX here...',
    fr: 'Insérez le texte des conditions générales de ZeusX ici...',
    de: 'Fügen Sie hier den AGB-Text von ZeusX ein...',
    es: 'Inserta aquí el texto de términos y condiciones de ZeusX...',
  },
  privacy: {
    it: 'Inserisci qui il testo della privacy policy di ZeusX...',
    en: 'Insert the privacy policy text for ZeusX here...',
    fr: 'Insérez le texte de la politique de confidentialité de ZeusX ici...',
    de: 'Fügen Sie hier den Datenschutzrichtlinien-Text von ZeusX ein...',
    es: 'Inserta aquí el texto de la política de privacidad de ZeusX...',
  },
};

/**
 * Get legal content for a specific type and locale.
 * Looks for file at /public/legal/[type].[lang].txt
 * Falls back to placeholder if file not found.
 */
export function getLegalContent(type: LegalType, locale: Locale): string {
  // In server context, we can read files directly
  // In client context, we use fetch to get the public file
  if (typeof window === 'undefined') {
    // Server-side: read from filesystem
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(process.cwd(), 'public', 'legal', `${type}.${locale}.txt`);
    
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch {
      return DEFAULT_CONTENT[type][locale];
    }
  }
  
  // Client-side: this will be handled by the page component
  // For now return placeholder (the page will fetch on mount)
  return DEFAULT_CONTENT[type][locale];
}

/**
 * Get all available locales for a legal type
 */
export function getAvailableLocales(type: LegalType): Locale[] {
  return ['it', 'en', 'fr', 'de', 'es'];
}