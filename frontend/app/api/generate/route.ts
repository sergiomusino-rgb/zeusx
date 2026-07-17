// ─── Totalium Generate API Route (Next.js App Router) ───────────────────────────────
// Genera interfacce dinamiche tramite l'API di Totalium con stile ATOMIC DARK

import { NextRequest, NextResponse } from 'next/server';

// Configurazione Totalium
const TOTALIUM_API_URL = process.env.TOTALIUM_API_URL || 'https://api.totalium.app/v1';
const TOTALIUM_API_KEY = process.env.TOTALIUM_API_KEY;

// Log per debug
console.log('[Totalium Next.js] API URL:', TOTALIUM_API_URL);
console.log('[Totalium Next.js] API Key presente:', !!TOTALIUM_API_KEY);

// ─── System Prompt per ATOMIC DARK ───────────────────────────────────────────────

const ATOMIC_DARK_SYSTEM_PROMPT = `Sei un generatore di interfacce UI specializzato. Genera SOLO un oggetto JSON valido, senza testo aggiuntivo, senza markdown, senza spiegazioni.

STILE ATOMIC DARK:
- Sfondi: 'bg-slate-950' o 'bg-slate-900'
- Card e pannelli: 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl'
- Colori di accento: Viola vibrante ('bg-violet-600 hover:bg-violet-500', 'text-violet-400')
- Input: Sfondi scuri con focus viola ('focus:border-violet-500')

Schema JSON richiesto:
{
  "appName": "Nome dell'app",
  "sector": "settore-kebab-case",
  "description": "Descrizione breve",
  "schema": {
    "tables": [
      {
        "name": "snake_case_singolare",
        "label": "Etichetta singolare",
        "labelPlural": "Etichetta plurale",
        "icon": "emoji opzionale",
        "fields": [
          {
            "id": "snake_case",
            "type": "text|number|date|datetime|boolean|email|phone|textarea|select|multiselect|relation|currency|file|image",
            "label": "Etichetta campo",
            "required": true|false,
            "options": ["opzione1", "opzione2"],
            "target": "nome_tabella_target",
            "targetLabel": "campo_label_target"
          }
        ]
      }
    ]
  },
  "ui": {
    "primaryColor": "#6366f1",
    "sidebar": ["nome_tabella_1", "nome_tabella_2"],
    "dashboardCards": [
      { "type": "count|sum|latest|chart", "table": "nome_tabella", "label": "Label", "field": "campo_numerico" }
    ]
  }
}

Regole:
- Genera almeno 2-4 tabelle con relazioni logiche
- Usa solo snake_case per name, id, sector
- I campi relation devono puntare a tabelle esistenti
- Non includere id, created_at, updated_at (aggiunti automaticamente)
- Output SOLO JSON puro, niente blocchi di codice markdown.`;

// ─── Helper: Sanitizza JSON response ───────────────────────────────────────────────

