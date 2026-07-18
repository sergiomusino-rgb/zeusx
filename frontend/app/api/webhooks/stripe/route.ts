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
 * Mappa i piani agli slot da aggiungere (cumulativo)
 * - free: 0 slot
 * - starter: +1 slot
 * - pro: +5 slot
 * - business: +100 slot
 * - extra_slot: +1 slot
 */
function getSlotsForPlan(planId: string): number {
  const slotsMap: Record<string, number> = {
    free: 0,
    starter: 1,
    pro: 5,
    business: 100,
    extra_slot: 1,
  };
  return slotsMap[planId] || 0;
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
        await handleCheckoutSessionCompleted(event, supabase);
        break;
      
      case 'invoice.paid':
        await handleInvoicePaid(event, supabase);
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
 * Gestisce il successo di un checkout session
 * Aggiorna lo stato dell'app o aggiunge gli slot in base al tipo
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event, supabase: any) {
  const data = event.data.object as any;
  
  // Estrai totalum_app_id dai metadata (pagamento per app cliente)
  let totalum_app_id: string | null = null;
  let planId: string | null = null;
  let tenantId: string | null = null;
  
  if (data.metadata) {
    totalum_app_id = data.metadata.totalum_app_id ?? null;
    planId = data.metadata.plan_id ?? null;
    tenantId = data.metadata.tenant_id ?? null;
  }
  
  // Caso 1: Pagamento per un'app cliente (Stripe Connect)
  if (totalum_app_id) {
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
    return;
  }
  
  // Caso 2: Pagamento per un piano/utente (aggiungi slot)
  if (planId && tenantId) {
    const slotsToAdd = getSlotsForPlan(planId);
    
    if (slotsToAdd > 0) {
      // Aggiungi gli slot in modo cumulativo
      const { error } = await supabase
        .from('tenants')
        .update({ 
          app_limit: supabase.raw('app_limit + ?', slotsToAdd),
          plan: planId,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId);

      if (error) {
        console.error('[Stripe Webhook] Errore aggiunta slot:', error);
      } else {
        console.log(`[Stripe Webhook] Aggiunti ${slotsToAdd} slot al tenant ${tenantId} per piano ${planId}`);
      }
    }
    
    // Aggiorna o crea la subscription
    const customerId = data.customer;
    const subscriptionId = data.subscription;
    
    if (customerId) {
      const { data: existingSub } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('tenant_id', tenantId)
        .single();
      
      if (existingSub) {
        await supabase
          .from('subscriptions')
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('tenant_id', tenantId);
      } else {
        await supabase
          .from('subscriptions')
          .insert({
            tenant_id: tenantId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: 'active'
          });
      }
    }
  }
}

/**
 * Gestisce il pagamento di una fattura
 * Aggiorna lo stato dell'app a 'active'
 */
async function handleInvoicePaid(event: Stripe.Event, supabase: any) {
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

  if (totalum_app_id) {
    // Aggiorna lo stato dell'app a 'active'
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
