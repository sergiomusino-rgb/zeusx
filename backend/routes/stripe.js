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

  console.log('[getUser] Authorization header:', authHeader);
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

// POST /api/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { priceId, tenantId: requestedTenantId } = req.query;
    if (!priceId) return res.status(400).json({ error: 'priceId mancante' });

    const supabase = getSupabase();
    const { data: membership, error: membershipError } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return res.status(400).json({ error: 'Nessun tenant trovato per l\'utente' });
    }

    const tenantId = requestedTenantId || membership.tenant_id;

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
    const { tenantId: requestedTenantId } = req.body || {};
    const supabase = getSupabase();

    const { data: membership, error: membershipError } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (membershipError || !membership) {
      return res.status(400).json({ error: 'Nessun tenant trovato' });
    }

    const tenantId = requestedTenantId || membership.tenant_id;

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

module.exports = router;
