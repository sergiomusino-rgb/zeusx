import { NextResponse } from "next/server";
import { createServerSupabase } from "../../../src/lib/supabase-server";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zeusx-backend.onrender.com";

    const sessionRes = await supabase.auth.getSession();
    const token = sessionRes.data.session?.access_token;

    if (!token) {
      return NextResponse.json({ error: "Token non disponibile" }, { status: 401 });
    }

    const res = await fetch(`${backendUrl}/api/create-checkout-session?priceId=${encodeURIComponent(priceId)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
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
