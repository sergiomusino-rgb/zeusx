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

  if (serviceToken && authHeader === `Bearer ${serviceToken}`) {
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];
    if (!userId) return null;
    return { id: userId, email: userEmail };
  }

  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getOrCreateTenant(supabase, user) {
  const { data: membership } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  if (membership) return membership.tenant_id;

  const { data: tenant } = await supabase
    .from('tenants')
    .insert({
      owner_id: user.id,
      name: user.email ? `Tenant di ${user.email}` : 'Tenant personale',
      slug: `tenant-${user.id.slice(0, 8)}`,
      plan: 'free',
      app_limit: 1,
    })
    .select('id')
    .single();

  if (!tenant) throw new Error('Errore creazione tenant');

  await supabase.from('tenant_members').insert({ tenant_id: tenant.id, user_id: user.id, role: 'owner' });

  return tenant.id;
}

// POST /api/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { priceId, planId } = req.query;
    if (!priceId) return res.status(400).json({ error: 'priceId mancante' });

    const supabase = getSupabase();
    const tenantId = await getOrCreateTenant(supabase, user);

    const stripe = getStripe();

    // Crea o recupera customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data[0]?.id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
    }

    // Attach payment method
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    const appUrl = process.env.APP_URL || 'https://zeusx-zwu8.vercel.app';

    // Line items: setup + fee mensile (quantity=0 iniziale)
    const feePriceId = getFeePriceId(planId);
    const lineItems = [
      { price: priceId, quantity: 1 }, // Setup one-time
    ];

    if (feePriceId) {
      lineItems.push({ price: feePriceId, quantity: 0 }); // Fee mensile, quantity aggiornata dopo
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: lineItems,
      success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      client_reference_id: tenantId,
      metadata: { tenant_id: tenantId, plan_id: planId || 'starter' },
      subscription_data: {
        metadata: { tenant_id: tenantId },
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[Stripe Checkout] Errore:', err);
    res.status(500).json({ error: err.message || 'Errore Stripe' });
  }
});

// GET fee price ID in base al piano
function getFeePriceId(planId) {
  const feePrices = {
    starter: process.env.STRIPE_FEE_PRICE_STARTER || 'price_1TmdIgRZR2YaFu2sT5gkrMdx',
    pro: process.env.STRIPE_FEE_PRICE_PRO || 'price_1TmdK0RZR2YaFu2s8pXkLety',
    business: process.env.STRIPE_FEE_PRICE_BUSINESS || 'price_1TmdKuRZR2YaFu2sHeH8fShE',
  };
  return feePrices[planId] || feePrices.starter;
}

// POST /api/stripe/update-app-fee
router.post('/update-app-fee', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { tenantId, action } = req.body; // action: 'increment' o 'decrement'
    if (!tenantId || !action) return res.status(400).json({ error: 'tenantId e action obbligatori' });

    const supabase = getSupabase();
    const stripe = getStripe();

    // Verifica membership
    const { data: membership } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .single();

    if (!membership) return res.status(403).json({ error: 'Non autorizzato' });

    // Recupera subscription
    const { data: subData } = await supabase
      .from('subscriptions')
      .select('stripe_subscription_id, stripe_customer_id')
      .eq('tenant_id', tenantId)
      .single();

    if (!subData?.stripe_subscription_id) {
      return res.status(400).json({ error: 'Nessuna subscription attiva' });
    }

    // Recupera subscription da Stripe
    const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);

    // Trova il line item della fee mensile
    const feeLineItem = subscription.items.data.find(item => {
      return item.price.metadata?.type === 'app_fee' || item.price.nickname?.toLowerCase().includes('fee');
    });

    if (!feeLineItem) {
      return res.status(400).json({ error: 'Line item fee non trovato' });
    }

    // Calcola nuova quantity
    let newQuantity = feeLineItem.quantity;
    if (action === 'increment') {
      newQuantity += 1;
    } else if (action === 'decrement') {
      newQuantity = Math.max(0, newQuantity - 1);
    }

    // Aggiorna subscription
    await stripe.subscriptions.update(subscription.id, {
      items: [{
        id: feeLineItem.id,
        quantity: newQuantity,
      }],
      proration_behavior: 'always_invoice',
    });

    console.log(`[update-app-fee] tenant ${tenantId}: quantity ${feeLineItem.quantity} -> ${newQuantity}`);

    return res.json({ success: true, newQuantity });
  } catch (err) {
    console.error('[update-app-fee] errore:', err);
    res.status(500).json({ error: err.message || 'Errore aggiornamento fee' });
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

    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 10 });
    const priceId = lineItems.data[0]?.price?.id;
    
    let plan = 'starter';
    let appLimit = 1;

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
