import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
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

    // Ottieni l'utente dalla sessione Supabase (via token nell'header)
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    // Trova il tenant dell'utente
    let tenantId: string | null = null;

    // Prima prova: cerca nelle membership
    const { data: memberships, error: membershipError } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    if (membershipError) {
      console.error('[Checkout] Errore query membership:', membershipError);
    }

    tenantId = memberships?.[0]?.tenant_id || null;

    // Seconda prova: cerca direttamente nei tenants come owner
    if (!tenantId) {
      console.log('[Checkout] Nessun tenant da membership, cerco per owner_id...');
      const { data: tenantAsOwner } = await supabase
        .from('tenants')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();

      if (tenantAsOwner) {
        tenantId = tenantAsOwner.id;
        // Associo l'utente alle membership
        await supabase.from('tenant_members').insert({
          tenant_id: tenantId,
          user_id: user.id,
          role: 'owner',
        }).throwOnError();
      }
    }

    // Se non ha un tenant, creane uno
    if (!tenantId) {
      console.log('[Checkout] Nessun tenant trovato, creazione in corso per user:', user.id);
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
        console.error('[Checkout] Errore creazione tenant:', tenantError);
        return NextResponse.json({ error: 'Errore creazione tenant' }, { status: 500 });
      }

      tenantId = tenant.id;

      await supabase.from('tenant_members').insert({
        tenant_id: tenantId,
        user_id: user.id,
        role: 'owner',
      });
    }

    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id, plan')
      .eq('id', tenantId)
      .single();

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
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

      await supabase
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
