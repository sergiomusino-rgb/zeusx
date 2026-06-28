import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sanitizeBlueprint, normalizeSector } from '@/src/lib/blueprint-schema';

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
  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1);

  if (membershipError) {
    console.error('[getOrCreateTenant] membership error:', membershipError);
  }

  if (memberships?.[0]?.tenant_id) return memberships[0].tenant_id;

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

const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

async function canCreateApp(supabase: ReturnType<typeof createClient>, tenantId: string, userId?: string): Promise<{ allowed: boolean; reason?: string; slotsAvailable?: number; tenant?: any }> {
  // Admin: app illimitate
  if (userId === ADMIN_USER_ID) {
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan, app_limit, total_apps_created')
      .eq('id', tenantId)
      .single();
    if (tenantError || !tenant) {
      // Crea tenant se non esiste
      const { data: newTenant } = await supabase
        .from('tenants')
        .insert({
          owner_id: userId,
          name: 'Admin Tenant',
          slug: `admin-${userId.slice(0, 8)}`,
          plan: 'free',
          total_apps_created: 0,
        })
        .select('plan, app_limit, total_apps_created')
        .single();
      console.log('[canCreateApp] admin tenant created:', newTenant);
      return { allowed: true, slotsAvailable: Infinity, tenant: newTenant };
    }
    return { allowed: true, slotsAvailable: Infinity, tenant };
  }

  console.log('[canCreateApp] tenantId:', tenantId);

  // Conta app totali create (incluso quelle cancellate, lo slot non si libera mai)
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan, app_limit, total_apps_created')
    .eq('id', tenantId)
    .single();

  console.log('[canCreateApp] tenant:', tenant, 'error:', tenantError);

  if (tenantError || !tenant) {
    return { allowed: false, reason: 'Tenant non trovato' };
  }

  const planLimits: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 5,
    business: 250,
  };

  const appLimit = tenant.app_limit ?? planLimits[tenant.plan] ?? 1;
  const totalCreated = tenant.total_apps_created || 0;
  const slotsAvailable = appLimit - totalCreated;

  if (slotsAvailable <= 0) {
    return { allowed: false, reason: 'SlotsExhausted', slotsAvailable: 0, tenant };
  }

  return { allowed: true, slotsAvailable, tenant };
}

function generateSlug(name: string, sector: string): string {
  const base = `${sector}-${name}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const body = await req.json();
    const { sector, prompt, logo, name: userAppName } = body;

    if (!sector || typeof sector !== 'string') {
      return NextResponse.json({ error: 'Settore richiesto' }, { status: 400 });
    }

    const supabase = getServiceSupabase();
    const tenantId = await getOrCreateTenant(supabase, user);

    // Controlla limite 5 app
    const { allowed, reason, tenant } = await canCreateApp(supabase, tenantId, user.id);
    console.log('[API /apps] canCreateApp:', allowed, reason);

    if (!allowed) {
      if (reason === 'SlotsExhausted') {
        return NextResponse.json(
          { error: 'SlotsExhausted', message: 'Hai esaurito gli slot app. Acquista un nuovo piano per crearne altre.', redirectTo: '/pricing' },
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
    console.log('[API /apps] Raw blueprint from backend:', JSON.stringify(rawBlueprint).slice(0, 500));
    
    const blueprintPayload = rawBlueprint.blueprint || rawBlueprint;
    blueprintPayload.sector = normalizeSector(sector);
    if (logo) blueprintPayload.logo = logo;
    
    const blueprint = sanitizeBlueprint(blueprintPayload);
    console.log('[API /apps] Sanitized blueprint:', blueprint ? `${blueprint.schema?.tables?.length || 0} tabelle` : 'NULL');

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

    // Calcola trial 30 giorni e scadenza cliente
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Genera slug e password cliente (usa nome utente se fornito, altrimenti blueprint)
    const finalName = userAppName || blueprint.appName;
    const slug = generateSlug(finalName, sector);
    const clientPassword = generatePassword();

    // Salva app
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert({
        tenant_id: tenantId,
        blueprint_id: blueprintId,
        name: finalName,
        config: blueprint,
        trial_ends_at: trialEndsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        slug,
        client_password: clientPassword,
        client_email: user.email, // Email di default dell'utente ZeusX
        client_active: true,
        expiry_warning_sent: false,
        is_active: true,
      })
      .select('id, name, trial_ends_at, expires_at, slug, client_password, client_email')
      .single();

    if (appError || !app) {
      console.error('[API /apps] app insert error:', appError);
      return NextResponse.json({ error: 'Errore salvataggio app' }, { status: 500 });
    }

    // Incrementa il contatore permanente di app create (non si libera mai)
    if (user.id !== ADMIN_USER_ID) {
      await supabase
        .from('tenants')
        .update({ total_apps_created: (tenant?.total_apps_created || 0) + 1 })
        .eq('id', tenantId);
    }

    // Incrementa fee mensile per la nuova app
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';
      const token = process.env.BACKEND_SERVICE_TOKEN;
      
      await fetch(`${backendUrl}/api/update-app-fee`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-ID': user.id,
          'X-User-Email': user.email || '',
        },
        body: JSON.stringify({ tenantId, action: 'increment' }),
      });
    } catch (err) {
      console.error('[API /apps] errore aggiornamento fee:', err);
      // Non bloccare la creazione app se fallisce l'aggiornamento fee
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
