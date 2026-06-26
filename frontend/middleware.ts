import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const config = {
  matcher: ['/dashboard/:path*', '/app/:path*'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Crea client Supabase lato server
  const response = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Recupera utente
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Ottieni tenant dell'utente
  const { data: memberships, error: membershipError } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1);

  if (membershipError || !memberships?.[0]?.tenant_id) {
    // Nessun tenant: porta a /create per crearne uno o a /pricing
    return NextResponse.redirect(new URL('/create', request.url));
  }

  const tenantId = memberships[0].tenant_id;

  // Verifica se il tenant ha un abbonamento attivo
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  const hasActiveSubscription = !!subscription &&
    (subscription.status === 'active' || subscription.status === 'trialing') &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  // Se ha un abbonamento attivo, lascia passare
  if (hasActiveSubscription) {
    return response;
  }

  // Se non ha abbonamento, controlla il piano del tenant
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('plan')
    .eq('id', tenantId)
    .single();

  const paidPlan = ['pro', 'vip', 'premium'].includes(tenant?.plan?.toLowerCase() || '');

  // Se ha piano a pagamento ma non subscription attiva, potrebbe essere scaduto
  // comunque controlliamo se ci sono app con trial scaduto
  const { data: expiredApps, error: appsError } = await supabase
    .from('apps')
    .select('id')
    .eq('tenant_id', tenantId)
    .lt('trial_ends_at', new Date().toISOString())
    .eq('is_active', true)
    .limit(1);

  if (appsError) {
    console.error('[Middleware] errore controllo app:', appsError);
  }

  const hasExpiredApp = (expiredApps?.length || 0) > 0;

  // Blocca solo se ci sono app scadute E non c'è abbonamento attivo nè piano a pagamento
  if (hasExpiredApp && !hasActiveSubscription && !paidPlan) {
    return NextResponse.redirect(new URL('/pricing', request.url));
  }

  return response;
}
