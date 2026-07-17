import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function POST(request: NextRequest) {
  try {
    const slug = request.nextUrl.pathname.split('/')[3];
    
    const supabase = getSupabaseAdmin();
    
    // Get app info
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, name, tenant_id, stripe_product_id')
      .eq('slug', slug)
      .single();
    
    if (appError || !app) {
      return NextResponse.json({ error: 'App non trovata' }, { status: 404 });
    }

    // Get or create Stripe product
    let productId = app.stripe_product_id;
    if (!productId) {
      const product = await stripe.products.create({
        name: app.name,
        description: `Abbonamento per ${app.name}`,
      });
      productId = product.id;
      
      await supabase
        .from('apps')
        .update({ stripe_product_id: productId })
        .eq('id', app.id);
    }

    // Create price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: 2900, // €29.00
      currency: 'eur',
      recurring: { interval: 'month' },
    });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${request.nextUrl.origin}/a/${slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/a/${slug}/settings`,
      metadata: {
        app_id: app.id,
        app_slug: slug,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Errore durante la creazione del checkout' }, { status: 500 });
  }
}