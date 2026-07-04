import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
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

    // Instanzia il client Supabase DENTRO la funzione per evitare problemi di scope e cold-start
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[change-password] Missing Supabase credentials');
      return NextResponse.json({ error: 'Configurazione server incompleta' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Recupera l'app tramite slug
    const { data: app, error: appError } = await supabase
      .from('apps')
      .select('id, client_password, client_active, expires_at')
      .eq('slug', slug)
      .single();

    if (appError || !app) {
      return NextResponse.json({ error: 'App non trovata' }, { status: 404 });
    }

    if (app.client_active === false) {
      return NextResponse.json({ error: 'App bloccata' }, { status: 403 });
    }

    if (app.expires_at && new Date(app.expires_at) < new Date()) {
      return NextResponse.json({ error: 'App scaduta' }, { status: 403 });
    }

    // Verifica password attuale
    if (app.client_password !== oldPassword) {
      return NextResponse.json({ error: 'Password attuale errata' }, { status: 401 });
    }

    // Aggiorna password
    const { error: updateError } = await supabase
      .from('apps')
      .update({ client_password: newPassword })
      .eq('id', app.id);

    if (updateError) {
      console.error('[change-password] update error:', updateError);
      return NextResponse.json({ error: 'Errore aggiornamento password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Password cambiata con successo' });
  } catch (err) {
    console.error('[change-password] error:', err);
    return NextResponse.json({ error: 'Errore interno' }, { status: 500 });
  }
}
