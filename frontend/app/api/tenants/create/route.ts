import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    const { name, slug } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e slug sono obbligatori' }, { status: 400 });
    }

    // Verifica che l'utente non abbia già un tenant
    const { data: existingTenant } = await supabase
      .from('tenants')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (existingTenant) {
      return NextResponse.json({ tenant: existingTenant }, { status: 200 });
    }

    // Crea il tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        owner_id: user.id,
        name,
        slug,
        plan: 'free',
      })
      .select()
      .single();

    if (tenantError) {
      console.error('[API tenants/create] Errore creazione tenant:', tenantError);
      return NextResponse.json({ error: 'Impossibile creare il tenant' }, { status: 500 });
    }

    // Crea la membership
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) {
      console.error('[API tenants/create] Errore creazione membership:', memberError);
    }

    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    console.error('[API tenants/create] Errore:', error);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
