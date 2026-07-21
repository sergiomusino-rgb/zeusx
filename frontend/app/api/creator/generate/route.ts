// ─── Creator AI Generate API Route (Next.js App Router) ───────────────────────────────
// Genera schema JSON tramite Groq API (Llama 3.3) e salva nella tabella apps
// CON INIEZIONE DEL DESIGN SYSTEM

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getDesignSystemForSector } from '@/lib/designSystemLoader';

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
    "primaryColor": "${designSystem.designTokens?.colors?.primary || '#6366f1'}",
    "template": "${getTemplateForSector(sector)}"
  },
  "schema": {
    "tables": [
      {
        "name": "nome_tabella",
        "label": "Etichetta",
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
          primaryColor: designSystem.designTokens?.colors?.primary || '#6366f1',
          template: getTemplateForSector(sector)
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

// ─── Helper: Get template for sector ───────────────────────────────────────────────
function getTemplateForSector(sector: string): string {
  const sectorLower = (sector || 'wandermap').toLowerCase();
  if (['food', 'ristorante', 'ristorazione', 'bar', 'caffetteria', 'pizzeria', 'trattoria', 'osteria', 'menu', 'recipe', 'recipes', 'cooking', 'foodblog'].includes(sectorLower)) {
    return 'warm-editorial';
  }
  if (['retail', 'ecommerce', 'e-commerce', 'negozio', 'shop', 'store', 'marketplace', 'artigianato', 'handmade', 'prodotti'].includes(sectorLower)) {
    return 'clean-tech';
  }
  if (['crypto', 'finance', 'banking', 'investimento', 'trading', 'wallet'].includes(sectorLower)) {
    return 'clean-tech';
  }
  if (['realestate', 'property', 'immobiliare', 'casa', 'affitto', 'affittare', 'interior', 'design'].includes(sectorLower)) {
    return 'warm-editorial';
  }
  if (['volunteer', 'volontariato', 'nonprofit', 'charity', 'fondazione', 'ngo', 'cause'].includes(sectorLower)) {
    return 'warm-editorial';
  }
  return 'clean-tech';
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
    const schema = await callGroq(userPrompt || `Genera un'app per ${safeSector}`, safeSector, lang);
    
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