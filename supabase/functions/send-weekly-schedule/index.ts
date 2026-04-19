// send-weekly-schedule — Supabase Edge Function
// Fires at 21:00 UTC Sunday (5 PM ET during DST) via pg_cron.
//
// Builds an HTML email of the UPCOMING week's shifts (Mon-Sun) and sends via
// Resend to REPORT_RECIPIENTS. If the upcoming week has zero shifts, sends
// a "schedule not set" warning email instead.
//
// Reuses env already present in the And-Done-Backend project:
//   RESEND_API_KEY, REPORT_FROM, REPORT_RECIPIENTS, SUPABASE_URL,
//   SUPABASE_SERVICE_ROLE_KEY.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API = "https://api.resend.com/emails";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY")!;
const REPORT_FROM = Deno.env.get("REPORT_FROM") || "Shift <nightly@anddone.ai>";
const REPORT_RECIPIENTS = (Deno.env.get("REPORT_RECIPIENTS") || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Role colors — match app exactly
const ROLE_COLORS: Record<string, string> = {
  manager: '#1d4ed8',
  server:  '#0e7490',
  cashier: '#15803d',
  cook:    '#a02843',
  host:    '#7c3aed',
  barista: '#6b3e18',
};

// Lightly tinted backgrounds for shift rows and pill badges (hex, email-safe)
const ROLE_LIGHT: Record<string, string> = {
  manager: '#f9eaed',
  server:  '#e4f4f7',
  cashier: '#e2f4e9',
  cook:    '#fdeee6',
  host:    '#f0ecfc',
  barista: '#f2ece6',
};

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function nextWeekRange() {
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = Sun
  const daysUntilMon = dow === 0 ? 1 : (8 - dow);
  const mon = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() + daysUntilMon
  ));
  const sun = new Date(mon); sun.setUTCDate(mon.getUTCDate() + 6);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { start: iso(mon), end: iso(sun), mon, sun };
}

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suf = h >= 12 ? "pm" : "am";
  const hh = h % 12 || 12;
  return m === 0 ? `${hh}${suf}` : `${hh}:${String(m).padStart(2,"0")}${suf}`;
}

function calcHours(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return Math.max(0, (bh + bm / 60) - (ah + am / 60));
}

function fmtHours(h: number) {
  if (h === Math.floor(h)) return `${h}h`;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

function esc(s: string) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function weekLabel(mon: Date, sun: Date) {
  if (mon.getUTCMonth() === sun.getUTCMonth()) {
    return `${MONTH_NAMES[mon.getUTCMonth()]} ${mon.getUTCDate()}–${sun.getUTCDate()}`;
  }
  return `${MONTH_NAMES[mon.getUTCMonth()]} ${mon.getUTCDate()}–${MONTH_NAMES[sun.getUTCMonth()]} ${sun.getUTCDate()}`;
}

async function sendEmail(subject: string, html: string) {
  const res = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: REPORT_FROM, to: REPORT_RECIPIENTS, subject, html }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body}`);
  }
  return await res.json();
}

type ShiftRow = { id: string; employee_id: string; shift_date: string; start_time: string; end_time: string; note: string };
type EmpRow = { id: string; name: string; role: string };

// Stat box — used in summary bar
function statBox(value: string, label: string) {
  return `
<td style="padding:0 6px;">
  <div style="border:1px solid #E8E3D8;border-radius:6px;padding:8px 14px;text-align:center;background:#FFFFFF;">
    <div style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:17px;font-weight:700;color:#1F1B16;letter-spacing:-0.02em;">${value}</div>
    <div style="font-size:10px;color:#8A8478;text-transform:uppercase;letter-spacing:0.1em;margin-top:2px;">${label}</div>
  </div>
