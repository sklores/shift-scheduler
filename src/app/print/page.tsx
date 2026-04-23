'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';

interface Employee { id: string; name: string; role: string }
interface Shift { employee_id: string; shift_date: string; start_time: string; end_time: string; note: string }

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekDates(start: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
function weekLabel(start: string): string {
  const mon = new Date(start + 'T00:00:00');
  const sun = new Date(addDays(start, 6) + 'T00:00:00');
  const m1 = MONTHS[mon.getMonth()], m2 = MONTHS[sun.getMonth()];
  if (mon.getMonth() === sun.getMonth()) return `${m1} ${mon.getDate()}–${sun.getDate()}, ${mon.getFullYear()}`;
  return `${m1} ${mon.getDate()} – ${m2} ${sun.getDate()}, ${mon.getFullYear()}`;
}
function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const suf = h >= 12 ? 'pm' : 'am';
  const hh = h % 12 || 12;
  return m === 0 ? `${hh}${suf}` : `${hh}:${String(m).padStart(2,'0')}${suf}`;
}
function calcHours(a: string, b: string): number {
  const [ah, am] = a.split(':').map(Number);
  const [bh, bm] = b.split(':').map(Number);
  return Math.max(0, (bh + bm / 60) - (ah + am / 60));
}
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────

