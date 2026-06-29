import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

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
