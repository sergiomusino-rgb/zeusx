import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const PLAN_PRICES: Record<string, number> = {
  starter: 10,
  pro: 25,
  business: 50,
};

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Utente non autenticato' }, { status: 401 });
    }

    const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';
    if (user.id !== ADMIN_USER_ID) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    const [tenantsRes, appsRes, subsRes, paymentsRes] = await Promise.all([
      supabase.from('tenants').select('*'),
      supabase.from('apps').select('*'),
      supabase.from('subscriptions').select('*'),
      supabase.from('payments').select('*'),
    ]);

    if (tenantsRes.error) throw tenantsRes.error;
    if (appsRes.error) throw appsRes.error;
    if (subsRes.error) throw subsRes.error;

    const tenants = tenantsRes.data || [];
    const apps = appsRes.data || [];
    const subs = subsRes.data || [];
    const payments = paymentsRes.data || [];

    const now = new Date();
    const activeApps = apps.filter(a => a.client_active !== false && a.expires_at && new Date(a.expires_at) > now);
    const expiredApps = apps.filter(a => a.client_active === false || (a.expires_at && new Date(a.expires_at) < now));

    const dist: Record<string, number> = {};
    tenants.forEach(t => { const p = t.plan || 'free'; dist[p] = (dist[p] || 0) + 1; });

    const revenue = payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    const monthly: Record<string, { count: number; revenue: number }> = {};
    payments.forEach((p: any) => {
      const d = new Date(p.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { count: 0, revenue: 0 };
      monthly[key].count++;
      monthly[key].revenue += p.amount || 0;
    });

    const chartData = Object.entries(monthly)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));

    const recentApps = [...apps].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10);

    return NextResponse.json({
      totals: {
        tenants: tenants.length,
        apps: apps.length,
        activeApps: activeApps.length,
        expiredApps: expiredApps.length,
        activeSubs: subs.filter(s => s.status === 'active').length,
        revenue,
      },
      dist,
      chartData,
      recentApps,
    });
  } catch (error) {
    console.error('[GET /api/admin/stats] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
