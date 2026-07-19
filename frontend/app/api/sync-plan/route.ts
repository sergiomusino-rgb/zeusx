import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getStripe() {
  return new Stripe(stripeSecretKey, {
    apiVersion: '2026-06-24.dahlia' as any,
  });
}

// Mappa piani -> slot
const PLAN_SLOTS: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 5,
  business: 100,
};

/**
 * POST /api/sync-plan
 * Sincronizza il piano del tenant dopo checkout Stripe
 * Body: { session_id: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id } = body;
    
    if (!session_id) {
      return NextResponse.json({ error: 'session_id richiesto' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const stripe = getStripe();

    // Recupera la sessione Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        paid: false, 
        plan: 'free', 
        app_limit: 1 
      });
    }

    const tenantId = session.client_reference_id || session.metadata?.tenant_id;
    if (!tenantId) {
      return NextResponse.json({ error: 'tenant_id non trovato nella sessione' }, { status: 400 });
    }

    // Recupera i dettagli del prodotto per determinare il piano
    const lineItems = await stripe.checkout.sessions.listLineItems(session_id, { limit: 10 });
    const priceId = lineItems.data[0]?.price?.id;
    
    let plan = 'starter';
    let appLimit = 1;

    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      const productId = typeof price.product === 'string' ? price.product : price.product?.id;
      
      if (productId) {
        const product = await stripe.products.retrieve(productId);
        const name = (product.name || '').toLowerCase();
        
        if (name.includes('business')) {
          plan = 'business';
          appLimit = PLAN_SLOTS.business;
        } else if (name.includes('pro')) {
          plan = 'pro';
          appLimit = PLAN_SLOTS.pro;
        } else if (name.includes('starter')) {
          plan = 'starter';
          appLimit = PLAN_SLOTS.starter;
        }
      }
    }

    // Aggiorna il tenant
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ 
        plan, 
        app_limit: appLimit,
        updated_at: new Date().toISOString() 
      })
      .eq('id', tenantId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      paid: true,
      plan,
      app_limit: appLimit,
    });
    
  } catch (error) {
    console.error('[Sync Plan] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}
