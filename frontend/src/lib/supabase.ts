import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'sb-zeusx-auth-token',
    flowType: 'pkce',
    debug: false,
  },
});

export function getAccessTokenFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('sb-zeusx-auth-token');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.access_token || parsed[0] || null;
  } catch {
    return null;
  }
}
