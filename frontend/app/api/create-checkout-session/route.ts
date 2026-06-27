import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Client per autenticazione (anon key)
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Client per operazioni DB (service role key se disponibile)
const dbClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    console.log('[Checkout] === INIZIO ===');

    const body = await req.json();
    const { priceId, planId } = body;
    console.log('[Checkout] priceId:', priceId, 'planId:', planId);

    if (!priceId || !planId) {
      console.error('[Checkout] Parametri mancanti');
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[Checkout] Stripe non configurato');
      return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 });
    }

    // Autenticazione con anon key
    const authHeader = req.headers.get('authorization');
    console.log('[Checkout] authHeader:', authHeader ? 'presente' : 'assente');

    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      console.error('[Checkout] Auth error:', authError);
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    console.log('[Checkout] User autenticato:', user.id, user.email);

    // Cerca tenant con service role key
    console.log('[Checkout] Cerco tenant per user_id:', user.id);
    const { data: memberships, error: membershipError } = await dbClient
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    console.log('[Checkout] memberships:', memberships, 'error:', membershipError);

    let tenantId = memberships?.[0]?.tenant_id || null;

    if (!tenantId) {
      console.log('[Checkout] Cerco per owner_id...');
      const { data: tenantAsOwner, error: ownerError } = await dbClient
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();

      console.log('[Checkout] tenantAsOwner:', tenantAsOwner, 'error:', ownerError);

      if (tenantAsOwner) {
        tenantId = tenantAsOwner.id;
        const { error: insertError } = await dbClient.from('tenant_members').insert({
          tenant_id: tenantId,
          user_id: user.id,
          role: 'owner',
        });
        console.log('[Checkout] Insert membership error:', insertError);
      }
    }

    if (!tenantId) {
      console.log('[Checkout] Creo nuovo tenant...');
      const { data: newTenant, error: createError } = await dbClient
        .from('tenants')
        .insert({
          owner_id: user.id,
          name: user.email ? `Tenant di ${user.email}` : 'Tenant personale',
          slug: `tenant-${user.id.slice(0, 8)}`,
          plan: 'free',
        })
        .select('id')
        .single();

      console.log('[Checkout] newTenant:', newTenant, 'error:', createError);

      if (createError || !newTenant) {
        return NextResponse.json({ error: 'Errore creazione tenant' }, { status: 500 });
      }

      tenantId = newTenant.id;

      await dbClient.from('tenant_members').insert({
        tenant_id: tenantId,
        user_id: user.id,
        role: 'owner',
      });
    }

    console.log('[Checkout] tenantId finale:', tenantId);

    // Recupera tenant completo
    const { data: tenant, error: tenantError } = await dbClient
      .from('tenants')
      .select('id, stripe_customer_id, plan')
      .eq('id', tenantId)
      .single();

    console.log('[Checkout] tenant:', tenant, 'error:', tenantError);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
    }

    // Stripe customer
    let customerId = tenant.stripe_customer_id;

    if (!customerId) {
      console.log('[Checkout] Creo Stripe customer...');
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

    // Sessione checkout
    console.log('[Checkout] Creo sessione Stripe...');
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

    console.log('[Checkout] === SUCCESSO ===');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[Checkout] ERRORE CATCH:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
