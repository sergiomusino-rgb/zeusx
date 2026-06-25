import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { ensureTenantAccess, canCreateApp, getTenantAppsCount } from "@/src/lib/tenant";

const STRIPE_API_VERSION = "2026-06-24.dahlia";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function getUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });

  try {
    const body = await req.json();
    const { priceId, tenantId: requestedTenantId } = body;

    console.log("[Stripe Checkout] payload ricevuto:", { priceId, requestedTenantId, userEmail: user.email });

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const { tenantId } = await ensureTenantAccess(user.id, requestedTenantId);

    console.log("[Stripe Checkout] tenantId risolto:", tenantId);

    const appsCount = await getTenantAppsCount(tenantId);
    const createCheck = await canCreateApp(tenantId);

    if (appsCount >= 5 && !createCheck.allowed) {
      return NextResponse.json(
        { error: "UpgradeToProRequired", redirect: "/pricing", message: "Hai raggiunto il limite di 5 app. Passa al piano Pro per crearne altre." },
        { status: 403 }
      );
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
      apiVersion: STRIPE_API_VERSION,
    });

    const lineItems = [{ price: priceId, quantity: 1 }];
    console.log("[Stripe Checkout] line_items:", JSON.stringify(lineItems));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`,
      customer_email: user.email || undefined,
      client_reference_id: tenantId,
      metadata: {
        tenant_id: tenantId,
      },
    });

    console.log("[Stripe Checkout] sessione creata:", session.id);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore Stripe";
    console.error("[Stripe Checkout] Errore:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
