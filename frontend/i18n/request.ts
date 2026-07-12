import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

// Definisci le lingue supportate
export const locales = ['it', 'en', 'es', 'de'] as const;
export type Locale = (typeof locales)[number];

// Lingua di default
export const defaultLocale: Locale = 'it';

export default getRequestConfig(async () => {
  // Leggi la lingua dal cookie o usa quella di default
  const cookieStore = await cookies();
  const locale = (cookieStore.get('NEXT_LOCALE')?.value as Locale) || defaultLocale;

  // Carica il file di messaggi corrispondente
  const messages = (await import(`../messages/${locale}.json`)).default;

  return {
    locale,
    messages,
  };
});