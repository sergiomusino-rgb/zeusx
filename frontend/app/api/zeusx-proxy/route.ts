import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { join } from 'path';

// Configurazione Totalium (usando variabili d'ambiente)
const TOTALIUM_API_URL = process.env.TOTALIUM_API_URL || 'https://api.totalium.com/v1';
const TOTALIUM_API_KEY = process.env.TOTALIUM_API_KEY;

// Percorso del file AppRegistry
const REGISTRY_PATH = join(process.cwd(), 'frontend', 'data', 'AppRegistry.json');

// ─── Registry Management ──────────────────────────────────────────────────────

interface AppRegistry {
  apps: Array<{
    activityName: string;
    activityType: string;
    appUrl: string;
    createdAt: string;
  }>;
}

async function readRegistry(): Promise<AppRegistry> {
  try {
    const data = await fs.readFile(REGISTRY_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return { apps: [] };
  }
}

async function writeRegistry(registry: AppRegistry): Promise<void> {
  await fs.writeFile(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
}

// ─── API Route Handler ────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, activityName, activityType } = body;

    if (action !== 'createApp') {
      return NextResponse.json({ 
        success: false, 
        error: 'Azione non supportata' 
      }, { status: 400 });
    }

    if (!activityName || !activityType) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nome attività e tipo sono obbligatori' 
      }, { status: 400 });
    }

    if (!TOTALIUM_API_KEY) {
      return NextResponse.json({ 
        success: false, 
        error: 'Configurazione API non disponibile' 
      }, { status: 500 });
    }

    // Chiama Totalium
    const response = await fetch(`${TOTALIUM_API_URL}/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TOTALIUM_API_KEY}`,
        'X-Source': 'zeusx',
      },
      body: JSON.stringify({
        name: activityName,
        type: activityType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: data.error || `Errore ${response.status}: ${response.statusText}`,
      }, { status: response.status });
    }

    const appUrl = data.appUrl || data.url;

    // Registra l'app nel registry locale
    const registry = await readRegistry();
    registry.apps.push({
      activityName,
      activityType,
      appUrl,
      createdAt: new Date().toISOString(),
    });
    await writeRegistry(registry);

    return NextResponse.json({
      success: true,
      appUrl,
    });

  } catch (err) {
    console.error('[zeusx-proxy] Error:', err);
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Errore di rete sconosciuto',
    }, { status: 500 });
  }
}