'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateAppInput {
  prompt: string;
  appName?: string;
  sector?: string;
}

export interface GenerateAppResult {
  success: boolean;
  appId?: string;
  slug?: string;
  error?: string;
}

// ─── LLM Call ─────────────────────────────────────────────────────────────────

async function callLLM(systemPrompt: string): Promise<string> {
  const provider = (process.env.LLM_PROVIDER || 'groq').toLowerCase();
  const apiKey = process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('API key LLM non configurata');
  }

  if (provider === 'openrouter') {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zeusx.app',
        'X-Title': 'ZeusX',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Errore OpenRouter');
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Errore OpenAI');
    return data.choices?.[0]?.message?.content || '';
  }

  if (provider === 'groq') {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: systemPrompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Errore Groq');
    return data.choices?.[0]?.message?.content || '';
  }

  // No other providers supported - throw clear error
  throw new Error(`Provider '${provider}' non supportato. Usa 'groq', 'openai' o 'openrouter'.`);
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(userPrompt: string, appName?: string, sector?: string): string {
  const inferredSector = sector || 'gestione aziendale';
  const inferredAppName = appName || 'Gestionale';

  return `Sei l'architetto software di ZeusX. Devi produrre SOLO un oggetto JSON valido, senza testo aggiuntivo, senza markdown, senza spiegazioni.

Il JSON rappresenta un gestionale SaaS per il settore: "${inferredSector}".
${userPrompt ? `Richiesta dell'utente: ${userPrompt}` : ''}

Lingua dei label: italiano.

Schema obbligatorio:
{
  "appName": "${inferredAppName}",
  "sector": "${inferredSector}",
  "description": "Descrizione breve del gestionale",
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
    "sidebar": ["name_tabella_1", "name_tabella_2"],
    "dashboardCards": [
      { "type": "count|sum|latest|chart", "table": "name_tabella", "label": "Label", "field": "campo_numerico" }
    ]
  }
}

Regole:
- Genera almeno 2-4 tabelle con relazioni logiche per il settore.
- Usa solo snake_case per name, id, sector.
- I campi relation devono puntare a tabelle esistenti nello schema.
- Non includere campi id, created_at, updated_at: saranno aggiunti automaticamente.
- Colori validi esadecimale a 6 cifre.
- Output SOLO JSON, niente markdown, niente spiegazioni.`;
}

// ─── Server Action ────────────────────────────────────────────────────────────

export async function generateAppAction(input: GenerateAppInput): Promise<GenerateAppResult> {
  try {
    const cookieStore = await cookies();
    
    // Use anon key for auth operations (to read user session from cookies)
    const supabaseAuth = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (err) {
            // Ignora errori in server action read-only
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (err) {
            // Ignora errori
          }
        },
      },
    });

    // Use service role key for database writes (bypasses RLS)
    const supabaseAdmin = createServerClient(supabaseUrl, supabaseServiceKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (err) {}
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (err) {}
        },
      },
    });

    // Get current user from session using anon client
    const { data: { user } } = await supabaseAuth.auth.getUser();
    
    // Get user's tenant
    let tenantId: string;
    if (user) {
      const { data: membership, error: membershipError } = await supabaseAdmin
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .single();

      if (membershipError || !membership) {
        return { success: false, error: 'Nessun tenant associato all\'utente' };
      }
      tenantId = membership.tenant_id;
    } else {
      // Fallback: get first tenant for demo purposes when not authenticated
      const { data: firstTenant, error: tenantError } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .limit(1)
        .single();
      
      if (tenantError || !firstTenant) {
        return { success: false, error: 'Nessun tenant disponibile' };
      }
      tenantId = firstTenant.id;
    }

    // Call LLM to generate schema
    const systemPrompt = buildSystemPrompt(input.prompt, input.appName, input.sector);
    const rawResponse = await callLLM(systemPrompt);

    // Clean and parse JSON
    const cleaned = rawResponse
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let generatedSchema: Record<string, unknown>;
    try {
      generatedSchema = JSON.parse(cleaned);
    } catch {
      console.error('[generateAppAction] JSON parse error. Raw:', rawResponse);
      return { success: false, error: 'Il modello ha restituito un JSON non valido' };
    }

    // Validate required fields
    const schema = generatedSchema.schema as Record<string, unknown> | undefined;
    const tables = schema?.tables as Array<Record<string, unknown>> | undefined;
    if (!schema || !tables) {
      return { success: false, error: 'Schema non valido: manca il campo schema.tables' };
    }

    // Create app record
    const appName = (generatedSchema.appName as string) || input.appName || 'Nuovo Gestionale';
    const sector = (generatedSchema.sector as string) || input.sector || 'generale';
    const description = (generatedSchema.description as string) || '';

    console.log('[generateAppAction] Creating app:', { appName, sector, tenantId });

    // Generate slug
    const slugBase = appName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const slug = `${slugBase}-${Date.now().toString(36)}`;

    // Generate random password
    const clientPassword = Math.random().toString(36).slice(-8);

    const { data: newApp, error: appError } = await supabaseAdmin
      .from('apps')
      .insert({
        name: appName,
        slug,
        tenant_id: tenantId,
        sector,
        description,
        client_password: clientPassword,
        client_active: true,
        config: {
          schema: generatedSchema.schema,
          ui: generatedSchema.ui || {},
          branding: generatedSchema.ui || {},
          is_published: true,
        },
      })
      .select('id')
      .single();

    console.log('[generateAppAction] App created:', { newApp, appError });

    if (appError || !newApp) {
      console.error('[generateAppAction] Error creating app:', appError);
      return { success: false, error: 'Errore nella creazione dell\'app: ' + (appError?.message || 'unknown') };
    }

    // Create app_definitions entry
    const { error: definitionError } = await supabaseAdmin
      .from('app_definitions')
      .insert({
        app_id: newApp.id,
        tenant_id: tenantId,
        schema: generatedSchema.schema,
        ui_config: generatedSchema.ui || {},
        is_published: true,
      });

    if (definitionError) {
      console.error('[generateAppAction] Error creating app_definitions:', definitionError);
      // Rollback: delete the app
      await supabaseAdmin.from('apps').delete().eq('id', newApp.id);
      return { success: false, error: 'Errore nel salvataggio della definizione' };
    }

    return {
      success: true,
      appId: newApp.id,
      slug,
    };
  } catch (err) {
    console.error('[generateAppAction] Unexpected error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Errore sconosciuto',
    };
  }
}