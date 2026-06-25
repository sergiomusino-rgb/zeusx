import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../src/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log("[Proxy Checkout] user:", user?.id, "error:", userError?.message);

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zeusx-backend.onrender.com";
    const serviceToken = process.env.BACKEND_SERVICE_TOKEN;

    console.log("[Proxy Checkout] backendUrl:", backendUrl, "serviceToken presente:", !!serviceToken);

    const res = await fetch(`${backendUrl}/api/create-checkout-session?priceId=${encodeURIComponent(priceId)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceToken || "missing"}`,
        "X-User-Id": user.id,
        "X-User-Email": user.email || '',
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log("[Proxy Checkout] backend status:", res.status, "data:", data);
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore checkout";
    console.error("[Proxy Checkout] Errore:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
