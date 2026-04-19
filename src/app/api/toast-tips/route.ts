import { NextRequest, NextResponse } from 'next/server';

const AUTH_URL = 'https://ws-api.toasttab.com/authentication/v1/authentication/login';
const BASE = 'https://ws-api.toasttab.com';

async function getToastToken(): Promise<string> {
  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.TOAST_CLIENT_ID,
      clientSecret: process.env.TOAST_CLIENT_SECRET,
      userAccessType: 'TOAST_MACHINE_CLIENT',
    }),
  });
  if (!res.ok) throw new Error(`Toast auth failed: ${res.status}`);
  const body = await res.json();
  return body.token.accessToken as string;
}

// YYYYMMDD from YYYY-MM-DD
function toBusinessDate(iso: string): string {
  return iso.replace(/-/g, '');
}

// Add N days to ISO date
function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// Fetch ALL pages for a business date, following Link: rel="next"
async function fetchDayTips(headers: Record<string, string>, businessDate: string): Promise<number> {
  let tips = 0;
  let url: string | null = `${BASE}/orders/v2/ordersBulk?businessDate=${businessDate}&pageSize=100`;

  while (url) {
    const pageUrl: string = url;
    const pageRes: Response = await fetch(pageUrl, { headers });
    if (!pageRes.ok) break;
    const orders: unknown = await pageRes.json();
    if (!Array.isArray(orders)) break;

    for (const order of orders) {
      for (const check of (order as { checks?: { payments?: { tipAmount?: number }[] }[] }).checks ?? []) {
        for (const payment of check.payments ?? []) {
          const t = payment.tipAmount;
          if (typeof t === 'number' && t > 0) tips += t;
        }
      }
    }

    // Parse Link header for next page
    const linkHeader = pageRes.headers.get('link') ?? '';
    const nextMatch = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
    url = nextMatch ? nextMatch[1] : null;
  }

  return Math.round(tips * 100) / 100;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export async function GET(req: NextRequest) {
  const week = req.nextUrl.searchParams.get('week');
  if (!week) return NextResponse.json({ error: 'week param required' }, { status: 400 });

  if (!process.env.TOAST_CLIENT_ID || !process.env.TOAST_CLIENT_SECRET || !process.env.TOAST_RESTAURANT_GUID) {
    return NextResponse.json({ error: 'Toast credentials not configured' }, { status: 500 });
  }

  try {
    const token = await getToastToken();
    const headers = {
      Authorization: `Bearer ${token}`,
      'Toast-Restaurant-External-ID': process.env.TOAST_RESTAURANT_GUID!,
      'Content-Type': 'application/json',
    };

    const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
    const results = await Promise.allSettled(
      days.map(iso => fetchDayTips(headers, toBusinessDate(iso)))
    );

    const byDay: Record<string, number> = {};
    let total = 0;
    results.forEach((r, i) => {
      const tips = r.status === 'fulfilled' ? r.value : 0;
      byDay[DAY_LABELS[i]] = tips;
      total += tips;
    });

    return NextResponse.json({
      total: Math.round(total * 100) / 100,
      byDay,
      week,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
