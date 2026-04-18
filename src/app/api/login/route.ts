import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Beta gate login.
 *
 * Client POSTs { password }. We check against BETA_GATE_PASSWORD env var.
 * If match, we sign into Supabase (server-side) as the pre-seeded bootstrap
 * user and return the resulting session tokens. Client sets those on its
 * Supabase client and is now authenticated for data access.
 *
 * This keeps the real Supabase credentials out of the browser and lets us
 * enforce the beta password server-side (so client-side bypass attempts fail).
 */
export async function POST(request: Request) {
  let body: { password?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const password = (body?.password ?? '').toString().trim();
  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 });
  }

  const expected = process.env.BETA_GATE_PASSWORD;
  if (!expected) {
    return Response.json({ error: 'Server missing BETA_GATE_PASSWORD' }, { status: 500 });
  }
  if (password !== expected) {
    // Tiny delay to slow brute force. Vercel also rate-limits at the edge.
    await new Promise(r => setTimeout(r, 400));
    return Response.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const bootstrapEmail = process.env.SUPABASE_BOOTSTRAP_USER_EMAIL;
  const bootstrapPassword = process.env.SUPABASE_BOOTSTRAP_USER_PASSWORD;

  if (!supabaseUrl || !anonKey || !bootstrapEmail || !bootstrapPassword) {
    return Response.json({ error: 'Server missing Supabase bootstrap env vars' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.signInWithPassword({
    email: bootstrapEmail,
    password: bootstrapPassword,
  });

  if (error || !data?.session) {
    return Response.json({ error: error?.message || 'Bootstrap signin failed' }, { status: 500 });
  }

  return Response.json({
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
