const express = require('express');
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const STRIPE_API_VERSION = '2026-06-24.dahlia';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: STRIPE_API_VERSION,
  });
}

async function getUser(req) {
  const authHeader = req.headers.authorization;
  const serviceToken = process.env.BACKEND_SERVICE_TOKEN;

  console.log('[getUser] authHeader:', authHeader);
  console.log('[getUser] serviceToken presente:', !!serviceToken);
  console.log('[getUser] match:', serviceToken ? authHeader === `Bearer ${serviceToken}` : false);

  if (serviceToken && authHeader === `Bearer ${serviceToken}`) {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    console.log('[getUser] service auth - userId:', userId, 'email:', userEmail);
    if (!userId) return null;
    return { id: userId, email: userEmail };
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.log('[getUser] getUser error:', error?.message || 'no user');
    return null;
  }
  return user;
}

async function getOrCreateTenant(supabase, user) {
  // Cerca membership esistente
  const { data: membership, error: membershipError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (membership) return membership.tenant_id;

  console.log('[getOrCreateTenant] Nessun tenant trovato, creazione per user:', user.id);

  // Crea tenant
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
    console.error('[getOrCreateTenant] Errore creazione tenant:', tenantError);
    throw new Error('Errore creazione tenant');
  }

  // Crea membership owner
  const { error: memberError } = await supabase
    .from('tenant_members')
    .insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });

  if (memberError) {
    console.error('[getOrCreateTenant] Errore membership:', memberError);
    throw new Error('Errore membership');
  }

  // Crea profilo se mancante
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({ id: user.id, user_id: user.id, email: user.email || '' }, { onConflict: 'user_id' });

  if (profileError) {
    console.error('[getOrCreateTenant] Errore profilo:', profileError);
  }

  return tenant.id;
}

// POST /api/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { priceId } = req.query;
    if (!priceId) return res.status(400).json({ error: 'priceId mancante' });

    const supabase = getSupabase();
    const tenantId = await getOrCreateTenant(supabase, user);

    const stripe = getStripe();
    const lineItems = [{ price: priceId, quantity: 1 }];

    const appUrl = process.env.APP_URL || 'https://zeusx-zwu8.vercel.app';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      customer_email: user.email || undefined,
      client_reference_id: tenantId,
      metadata: { tenant_id: tenantId },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe Checkout] Errore:', err);
    res.status(500).json({ error: err.message || 'Errore Stripe' });
  }
});

// POST /api/billing
router.post('/billing', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const supabase = getSupabase();
    const tenantId = await getOrCreateTenant(supabase, user);

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('tenant_id', tenantId)
      .single();

    if (error || !subscription?.stripe_customer_id) {
      return res.status(400).json({ error: 'Nessun abbonamento attivo trovato' });
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.APP_URL || 'https://zeusx-zwu8.vercel.app'}/dashboard`,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Errore billing portal:', err);
    res.status(500).json({ error: err.message || 'Errore billing' });
  }
});

// POST /api/sync-plan
router.post('/sync-plan', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'sessionId mancante' });

    const supabase = getSupabase();
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const tenantId = session.client_reference_id || session.metadata?.tenant_id;

    if (!tenantId) return res.status(400).json({ error: 'tenant_id mancante nella sessione' });

    // Verifica che l'utente sia membro del tenant
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!membership) return res.status(403).json({ error: 'Tenant non autorizzato' });

    if (session.payment_status !== 'paid') {
      return res.json({ paid: false, plan: 'free', appLimit: 1 });
    }

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id;
    
    // Mappa piano in base al priceId o nome prodotto
    let plan = 'starter';
    let appLimit = 1;

    // Definizione piani con slot
    const planConfig = {
      starter: { appLimit: 1 },
      pro: { appLimit: 5 },
      business: { appLimit: 250 }
    };

    if (priceId) {
      const price = await stripe.prices.retrieve(priceId);
      const productId = typeof price.product === 'string' ? price.product : price.product?.id;
      
      if (productId) {
        const product = await stripe.products.retrieve(productId);
        const name = (product.name || '').toLowerCase();
        
        // Determina piano dal nome prodotto
        if (name.includes('business')) {
          plan = 'business';
          appLimit = planConfig.business.appLimit;
        } else if (name.includes('pro')) {
          plan = 'pro';
          appLimit = planConfig.pro.appLimit;
        } else if (name.includes('starter')) {
          plan = 'starter';
          appLimit = planConfig.starter.appLimit;
        }
      }
    }

    // Aggiorna tenant con nuovo piano e limiti
    const { error: updateError } = await supabase
      .from('tenants')
      .update({ 
        plan, 
        app_limit: appLimit,
        updated_at: new Date().toISOString() 
      })
      .eq('id', tenantId);

    if (updateError) {
      console.error('[sync-plan] errore update:', updateError);
      return res.status(500).json({ error: 'Errore aggiornamento piano' });
    }

    return res.json({ paid: true, plan, appLimit });
  } catch (err) {
    console.error('[sync-plan] errore:', err);
    res.status(500).json({ error: err.message || 'Errore sync piano' });
  }
});

module.exports = router;