</td>`;
}

Deno.serve(async (_req) => {
  try {
    if (!RESEND_KEY) return new Response("Missing RESEND_API_KEY", { status: 500 });
    if (REPORT_RECIPIENTS.length === 0) return new Response("Missing REPORT_RECIPIENTS", { status: 500 });

    const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { start, end, mon, sun } = nextWeekRange();
    const wkLabel = weekLabel(mon, sun);

    const [{ data: shifts, error: shErr }, { data: emps, error: eErr }] = await Promise.all([
      sb.from("shift_shifts")
        .select("id,employee_id,shift_date,start_time,end_time,note")
        .gte("shift_date", start).lte("shift_date", end)
        .order("shift_date").order("start_time"),
      sb.from("shift_employees")
        .select("id,name,role"),
    ]);
    if (shErr) throw new Error(`fetch shifts: ${shErr.message}`);
    if (eErr) throw new Error(`fetch employees: ${eErr.message}`);

    const empMap = new Map<string, EmpRow>();
    for (const e of (emps ?? []) as EmpRow[]) empMap.set(e.id, e);

    // ── Warning email: zero shifts ──────────────────────────────────────────
    if (!shifts || shifts.length === 0) {
      const html = `<!DOCTYPE html><html><body style="margin:0;padding:20px 0;background:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFF;border-radius:10px;border:1px solid #E8E3D8;overflow:hidden;">
  <tr><td style="background:#A02843;color:#FFF;padding:22px 28px;">
    <div style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:20px;font-weight:700;letter-spacing:-0.02em;">sh<span style="color:#F4A98A;">i</span>ft</div>
    <div style="font-size:13px;opacity:0.75;margin-top:6px;">⚠ Next week is unscheduled — week of ${wkLabel}</div>
  </td></tr>
  <tr><td style="padding:28px;color:#1F1B16;font-size:14px;line-height:1.7;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:600;">No shifts scheduled for the week of ${wkLabel}.</p>
    <p style="margin:0 0 20px;color:#4A453C;">Open <a href="https://schedule.anddone.ai" style="color:#A02843;font-weight:500;">schedule.anddone.ai</a> to build next week before anyone clocks in.</p>
    <p style="margin:0;color:#B8B3A5;font-size:11px;">Auto-sent because the upcoming week had no shifts at Sunday 5 PM ET.</p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
      await sendEmail(`⚠ Schedule not set — week of ${wkLabel}`, html);
      return new Response(JSON.stringify({ ok: true, sent: "warning", week: wkLabel }),
        { headers: { "Content-Type": "application/json" } });
    }

    // ── Build stats ─────────────────────────────────────────────────────────
    const shiftList = shifts as ShiftRow[];
    const totalShifts = shiftList.length;
    const totalHours = shiftList.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
    const uniqueStaff = new Set(shiftList.map(s => s.employee_id)).size;

    // Group by date
    const byDate = new Map<string, ShiftRow[]>();
    for (const s of shiftList) {
      const arr = byDate.get(s.shift_date) ?? [];
      arr.push(s);
      byDate.set(s.shift_date, arr);
    }

    // ── Day rows ─────────────────────────────────────────────────────────────
    let daysHtml = "";

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + i));
      const iso = d.toISOString().slice(0, 10);
      const dayShifts = byDate.get(iso) ?? [];

      // Skip empty days — clean and compact
      if (dayShifts.length === 0) continue;

      const dayHours = dayShifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
      const dayLabel = `${DAY_NAMES[i]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
      const sub = `${dayShifts.length} shift${dayShifts.length !== 1 ? "s" : ""} · ${fmtHours(dayHours)}`;

      const shiftsHtml = dayShifts.map(s => {
        const emp = empMap.get(s.employee_id);
        const name = esc(emp?.name ?? "Unknown");
        const role = emp?.role ?? "server";
        const color = ROLE_COLORS[role] || "#1F1B16";
        const lightBg = ROLE_LIGHT[role] || "#F5F3EE";
        const h = calcHours(s.start_time, s.end_time);
        const noteLine = s.note
          ? `<div style="font-size:11px;color:#8A8478;margin-top:3px;padding-left:10px;">${esc(s.note)}</div>`
          : "";
        return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:3px;">
  <tr>
    <td style="background:${lightBg};border-radius:6px;padding:0;" colspan="3">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="width:5px;padding:10px 0 10px 0;vertical-align:middle;">
            <div style="width:4px;height:100%;min-height:20px;background:${color};border-radius:2px 0 0 2px;"></div>
          </td>
          <td style="padding:9px 10px;font-size:13px;color:#1F1B16;vertical-align:middle;">
            <div style="display:inline;">
              <strong style="font-size:13.5px;">${name}</strong>
              <span style="display:inline-block;margin-left:6px;background:${color};color:#FFFFFF;font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;padding:2px 7px;border-radius:99px;vertical-align:middle;">${esc(role)}</span>
            </div>
            ${noteLine}
          </td>
          <td style="padding:9px 12px 9px 0;font-family:'SFMono-Regular',ui-monospace,monospace;font-size:12px;color:#4A453C;white-space:nowrap;text-align:right;vertical-align:middle;">
            ${fmtTime(s.start_time)}&thinsp;–&thinsp;${fmtTime(s.end_time)}<br>
            <span style="font-size:11px;color:#8A8478;">${fmtHours(h)}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
      }).join("");

      daysHtml += `
