import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface EmailMessage {
  to: string;
  name: string;
  subject: string;
  body: string; // plain text schedule body
}

interface SendRequest {
  fromWeekStart?: string;
  messages?: EmailMessage[];
}

interface SendResult {
  to: string;
  status: 'sent' | 'failed';
  id?: string;
  reason?: string;
}

function errorResponse(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

function buildHtml(name: string, body: string): string {
  const lines = body.split('\n').map(l => `<p style="margin:0 0 6px 0;font-family:'Courier New',monospace;font-size:14px;color:#111">${l}</p>`).join('');
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#f5f5f5;margin:0;padding:32px 16px;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e0e0e0">
    <div style="background:#111;padding:20px 24px">
      <span style="font-family:'Courier New',monospace;font-size:18px;font-weight:800;color:#fff;letter-spacing:0.04em">shift</span>
    </div>
    <div style="padding:24px">
      <p style="margin:0 0 16px 0;font-size:15px;color:#333">Hi ${name},</p>
      <p style="margin:0 0 16px 0;font-size:14px;color:#555">Here's your schedule for the upcoming week:</p>
      <div style="background:#f9f9f9;border:1px solid #e8e8e8;border-radius:6px;padding:16px 20px;margin-bottom:20px">
        ${lines}
      </div>
      <p style="margin:0;font-size:12px;color:#999">Reply to this email if you have questions, or contact management directly.</p>
    </div>
    <div style="background:#f9f9f9;border-top:1px solid #e8e8e8;padding:12px 24px;text-align:center">
      <p style="margin:0;font-size:11px;color:#bbb;font-family:monospace">schedule.anddone.ai</p>
    </div>
  </div>
</body>
</html>`;
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return errorResponse(500, 'Missing RESEND_API_KEY env var.');
  }

  const resend = new Resend(apiKey);
  const results: SendResult[] = [];

  for (const msg of messages) {
    if (!msg.to || !msg.body) {
      results.push({ to: msg.to ?? '', status: 'failed', reason: 'Missing to or body' });
      continue;
    }
    try {
      const { data, error } = await resend.emails.send({
        from: 'Shift Schedule <schedule@anddone.ai>',
        to: msg.to,
        subject: msg.subject || 'Your upcoming schedule',
        html: buildHtml(msg.name || 'there', msg.body),
        text: msg.body,
      });
      if (error) throw new Error(error.message);
      results.push({ to: msg.to, status: 'sent', id: data?.id });
    } catch (err) {
      results.push({ to: msg.to, status: 'failed', reason: (err as Error).message });
    }
  }

  const sentCount = results.filter(r => r.status === 'sent').length;
  const failedCount = results.length - sentCount;

  return Response.json(
    { sent: sentCount, failed: failedCount, results, fromWeekStart },
    { status: failedCount > 0 && sentCount === 0 ? 502 : 200 }
  );
}
