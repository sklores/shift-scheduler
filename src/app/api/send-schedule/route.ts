import twilio from 'twilio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface SendMessage {
  to: string;
  body: string;
}

interface SendRequest {
  fromWeekStart?: string;
  messages?: SendMessage[];
}

interface SendResult {
  to: string;
  status: 'sent' | 'failed';
  sid?: string;
  reason?: string;
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: SendRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, 'Invalid JSON body');
  }

  const { fromWeekStart, messages } = body;

  if (!fromWeekStart || typeof fromWeekStart !== 'string') {
    return errorResponse(400, 'fromWeekStart is required (YYYY-MM-DD)');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse(400, 'messages must be a non-empty array');
  }

  const badMessage = messages.find(
    (m) => !m || typeof m.to !== 'string' || !m.to.startsWith('+')
  );
  if (badMessage) {
    return errorResponse(400, 'Each message.to must be a string starting with "+"');
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return errorResponse(
      500,
      'Missing Twilio env vars. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER in Vercel.'
    );
  }

  const client = twilio(accountSid, authToken);
  const results: SendResult[] = [];

  for (const msg of messages) {
    if (!msg.body || typeof msg.body !== 'string') {
      results.push({ to: msg.to, status: 'failed', reason: 'Message body is required' });
      continue;
    }

    try {
      const sent = await client.messages.create({
        to: msg.to,
        from: fromNumber,
        body: msg.body,
      });
      results.push({ to: msg.to, status: 'sent', sid: sent.sid });
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      results.push({ to: msg.to, status: 'failed', reason });
    }
  }

  const sentCount = results.filter((r) => r.status === 'sent').length;
  const failedCount = results.length - sentCount;

  return Response.json(
    { sent: sentCount, failed: failedCount, results, fromWeekStart },
    { status: failedCount > 0 && sentCount === 0 ? 502 : 200 }
  );
}
