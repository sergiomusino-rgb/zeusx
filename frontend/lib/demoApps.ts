// Demo dello Showcase (dashboard/showcase): non sono app reali generate dagli
// utenti, quindi non esistono righe corrispondenti nella tabella `apps` — per
// questo /a/[slug]/layout.tsx le riconosce per slug e costruisce l'AppInfo
// localmente invece di interrogare Supabase, mostrando comunque la landing
// page pubblica reale (LandingPublic in /a/[slug]/page.tsx).

export interface DemoAppTable {
  name: string;
  label: string;
  labelPlural: string;
}

export interface DemoApp {
  slug: string;
  name: string;
  sector: string;
  appType: string;
  description: string;
  tables: DemoAppTable[];
}

export const DEMO_APPS: DemoApp[] = [
  {
    slug: 'demo-ristorante',
    name: 'Ristorante La Piazza',
    sector: 'ristorante',
    appType: 'Ristorante',
    description: 'Gestione tavoli, menu, ordini e cucina in tempo reale',
    tables: [
      { name: 'tavoli', label: 'Tavolo', labelPlural: 'Tavoli' },
      { name: 'menu', label: 'Piatto', labelPlural: 'Menu' },
      { name: 'ordini', label: 'Ordine', labelPlural: 'Ordini' },
    ],
  },
  {
    slug: 'demo-studio-medico',
    name: 'Studio Medico Bianchi',
    sector: 'studio medico',
    appType: 'Medico',
    description: 'Pazienti, appuntamenti e cartelle cliniche digitali',
    tables: [
      { name: 'pazienti', label: 'Paziente', labelPlural: 'Pazienti' },
      { name: 'appuntamenti', label: 'Appuntamento', labelPlural: 'Appuntamenti' },
      { name: 'visite', label: 'Visita', labelPlural: 'Cartelle Cliniche' },
    ],
  },
  {
    slug: 'demo-officina',
    name: 'Officina Rossi',
    sector: 'officina',
    appType: 'Officina',
    description: 'Veicoli, interventi, ricambi e fatturazione',
    tables: [
      { name: 'veicoli', label: 'Veicolo', labelPlural: 'Veicoli' },
      { name: 'interventi', label: 'Intervento', labelPlural: 'Interventi' },
      { name: 'fatture', label: 'Fattura', labelPlural: 'Fatturazione' },
    ],
  },
  {
    slug: 'demo-hotel',
    name: 'Hotel Mediterraneo',
    sector: 'hotel',
    appType: 'Hotel',
    description: 'Camere, prenotazioni, ospiti e housekeeping',
    tables: [
      { name: 'camere', label: 'Camera', labelPlural: 'Camere' },
      { name: 'prenotazioni', label: 'Prenotazione', labelPlural: 'Prenotazioni' },
      { name: 'ospiti', label: 'Ospite', labelPlural: 'Ospiti' },
    ],
  },
  {
    slug: 'demo-palestra',
    name: 'Palestra FitLab',
    sector: 'palestra',
    appType: 'Palestra',
    description: 'Iscritti, abbonamenti, schede e presenze',
    tables: [
      { name: 'iscritti', label: 'Iscritto', labelPlural: 'Iscritti' },
      { name: 'abbonamenti', label: 'Abbonamento', labelPlural: 'Abbonamenti' },
      { name: 'presenze', label: 'Presenza', labelPlural: 'Presenze' },
    ],
  },
  {
    slug: 'demo-negozio',
    name: 'Negozio Moda & Co.',
    sector: 'negozio',
    appType: 'Negozio',
    description: 'Prodotti, vendite, magazzino e fornitori',
    tables: [
      { name: 'prodotti', label: 'Prodotto', labelPlural: 'Prodotti' },
      { name: 'magazzino', label: 'Voce Magazzino', labelPlural: 'Magazzino' },
      { name: 'fornitori', label: 'Fornitore', labelPlural: 'Fornitori' },
    ],
  },
];

export function getDemoApp(slug: string): DemoApp | undefined {
  return DEMO_APPS.find((a) => a.slug === slug);
}
