import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { BlueprintJSONSchema, sanitizeBlueprint, normalizeSector } from '@/src/lib/blueprint-schema';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

function getServiceSupabase() {
  return createClient(supabaseUrl, serviceRoleKey);
}

async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const supabase = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getOrCreateTenant(supabase: ReturnType<typeof createClient>, user: { id: string; email?: string }) {
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (membership?.tenant_id) return membership.tenant_id;

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .insert({
      owner_id: user.id,
      name: user.email ? `Tenant di ${user.email}` : 'Tenant personale',
      slug: `tenant-${user.id.slice(0, 8)}`,
      plan: 'free',
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

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { sector, prompt } = body;

    if (!sector || typeof sector !== 'string') {
      return NextResponse.json({ error: 'Settore richiesto' }, { status: 400 });
    }

async function canCreateApp(supabase: ReturnType<typeof createClient>, tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
  const { count, error: countError } = await supabase
    .from('apps')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  if (countError) {
    console.error('[canCreateApp] count error:', countError);
    return { allowed: false, reason: 'Errore conteggio app' };
  }

  const appCount = count || 0;

  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single();

  if (tenantError || !tenant) {
    return { allowed: false, reason: 'Tenant non trovato' };
  }

  const paidPlans = ['pro', 'vip', 'premium', 'basic'];
  const isPaid = paidPlans.includes(tenant.plan?.toLowerCase() || '');

  if (appCount >= 5 && !isPaid) {
    return { allowed: false, reason: 'UpgradeToProRequired' };
  }

  return { allowed: true };
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { sector, prompt } = body;

    if (!sector || typeof sector !== 'string') {
      return NextResponse.json({ error: 'Settore richiesto' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const tenantId = await getOrCreateTenant(supabase, user);

    // Controlla limite 5 app
    const { allowed, reason } = await canCreateApp(supabase, tenantId);

    if (!allowed) {
      if (reason === 'UpgradeToProRequired') {
        return NextResponse.json(
          { error: 'UpgradeToProRequired', message: 'Hai raggiunto il limite di 5 app. Passa a Pro per crearne altre.' },
          { status: 403 }
        );
      }
      return NextResponse.json({ error: reason || 'Errore controllo limite app' }, { status: 500 });
    }

    // Genera blueprint dal backend
    const blueprintRes = await fetch(`${backendUrl}/api/generate-app`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sector, prompt, lang: 'it', provider: 'groq' }),
    });

    if (!blueprintRes.ok) {
      const err = await blueprintRes.json().catch(() => ({}));
      return NextResponse.json({ error: err.error || 'Errore generazione blueprint' }, { status: 502 });
    }

    const rawBlueprint = await blueprintRes.json();
    rawBlueprint.sector = normalizeSector(sector);
    const blueprint = sanitizeBlueprint(rawBlueprint);

    // Salva o recupera blueprint
    const normalizedSector = blueprint.sector;
    const { data: existingBlueprint } = await supabase
      .from('blueprints')
      .select('id')
      .eq('sector', normalizedSector)
      .single();

    let blueprintId = existingBlueprint?.id;
    if (!blueprintId) {
      const { data: newBlueprint, error: blueprintError } = await supabase
        .from('blueprints')
        .insert({
          sector: normalizedSector,
          display_name: blueprint.appName,
          description: blueprint.description || '',
          schema: blueprint.schema,
          ui_config: blueprint.ui,
        })
        .select('id')
        .single();

      if (blueprintError || !newBlueprint) {
        console.error('[API /apps] blueprint insert error:', blueprintError);
        return NextResponse.json({ error: 'Errore salvataggio blueprint' }, { status: 500 });
      }
      blueprintId = newBlueprint.id;
    }

    // Calcola trial 30 giorni
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    // Salva app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        tenant_id: tenantId,
        blueprint_id: blueprintId,
        name: blueprint.appName,
        config: blueprint,
        trial_ends_at: trialEndsAt.toISOString(),
        is_active: true,
      })
      .select('id, name, trial_ends_at')
      .single();

    if (appError || !app) {
      console.error('[API /apps] app insert error:', appError);
      return NextResponse.json({ error: 'Errore salvataggio app' }, { status: 500 });
    }

    return NextResponse.json({ app, blueprint });
  } catch (err) {
    console.error('[API /apps] error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
