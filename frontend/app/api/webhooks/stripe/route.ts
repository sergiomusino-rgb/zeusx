import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error('[Webhook] Config mancante:', { sig: !!sig, webhookSecret: !!webhookSecret });
    return NextResponse.json({ error: 'Configurazione webhook mancante' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (error: any) {
    console.error('[Webhook] Errore validazione:', error.message);
    return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
  }

  console.log('[Webhook] Evento ricevuto:', event.type);

  // Gestisci checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.client_reference_id || session.metadata?.tenant_id;

    console.log('[Webhook] Session completed:', session.id, 'tenantId:', tenantId);

    if (!tenantId) {
      console.error('[Webhook] tenant_id mancante nella sessione');
      return NextResponse.json({ error: 'tenant_id mancante' }, { status: 400 });
    }

    // Aggiorna il piano del tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('[Webhook] Tenant non trovato:', tenantId, tenantError);
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
    }

    console.log('[Webhook] Tenant trovato:', tenant.id, 'piano attuale:', tenant.plan);

    // Estrai il price_id dalla subscription per determinare il piano
    const subscriptionId = session.subscription as string;
    let newPlan = 'pro'; // Default

    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;

        // Mappa price_id → piano
        const priceToPlan: Record<string, string> = {
          'price_1TmcprRZR2YaFu2sU0m1kbFC': 'starter',
          'price_1Tmd1tRZR2YaFu2sgHgxzcTC': 'pro',
          'price_1Tmd4GRZR2YaFu2s0FZ4Btym': 'business',
        };

        if (priceId && priceToPlan[priceId]) {
          newPlan = priceToPlan[priceId];
        }
      } catch (err) {
        console.error('[Webhook] Errore lettura subscription:', err);
      }
    }

    // Aggiorna il tenant con il nuovo piano
    const { error: updateError } = await supabase
      .from('tenants')
      .update({
        plan: newPlan,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: session.customer as string,
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[Webhook] Errore aggiornamento tenant:', updateError);
      return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 });
    }

    console.log('[Webhook] Piano aggiornato a:', newPlan, 'tenant:', tenantId);
  }

  // Gestisci customer.subscription.deleted (cancellazione)
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const customerId = subscription.customer as string;

    console.log('[Webhook] Subscription deleted:', subscription.id, 'customer:', customerId);

    // Trova il tenant per stripe_customer_id
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, plan')
      .eq('stripe_customer_id', customerId)
      .single();

    if (tenant) {
      await supabase
        .from('tenants')
        .update({ plan: 'free', stripe_subscription_id: null })
        .eq('id', tenant.id);
      console.log('[Webhook] Tenant', tenant.id, 'degradato a free');
    }
  }

  return NextResponse.json({ received: true });
}
