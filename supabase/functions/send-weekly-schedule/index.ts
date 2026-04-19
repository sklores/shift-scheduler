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

const ROLE_COLORS: Record<string, string> = {
  manager: '#a02843',
  server:  '#0e7490',
  cashier: '#15803d',
  cook:    '#c2410c',
  host:    '#7c3aed',
  barista: '#6b3e18',
};

const DAY_NAMES = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Upcoming Monday-Sunday. Uses UTC dates, which match the YYYY-MM-DD strings
// the frontend stores (local-wall-clock dates, timezone-naive).
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

    // Warning email: zero shifts
    if (!shifts || shifts.length === 0) {
      const html = `<!DOCTYPE html><html><body style="margin:0;background:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#FFF;border:1px solid #E8E3D8;">
  <tr><td style="background:#A02843;color:#FFF;padding:20px 24px;">
    <div style="font-size:18px;font-weight:700;">⚠ Next week is unscheduled</div>
    <div style="font-size:12px;opacity:0.85;margin-top:4px;">Week of ${wkLabel}</div>
  </td></tr>
  <tr><td style="padding:24px;color:#1F1B16;font-size:14px;line-height:1.6;">
    <p style="margin:0 0 12px;"><strong>No shifts have been scheduled for the week of ${wkLabel}.</strong></p>
    <p style="margin:0 0 16px;">Open <a href="https://schedule.anddone.ai" style="color:#A02843;font-weight:500;">schedule.anddone.ai</a> to build next week before anyone clocks in.</p>
    <p style="margin:0;color:#8A8478;font-size:12px;">Auto-sent because the upcoming week had no shifts at Sunday 5 PM ET.</p>
  </td></tr>
</table></body></html>`;
      await sendEmail(`⚠ Schedule not set — week of ${wkLabel}`, html);
      return new Response(JSON.stringify({ ok: true, sent: "warning", week: wkLabel }),
        { headers: { "Content-Type": "application/json" } });
    }

    // Group by date
    const byDate = new Map<string, ShiftRow[]>();
    for (const s of shifts as ShiftRow[]) {
      const arr = byDate.get(s.shift_date) ?? [];
      arr.push(s);
      byDate.set(s.shift_date, arr);
    }

    let daysHtml = "";
    let totalShifts = 0;
    let totalHours = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date(Date.UTC(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate() + i));
      const iso = d.toISOString().slice(0, 10);
      const dayShifts = byDate.get(iso) ?? [];
      const dayHours = dayShifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
      totalShifts += dayShifts.length;
      totalHours += dayHours;

      const dayLabel = `${DAY_NAMES[i]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
      const sub = dayShifts.length === 0
        ? "No shifts"
        : `${dayShifts.length} shift${dayShifts.length !== 1 ? "s" : ""} · ${dayHours.toFixed(0)}h`;

      const shiftsHtml = dayShifts.length === 0
        ? `<div style="font-size:12px;color:#B8B3A5;font-style:italic;padding:6px 0;">No shifts scheduled</div>`
        : dayShifts.map(s => {
            const emp = empMap.get(s.employee_id);
            const name = esc(emp?.name ?? "Unknown");
            const role = emp?.role ?? "server";
            const color = ROLE_COLORS[role] || "#1F1B16";
            const h = calcHours(s.start_time, s.end_time);
            const noteLine = s.note
              ? `<div style="font-size:11px;color:#8A8478;margin-top:2px;">${esc(s.note)}</div>`
              : "";
            return `
<table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px dashed #F0EDE5;">
  <tr>
    <td style="width:8px;padding:8px 0;"><div style="width:4px;height:24px;background:${color};border-radius:2px;"></div></td>
    <td style="padding:8px 10px;font-size:13px;color:#1F1B16;">
      <div><strong>${name}</strong> <span style="color:#8A8478;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">· ${role}</span></div>
      ${noteLine}
    </td>
    <td style="padding:8px 0;font-family:'SFMono-Regular',ui-monospace,monospace;font-size:12px;color:#4A453C;white-space:nowrap;text-align:right;">
      ${fmtTime(s.start_time)} – ${fmtTime(s.end_time)} · ${h}h
    </td>
  </tr>
</table>`;
          }).join("");

      daysHtml += `
<tr><td style="padding:14px 20px;border-bottom:1px solid #E8E3D8;">
  <table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:14px;font-weight:700;color:#1F1B16;">${dayLabel}</td>
    <td style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:10.5px;color:#8A8478;letter-spacing:0.08em;text-transform:uppercase;text-align:right;">${sub}</td>
  </tr></table>
  <div style="margin-top:6px;">${shiftsHtml}</div>
</td></tr>`;
    }

    const html = `<!DOCTYPE html><html><body style="margin:0;background:#F5F3EE;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1F1B16;">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid #E8E3D8;">
  <tr><td style="background:#1F1B16;color:#FFFFFF;padding:20px 24px;">
    <div style="font-family:'SFMono-Regular',ui-monospace,monospace;font-size:22px;font-weight:600;letter-spacing:-0.02em;">sh<span style="color:#C2410C;">i</span>ft</div>
    <div style="font-size:11px;color:#B8B3A5;margin-top:4px;letter-spacing:0.1em;text-transform:uppercase;">Weekly Schedule · ${wkLabel}</div>
  </td></tr>
  <tr><td style="padding:16px 24px;background:#FAF8F3;border-bottom:1px solid #E8E3D8;font-size:13px;color:#4A453C;">
    <strong>${totalShifts} shift${totalShifts !== 1 ? "s" : ""} · ${totalHours.toFixed(0)} hours</strong>
    — edit at <a href="https://schedule.anddone.ai" style="color:#C2410C;font-weight:500;">schedule.anddone.ai</a>
  </td></tr>
  ${daysHtml}
  <tr><td style="padding:16px 24px;background:#F5F3EE;font-size:11px;color:#8A8478;text-align:center;">
    Auto-sent every Sunday at 5 PM ET. Reply with feedback.
  </td></tr>
</table></body></html>`;

    await sendEmail(`Weekly Schedule — ${wkLabel}`, html);
    return new Response(JSON.stringify({ ok: true, sent: "schedule", week: wkLabel, totalShifts, totalHours }),
      { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(`Error: ${(err as Error).message}`, { status: 500 });
  }
});
