'use server';

import { promises as fs } from 'fs';
import { join } from 'path';

// Percorso del file AppRegistry
const REGISTRY_PATH = join(process.cwd(), 'frontend', 'data', 'AppRegistry.json');

// URL di base di Totalium (configurabile via environment)
const TOTALIUM_API_URL = process.env.TOTALIUM_API_URL || 'https://api.totalium.com/v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TotaliumPayload {
  activityName: string;
  activityType: string;
  apiKey: string;
}

export interface TotaliumResponse {
  success: boolean;
  appUrl?: string;
  error?: string;
}

// ─── Registry Management ──────────────────────────────────────────────────────

export interface AppRegistry {
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

// ─── Totalium API Call ────────────────────────────────────────────────────────

export async function createAppOnTotalium(payload: TotaliumPayload): Promise<TotaliumResponse> {
  try {
    const response = await fetch(`${TOTALIUM_API_URL}/apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${payload.apiKey}`,
        'X-Source': 'zeusx',
      },
      body: JSON.stringify({
        name: payload.activityName,
        type: payload.activityType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `Errore ${response.status}: ${response.statusText}`,
      };
    }

    // Registra l'app nel registry locale
    const registry = await readRegistry();
    registry.apps.push({
      activityName: payload.activityName,
      activityType: payload.activityType,
      appUrl: data.appUrl || data.url,
      createdAt: new Date().toISOString(),
    });
    await writeRegistry(registry);

    return {
      success: true,
      appUrl: data.appUrl || data.url,
    };
  } catch (err) {
    console.error('[createAppOnTotalium] Error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Errore di rete sconosciuto',
    };
  }
}

// ─── Get Registry ────────────────────────────────────────────────────────────

export async function getAppRegistry(): Promise<AppRegistry> {
  return readRegistry();
}