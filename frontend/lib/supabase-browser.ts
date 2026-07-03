import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables - fail fast if missing
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `[supabase-browser] Missing Supabase environment variables! ` +
    `URL: ${!!supabaseUrl}, Key: ${!!supabaseAnonKey}. ` +
    `Make sure .env.local is properly configured and restart the dev server.`
  );
}

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'zeusx-frontend',
    },
  },
});
