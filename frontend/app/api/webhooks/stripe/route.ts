import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-06-24.dahlia',
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * POST /api/webhooks/stripe
 * Webhook per ricevere eventi da Stripe (da account connessi)
 * Gestisce checkout.session.completed e invoice.paid
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Signature mancante' }, { status: 400 });
    }

    let event: Stripe.Event;

    // Verifica la firma del webhook
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook] Firma non valida:', err);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Gestisci gli eventi di interesse
    switch (event.type) {
      case 'checkout.session.completed':
      case 'invoice.paid':
        await handlePaymentSuccess(event, supabase);
        break;
      
      case 'invoice.payment_failed':
        // Prima controlla se è un pagamento fallito di un'App cliente
        // Poi controlla se è un pagamento fallito di un User (subscription)
        await handlePaymentFailed(event, supabase);
        break;
      
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
        // User ha cancellato o messo in pausa il proprio abbonamento a ZeusX
        await handleUserSubscriptionCancelled(event, supabase);
        break;
      
      case 'account.application.deauthorized':
        await handleOAuthDeauthorized(event, supabase);
        break;
      
      default:
        console.log(`[Stripe Webhook] Evento ignorato: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('[Stripe Webhook] Errore:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore webhook' },
      { status: 500 }
    );
  }
}

/**
 * Gestisce il successo di un pagamento
 * Aggiorna lo stato dell'app a 'active'
 */
async function handlePaymentSuccess(event: Stripe.Event, supabase: any) {
  const data = event.data.object as any;
  
  // Estrai totalum_app_id dai metadata
  let totalum_app_id: string | null = null;
  
  if (data.metadata) {
    totalum_app_id = data.metadata.totalum_app_id ?? null;
  }
  
  // Per le fatture, controlla anche le line items
  if (!totalum_app_id && data.lines?.data?.[0]?.price?.metadata) {
    totalum_app_id = data.lines.data[0].price.metadata.totalum_app_id ?? null;
  }

  if (!totalum_app_id) {
    console.warn('[Stripe Webhook] Nessun totalum_app_id nei metadata');
    return;
  }

  // Aggiorna lo stato dell'app a 'active'
  const { error } = await supabase
    .from('apps')
    .update({ 
      status: 'active',
      updated_at: new Date().toISOString()
    })
    .eq('totalum_app_id', totalum_app_id);

  if (error) {
    console.error('[Stripe Webhook] Errore aggiornamento stato app:', error);
  } else {
    console.log(`[Stripe Webhook] App ${totalum_app_id} impostata a 'active'`);
  }
}

/**
 * Gestisce un pagamento fallito
 * Aggiorna lo stato dell'app a 'expired' se necessario
 */
async function handlePaymentFailed(event: Stripe.Event, supabase: any) {
  const data = event.data.object as any;
  
  const totalum_app_id = data.metadata?.totalum_app_id ?? null;
  
  if (!totalum_app_id) {
    console.warn('[Stripe Webhook] Nessun totalum_app_id nei metadata per payment_failed');
    return;
  }

  // Qui potresti voler inviare una notifica o aggiornare lo stato
  console.log(`[Stripe Webhook] Pagamento fallito per app ${totalum_app_id}`);
}

/**
 * Gestisce lo scollegamento di Stripe Connect
 * Quando un User revoca l'accesso, porta l'app sotto gestione diretta
 */
async function handleOAuthDeauthorized(event: Stripe.Event, supabase: any) {
  const data = event.data.object as any;
  
  // L'account Stripe Connect che è stato scollegato
  const accountId = data.account;
  
  if (!accountId) {
    console.warn('[Stripe Webhook] Nessun account ID in oauth.deauthorized');
    return;
  }

  console.log(`[Stripe Webhook] Account ${accountId} scollegato, cerco app associate...`);

  // Trova tutte le app associate a questo stripe_connect_id
  const { data: apps, error } = await supabase
    .from('apps')
    .select('id, name, totalum_app_id, tenant_id')
    .eq('stripe_connect_id', accountId);

  if (error) {
    console.error('[Stripe Webhook] Errore ricerca app:', error);
    return;
  }

  if (!apps || apps.length === 0) {
    console.log(`[Stripe Webhook] Nessuna app trovata per account ${accountId}`);
    return;
  }

  // Imposta is_managed_by_platform = true per tutte le app trovate
  for (const app of apps) {
    const { error: updateError } = await supabase
      .from('apps')
      .update({ 
        is_managed_by_platform: true,
        payment_reset_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', app.id);

  if (updateError) {
      console.error(`[Stripe Webhook] Errore takeover app ${app.id}:`, updateError);
    } else {
      console.log(`[Stripe Webhook] App ${app.id} (${app.name}) messa in gestione diretta`);
    }
  }
}

/**
 * Gestisce la cancellazione/pausa dell'abbonamento di un User
 * Quando un User cancella il suo abbonamento a ZeusX, prendi in gestione le sue app
 */
async function handleUserSubscriptionCancelled(event: Stripe.Event, supabase: any) {
  const data = event.data.object as any;
  
  // L'ID del cliente Stripe
  const customerId = data.customer;
  
  if (!customerId) {
    console.warn('[Stripe Webhook] Nessun customer ID nell\'evento');
    return;
  }

  console.log(`[Stripe Webhook] Abbonamento User ${customerId} cancellato/pausato, cerco app associate...`);

  // Trova la subscription associata a questo customer_id
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (subscriptionError || !subscription) {
    console.warn(`[Stripe Webhook] Subscription non trovata per customer ${customerId}`);
    return;
  }

  // Trova l'owner del tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('owner_id')
    .eq('id', subscription.tenant_id)
    .single();

  if (tenantError || !tenant) {
    console.warn(`[Stripe Webhook] Tenant non trovato per subscription ${subscription.tenant_id}`);
    return;
  }

  // Ottieni l'email dell'owner
  const { data: userData } = await supabase.auth.getUser(tenant.owner_id);
  const userEmail = userData?.user?.email || 'user@unknown.com';

  // Trova tutte le app del tenant
  const { data: apps, error: appsError } = await supabase
    .from('apps')
    .select('id, name, totalum_app_id, stripe_connect_id, tenant_id')
    .eq('tenant_id', subscription.tenant_id);

  if (appsError) {
    console.error('[Stripe Webhook] Errore ricerca app:', appsError);
    return;
  }

  if (!apps || apps.length === 0) {
    console.log(`[Stripe Webhook] Nessuna app trovata per tenant ${subscription.tenant_id}`);
    return;
  }

  // Prendi in gestione tutte le app
  for (const app of apps) {
    // Imposta is_managed_by_platform = true
    const { error: updateError } = await supabase
      .from('apps')
      .update({ 
        is_managed_by_platform: true,
        payment_reset_required: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', app.id);

    if (updateError) {
      console.error(`[Stripe Webhook] Errore takeover app ${app.id}:`, updateError);
    } else {
      console.log(`[Stripe Webhook] App ${app.id} (${app.name}) messa in gestione diretta per mancato pagamento User`);
      
      // Notifica admin
      await notifyAdminTakeover(app.totalum_app_id, userEmail, 'mancato pagamento User');
    }
  }
}

/**
 * Notifica l'admin del takeover automatico
 */
async function notifyAdminTakeover(totalumAppId: string, userEmail: string, reason: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@zeusx.it';
  
  if (resendApiKey) {
    try {
      await fetch('https://api.resend.com/v1/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ZeusX <noreply@zeusx.it>',
          to: [adminEmail],
          subject: `[URGENTE] Takeover automatico app ${totalumAppId}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #ef4444;">Takeover automatico eseguito</h2>
              <p>L'app <strong>${totalumAppId}</strong> è stata messa in gestione diretta da ZeusX.</p>
              <p><strong>Motivo:</strong> ${reason}</p>
              <p><strong>User:</strong> ${userEmail}</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                ZeusX System<br>
                Questo messaggio è stato inviato automaticamente.
              </p>
            </div>
          `,
        }),
      });
    } catch (error) {
      console.error('[Stripe Webhook] Errore invio notifica admin:', error);
    }
  } else {
    // Fallback: log
    console.log(`[ADMIN NOTIFICATION] App ${totalumAppId} takeover per ${reason} (User: ${userEmail})`);
  }
}
