'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

/** Get the browser Supabase client (singleton). */
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  if (!url || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Check Vercel env vars.'
    );
  }
  // Storage key is scoped to the Supabase project so a session from a
  // previous backend is never replayed against the current one (a stale
  // foreign JWT makes every query fail with "No suitable key or wrong
  // key type" while the login gate stays hidden).
  const projectRef = new URL(url).hostname.split('.')[0];
  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: `shift-auth-${projectRef}`,
    },
  });
  return _client;
}
