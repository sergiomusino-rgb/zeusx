import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Escludi le route delle Server Actions dal middleware
  // Le Server Actions usano route interne che iniziano con /api/_next/action
  const isServerAction = request.nextUrl.pathname.startsWith('/api/_next/action');
  const isServerActionData = request.nextUrl.pathname.startsWith('/api/_next/data') && request.nextUrl.searchParams.get('_action');
  
  if (isServerAction || isServerActionData) {
    return response;
  }

  // Aggiungi CORS headers per la route manifest
  if (request.nextUrl.pathname.match(/^\/a\/[^\/]+\/manifest$/)) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    
    // Gestisci preflight OPTIONS request
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
  }
  
  // Disabilita la cache per tutte le pagine della dashboard
  // Questo forza il browser a caricare sempre la versione più recente
  if (request.nextUrl.pathname.startsWith('/dashboard') || request.nextUrl.pathname.startsWith('/login')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
  }
  
  return response;
}
