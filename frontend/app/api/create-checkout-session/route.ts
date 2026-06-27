import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

// Client per auth (anon key)
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Client per DB operations (service role key bypassa RLS)
const dbClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { priceId, planId } = await req.json();

    if (!priceId || !planId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    // Trova il tenant dell'utente - prima per owner_id
    const { data: tenantByOwner } = await dbClient
      .from('tenants')
      .select('id, stripe_customer_id, plan, owner_id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();

    let tenant = tenantByOwner;

    // Fallback: cerca nelle membership
    if (!tenant) {
      const { data: membership } = await dbClient
        .from('tenant_members')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.tenant_id) {
        const { data: tenantFromMembership } = await dbClient
          .from('tenants')
          .select('id, stripe_customer_id, plan, owner_id')
          .eq('id', membership.tenant_id)
          .single();
        tenant = tenantFromMembership;
      }
    }

    // Se ancora non trovato, crea un nuovo tenant
    if (!tenant) {
      const { data: newTenant, error: createErr } = await dbClient
        .from('tenants')
        .insert({
          owner_id: user.id,
          name: user.email || 'Tenant personale',
          slug: `tenant-${user.id.slice(0, 8)}`,
          plan: 'free',
        })
        .select('id, stripe_customer_id, plan, owner_id')
        .single();

      if (createErr || !newTenant) {
        console.error('[Checkout] Errore creazione tenant:', JSON.stringify(createErr));
        return NextResponse.json({ error: 'Impossibile creare il tenant: ' + JSON.stringify(createErr) }, { status: 500 });
      }

      tenant = newTenant;

      // Aggiungi membership
      await dbClient.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: user.id,
        role: 'owner',
      });
    }

    // Crea o recupera il cliente Stripe
    let customerId = tenant.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
          tenant_id: tenant.id,
        },
      });
      customerId = customer.id;

      await dbClient
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenant.id);
    }

    // Crea la sessione di checkout
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/dashboard?upgrade=success`,
      cancel_url: `${req.nextUrl.origin}/pricing?upgrade=cancelled`,
      metadata: {
        tenant_id: tenant.id,
        plan_id: planId,
        supabase_user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Checkout] Errore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
