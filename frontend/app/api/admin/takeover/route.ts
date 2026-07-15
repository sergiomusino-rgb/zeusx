import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// Supabase Admin Client
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Admin user ID
const ADMIN_USER_ID = 'd3eda57f-692a-4904-ac5f-93bdaaec8ce5';

// ============================================================================
// Helper: Verify admin
// ============================================================================

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  
  if (!user) return false;
  
  // Check if user is admin by ID
  if (user.id === ADMIN_USER_ID) return true;
  
  // Check if user has admin role in profile
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single();
  
  return profile?.role === 'admin';
}

// ============================================================================
// Helper: Send takeover notification email
// ============================================================================

async function sendTakeoverNotification(userEmail: string, appName: string): Promise<void> {
  // Using Resend API (recommended) or fallback to console log
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (resendApiKey) {
    try {
      const response = await fetch('https://api.resend.com/v1/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ZeusX <noreply@zeusx.it>',
          to: [userEmail],
          subject: 'Servizio ZeusX - Aggiornamento Gestione',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e293b;">Gentile utente,</h2>
              <p>Il tuo servizio <strong>${appName}</strong> è ora gestito direttamente da ZeusX.</p>
              <p>Non è richiesta alcuna azione, il servizio continuerà senza interruzioni.</p>
              <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
                ZeusX Team<br>
                Questo messaggio è stato inviato automaticamente.
              </p>
            </div>
          `,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to send email:', await response.text());
      }
    } catch (error) {
      console.error('Email send error:', error);
    }
  } else {
    // Fallback: log the notification (for development)
    console.log(`[TAKEOVER NOTIFICATION] To: ${userEmail}, App: ${appName}`);
    console.log('Gentile utente, il tuo servizio è ora gestito direttamente da ZeusX. Non è richiesta alcuna azione, il servizio continuerà senza interruzioni.');
  }
}

// ============================================================================
// API Handler - GET: Get app details for confirmation
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Verify admin
    if (!await verifyAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get app ID from query params
    const { searchParams } = new URL(request.url);
    const appId = searchParams.get('app_id');

    if (!appId) {
      return NextResponse.json(
        { error: 'app_id parameter required' },
        { status: 400 }
      );
    }

    // Get app details using RPC function
    const { data, error } = await supabaseAdmin.rpc('get_app_for_takeover', {
      target_app_id: appId
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data?.[0] || null });
  } catch (error) {
    console.error('Error fetching app for takeover:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// API Handler - POST: Execute takeover
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Verify admin
    if (!await verifyAdmin(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { app_id } = body;

    if (!app_id) {
      return NextResponse.json(
        { error: 'app_id is required' },
        { status: 400 }
      );
    }

    // Execute takeover using RPC function
    const { data, error } = await supabaseAdmin.rpc('admin_takeover_reseller_app', {
      target_app_id: app_id
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const result = data?.[0];
    
    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || 'Takeover failed' },
        { status: 400 }
      );
    }

    // Get user email for notification
    const { data: appData } = await supabaseAdmin
      .from('app_registry')
      .select('reseller_id, original_reseller_id')
      .eq('id', app_id)
      .single();

    if (appData?.original_reseller_id) {
      const { data: userData } = await supabaseAdmin.auth.getUser(appData.original_reseller_id);
      if (userData?.user?.email) {
        await sendTakeoverNotification(userData.user.email, result.app_name);
      }
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      app_name: result.app_name,
      original_reseller_id: result.original_reseller_id,
      new_checkout_url: result.new_checkout_url
    });
  } catch (error) {
    console.error('Error executing takeover:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}