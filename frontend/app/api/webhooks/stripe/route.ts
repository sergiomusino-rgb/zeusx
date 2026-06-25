import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: STRIPE_API_VERSION,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function getPeriodISO(sub: Stripe.Subscription, field: 'current_period_start' | 'current_period_end'): string {
  const val = (sub as any)[field];
  return new Date(val * 1000).toISOString();
}

export async function POST(req: Request) {
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = getSupabase();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.client_reference_id || session.metadata?.tenant_id;
        const customerEmail = session.customer_email || session.customer_details?.email;

        console.log(`[Stripe Webhook] checkout.session.completed - sessionId: ${session.id}, tenantId: ${tenantId}, email: ${customerEmail}`);

        if (!tenantId) {
          console.error("[Stripe Webhook] checkout.session.completed: tenant_id mancante nella sessione Stripe");
          break;
        }

        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("id, name, owner_id")
          .eq("id", tenantId)
          .single();

        if (tenantError || !tenant) {
          console.error(`[Stripe Webhook] checkout.session.completed: tenant ${tenantId} non trovato`, tenantError);
          break;
        }

        console.log(`[Stripe Webhook] Tenant trovato: ${tenant.name} (${tenant.id})`);

        const { error: updateTenantError } = await supabase
          .from("tenants")
          .update({ plan: "pro", updated_at: new Date().toISOString() })
          .eq("id", tenantId);

        if (updateTenantError) {
          console.error(`[Stripe Webhook] checkout.session.completed: errore aggiornamento tenant ${tenantId}`, updateTenantError);
          throw updateTenantError;
        }

        console.log(`[Stripe Webhook] Tenant ${tenantId} aggiornato a piano PRO`);

        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.error("[Stripe Webhook] checkout.session.completed: subscription id mancante");
          break;
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          current_period_start: getPeriodISO(subscription, 'current_period_start'),
          current_period_end: getPeriodISO(subscription, 'current_period_end'),
        });

        console.log(`[Stripe Webhook] Subscription attivata per tenant ${tenantId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);

        if (!tenantId) {
          console.error(`invoice.payment_succeeded: tenant non trovato per ${subscriptionId}`);
          break;
        }

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: invoice.customer as string,
          stripe_subscription_id: subscriptionId,
          status: subscription.status,
          current_period_start: getPeriodISO(subscription, 'current_period_start'),
          current_period_end: getPeriodISO(subscription, 'current_period_end'),
        });

        console.log(`Rinnovo pagato per tenant ${tenantId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        if (!subscriptionId) break;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await supabase
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId)
          .eq("stripe_subscription_id", subscriptionId);

        console.log(`Pagamento fallito per tenant ${tenantId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await supabase
          .from("subscriptions")
          .update({ status: "canceled", updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId)
          .eq("stripe_subscription_id", subscriptionId);

        console.log(`Subscription cancellata per tenant ${tenantId}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        const tenantId = await getTenantIdBySubscriptionId(supabase, subscriptionId);
        if (!tenantId) break;

        await upsertSubscription(supabase, tenantId, {
          stripe_customer_id: subscription.customer as string,
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

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore webhook";
    console.error("Errore webhook Stripe:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

interface SubscriptionData {
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

async function upsertSubscription(
  supabase: ReturnType<typeof getSupabase>,
  tenantId: string,
  data: SubscriptionData
) {
  const { error } = await supabase
    .from("subscriptions")
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
      { onConflict: "tenant_id" }
    );

  if (error) {
    console.error("upsertSubscription error:", error);
    throw error;
  }
}

async function getTenantIdBySubscriptionId(
  supabase: ReturnType<typeof getSupabase>,
  subscriptionId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("tenant_id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (error || !data) return null;
  return data.tenant_id;
}
