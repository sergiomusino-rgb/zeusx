/**
 * Configurazione centralizzata delle tabelle dashboard.
 * Queste definizioni corrispondono agli schema blueprints presenti nel database
 * e sono usate dalla Sidebar e dalla pagina [table] per la navigazione dinamica.
 */

export interface UIField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'boolean' | 'number' | 'currency' | 'date' | 'datetime' | 'email' | 'phone' | 'relation';
  label: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  target?: string;
  targetLabel?: string;
}

export interface UITable {
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  description?: string;
  sector: string;
  fields: UIField[];
}

/**
 * Catalogo completo delle tabelle disponibili per navigazione dashboard.
 * Organizzate per settore. In produzione questi dati vengono dal DB (blueprints),
 * questo file funge da fallback e reference per TypeScript.
 */
export const TABLE_CATALOG: Record<string, UITable> = {
  // ─── Oculista ────────────────────────────────────────────────────────────
  patients: {
    name: 'patients',
    label: 'Paziente',
    labelPlural: 'Pazienti',
    icon: '👁️',
    sector: 'oculista',
    description: 'Anagrafica pazienti dello studio oculistico',
    fields: [
      { id: 'first_name', type: 'text', label: 'Nome', required: true },
      { id: 'last_name', type: 'text', label: 'Cognome', required: true },
      { id: 'phone', type: 'phone', label: 'Telefono' },
      { id: 'email', type: 'email', label: 'Email' },
      { id: 'birth_date', type: 'date', label: 'Data di nascita' },
    ],
  },
  appointments: {
    name: 'appointments',
    label: 'Appuntamento',
    labelPlural: 'Appuntamenti',
    icon: '📅',
    sector: 'oculista',
    description: 'Gestione appuntamenti e visite',
    fields: [
      { id: 'patient_id', type: 'relation', label: 'Paziente', target: 'patients', targetLabel: 'last_name', required: true },
      { id: 'date', type: 'datetime', label: 'Data e ora', required: true },
      { id: 'type', type: 'select', label: 'Tipo visita', options: ['Prima visita', 'Controllo', 'Urgenza', 'Lenti a contatto'], required: true },
      { id: 'notes', type: 'textarea', label: 'Note' },
    ],
  },

  // ─── Officina ────────────────────────────────────────────────────────────
  customers: {
    name: 'customers',
    label: 'Cliente',
    labelPlural: 'Clienti',
    icon: '👤',
    sector: 'officina',
    description: 'Anagrafica clienti dell\'officina',
    fields: [
      { id: 'name', type: 'text', label: 'Ragione Sociale', required: true },
      { id: 'phone', type: 'phone', label: 'Telefono' },
      { id: 'email', type: 'email', label: 'Email' },
      { id: 'address', type: 'textarea', label: 'Indirizzo' },
    ],
  },
  vehicles: {
    name: 'vehicles',
    label: 'Veicolo',
    labelPlural: 'Veicoli',
    icon: '🚗',
    sector: 'officina',
    description: 'Parco veicoli dei clienti',
    fields: [
      { id: 'customer_id', type: 'relation', label: 'Cliente', target: 'customers', targetLabel: 'name', required: true },
      { id: 'plate', type: 'text', label: 'Targa', required: true },
      { id: 'brand', type: 'text', label: 'Marca' },
      { id: 'model', type: 'text', label: 'Modello' },
      { id: 'year', type: 'number', label: 'Anno' },
    ],
  },
  jobs: {
    name: 'jobs',
    label: 'Lavorazione',
    labelPlural: 'Lavorazioni',
    icon: '🔧',
    sector: 'officina',
    description: 'Lavorazioni e riparazioni',
    fields: [
      { id: 'vehicle_id', type: 'relation', label: 'Veicolo', target: 'vehicles', targetLabel: 'plate', required: true },
      { id: 'description', type: 'textarea', label: 'Descrizione', required: true },
      { id: 'status', type: 'select', label: 'Stato', options: ['In attesa', 'In corso', 'Completata', 'Consegnata'], required: true },
      { id: 'cost', type: 'currency', label: 'Costo' },
    ],
  },

  // ─── Ristorante ──────────────────────────────────────────────────────────
  dishes: {
    name: 'dishes',
    label: 'Piatto',
    labelPlural: 'Menu',
    icon: '🍽️',
    sector: 'ristorante',
    description: 'Piatti del menu del ristorante',
    fields: [
      { id: 'name', type: 'text', label: 'Nome piatto', required: true },
      { id: 'category', type: 'select', label: 'Categoria', options: ['Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci', 'Bevande'], required: true },
      { id: 'price', type: 'currency', label: 'Prezzo', required: true },
      { id: 'description', type: 'textarea', label: 'Descrizione' },
    ],
  },
  reservations: {
    name: 'reservations',
    label: 'Prenotazione',
    labelPlural: 'Prenotazioni',
    icon: '📅',
    sector: 'ristorante',
    description: 'Prenotazioni dei clienti',
    fields: [
      { id: 'customer_name', type: 'text', label: 'Nome cliente', required: true },
      { id: 'phone', type: 'phone', label: 'Telefono', required: true },
      { id: 'date', type: 'datetime', label: 'Data e ora', required: true },
      { id: 'guests', type: 'number', label: 'Numero ospiti', required: true },
      { id: 'notes', type: 'textarea', label: 'Note' },
    ],
  },
};

/**
 * Raggruppa le tabelle per settore per la sidebar.
 */
export function getTablesBySector(): Record<string, UITable[]> {
  const sectors: Record<string, UITable[]> = {};
  for (const table of Object.values(TABLE_CATALOG)) {
    if (!sectors[table.sector]) {
      sectors[table.sector] = [];
    }
    sectors[table.sector].push(table);
  }
  return sectors;
}

/**
 * Recupera una tabella dal catalogo per nome.
 */
export function getTableConfig(tableName: string): UITable | null {
  return TABLE_CATALOG[tableName] || null;
}

/**
 * Restituisce tutte le tabelle come array piatto.
 */
export function getAllTables(): UITable[] {
  return Object.values(TABLE_CATALOG);
}

/**
 * Nomi leggibili dei settori per la UI.
 */
export const SECTOR_LABELS: Record<string, string> = {
  oculista: 'Studio Oculistico',
  officina: 'Officina Meccanica',
  ristorante: 'Ristorante',
};