function sanitizeJsonResponse(rawText: string): string {
  if (!rawText) return rawText;
  
  // Rimuovi blocchi markdown ```json ... ``` o ``` ... ```
  let cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .replace(/^`+$/gm, '')
    .trim();
  
  // Se il testo inizia con un oggetto o array, estrailo
  const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\})/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }
  
  return cleaned;
}

// ─── Helper: Gestione errori Totalium ─────────────────────────────────────────────

function handleTotaliumError(status: number, data: any) {
  const errorMessages: Record<number, { error: string; message: string; code: string }> = {
    401: {
      error: 'Chiave API non valida',
      message: "L'API key di Totalium non è valida o è mancante. Verifica la configurazione.",
      code: 'INVALID_API_KEY'
    },
    429: {
      error: 'Limite crediti superato',
      message: "Hai superato il limite giornaliero dei crediti. Passa al piano successivo per continuare.",
      code: 'CREDIT_LIMIT_EXCEEDED'
    },
    402: {
      error: 'Credito insufficiente',
      message: "Credito insufficiente per completare l'operazione. Aggiungi crediti al tuo account Totalium.",
      code: 'INSUFFICIENT_CREDITS'
    },
    412: {
      error: 'Pagamento richiesto',
      message: "È richiesto un pagamento per utilizzare questo endpoint. Aggiorna il tuo piano.",
      code: 'PAYMENT_REQUIRED'
    }
  };
  
  return errorMessages[status] || {
    error: data?.error || `Errore ${status}`,
    message: data?.message || `Si è verificato un errore (${status})`,
    code: 'UNKNOWN_ERROR'
  };
}

// ─── POST /api/generate ───────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt, appName, sector, lang } = body;
    
    // Validazione input
    if (!userPrompt && !sector) {
      return NextResponse.json({
        success: false,
        error: 'userPrompt o sector è richiesto',
        code: 'MISSING_INPUT'
      }, { status: 400 });
    }
    
    // Verifica API Key
    if (!TOTALIUM_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'API Key di Totalium non configurata',
        code: 'API_KEY_NOT_CONFIGURED'
      }, { status: 503 });
    }
    
    // Costruisci il prompt completo
    const sectorValue = sector || 'gestione aziendale';
    const appNameValue = appName || 'Gestionale';
    
    const fullPrompt = userPrompt 
      ? `${ATOMIC_DARK_SYSTEM_PROMPT}\n\nRichiesta dell'utente: ${userPrompt}\n\nSettore: ${sectorValue}\n\nNome app: ${appNameValue}`
      : `${ATOMIC_DARK_SYSTEM_PROMPT}\n\nGenera un'interfaccia per: ${sectorValue}\n\nNome app: ${appNameValue}`;
    
    // Chiama l'API di Totalium
    const finalUrl = `${TOTALIUM_API_URL}/generate`;
    console.log('[Totalium] Inviando richiesta a:', finalUrl);
    console.log('[Totalium] API Key presente:', !!TOTALIUM_API_KEY);
    
    let response;
    try {
      response = await fetch(finalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': TOTALIUM_API_KEY,
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          stream: false
        }),
      });
    } catch (fetchErr) {
      console.error('[Totalium] Fetch error:', fetchErr);
      return NextResponse.json({
        success: false,
        error: 'Errore di rete nella chiamata a Totalium',
        code: 'FETCH_ERROR',
        details: fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
      }, { status: 503 });
    }
    
    const data = await response.json();
    
    // Gestione errori specifici di Totalium
    if (!response.ok) {
      const errorInfo = handleTotaliumError(response.status, data);
      return NextResponse.json({
        success: false,
        error: errorInfo.error,
        message: errorInfo.message,
        code: errorInfo.code,
        details: data
      }, { status: response.status });
    }
    
    // Estrai il contenuto dalla risposta
    let rawContent = data.choices?.[0]?.message?.content || data.content || data.response || '';
    
    // Sanitizza il JSON
    const sanitized = sanitizeJsonResponse(rawContent);
    
    // Parse del JSON
    let generatedSchema: any;
    try {
      generatedSchema = JSON.parse(sanitized);
    } catch (parseErr) {
      console.error('[generate] JSON parse error. Raw:', rawContent);
      return NextResponse.json({
        success: false,
        error: "Il modello ha restituito un JSON non valido",
        code: 'INVALID_JSON_RESPONSE',
        raw: rawContent
      }, { status: 500 });
    }
    
    // Validazione schema minimo
    if (!generatedSchema.schema || !generatedSchema.schema.tables) {
      return NextResponse.json({
        success: false,
        error: 'Schema generato non valido: manca schema.tables',
        code: 'INVALID_SCHEMA'
      }, { status: 400 });
    }
    
    // Aggiungi le classi ATOMIC DARK al UI se non presenti
    if (generatedSchema.ui) {
      generatedSchema.ui.atomicDark = {
        background: 'bg-slate-950',
        card: 'bg-slate-900/40 border border-slate-800/80 backdrop-blur-md rounded-2xl',
        accent: 'bg-violet-600 hover:bg-violet-500',
        accentText: 'text-violet-400',
        inputFocus: 'focus:border-violet-500'
      };
    }
    
    return NextResponse.json({
      success: true,
      data: generatedSchema
    });
    
  } catch (err) {
    console.error('[generate] Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Errore interno del server',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}