import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zeusx-backend.onrender.com";

    const res = await fetch(`${backendUrl}/api/create-checkout-session?priceId=${encodeURIComponent(priceId)}&tenantId=${encodeURIComponent(requestedTenantId || "")}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.BACKEND_SERVICE_TOKEN || ""}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore checkout";
    console.error("[Proxy Checkout] Errore:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
