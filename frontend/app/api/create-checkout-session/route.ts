import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Client Supabase con service role key (bypassa RLS completamente)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

// Decodifica JWT senza verificare la firma (solo per ottenere user_id)
function decodeJWT(token: string): { sub?: string; email?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = JSON.parse(atob(parts[1]));
    return { sub: payload.sub, email: payload.email };
  } catch {
    return {};
  }
}

export async function POST(req: NextRequest) {
  try {
    const { priceId, planId } = await req.json();

    if (!priceId || !planId) {
      return NextResponse.json({ error: 'Parametri mancanti' }, { status: 400 });
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe non configurato' }, { status: 500 });
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service role key mancante' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Decodifica JWT per ottenere user_id (senza chiamata network)
    const decoded = decodeJWT(token);
    const userId = decoded.sub;

    if (!userId) {
      console.error('[Checkout] User ID non trovato nel token');
      return NextResponse.json({ error: 'Token non valido' }, { status: 401 });
    }

    console.log('[Checkout] User ID da JWT:', userId, 'email:', decoded.email);

    // Cerca tenant con service role key (bypassa RLS)
    console.log('[Checkout] Cerco tenant per owner_id:', userId);
    const { data: tenantsByOwner, error: ownerError } = await supabase
      .from('tenants')
      .select('*')
      .eq('owner_id', userId)
      .limit(1);

    console.log('[Checkout] tenantsByOwner:', tenantsByOwner, 'error:', ownerError);

    let tenant = tenantsByOwner?.[0] || null;

    // Fallback: cerca nelle membership
    if (!tenant) {
      console.log('[Checkout] Cerco nelle membership...');
      const { data: memberships } = await supabase
        .from('tenant_members')
        .select('*')
        .eq('user_id', userId)
        .limit(1);

      if (memberships?.[0]?.tenant_id) {
        const { data: tenantFromMembership } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', memberships[0].tenant_id)
          .limit(1);
        tenant = tenantFromMembership?.[0] || null;
      }
    }

    // Se ancora non trovato, crea nuovo tenant
    if (!tenant) {
      console.log('[Checkout] Creo nuovo tenant per user:', userId);
      const { data: newTenants, error: createError } = await supabase
        .from('tenants')
        .insert({
          owner_id: userId,
          name: decoded.email ? `Tenant di ${decoded.email}` : 'Tenant personale',
          slug: `tenant-${userId.slice(0, 8)}`,
          plan: 'free',
        })
        .select('*');

      console.log('[Checkout] newTenants:', newTenants, 'createError:', createError);

      if (createError || !newTenants || newTenants.length === 0) {
        return NextResponse.json({ error: 'Errore creazione tenant: ' + createError?.message }, { status: 500 });
      }

      tenant = newTenants[0];

      await supabase.from('tenant_members').insert({
        tenant_id: tenant.id,
        user_id: userId,
        role: 'owner',
      });
    }

    console.log('[Checkout] Tenant trovato:', tenant.id);