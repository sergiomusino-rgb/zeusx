// ─── Creator AI Generate API Route (Next.js App Router) ───────────────────────────────
// Genera schema JSON tramite Groq API (Llama 3.3) e salva nella tabella apps
// CON INIEZIONE DEL DESIGN SYSTEM

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDesignSystemForSector } from '@/lib/designSystemLoader';
import { sanitizeBlueprint, normalizeSector, type Table } from '@/src/lib/blueprint-schema';

// Configurazione Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

// ─── Helper: Get user from auth token ───────────────────────────────────────────────
async function getUserFromToken(token: string) {
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// ─── Helper: Get or create tenant for user ───────────────────────────────────────────
async function getOrCreateTenant(supabase: any, user: { id: string; email?: string }) {
  const { data: memberships } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1);

  if (memberships?.[0]?.tenant_id) return memberships[0].tenant_id;

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      owner_id: user.id,
      name: user.email ? `Tenant di ${user.email}` : 'Tenant personale',
      slug: `tenant-${user.id.slice(0, 8)}`,
      plan: 'free',
      app_limit: 0,
      total_apps_created: 0,
    })
    .select('id')
    .single();

  if (tenantError || !tenant) {
    throw new Error('Errore creazione tenant');
  }

  await supabase.from('tenant_members').insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: 'owner',
  });

  return tenant.id;
}

