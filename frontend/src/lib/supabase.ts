function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  const encoded = encodeURIComponent(value);
  console.log(`[setCookie] name=${name} length=${encoded.length}`);
  document.cookie = `${name}=${encoded}; expires=${expires}; path=/; SameSite=Lax; Secure`;
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax; Secure`;
}

const cookieStorage = {
  getItem(key: string): string | null {
    const val = getCookie(key);
    console.log(`[cookieStorage getItem] key=${key} found=${!!val}`);
    return val;
  },
  setItem(key: string, value: string) {
    console.log(`[cookieStorage setItem] key=${key}`);
    setCookie(key, value);
  },
  removeItem(key: string) {
    console.log(`[cookieStorage removeItem] key=${key}`);
    removeCookie(key);
  },
};

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: cookieStorage,
    storageKey: 'sb-zeusx-auth-token',
  },
});
