import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function getUserAndToken() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    console.log('[Checkout] cookies trovati:', allCookies.map(c => c.name));

    const authCookie = allCookies.find(c => c.name.endsWith('-auth-token') || c.name === 'sb-access-token');

    if (!authCookie) {
      console.log('[Checkout] Nessun cookie auth trovato');
      return { user: null, token: null };
    }

    let accessToken: string | undefined;

    try {
      const parsed = JSON.parse(decodeURIComponent(authCookie.value));
      accessToken = parsed.access_token || parsed[0];
    } catch {
      accessToken = decodeURIComponent(authCookie.value);
    }

    if (!accessToken) {
      console.log('[Checkout] Token non trovato nel cookie');
      return { user: null, token: null };
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log('[Checkout] getUser error:', error?.message || 'no user');
      return { user: null, token: accessToken };
    }

    return { user, token: accessToken };
  } catch (err) {
    console.error('[Checkout] Errore:', err);
    return { user: null, token: null };
  }
}

export async function POST(req: Request) {
  try {
    const { user, token } = await getUserAndToken();

    console.log("[Checkout] user:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zeusx-backend.onrender.com";

    const res = await fetch(`${backendUrl}/api/create-checkout-session?priceId=${encodeURIComponent(priceId)}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token || 'missing'}`,
        "X-User-Id": user.id,
        "X-User-Email": user.email || '',
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    console.log("[Checkout] backend status:", res.status, "data:", data);
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Errore checkout";
    console.error("[Checkout] Errore:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
