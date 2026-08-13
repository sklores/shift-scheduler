import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET  /api/settings?key=weekly_salary  — read a single setting
 * POST /api/settings  { key, value }     — write a single setting
 *
 * Uses the service role key server-side to bypass RLS.
 * The shift_settings table has RLS enabled; rather than fight per-user
 * policies on a global config table, we proxy through the server.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Missing Supabase service env vars');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

// Multi-tenant org scope. Unset → original single-tenant DB (no org_id column).
const ORG_ID = process.env.NEXT_PUBLIC_ORG_ID ?? '';

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key');
  if (!key) return Response.json({ error: 'key param required' }, { status: 400 });

  try {
    const sb = getServiceClient();
    let query = sb.from('shift_settings').select('value').eq('key', key);
    if (ORG_ID) query = query.eq('org_id', ORG_ID);
    const { data, error } = await query.single();
    if (error) return Response.json({ value: null }, { status: 200 }); // missing row → null, not an error
    return Response.json({ value: data.value });
  } catch (e: unknown) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { key?: string; value?: string };
  try { body = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { key, value } = body ?? {};
  if (!key || value === undefined) {
    return Response.json({ error: 'key and value required' }, { status: 400 });
  }

  try {
    const sb = getServiceClient();
    const row: Record<string, string> = { key, value, updated_at: new Date().toISOString() };
    if (ORG_ID) row.org_id = ORG_ID;
    const { error } = await sb
      .from('shift_settings')
      .upsert(row, { onConflict: ORG_ID ? 'org_id,key' : 'key' });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ ok: true });
  } catch (e: unknown) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
