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
    const planId = session.metadata?.plan_id;

    console.log('[Webhook] Session:', session.id);
    console.log('[Webhook] tenantId:', tenantId);
    console.log('[Webhook] priceId:', priceId);
    console.log('[Webhook] planId:', planId);

    if (!tenantId) {
      console.error('[Webhook] tenant_id mancante');
      return NextResponse.json({ error: 'tenant_id mancante' }, { status: 400 });
    }

    // Verifica se il tenant esiste
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, plan, app_limit, total_apps_created')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      console.error('[Webhook] Tenant non trovato:', tenantId, tenantError);
      return NextResponse.json({ error: 'Tenant non trovato' }, { status: 404 });
    }

    // Mappa plan_id → piano e slot aggiuntivi
    const planToConfig: Record<string, { plan: string; slots: number }> = {
      'starter': { plan: 'starter', slots: 1 },
      'pro': { plan: 'pro', slots: 5 },
      'business': { plan: 'business', slots: 250 },
    };

    const planConfig = planToConfig[planId] || { plan: 'pro', slots: 5 };

    // Logica upgrade: somma slot al limite attuale
    const currentSlots = tenant.app_limit || 0;
    const totalCreated = tenant.total_apps_created || 0;
    const newSlotsTotal = currentSlots + planConfig.slots;
    
    // Determina il piano finale (quello più alto tra attuale e nuovo)
    const planRank: Record<string, number> = { 'free': 0, 'starter': 1, 'pro': 2, 'business': 3 };
    const currentRank = planRank[tenant.plan] || 0;
    const newRank = planRank[planConfig.plan] || 0;
    const finalPlan = newRank > currentRank ? planConfig.plan : tenant.plan;

    // Aggiorna piano e somma slot (NON resettare il contatore)
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ 
        plan: finalPlan,
        app_limit: newSlotsTotal
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[Webhook] Errore update:', updateError);
      return NextResponse.json({ error: 'Errore aggiornamento' }, { status: 500 });
    }

    console.log('[Webhook] Piano aggiornato a:', finalPlan, 'slot totali:', newSlotsTotal, 'slot aggiunti:', planConfig.slots, 'tenant:', tenantId);
  }

  return NextResponse.json({ received: true });
}
