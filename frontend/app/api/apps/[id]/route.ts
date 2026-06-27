import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { id } = params;

    // Verifica che l'app appartenga al tenant dell'utente
    const { data: memberships } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1);

    const tenantId = memberships?.[0]?.tenant_id;

    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, tenant_id')
      .eq('id', id)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'App non trovata' }, { status: 404 });
    }

    if (app.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
    }

    // Elimina l'app
    const { error: deleteError } = await supabase
      .from('apps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('[DELETE /api/apps/:id] delete error:', deleteError);
      return NextResponse.json({ error: 'Errore durante l\'eliminazione' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/apps/:id] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Errore interno' },
      { status: 500 }
    );
  }
}
