import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

const ALLOWED_FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea', 'email', 'tel', 'checkbox'];

interface AIColumn {
  name: string;
  label: string;
  type: string;
  required: boolean;
}

interface AITableDef {
  name: string;
  label: string;
  labelPlural: string;
  icon: string;
  columns: AIColumn[];
}

// Traduce una richiesta in linguaggio naturale (es. "Aggiungi la tabella
// Storico Interventi con campi data, descrizione, costo") in una definizione
// di tabella tramite Groq, con lo stesso schema di chiamata già usato in
// app/api/creator/generate/route.ts (stesso GROQ_API_KEY, stesso pattern di
// strip markdown + regex-extract del JSON).
async function callGroq(instruction: string): Promise<AITableDef> {
  const systemPrompt = `Sei un assistente che traduce richieste in linguaggio naturale in una definizione di tabella per un database.
Rispondi SOLO con un JSON valido con questa struttura, senza testo prima o dopo:
{
  "name": "nome_tabella_snake_case",
  "label": "Etichetta singolare",
  "labelPlural": "Etichetta plurale",
  "icon": "📄",
  "columns": [
    {"name": "nome_campo_snake_case", "label": "Etichetta Campo", "type": "text", "required": false}
  ]
}
Tipi di campo ammessi: ${ALLOWED_FIELD_TYPES.join(', ')}. Usa "number" per importi/quantità, "date" per date, "checkbox" per booleani, "text" per il resto.
Non aggiungere mai un campo "id": viene gestito automaticamente dal sistema.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: instruction },
      ],
    }),
  });

  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    const errorText = await res.text();
    console.error('[AI Schema] Non-JSON response:', res.status, errorText.substring(0, 200));
    throw new Error(`Errore Groq (${res.status}): ${res.statusText || 'risposta non valida'}`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Errore Groq');

  const content = data.choices?.[0]?.message?.content || '';
  const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Nessun JSON valido nella risposta AI');

  let parsed: any;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (parseError) {
    console.error('[AI Schema] JSON parse error:', parseError, jsonMatch[0]);
    throw new Error('Errore nel parsing della risposta AI');
  }

  return parsed as AITableDef;
}

// Sanifica l'output dell'AI: whitelist dei campi, fallback sui default,
// stesso spirito della validazione già presente in custom-tables.js POST.
function sanitizeTableDef(raw: any): AITableDef {
  const rawName = typeof raw?.name === 'string' ? raw.name : '';
  const name = rawName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const label = typeof raw?.label === 'string' && raw.label.trim() ? raw.label.trim() : '';

  if (!name || !label) {
    throw new Error('La richiesta non contiene un nome di tabella riconoscibile. Prova a essere più specifico, es. "Aggiungi la tabella Fornitori con campi nome, telefono".');
  }

  const rawColumns = Array.isArray(raw?.columns) ? raw.columns : [];
  const columns: AIColumn[] = rawColumns
    .map((c: any) => {
      const colName = typeof c?.name === 'string'
        ? c.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
        : '';
      const colLabel = typeof c?.label === 'string' && c.label.trim() ? c.label.trim() : '';
      const type = ALLOWED_FIELD_TYPES.includes(c?.type) ? c.type : 'text';
      return colName && colLabel ? { name: colName, label: colLabel, type, required: Boolean(c?.required) } : null;
    })
    .filter((c: AIColumn | null): c is AIColumn => c !== null);

  if (columns.length === 0) {
    throw new Error('La richiesta non specifica campi validi per la tabella. Indica almeno un campo, es. "con campi data, descrizione, costo".');
  }

  return {
    name,
    label,
    labelPlural: typeof raw?.labelPlural === 'string' && raw.labelPlural.trim() ? raw.labelPlural.trim() : label + 'i',
    icon: typeof raw?.icon === 'string' && raw.icon.trim() ? raw.icon.trim() : '📄',
    columns,
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'Authorization header mancante' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const instruction = typeof body?.instruction === 'string' ? body.instruction.trim() : '';

    if (!instruction) {
      return NextResponse.json({ error: 'Descrivi cosa vuoi aggiungere, es. "Aggiungi la tabella Fornitori con campi nome, telefono"' }, { status: 400 });
    }

    const rawTableDef = await callGroq(instruction);
    const tableDef = sanitizeTableDef(rawTableDef);

    // Riusa integralmente la logica di creazione/validazione/unicità-nome
    // già esistente in backend/routes/custom-tables.js — zero duplicazione.
    const res = await fetch(`${BACKEND_URL}/api/client/apps/${id}/custom-tables`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tableDef),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[AI Schema] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore durante la generazione della tabella' },
      { status: 500 }
    );
  }
}
