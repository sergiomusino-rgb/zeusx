import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: 'Password obbligatorie' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'La nuova password deve avere almeno 6 caratteri' }, { status: 400 });
    }

    const { data: app, error } = await supabase
      .from('apps')
      .select('id, client_password, client_active, expires_at')
      .eq('slug', slug)
      .single();

    if (error || !app) {
      return NextResponse.json({ error: 'App non trovata' }, { status: 404 });
    }

    if (app.client_password !== oldPassword) {
      return NextResponse.json({ error: 'Password attuale errata' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('apps')
      .update({ client_password: newPassword })
      .eq('id', app.id);

    if (updateError) {
      console.error('[change-password] update error:', updateError);
      return NextResponse.json({ error: 'Errore aggiornamento password' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[change-password] error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