function PrintContent() {
  const searchParams = useSearchParams();
  const weekStart = searchParams.get('week') ?? '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts]       = useState<Shift[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (!weekStart) { setError('No week specified.'); setLoading(false); return; }
    (async () => {
      try {
        const sb = getSupabase();
        const { data: sess } = await sb.auth.getSession();
        if (!sess?.session) { setError('Not signed in — open from the scheduler.'); setLoading(false); return; }
        const weekEnd = addDays(weekStart, 6);
        const [{ data: emps, error: eErr }, { data: sh, error: sErr }] = await Promise.all([
          sb.from('shift_employees').select('id,name,role').eq('is_active', true).order('name'),
          sb.from('shift_shifts').select('employee_id,shift_date,start_time,end_time,note')
            .gte('shift_date', weekStart).lte('shift_date', weekEnd).order('shift_date').order('start_time'),
        ]);
        if (eErr) throw eErr;
        if (sErr) throw sErr;
        setEmployees(emps ?? []);
        setShifts(sh ?? []);
        setLoading(false);
      } catch (err) {
        setError((err as Error).message ?? 'Failed to load');
        setLoading(false);
      }
    })();
  }, [weekStart]);

  useEffect(() => {
    if (!loading && !error && employees.length > 0) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, error, employees.length]);

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#666' }}>Loading schedule…</div>
  );
  if (error) return (
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#333' }}>{error}</div>
  );

  const dates = weekDates(weekStart);
  const label = weekLabel(weekStart);

  const shiftMap = new Map<string, Shift[]>();
  for (const s of shifts) {
    const key = `${s.employee_id}-${s.shift_date}`;
    shiftMap.set(key, [...(shiftMap.get(key) ?? []), s]);
  }

  const totalHours      = shifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
  const totalShifts     = shifts.length;
  const scheduledEmpIds = new Set(shifts.map(s => s.employee_id));
  const scheduledEmps   = employees.filter(e => scheduledEmpIds.has(e.id));

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
          background: #fff;
          color: #000;
          font-size: 11px;
        }

        /* ── Screen toolbar ── */
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #1a1a1a;
          color: #fff;
          padding: 10px 20px;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .toolbar-title { font-family: monospace; font-size: 15px; font-weight: 700; }
        .toolbar-label { font-size: 12px; color: rgba(255,255,255,0.5); flex: 1; }
        .btn-print {
          background: #fff; color: #000; border: none; border-radius: 4px;
          padding: 5px 14px; font-size: 12px; font-weight: 600; cursor: pointer;
        }
        .btn-close {
          background: transparent; color: rgba(255,255,255,0.5);
          border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;
          padding: 5px 12px; font-size: 12px; cursor: pointer;
        }

        /* ── Document ── */
        .doc { padding: 18px 22px; }

        /* ── Header ── */
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          padding-bottom: 8px;
          border-bottom: 1.5px solid #000;
          margin-bottom: 10px;
        }
        .doc-title  { font-size: 14px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; }
        .doc-week   { font-size: 12px; font-weight: 500; color: #333; margin-top: 2px; }
        .doc-meta   { font-family: monospace; font-size: 10px; color: #555; text-align: right; line-height: 1.6; }

        /* ── Table: NO fills, hairline rules only ── */
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }

        th, td {
          border-right: 0.75px solid #ccc;
          border-bottom: 0.75px solid #ccc;
          padding: 0;
          background: #fff;
        }
        th:last-child, td:last-child { border-right: none; }
        thead tr th { border-top: none; border-bottom: 1px solid #555; }
        tbody tr:last-child td { border-bottom: none; }

        /* ── Column header ── */
        .col-staff {
          text-align: left;
          padding: 5px 8px;
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #555;
          border-right: 1px solid #555;
        }
        .col-day { text-align: center; padding: 4px 3px; }
        .day-name {
          font-size: 7.5px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #777;
        }
        .day-num {
          font-size: 17px;
          font-weight: 800;
          color: #000;
          line-height: 1.1;
          margin-top: 1px;
        }
        .day-stats {
          font-family: monospace;
          font-size: 7.5px;
          color: #888;
          margin-top: 1px;
        }

        /* ── Employee cell ── */
        .emp-td { border-right: 1px solid #555; }
        .emp-inner {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 7px;
        }
        .emp-name { font-size: 12px; font-weight: 700; color: #000; }

        /* ── Shift cell ── */
        .shift-td { padding: 4px 6px; vertical-align: middle; text-align: center; }
        .shift-entry { padding: 2px 0; }
        .shift-entry + .shift-entry { border-top: 0.5px solid #e0e0e0; margin-top: 3px; padding-top: 3px; }
        .shift-time {
          font-family: 'Courier New', Courier, monospace;
          font-size: 13px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
          line-height: 1.35;
        }
        .shift-start { display: block; }
        .shift-end   { display: block; color: #444; font-weight: 600; }
        .shift-note {
          font-size: 9px;
          color: #555;
          font-style: italic;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* ── Empty cell ── */
        .empty-td {
          text-align: center;
          vertical-align: middle;
          padding: 6px;
          font-size: 11px;
          color: #ddd;
        }

        /* ── Footer ── */
        .doc-footer {
          margin-top: 8px;
          font-size: 8.5px;
          color: #aaa;
          text-align: right;
          font-family: monospace;
        }

        /* ── Print ── */
        @page { size: landscape; margin: 10mm 8mm; }
        @media print {
          .toolbar { display: none !important; }
          body { font-size: 10px; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Screen toolbar */}
      <div className="toolbar">
        <span className="toolbar-title">shift</span>
        <span className="toolbar-label">{label} — B&amp;W print preview</span>
        <button className="btn-print" onClick={() => window.print()}>Print</button>
        <button className="btn-close" onClick={() => window.close()}>Close</button>
      </div>

      <div className="doc">
        {/* Header */}
        <div className="doc-header">
          <div>
            <div className="doc-title">Shift Schedule</div>
            <div className="doc-week">Week of {label}</div>
          </div>
          <div className="doc-meta">
            <div><strong>{totalShifts}</strong> shifts &nbsp;·&nbsp; <strong>{totalHours.toFixed(0)}h</strong> total &nbsp;·&nbsp; <strong>{scheduledEmps.length}</strong> staff</div>
            <div style={{ color: '#aaa' }}>schedule.anddone.ai</div>
          </div>
        </div>

        {/* Grid */}
        <table>
          <colgroup>
            <col style={{ width: '120px' }} />
            {dates.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              <th className="col-staff">Employee</th>
              {dates.map((date, i) => {
                const d = new Date(date + 'T00:00:00');
                return (
                  <th key={i} className="col-day">
                    <div className="day-name">{DAYS[i]}</div>
                    <div className="day-num">{d.getDate()}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scheduledEmps.map((emp) => (
              <tr key={emp.id}>
                <td className="emp-td">
                  <div className="emp-inner">
                    <div className="emp-name">{emp.name}</div>
                  </div>
                </td>
                {dates.map((date, di) => {
                  const cellShifts = shiftMap.get(`${emp.id}-${date}`) ?? [];
                  if (cellShifts.length === 0) {
                    return <td key={di} className="empty-td">—</td>;
                  }
                  return (
                    <td key={di} className="shift-td">
                      {cellShifts.map((s, si) => {
                        return (
                          <div key={si} className="shift-entry">
                            <div className="shift-time">
                              <span className="shift-start">{fmtTime(s.start_time)}</span>
                              <span className="shift-end">{fmtTime(s.end_time)}</span>
                            </div>
                            {s.note && <div className="shift-note">{s.note}</div>}
                          </div>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <div className="doc-footer">
          Printed {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#666' }}>Loading…</div>
    }>
      <PrintContent />
    </Suspense>
  );
}
