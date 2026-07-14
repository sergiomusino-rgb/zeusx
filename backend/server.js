require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { createClient } = require('@supabase/supabase-js');
const Stripe = require('stripe');
const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 5005;

// Configurazione CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s => s.trim());
const isDevelopment = process.env.NODE_ENV !== 'production';

app.use(cors({
  origin: (origin, callback) => {
    // In development, permetti tutti gli origin
    if (isDevelopment) {
      return callback(null, true);
    }
    
    // In production, controlla la whitelist
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`[CORS] Origin bloccato: ${origin}`);
      callback(new Error(`Origin ${origin} non autorizzato`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(helmet());

// Stripe webhook raw body handler DEVE essere prima di express.json()
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || '';
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2026-06-24.dahlia' }) : null;

function getStripe() {
  if (!stripe) throw new Error('Stripe non configurato');
  return stripe;
}

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
}

function getPeriodISO(sub, field) {
  const val = sub[field];
  return new Date(val * 1000).toISOString();
}

function getFeePriceId(planId) {
  // Recurring monthly fee price IDs
  const feePrices = {
    starter: 'price_1TmdIgRZR2YaFu2sT5gkrMdx',
    pro: 'price_1TmdK0RZR2YaFu2s8pXkLety',
    business: 'price_1TmdKuRZR2YaFu2sHeH8fShE',
  };
  return feePrices[planId] || feePrices.starter;
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

async function resolvePlanFromSession(stripe, session) {
  try {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id;
    if (!priceId) return 'pro';
    const price = await stripe.prices.retrieve(priceId);
    const productId = typeof price.product === 'string' ? price.product : price.product?.id;
    if (!productId) return 'pro';
    const product = await stripe.products.retrieve(productId);
    const name = (product.name || '').toLowerCase();
    if (name.includes('vip')) return 'vip';
    if (name.includes('pro')) return 'pro';
    if (name.includes('basic') || name.includes('base')) return 'basic';
    return 'pro';
  } catch (err) {
    console.error('[resolvePlanFromSession] errore:', err);
    return 'pro';
  }
}

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!stripe) {
    console.error('[Stripe Webhook] STRIPE_SECRET_KEY non configurata');
    return res.status(503).json({ error: 'Stripe non configurato' });
  }

  const payload = req.body;
  const signature = req.headers['stripe-signature'] || '';

  let event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, stripeWebhookSecret);
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

        const planId = session.metadata?.plan_id || 'starter';
        const quantity = parseInt(session.metadata?.quantity || '1', 10);
        
        // Get current tenant to check for app_limit update
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, name, owner_id, app_limit')
          .eq('id', tenantId)
          .single();

        if (tenantError || !tenant) {
          console.error(`[Stripe Webhook] tenant ${tenantId} non trovato`, tenantError);
          break;
        }

        // Handle extra slot purchase - increment app_limit
        if (planId === 'extra_slot') {
          const newAppLimit = (tenant.app_limit || 0) + quantity;
          const { error: updateTenantError } = await supabase
            .from('tenants')
            .update({ 
              app_limit: newAppLimit,
              updated_at: new Date().toISOString() 
            })
            .eq('id', tenantId);
          
          if (updateTenantError) {
            console.error(`[Stripe Webhook] errore aggiornamento app_limit per tenant ${tenantId}`, updateTenantError);
            throw updateTenantError;
          }
          console.log(`[Stripe Webhook] app_limit aggiornato: ${tenant.app_limit} -> ${newAppLimit}`);
        } else {
          // Regular plan upgrade
          const plan = await resolvePlanFromSession(stripe, session);
          console.log(`[Stripe Webhook] piano risolto: ${plan}`);
          
          const { error: updateTenantError } = await supabase
            .from('tenants')
            .update({ plan, updated_at: new Date().toISOString() })
            .eq('id', tenantId);

          if (updateTenantError) {
            console.error(`[Stripe Webhook] errore aggiornamento tenant ${tenantId}`, updateTenantError);
            throw updateTenantError;
          }
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

        // Crea automaticamente la fee subscription per le app (skip for extra_slot)
        const feePriceId = getFeePriceId(planId);
        
        if (planId !== 'extra_slot' && feePriceId) {
          try {
            const feeSubscription = await stripe.subscriptions.create({
              customer: session.customer,
              items: [{ price: feePriceId, quantity: 0 }], // Inizia da 0, verrà incrementata con le app
              metadata: { tenant_id: tenantId, type: 'app_fee' },
              proration_behavior: 'always_invoice',
            });

            console.log(`[Stripe Webhook] Fee subscription creata: ${feeSubscription.id} per tenant ${tenantId}`);
          } catch (err) {
            console.error(`[Stripe Webhook] Errore creazione fee subscription:`, err);
          }
        }

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

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const tenantId = paymentIntent.metadata?.tenant_id;
        const planId = paymentIntent.metadata?.plan_id;
        const quantity = parseInt(paymentIntent.metadata?.quantity || '1', 10);
        const feePriceId = paymentIntent.metadata?.fee_price_id;

        if (!tenantId) {
          break;
        }

        console.log(`[Stripe Webhook] payment_intent.succeeded for tenant ${tenantId}, plan ${planId}`);

        // Get current tenant
        const { data: tenant, error: tenantError } = await supabase
          .from('tenants')
          .select('id, app_limit')
          .eq('id', tenantId)
          .single();

        if (tenantError || !tenant) {
          console.error(`[Stripe Webhook] tenant ${tenantId} non trovato`, tenantError);
          break;
        }

        // Handle extra slot purchase - increment app_limit
        if (planId === 'extra_slot') {
          const newAppLimit = (tenant.app_limit || 0) + quantity;
          const { error: updateError } = await supabase
            .from('tenants')
            .update({ 
              app_limit: newAppLimit,
              updated_at: new Date().toISOString() 
            })
            .eq('id', tenantId);

          if (updateError) {
            console.error(`[Stripe Webhook] errore aggiornamento app_limit per extra_slot`, updateError);
          } else {
            console.log(`[Stripe Webhook] app_limit aggiornato per extra_slot: ${tenant.app_limit} -> ${newAppLimit}`);
          }
        } else {
          // Regular plan upgrade - create subscription
          if (feePriceId) {
            try {
              const feeSubscription = await stripe.subscriptions.create({
                customer: paymentIntent.customer,
                items: [{ price: feePriceId, quantity: 0 }],
                metadata: { tenant_id: tenantId, type: 'app_fee' },
                proration_behavior: 'always_invoice',
              });

              console.log(`[Stripe Webhook] Fee subscription creata: ${feeSubscription.id} per tenant ${tenantId}`);
            } catch (err) {
              console.error(`[Stripe Webhook] Errore creazione fee subscription:`, err);
            }
          }
        }
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

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Client AI inizializzati solo se le chiavi sono presenti
const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

function clientMissing(res, provider) {
  return res.status(503).json({ error: `${provider} non configurato. Aggiungi la chiave API.` });
}

// --- HEALTH CHECK ---
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- CHAT API ---
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider = 'groq', model } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array richiesto' });
    }

    const content = messages[messages.length - 1]?.content || '';

    if (provider === 'groq') {
      if (!groq) return clientMissing(res, 'Groq');
      const chatModel = model || 'llama-3.3-70b-versatile';
      const completion = await groq.chat.completions.create({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        model: chatModel
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'gemini') {
      if (!genAI) return clientMissing(res, 'Gemini');
      const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-2.0-flash' });
      const result = await geminiModel.generateContent(content);
      return res.json({ reply: result.response.text() });
    }

    if (provider === 'openai') {
      if (!openai) return clientMissing(res, 'OpenAI');
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: messages.map(m => ({ role: m.role, content: m.content }))
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'anthropic') {
      if (!anthropic) return clientMissing(res, 'Anthropic');
      const msg = await anthropic.messages.create({
        model: model || 'claude-3-5-sonnet-20240620',
        max_tokens: 2048,
        messages: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role, content: m.content }))
      });
      return res.json({ reply: msg.content.map(c => c.type === 'text' ? c.text : '').join('') });
    }

    return res.status(400).json({ error: `Provider ${provider} non supportato` });
  } catch (err) {
    console.error('/api/chat error:', err);
    res.status(500).json({ error: err.message || 'Errore interno' });
  }
});

