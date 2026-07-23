// ─── Immagini placeholder per record (tabelle "visive") ────────────────────
// Le tabelle generate dall'AI raramente hanno foto reali caricate dal
// cliente: senza immagini, elenchi di prodotti/veicoli/piatti sembrano
// "semplici caselle" invece di una vetrina invitante. Come nella landing
// hero (lib/landingHero.ts), assegniamo una foto HD Unsplash verificata e
// contestuale al settore/tipo di tabella — deterministica per record (stesso
// id → sempre la stessa foto, niente "sfarfallio" tra un render e l'altro).
//
// Applicata SOLO a categorie di prodotto/oggetto (veicoli, immobili, prodotti,
// piatti): mai a persone (pazienti, clienti, dipendenti) per non attribuire
// volti reali di sconosciuti a identità fittizie nei dati demo.

export type PlaceholderCategory = 'veicoli' | 'immobili' | 'prodotti' | 'piatti';

const CATEGORY_IMAGES: Record<PlaceholderCategory, string[]> = {
  veicoli: [
    '1494976388531-d1058494cdd8',
    '1503376780353-7e6692767b70',
    '1583121274602-3e2820c69888',
    '1542362567-b07e54358753',
    '1567818735868-e71b99932e29',
  ],
  immobili: [
    '1493663284031-b7e3aefcae8e',
    '1484154218962-a197022b5858',
    '1560518883-ce09059eeffa',
    '1583847268964-b28dc8f51f92',
    '1484101403633-562f891dc89a',
  ],
  prodotti: [
    '1556911220-e15b29be8c8f',
    '1512621776951-a57141f2eefd',
    '1571091718767-18b5b1457add',
    '1441986300917-64674bd600d8',
  ],
  piatti: [
    '1467003909585-2f8a72700288',
    '1546069901-ba9599a7e63c',
    '1571997478779-2adcbbe9ab2f',
    '1550547660-d9450f859349',
  ],
};

// Nomi tabella (in minuscolo) → categoria. Match per sottostringa, come per
// designTokens/iconResolver: copre sia il singolare che varianti comuni.
const TABLE_NAME_CATEGORY: Array<{ keywords: string[]; category: PlaceholderCategory }> = [
  { category: 'veicoli', keywords: ['veicol', 'auto', 'macchin', 'moto', 'vettur', 'parco_auto', 'parco auto'] },
  { category: 'immobili', keywords: ['immobil', 'propriet', 'appartament', 'cas', 'stanz', 'camer', 'annunci'] },
  { category: 'piatti', keywords: ['piatt', 'menu', 'ricett', 'pizz', 'dish'] },
  { category: 'prodotti', keywords: ['prodott', 'articol', 'magazzin', 'ricambi', 'inventario', 'catalogo'] },
];

/** Determina se una tabella è "visiva" (merita foto/griglia) in base al nome. */
export function getPlaceholderCategoryForTable(tableName: string): PlaceholderCategory | null {
  const normalized = tableName.toLowerCase();
  for (const { keywords, category } of TABLE_NAME_CATEGORY) {
    if (keywords.some((kw) => normalized.includes(kw))) return category;
  }
  return null;
}

// Hash semplice e stabile (stringa → intero positivo) per scegliere sempre
// la stessa foto per lo stesso record, senza dipendenze esterne.
function stableHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/** URL Unsplash HD deterministico per un record, dato l'id e la categoria. */
export function getPlaceholderImageUrl(category: PlaceholderCategory, recordId: string): string {
  const photos = CATEGORY_IMAGES[category];
  const photo = photos[stableHash(recordId) % photos.length];
  return `https://images.unsplash.com/photo-${photo}?auto=format&fit=crop&w=600&q=80`;
}
