import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * GET /api/sync-plan?session_id=xxx
 * Sincronizza il piano dell'utente dopo il checkout Stripe
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');
    
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    
    // Recupera la sessione Stripe
    const { data: session, error: sessionError } = await supabase
      .from('stripe_checkout_sessions')
      .select('tenant_id, plan_id')
      .eq('session_id', sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verifica che l'utente abbia una subscription attiva
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('tenant_id', session.tenant_id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    // Aggiorna il piano del tenant se necessario
    if (session.plan_id) {
      const { data: currentTenant } = await supabase
        .from('tenants')
        .select('plan, app_limit')
        .eq('id', session.tenant_id)
        .single();

      if (currentTenant && currentTenant.plan !== session.plan_id) {
        // Calcola gli slot in base al piano
        const slotsMap: Record<string, number> = {
          free: 0,
          starter: 1,
          pro: 5,
          business: 100,
        };
        
        const newAppLimit = (currentTenant.app_limit || 0) + (slotsMap[session.plan_id] || 0);
        
        await supabase
          .from('tenants')
          .update({
            plan: session.plan_id,
            app_limit: newAppLimit,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.tenant_id);
      }
    }

    return NextResponse.json({
      paid: subscription.status === 'active',
      plan: session.plan_id,
    });
  } catch (error) {
    console.error('[Sync Plan] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}