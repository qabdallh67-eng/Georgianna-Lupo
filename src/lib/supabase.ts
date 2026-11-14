import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://suldaiuxaxremmfxodak.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith('YOUR_')) {
    return null;
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export function isBrowserSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('YOUR_'));
}
