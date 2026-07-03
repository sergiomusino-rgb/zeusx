import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://zeusx-backend.onrender.com';

  // Fetch app info to get name and logo
  let appName = 'ZeusX App';
  let appLogo = '';
  let primaryColor = '#6366f1';

  try {
    const res = await fetch(`${backendUrl}/api/a/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    });
    const data = await res.json();
    if (data.appInfo) {
      appName = data.appInfo.appName || data.appInfo.name || appName;
      appLogo = data.appInfo.branding?.logo_url || data.appInfo.logo || '';
      primaryColor = data.appInfo.branding?.primary_color || '#6366f1';
    }
  } catch {
    // Use defaults
  }

  const appUrl = `https://zeusx-zwu8.vercel.app/a/${slug}`;

  const manifest = {
    name: appName,
    short_name: appName.substring(0, 12),
    description: `Gestionale ${appName}`,
    start_url: `/a/${slug}/app`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0e1a',
    theme_color: primaryColor,
    icons: [
      {
        src: appLogo || '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable',
      },
      {
        src: appLogo || '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable',
      },
    ],
    screenshots: [],
    prefer_related_applications: false,
    categories: ['business', 'productivity'],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}