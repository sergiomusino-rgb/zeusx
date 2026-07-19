import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Helper to get Stripe client
function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY non configurata');
  }
  return new Stripe(secretKey, {
    apiVersion: '2026-06-24.dahlia',
  });
}

// Helper to get Supabase clients
function getSupabaseClients() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Variabili Supabase non configurate');
  }

  const authClient = createClient(
    supabaseUrl,
    supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  const dbClient = createClient(
    supabaseUrl,
    supabaseServiceKey || supabaseAnonKey,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  return { authClient, dbClient };
}

// ZeusX fee fissa in centesimi (25€)
const ZEUSX_FEE_CENTS = 2500;

/**
 * POST /api/apps/checkout
 * Genera una sessione di Stripe Checkout per l'abbonamento mensile di una singola app
 * Usa Stripe Connect in modalità 'subscription' con split payment
 */
export async function POST(req: NextRequest) {
  let stripe: any;
  let authClient: any;
  let dbClient: any;

  try {
    stripe = getStripe();
    const clients = getSupabaseClients();
    authClient = clients.authClient;
    dbClient = clients.dbClient;
  } catch (initError) {
    console.error('[App Checkout API] Initialization error:', initError);
    return NextResponse.json(
      { error: initError instanceof Error ? initError.message : 'Errore inizializzazione' },
      { status: 500 }
    );
  }

  try {
    const body = await req.json();
    const { appId, clientEmail } = body;

    if (!appId) {
      return NextResponse.json({ error: 'appId richiesto' }, { status: 400 });
    }

    // Verifica autenticazione
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato - header Authorization mancante o invalido' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Utente non autenticato: ' + (authError?.message || 'token invalido') }, { status: 401 });
    }

    // Recupera l'app dal database
    const { data: app, error: appError } = await dbClient
      .from('apps')
      .select(`
        id,
        name,
        tenant_id,
        client_price,
        zeusx_fee,
        stripe_connect_id,
        status,
        trial_end
      `)
      .eq('id', appId)
      .single();

    if (appError || !app) {
      console.error('[App Checkout] App non trovata:', appError);
      return NextResponse.json({ error: 'App non trovata' }, { status: 404 });
    }

    // Verifica che l'utente sia il proprietario del tenant
    const { data: tenant } = await dbClient
      .from('tenants')
      .select('id, owner_id')
      .eq('id', app.tenant_id)
      .single();

    if (!tenant || tenant.owner_id !== user.id) {
      return NextResponse.json({ error: 'Non sei il proprietario di questa app' }, { status: 403 });
    }

    // Verifica che l'app sia in trial
    if (app.status !== 'trial') {
      return NextResponse.json({ error: 'Questa app non è in periodo di prova' }, { status: 400 });
    }

    // Verifica che il reseller abbia configurato Stripe Connect
    if (!app.stripe_connect_id) {
      return NextResponse.json({ 
        error: 'Stripe Connect non configurato', 
        message: 'Il reseller deve prima configurare lo Stripe Connect' 
      }, { status: 400 });
    }

    // Recupera o crea il customer Stripe per il cliente
    const email = clientEmail || user.email;
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          app_id: app.id,
          tenant_id: app.tenant_id,
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Calcola l'importo in centesimi
    // client_price è in EUR, lo convertiamo in centesimi
    const clientPriceCents = Math.round((app.client_price || 25) * 100);
    
    // L'importo che va al reseller è: client_price - zeusx_fee
    const amountToResellerCents = clientPriceCents - ZEUSX_FEE_CENTS;
    
    // Se l'importo è negativo o zero, significa che il prezzo è troppo basso
    if (amountToResellerCents <= 0) {
      return NextResponse.json({ 
        error: 'Prezzo non valido', 
        message: 'Il prezzo del cliente deve essere maggiore dell\'importo minimo di 25€' 
      }, { status: 400 });
    }

    // Crea il prezzo per la subscription
    // Usiamo un prezzo dinamico basato sul client_price
    const price = await stripe.prices.create({
      currency: 'eur',
      unit_amount: clientPriceCents,
      recurring: {
        interval: 'month',
      },
      product_data: {
        name: `Abbonamento ${app.name}`,
        metadata: {
          app_id: app.id,
          tenant_id: app.tenant_id,
        },
      },
    });

    // Crea la sessione di checkout con Stripe Connect
    // Usa subscription_data per configurare lo split payment:
    // - application_fee_amount: 25€ fissi che vanno a ZeusX (platform)
    // - transfer_data.destination: il resto va al reseller
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/a/${app.id}?session_id={CHECKOUT_SESSION_ID}&app_checkout=success`,
      cancel_url: `${req.nextUrl.origin}/a/${app.id}?app_checkout=canceled`,
      metadata: {
        app_id: app.id,
        tenant_id: app.tenant_id,
        supabase_user_id: user.id,
        client_price: app.client_price?.toString() || '25.00',
        zeusx_fee: app.zeusx_fee?.toString() || '25.00',
      },
      subscription_data: {
        application_fee_amount: ZEUSX_FEE_CENTS, // 25€ fissi a ZeusX
        transfer_data: {
          destination: app.stripe_connect_id, // Account Connect del reseller
        },
      },
    });

    // Aggiorna l'app con l'ID della subscription
    await dbClient
      .from('apps')
      .update({ 
        stripe_subscription_id: session.subscription,
        status: 'active', // Passa a active dopo il checkout
        updated_at: new Date().toISOString()
      })
      .eq('id', app.id);

    return NextResponse.json({ 
      url: session.url,
      sessionId: session.id,
      subscriptionId: session.subscription 
    });

  } catch (error) {
    console.error('[App Checkout] Errore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}