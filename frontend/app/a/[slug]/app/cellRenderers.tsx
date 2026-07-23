import React from 'react';

// ─── Badge di stato colorati ────────────────────────────────────────────────
// Keyword-matching semantico sul valore (es. "Pagato"→verde, "In Attesa"→ambra,
// "Annullato"→rosso) invece di un pallino a tinta unica: condiviso da tutti i
// renderer di tabella (blueprint, tabelle personalizzate/AI, layout di settore)
// così un campo "stato" sembra sempre un vero gestionale, non testo grezzo.
const STATUS_STYLES: { keywords: string[]; bg: string; color: string }[] = [
  { keywords: ['consegnat', 'complet', 'pagat', 'confermat', 'pronto', 'attivo', 'disponibile', 'evaso', 'delivered', 'completed', 'paid', 'confirmed', 'ready', 'done', 'active'], bg: '#DCFCE7', color: '#166534' },
  { keywords: ['preparazione', 'corso', 'attesa', 'lavorazione', 'sospes', 'pending', 'processing', 'progress', 'in attesa'], bg: '#FEF3C7', color: '#92400E' },
  { keywords: ['annullat', 'rifiutat', 'scadut', 'bloccat', 'cancellat', 'cancelled', 'canceled', 'rejected', 'expired', 'blocked'], bg: '#FEE2E2', color: '#991B1B' },
];

export function getStatusBadgeStyle(value: string): { bg: string; color: string } {
  const v = value.toLowerCase();
  for (const s of STATUS_STYLES) {
    if (s.keywords.some((k) => v.includes(k))) return { bg: s.bg, color: s.color };
  }
  return { bg: '#E0E7FF', color: '#3730A3' }; // neutro/informativo di default
}

export function StatusBadge({ value }: { value: string }) {
  const { bg, color } = getStatusBadgeStyle(value);
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: '999px',
      background: bg, color, fontSize: '12px', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  );
}

// ─── Rendering celle per tipo di campo ──────────────────────────────────────
// Unico punto di verità per checkbox/currency/date/select/multiselect/image,
// usato da DynamicDataTable, CustomTableRenderer e DynamicLayoutRenderer così
// da avere lo stesso trattamento visivo ovunque (tabelle blueprint, tabelle
// create con l'AI Schema Updater, layout ricchi di settore).
export function renderCellValue(record: Record<string, unknown>, fieldName: string, type: string): React.ReactNode {
  const val = record[fieldName];
  if (val == null || val === '') return '';

  if (type === 'checkbox') {
    return val ? 'Sì' : 'No';
  }
  if (type === 'currency') {
    const n = Number(val);
    return isNaN(n) ? String(val) : `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }
  if (type === 'number') {
    const n = Number(val);
    const looksLikePrice = /prezzo|totale|importo|costo/i.test(fieldName);
    if (!isNaN(n) && looksLikePrice) {
      return `${n.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    return String(val);
  }
  if (type === 'date') {
    try {
      return new Date(val as string).toLocaleDateString('it-IT');
    } catch {
      return String(val);
    }
  }
  if (type === 'select' || type === 'multiselect') {
    const values = (Array.isArray(val) ? val : [val]).filter(Boolean);
    return (
      <span style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {values.map((v, i) => <StatusBadge key={i} value={String(v)} />)}
      </span>
    );
  }
  if (type === 'image' && typeof val === 'string' && val) {
    return (
      <img
        src={val}
        alt=""
        style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return String(val);
}
