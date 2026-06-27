import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const dbClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function GET(req: NextRequest) {
  try {
    // Leggi il token dal cookie o header
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Fallback: leggi dal cookie
    const tokenFromCookie = req.cookies.get('supabase.auth.token')?.value;
    const finalToken = token || tokenFromCookie;

    let userInfo: any = null;
    if (finalToken) {
      console.log('[Debug] Token presente, lunghezza:', finalToken.length);
      const { data: { user }, error } = await authClient.auth.getUser(finalToken);
      if (error) {
        console.error('[Debug] Auth error:', error);
      }
      if (!error && user) {
        userInfo = { id: user.id, email: user.email };
      }
    } else {
      console.log('[Debug] Nessun token trovato');
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'PRESENT' : 'MISSING';
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENT' : 'MISSING';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';

    const result: any = {
      supabaseUrl: supabaseUrl,
      serviceRoleKey: serviceRoleKey,
      anonKey: anonKey,
      user: userInfo,
    };

    if (userInfo) {
      const { data: tenantsByOwner } = await dbClient
        .from('tenants')
        .select('id, owner_id, name, plan')
        .eq('owner_id', userInfo.id);
      result.tenantsByOwner = tenantsByOwner;

      const { data: memberships } = await dbClient
        .from('tenant_members')
        .select('tenant_id, role')
        .eq('user_id', userInfo.id);
      result.memberships = memberships;

      const { data: allTenants } = await dbClient
        .from('tenants')
        .select('id, owner_id, name, plan');
      result.allTenants = allTenants;
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) });
  }
}
