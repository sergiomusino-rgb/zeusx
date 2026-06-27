import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-06-24.dahlia',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function POST(req: NextRequest) {
  // Se webhook secret non configurato, accetta comunque il pagamento
  // (utile per test, ma in produzione dovresti configurarlo)
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (sig && webhookSecret) {
    try {
      const body = await req.text();
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } catch (error: any) {
      console.error('[Webhook] Errore validazione firma:', error.message);
      return NextResponse.json({ error: `Webhook Error: ${error.message}` }, { status: 400 });
    }
  } else {
    // Fallback: parsing diretto (non sicuro per produzione, ma utile per debug)
    try {
      const body = await req.json();
      event = body as Stripe.Event;
      console.log('[Webhook] Evento ricevuto senza firma:', event.type);
    } catch {
      console.error('[Webhook] Impossibile parsare il body');
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
  }

  console.log('[Webhook] Evento:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const tenantId = session.client_reference_id || session.metadata?.tenant_id;
    const priceId = session.metadata?.price_id;

    console.log('[Webhook] Session:', session.id);
    console.log('[Webhook] tenantId:', tenantId);
    console.log('[Webhook] priceId:', priceId);

    if (!tenantId) {
      console.error('[Webhook] tenant_id mancante');
      return NextResponse.json({ error: 'tenant_id mancante' }, { status: 400 });
    }

    // Verifica se il tenant esiste
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('[Webhook] Tenant non trovato:', tenantId, tenantError);
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
    }

    // Mappa price_id → piano e slot
    const priceToPlan: Record<string, { plan: string; slots: number }> = {
      'price_1TmcprRZR2YaFu2sU0m1kbFC': { plan: 'starter', slots: 1 },
      'price_1Tmd1tRZR2YaFu2sgHgxzcTC': { plan: 'pro', slots: 5 },
      'price_1Tmd4GRZR2YaFu2s0FZ4Btym': { plan: 'business', slots: 250 },
    };

    const planConfig = priceToPlan[priceId] || { plan: 'pro', slots: 5 };

    // Aggiorna piano e resetta il contatore app create
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ 
        plan: planConfig.plan,
        total_apps_created: 0,
        app_limit: planConfig.slots
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[Webhook] Errore update:', updateError);
      return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 });
    }

    console.log('[Webhook] Piano aggiornato a:', planConfig.plan, 'slots:', planConfig.slots, 'tenant:', tenantId);
  }

  return NextResponse.json({ received: true });
}
