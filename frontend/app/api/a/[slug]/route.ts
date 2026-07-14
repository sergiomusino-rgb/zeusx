import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

// GET /api/a/[slug] - Get app info (for settings)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const authHeader = request.headers.get('authorization');

    const response = await fetch(`${BACKEND_URL}/a/${slug}`, {
      method: 'GET',
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching app info:', error);
    return NextResponse.json(
      { error: 'Errore di connessione al server' },
      { status: 500 }
    );
  }
}

// POST /api/a/[slug] - Client login with password
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: 'Password richiesta' }, { status: 400 });
    }

    const response = await fetch(`${BACKEND_URL}/a/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error proxying login:', error);
    return NextResponse.json(
      { error: 'Errore di connessione al server' },
      { status: 500 }
    );
  }
}