// ─── Helper: Call Groq API ─────────────────────────────────────────────────────────
async function callGroq(prompt: string, sector: string, lang: string): Promise<any> {
  // Carica il design system per il settore
  const designSystem = await getDesignSystemForSector(sector);
  
  const systemPrompt = `Sei ZeusX AI, un assistente specializzato nella generazione di applicazioni SaaS.
Genera uno schema JSON per un'applicazione di ${sector} in lingua ${lang}.

${designSystem.systemPrompt}

Rispondi SOLO con un JSON valido con la seguente struttura:
{
  "appName": "Nome dell'app",
  "description": "Descrizione breve",
  "sector": "${sector}",
  "ui": {
    "primaryColor": "${designSystem.designTokens?.colors?.primary || '#6366f1'}"
  },
  "schema": {
    "tables": [
      {
        "name": "nome_tabella",
        "label": "Etichetta singolare (es. Pizza, Ordine, Prenotazione)",
        "labelPlural": "Etichetta plurale REALE (es. Pizze, Ordini, Prenotazioni) - MAI la parola generica 'Tabelle'",
        "icon": "📄",
        "fields": [
          {"name": "id", "type": "id", "label": "ID"},
          {"name": "nome_campo", "type": "string", "label": "Etichetta Campo"}
        ]
      }
    ]
  }
}

Crea tabelle e campi SPECIFICI per il settore richiesto. Non usare nomi generici come "nome_tabella" o "nome_campo".
"labelPlural" è OBBLIGATORIO per ogni tabella e deve essere il plurale reale e specifico dell'entità (es. "Ordini", "Prenotazioni", "Menu Pizze", "Clienti") — non usare mai letteralmente la parola "Tabelle" o "Tabella".
Se una tabella rappresenta ordini/prenotazioni/richieste, includi sempre un campo "stato"/"status" di tipo "select" con opzioni di stato realistiche per il settore (es. "In preparazione", "Pronto", "Consegnato" per un ordine di cibo).
Se una tabella rappresenta prodotti/piatti/servizi in vendita, includi sempre un campo prezzo di tipo "number" con nome contenente "prezzo" o "totale".
Non aggiungere testo prima o dopo il JSON.`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.8,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
    }),
  });

  // Check content type before parsing JSON
  const contentType = res.headers.get('content-type');
  if (!res.ok || !contentType?.includes('application/json')) {
    const errorText = await res.text();
    console.error('[Groq] Non-JSON response:', res.status, errorText.substring(0, 200));
    throw new Error(`Groq API error (${res.status}): ${res.statusText || 'Invalid response'}`);
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Errore Groq');
  
  const content = data.choices?.[0]?.message?.content || '';
  
  // Log della risposta raw di Groq per debug
  console.log('[Groq] RAW RESPONSE:', content);
  
  // Rimuovi tag markdown se presenti
  const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Estrai il JSON dalla risposta
  const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      // Assicura che ui esista
      if (!parsed.ui) {
        parsed.ui = {
          primaryColor: designSystem.designTokens?.colors?.primary || '#6366f1'
        };
      }
      return parsed;
    } catch (parseError) {
      console.error('[Groq] JSON parse error:', parseError);
      console.error('[Groq] JSON that failed to parse:', jsonMatch[0]);
      throw new Error(`Errore parsing JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }
  
  throw new Error('Nessun JSON valido nella risposta');
}

// ─── Helper: Adatta lo shape Zod (blueprint-schema) a quello atteso dal viewer
// (table-definitions.ts / EditTableModal.tsx usano `field.name`, non `field.id`) ────
function toViewerTables(tables: Table[]) {
  return tables.map((t) => ({
    name: t.name,
    label: t.label,
    labelPlural: t.labelPlural,
    icon: t.icon,
    fields: t.fields.map((f) => ({
      id: f.id,
      name: f.id,
      label: f.label,
      type: f.type,
      required: f.required,
      options: f.options,
      fixed: false,
      targetTable: f.target,
      targetLabel: f.targetLabel,
    })),
  }));
}

// ─── Helper: Generate slug ─────────────────────────────────────────────────────────
function generateSlug(name: string, sector: string): string {
  const base = `${sector || 'wandermap'}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

// ─── Helper: Generate random password (10 alphanumeric characters) ─────────────────
function generateRandomPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// ─── POST /api/creator/generate ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userPrompt, sector, lang = 'it' } = body;
    const safeSector = sector || 'wandermap';
    
    // Validazione input
    if (!userPrompt && !sector) {
      return NextResponse.json({
        success: false,
        error: 'userPrompt o sector è richiesto',
        code: 'MISSING_INPUT'
      }, { status: 400 });
    }
    
    // Verifica autenticazione
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Autenticazione richiesta',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    const token = authHeader.slice(7);
    const user = await getUserFromToken(token);
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Utente non autenticato',
        code: 'UNAUTHORIZED'
      }, { status: 401 });
    }
    
    // Genera schema con Groq (con design system iniettato)
    const rawSchema = await callGroq(userPrompt || `Genera un'app per ${safeSector}`, safeSector, lang);

    // Il settore scelto dall'utente è la fonte di verità (non quello, spesso
    // impreciso o assente, restituito da Groq) — determina layout e colori a runtime.
    rawSchema.sector = normalizeSector(safeSector);

    // FieldSchema (blueprint-schema.ts) valida solo `field.id`, ma Groq genera
    // campi con `name` (formato storico atteso dal viewer). Senza questo step,
    // ogni campo privo di `id` collasserebbe sul default 'campo' di Zod,
    // producendo id duplicati tra i campi di una stessa tabella.
    if (Array.isArray(rawSchema?.schema?.tables)) {
      for (const t of rawSchema.schema.tables) {
        if (!t || typeof t !== 'object') continue;

        // Se Groq non fornisce labelPlural, TableSchema (blueprint-schema.ts)
        // lo forza sul default letterale 'Tabelle' — la stessa entità reale
        // (es. "Pizza") finirebbe con l'etichetta plurale generica invece di
        // qualcosa come "Pizze". Deriviamo un fallback dal label reale.
        if (!t.labelPlural && t.label) {
          const label = String(t.label).trim();
          // Pluralizzazione italiana approssimata (fallback: Groq dovrebbe già
          // fornire labelPlural esplicito, vedi prompt sopra).
          if (/a$/i.test(label)) t.labelPlural = `${label.slice(0, -1)}e`;
          else if (/[oe]$/i.test(label)) t.labelPlural = `${label.slice(0, -1)}i`;
          else t.labelPlural = label;
        }

        if (!Array.isArray(t?.fields)) continue;
        t.fields.forEach((f: any, index: number) => {
          if (!f || typeof f !== 'object' || f.id) return;
          const slug = String(f.label || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
          f.id = f.name || f.key || (slug ? slug : `campo_${index + 1}`);
        });
      }
    }

    // Valida/normalizza l'output dell'AI prima di salvarlo: rifiuta schemi
    // malformati invece di scriverli così come sono in produzione.
    const blueprint = sanitizeBlueprint(rawSchema);
    if (!blueprint) {
      return NextResponse.json({
        success: false,
        error: 'Lo schema generato non è valido, riprova con un prompt più specifico',
        code: 'INVALID_SCHEMA'
      }, { status: 500 });
    }
    const schema = {
      ...blueprint,
      schema: { tables: toViewerTables(blueprint.schema.tables) },
    };

    // Get or create tenant
    const tenantId = await getOrCreateTenant(supabase, user);

    // Genera slug univoco
    const slug = generateSlug(schema.appName || 'app-creator', safeSector);
    
    // Genera password iniziale casuale (10 caratteri alfanumerici)
    const initialPassword = generateRandomPassword();
    
    // Usa l'email dell'utente loggato come email cliente iniziale
    const tenantEmail = user.email || `tenant-${user.id.slice(0, 8)}@zeusx.app`;
    
    // Calcola trial 30 giorni
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    
    // Salva nella tabella apps (stessa di /api/apps)
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        tenant_id: tenantId,
        name: schema.appName || 'App Creator',
        config: schema,
        slug: slug,
        is_active: true,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        client_active: true,
        client_email: tenantEmail,
        client_password: initialPassword,
        initial_password: initialPassword,
      })
      .select('id, name, slug, status, trial_ends_at, client_email, client_password, initial_password')
      .single();
    
    if (appError) {
      console.error('[Creator] App insert error:', appError);
      return NextResponse.json({
        success: false,
        error: 'Errore salvataggio app: ' + appError.message,
        code: 'DB_ERROR'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        projectId: app.id,
        schema: schema,
        app: app,
      }
    });
    
  } catch (err) {
    console.error('[creator/generate] error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Errore interno del server',
      code: 'INTERNAL_ERROR'
    }, { status: 500 });
  }
}