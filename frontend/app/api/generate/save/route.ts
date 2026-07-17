// ─── Save Generated App to Supabase ───────────────────────────────────────────────
// Salva lo schema generato da Totalium nella tabella apps

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Genera slug univoco
function generateSlug(name: string): string {
  const slugBase = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).slice(-6);
  return `${slugBase}-${randomSuffix}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { schema, appName, sector, userId } = body;

    if (!schema || !appName) {
      return NextResponse.json({
        success: false,
        error: 'Schema e appName sono richiesti'
      }, { status: 400 });
    }

    // Verifica che l'utente sia autenticato
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Utente non autenticato'
      }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Ottieni il tenant dell'utente
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', userId)
      .single();

    if (!membership || !membership.tenant_id) {
      return NextResponse.json({
        success: false,
        error: 'Nessun tenant associato all\'utente'
      }, { status: 400 });
    }

    const tenantId = membership.tenant_id;

    // Genera slug
    const slug = generateSlug(appName);

    // Calcola le date del trial (30 giorni)
    const trialStartAt = new Date().toISOString();
    const trialEndAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Salva l'app nella tabella apps
    const { data: newApp, error: appError } = await supabase
      .from('apps')
      .insert({
        name: appName,
        slug,
        tenant_id: tenantId,
        config: {
          schema,
          ui: schema.ui || {},
          is_published: true,
          appName,
          sector: sector || 'generale',
          description: schema.description || ''
        },
        client_active: true,
        status: 'trial',
        trial_start_at: trialStartAt,
        trial_ends_at: trialEndAt
      })
      .select('id, slug')
      .single();

    if (appError || !newApp) {
      console.error('[save-generated-app] Error creating app:', appError);
      return NextResponse.json({
        success: false,
        error: 'Errore nel salvataggio dell\'app: ' + (appError?.message || 'unknown')
      }, { status: 500 });
    }

    // Crea anche la definizione nella tabella app_definitions
    const { error: definitionError } = await supabase
      .from('app_definitions')
      .upsert({
        app_id: newApp.id,
        tenant_id: tenantId,
        schema,
        ui_config: schema.ui || {},
        is_published: true,
      }, { onConflict: 'app_id' });

    if (definitionError) {
      console.error('[save-generated-app] Error creating app_definition:', definitionError);
    }

    return NextResponse.json({
      success: true,
      appId: newApp.id,
      slug: newApp.slug
    });

  } catch (err) {
    console.error('[save-generated-app] Unexpected error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Errore interno del server'
    }, { status: 500 });
  }
}