<tr>
  <td style="padding:0;border-bottom:1px solid #E8E3D8;">
    <!-- Day header -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;">
      <tr>
        <td style="padding:9px 20px;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="font-size:13px;font-weight:700;color:#1F1B16;letter-spacing:-0.01em;">${dayLabel}</td>
            <td style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:10px;color:#8A8478;letter-spacing:0.08em;text-transform:uppercase;text-align:right;">${sub}</td>
          </tr></table>
        </td>
      </tr>
    </table>
    <!-- Shifts -->
    <div style="padding:8px 16px 10px;">
      ${shiftsHtml}
    </div>
  </td>
</tr>`;
    }

    // ── Full email ────────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html>
<head><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Type" content="text/html;charset=UTF-8"></head>
<body style="margin:0;padding:20px 0;background:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F1B16;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#FFFFFF;border-radius:10px;border:1px solid #E8E3D8;overflow:hidden;">

  <!-- Header -->
  <tr><td style="background:#1F1B16;color:#FFFFFF;padding:22px 28px;">
    <div style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:22px;font-weight:700;letter-spacing:-0.03em;line-height:1;">sh<span style="color:#C2410C;">i</span>ft</div>
    <div style="font-size:11px;color:#B8B3A5;margin-top:6px;letter-spacing:0.1em;text-transform:uppercase;">Weekly Schedule &middot; ${wkLabel}</div>
  </td></tr>

  <!-- Stat boxes -->
  <tr><td style="padding:16px 20px;background:#FAF8F3;border-bottom:1px solid #E8E3D8;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        ${statBox(String(totalShifts), "shifts")}
        ${statBox(fmtHours(totalHours), "total hrs")}
        ${statBox(String(uniqueStaff), "staff")}
      </tr>
    </table>
    <div style="text-align:center;margin-top:12px;font-size:12px;color:#8A8478;">
      View &amp; edit at <a href="https://schedule.anddone.ai" style="color:#C2410C;font-weight:500;text-decoration:none;">schedule.anddone.ai</a>
    </div>
  </td></tr>

  <!-- Days -->
  ${daysHtml}

  <!-- Footer -->
  <tr><td style="padding:16px 24px;background:#F5F3EE;border-top:1px solid #E8E3D8;font-size:11px;color:#B8B3A5;text-align:center;line-height:1.6;">
    Auto-sent every Sunday at 5&thinsp;PM ET &middot; <a href="https://schedule.anddone.ai" style="color:#8A8478;">schedule.anddone.ai</a>
  </td></tr>

</table>
</td></tr></table>
</body></html>`;

    await sendEmail(`Weekly Schedule — ${wkLabel}`, html);
    return new Response(JSON.stringify({ ok: true, sent: "schedule", week: wkLabel, totalShifts, totalHours, uniqueStaff }),
      { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
