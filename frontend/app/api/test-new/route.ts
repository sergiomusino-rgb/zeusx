import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Variabili d\'ambiente Supabase mancanti');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/test-new?totalum_app_id=pizzeria
 * Test checkout con debug
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const totalum_app_id = searchParams.get('totalum_app_id');
  
  if (!totalum_app_id) {
    return NextResponse.json({ error: 'totalum_app_id è obbligatorio' }, { status: 400 });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Variabili d\'ambiente mancanti' }, { status: 500 });
  }

  const supabase = getSupabase();
  
  // Recupera i dati dell'app
  const { data: app, error: appError } = await supabase
    .from('apps')
    .select('id, name, slug, totalum_app_id, client_active, client_subscription_price, stripe_connect_id, tenant_id')
    .eq('totalum_app_id', totalum_app_id)
    .single();

  if (appError || !app) {
    return NextResponse.json({ error: 'App non trovata', details: appError?.message }, { status: 404 });
  }

  if (!app.client_subscription_price || app.client_subscription_price <= 0) {
    return NextResponse.json({ error: 'Il prezzo dell\'abbonamento non è configurato' }, { status: 400 });
  }

  // Converti il prezzo in centesimi
  const unitAmount = Math.round(app.client_subscription_price * 100);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';

  // Flusso standard: Stripe Connect
  if (!app.stripe_connect_id) {
    return NextResponse.json({ error: 'L\'app non ha un account Stripe Connect configurato' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'Abbonamento App ZeusX',
          description: `Abbonamento per l'app ${totalum_app_id}`,
          metadata: { totalum_app_id, tenant_id: app.tenant_id },
        },
        unit_amount: unitAmount,
        recurring: { interval: 'month' },
      },
      quantity: 1,
    }],
    subscription_data: {
      application_fee_percent: 25,
      transfer_data: { destination: app.stripe_connect_id },
    },
    success_url: `${appUrl}/a/${totalum_app_id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/a/${totalum_app_id}?canceled=1`,
    client_reference_id: totalum_app_id,
    metadata: { totalum_app_id, tenant_id: app.tenant_id },
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}