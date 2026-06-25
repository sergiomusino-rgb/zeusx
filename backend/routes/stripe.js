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
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

// POST /api/create-checkout-session
router.post('/create-checkout-session', async (req, res) => {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: 'Non autorizzato' });

  try {
    const { priceId, tenantId: requestedTenantId } = req.query;
    if (!priceId) return res.status(400).json({ error: 'priceId mancante' });

    // Placeholder: per ora usa il primo tenant dell'utente
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

function getPeriodISO(sub, field) {
  const val = sub[field];
  return new Date(val * 1000).toISOString();
}

async function upsertSubscription(supabase, tenantId, data) {
  const { error } = await supabase
    .from('subscriptions')
    .upsert(
      {
        tenant_id: tenantId,
        stripe_customer_id: data.stripe_customer_id,
        stripe_subscription_id: data.stripe_subscription_id,
        status: data.status,
        current_period_start: data.current_period_start,
        current_period_end: data.current_period_end,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    );

  if (error) {
    console.error('upsertSubscription error:', error);
    throw error;
  }
}

async function getTenantIdBySubscriptionId(supabase, subscriptionId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('tenant_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (error || !data) return null;
  return data.tenant_id;
}

// POST /api/webhooks/stripe
router.post('/webhooks/stripe', async (req, res) => {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
  const payload = req.body;
  const signature = req.headers['stripe-signature'] || '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.client_reference_id || session.metadata?.tenant_id;
        const customerEmail = session.customer_email || session.customer_details?.email;

        console.log(`[Stripe Webhook] checkout.session.completed - sessionId: ${session.id}, tenantId: ${tenantId}, email: ${customerEmail}`);

        if (!tenantId) {
          console.error('[Stripe Webhook] tenant_id mancante');
          break;
        }

        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, owner_id')
          .eq('id', tenantId)
          .single();

        if (tenantError || !tenant) {
          console.error(`[Stripe Webhook] tenant ${tenantId} non trovato`, tenantError);
          break;
        }

        const { error: updateTenantError } = await supabase
          .from('tenants')
          .update({ plan: 'pro', updated_at: new Date().toISOString() })
          .eq('id', tenantId);

        if (updateTenantError) {
          console.error(`[Stripe Webhook] errore aggiornamento tenant ${tenantId}`, updateTenantError);
          throw updateTenantError;
        }

        const subscriptionId = session.subscription;
        if (!subscriptionId) {
          console.error('[Stripe Webhook] subscription id mancante');
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: session.customer,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          current_period_start: getPeriodISO(subscription, 'current_period_start'),
          current_period_end: getPeriodISO(subscription, 'current_period_end'),
        });

        console.log(`[Stripe Webhook] Subscription attivata per tenant ${tenantId}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);

        if (!tenantId) {
          console.error(`invoice.payment_succeeded: tenant non trovato per ${subscriptionId}`);
          break;
        }

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: invoice.customer,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          current_period_start: getPeriodISO(subscription, 'current_period_start'),
          current_period_end: getPeriodISO(subscription, 'current_period_end'),
        });

        console.log(`Rinnovo pagato per tenant ${tenantId}`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const subscriptionId = invoice.subscription;
        if (!subscriptionId) break;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Pagamento fallito per tenant ${tenantId}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('stripe_subscription_id', subscriptionId);

        console.log(`Subscription cancellata per tenant ${tenantId}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const subscriptionId = subscription.id;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: subscription.customer,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          current_period_start: getPeriodISO(subscription, 'current_period_start'),
          current_period_end: getPeriodISO(subscription, 'current_period_end'),
        });

        console.log(`Subscription aggiornata per tenant ${tenantId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Errore webhook Stripe:', err);
    res.status(500).json({ error: err.message || 'Errore webhook' });
  }
});

module.exports = router;