// --- VISION API ---
app.post('/api/vision/analyze', async (req, res) => {
  try {
    const { prompt, image, provider = 'groq', model } = req.body;
    if (!image) return res.status(400).json({ error: 'Immagine richiesta' });

    const base64Image = image.includes(',') ? image.split(',')[1] : image;
    const mimeType = image.includes('data:image/png') ? 'image/png' : 'image/jpeg';

    if (provider === 'groq') {
      if (!groq) return clientMissing(res, 'Groq');
      const visionModel = model || 'meta-llama/llama-4-scout-17b-16e-instruct';
      const completion = await groq.chat.completions.create({
        model: visionModel,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Descrivi questa immagine dettagliatamente.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ]
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    if (provider === 'gemini') {
      if (!genAI) return clientMissing(res, 'Gemini');
      const geminiModel = genAI.getGenerativeModel({ model: model || 'gemini-1.5-flash' });
      const result = await geminiModel.generateContent([
        prompt || 'Descrivi questa immagine.',
        { inlineData: { data: base64Image, mimeType } }
      ]);
      return res.json({ reply: result.response.text() });
    }

    if (provider === 'openai') {
      if (!openai) return clientMissing(res, 'OpenAI');
      const completion = await openai.chat.completions.create({
        model: model || 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt || 'Descrivi questa immagine.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }
        ]
      });
      return res.json({ reply: completion.choices[0].message.content });
    }

    return res.status(400).json({ error: `Provider ${provider} non supportato per vision` });
  } catch (err) {
    console.error('/api/vision/analyze error:', err);
    res.status(500).json({ error: err.message || 'Errore vision' });
  }
});

// --- GENERATE APP BLUEPRINT ---
app.post('/api/generate-app', async (req, res) => {
  try {
    const { sector, tenantId } = req.body;
    if (!sector) return res.status(400).json({ error: 'Settore richiesto' });

    const provider = 'groq';
    const prompt = `Sei un architetto software. Genera un blueprint JSON per un gestionale SaaS per il settore "${sector}".
Il JSON deve contenere:
- appName: nome dell'app
- sector: settore normalizzato in kebab-case
- description: descrizione breve
- schema: { tables: [{ name, label, labelPlural, icon, fields: [{ id, type, label, required, options, target, targetLabel }] }] }
- ui: { primaryColor, sidebar, dashboardCards: [{ type, table, label, field }] }
Rispondi SOLO con il JSON valido, senza testo aggiuntivo.`;

    console.log('[generate-app] provider:', provider);

    let raw = '';

    if (provider === 'groq' && groq) {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }]
      });
      raw = completion.choices[0].message.content;
    } else if (provider === 'openai' && openai) {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }]
      });
      raw = completion.choices[0].message.content;
    } else if (provider === 'gemini' && genAI) {
      const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const result = await geminiModel.generateContent(prompt);
      raw = result.response.text();
    } else {
      return res.status(503).json({ error: 'Nessun provider AI disponibile' });
    }

    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const parsed = JSON.parse(jsonMatch[1].trim());

    // Normalizza al formato BlueprintJSON atteso
    const blueprint = {
      appName: parsed.appName || parsed.name || `App ${sector}`,
      sector: parsed.sector || sector.toLowerCase().replace(/\s+/g, '-'),
      description: parsed.description || '',
      schema: parsed.schema || { tables: [] },
      ui: parsed.ui || { primaryColor: '#6366f1', sidebar: [], dashboardCards: [] },
    };

    return res.json({ blueprint, tenantId });
  } catch (err) {
    console.error('/api/generate-app error:', err);
    res.status(500).json({ error: err.message || 'Errore generazione blueprint' });
  }
});

// --- STRIPE ROUTES (checkout e billing) ---
app.use('/api', require('./routes/stripe'));
app.use('/api', require('./routes/client-app'));

// --- APP RECORDS ROUTES (CRUD dati app) ---
app.use('/api', require('./routes/app-records'));

// --- CUSTOM TABLES ROUTES (tabelle personalizzate utente) ---
app.use('/api', require('./routes/custom-tables'));

// --- INVOICES ROUTES (fatturazione) ---
app.use('/api', require('./routes/invoices'));

// --- APP REGISTRY ROUTES (Management Console) ---
app.use('/api', require('./routes/app-registry'));

// --- ERROR HANDLER ---
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Errore interno del server' });
});

// Cron job per controllo scadenze app
const { startExpiryCheck } = require('./jobs/expiry-check');
startExpiryCheck();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ ZeusX backend attivo su http://0.0.0.0:${PORT}`);
});
