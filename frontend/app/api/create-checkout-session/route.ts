import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function getUserFromCookies() {
  try {
    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    console.log('[getUserFromCookies] cookies trovati:', allCookies.map(c => c.name));

    const authCookie = allCookies.find(c => c.name.endsWith('-auth-token') || c.name === 'sb-access-token');

    if (!authCookie) {
      console.log('[getUserFromCookies] Nessun cookie auth trovato');
      return null;
    }

    let accessToken: string | undefined;

    try {
      const parsed = JSON.parse(decodeURIComponent(authCookie.value));
      accessToken = parsed.access_token || parsed[0];
      console.log('[getUserFromCookies] parsed token, type:', typeof parsed);
    } catch {
      accessToken = decodeURIComponent(authCookie.value);
      console.log('[getUserFromCookies] token raw');
    }

    if (!accessToken) {
      console.log('[getUserFromCookies] Token non trovato nel cookie');
      return null;
    }

    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.log('[getUserFromCookies] getUser error:', error?.message || 'no user');
      return null;
    }

    return user;
  } catch (err) {
    console.error('[getUserFromCookies] Errore:', err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromCookies();

    console.log("[Proxy Checkout] user:", user?.id);

    if (!user) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const body = await req.json();
    const { priceId } = body;

    if (!priceId) return NextResponse.json({ error: "priceId mancante" }, { status: 400 });

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "https://zeusx-backend.onrender.com";
    const serviceToken = process.env.BACKEND_SERVICE_TOKEN;

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
