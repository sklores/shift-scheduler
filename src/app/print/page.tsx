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
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#666' }}>
      Loading schedule…
    </div>
  );
  if (error) return (
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#333' }}>
      {error}
    </div>
  );

  const dates = weekDates(weekStart);
  const label = weekLabel(weekStart);

  const shiftMap = new Map<string, Shift[]>();
  for (const s of shifts) {
    const key = `${s.employee_id}-${s.shift_date}`;
    const arr = shiftMap.get(key) ?? [];
    arr.push(s);
    shiftMap.set(key, arr);
  }

  const totalHours  = shifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
  const totalShifts = shifts.length;
  const scheduledEmpIds = new Set(shifts.map(s => s.employee_id));
  const scheduledEmps   = employees.filter(e => scheduledEmpIds.has(e.id));

  return (
    <>
      <style>{`
        /* ── Reset ── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
          background: #fff;
          color: #000;
        }

        /* ── Screen toolbar (hidden when printing) ── */
        .no-print { display: flex; }
        @media print { .no-print { display: none !important; } }

        /* ── Print page setup ── */
        @page {
          size: landscape;
          margin: 12mm 10mm;
        }

        /* ── Force everything to print as-designed ── */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { background: #fff !important; }
        }

        /* ── Table ── */
        table { border-collapse: collapse; width: 100%; table-layout: fixed; }
        th, td {
          border: 1px solid #bbb;
          padding: 0;
          vertical-align: top;
        }
        th {
          border-color: #888;
          background: #1a1a1a;
          color: #fff;
        }

        /* ── Shift pill ── */
        .shift-pill {
          border: 1.5px solid #1a1a1a;
          border-radius: 3px;
          background: #fff;
          padding: 3px 5px;
          margin: 2px;
          display: block;
        }
        .shift-time {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10.5px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
          letter-spacing: -0.02em;
        }
        .shift-hours {
          font-family: 'Courier New', Courier, monospace;
          font-size: 9px;
          color: #555;
          margin-top: 1px;
        }
        .shift-note {
          font-size: 8.5px;
          color: #444;
          margin-top: 1px;
          font-style: italic;
        }

        /* ── Employee cell ── */
        .emp-cell {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          min-width: 120px;
        }
        .emp-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 1.5px solid #1a1a1a;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 800;
          color: #000;
          flex-shrink: 0;
          letter-spacing: 0;
        }
        .emp-name {
          font-size: 11.5px;
          font-weight: 700;
          color: #000;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .emp-role {
          font-size: 9px;
          color: #555;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-top: 1px;
        }

        /* ── Day header cell ── */
        .day-header {
          text-align: center;
          padding: 5px 4px;
        }
        .day-label {
          font-size: 8.5px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #ccc;
        }
        .day-num {
          font-size: 18px;
          font-weight: 800;
          color: #fff;
          line-height: 1.1;
          margin-top: 1px;
        }
        .day-meta {
          font-family: 'Courier New', Courier, monospace;
          font-size: 8px;
          color: #aaa;
          margin-top: 2px;
        }

        /* ── Empty cell dash ── */
        .empty-cell {
          text-align: center;
          padding: 10px 6px;
          color: #ccc;
          font-size: 13px;
        }

        /* ── Day cells ── */
        .day-cell { padding: 2px; vertical-align: top; }
        tr:nth-child(even) td { background: #f5f5f5; }
        tr:nth-child(even) .shift-pill { background: #fff; }
      `}</style>

      {/* Screen toolbar */}
      <div className="no-print" style={{
        background: '#1a1a1a', color: '#fff',
        padding: '10px 20px', alignItems: 'center', gap: '14px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <span style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.02em' }}>
          shift
        </span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', flex: 1 }}>
          {label} — B&amp;W print preview
        </span>
        <button
          onClick={() => window.print()}
          style={{ background: '#fff', color: '#000', border: 'none', borderRadius: '5px', padding: '6px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
        >
          Print
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '5px', padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>

      {/* Document */}
      <div style={{ padding: '20px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px', borderBottom: '2px solid #1a1a1a', paddingBottom: '10px' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '20px', fontWeight: 800, letterSpacing: '-0.03em', color: '#000' }}>
              SHIFT SCHEDULE
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#000', marginTop: '2px' }}>
              Week of {label}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'monospace', fontSize: '11px', color: '#444', lineHeight: 1.6 }}>
            <div>
              <strong>{totalShifts}</strong> shifts &nbsp;·&nbsp;
              <strong>{totalHours.toFixed(0)}h</strong> total &nbsp;·&nbsp;
              <strong>{scheduledEmps.length}</strong> staff
            </div>
            <div style={{ color: '#888', fontSize: '10px' }}>schedule.anddone.ai</div>
          </div>
        </div>

        {/* Grid */}
        <table>
          <colgroup>
            <col style={{ width: '130px' }} />
            {dates.map((_, i) => <col key={i} />)}
          </colgroup>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#ccc' }}>
                Employee
              </th>
              {dates.map((date, i) => {
                const d = new Date(date + 'T00:00:00');
                const dayShifts = shifts.filter(s => s.shift_date === date);
                const dayHrs = dayShifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
                return (
                  <th key={i} className="day-header">
                    <div className="day-label">{DAYS[i]}</div>
                    <div className="day-num">{d.getDate()}</div>
                    {dayShifts.length > 0 && (
                      <div className="day-meta">{dayHrs.toFixed(0)}h · {dayShifts.length}</div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scheduledEmps.map((emp) => (
              <tr key={emp.id}>
                <td style={{ borderColor: '#bbb', background: 'inherit' }}>
                  <div className="emp-cell">
                    <div className="emp-avatar">{initials(emp.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="emp-name">{emp.name}</div>
                      <div className="emp-role">{emp.role}</div>
                    </div>
                  </div>
                </td>
                {dates.map((date, di) => {
                  const cellShifts = shiftMap.get(`${emp.id}-${date}`) ?? [];
                  return (
                    <td key={di} className={cellShifts.length === 0 ? 'empty-cell' : 'day-cell'}>
                      {cellShifts.length === 0 ? '—' : cellShifts.map((s, si) => {
                        const h = calcHours(s.start_time, s.end_time);
                        return (
                          <span key={si} className="shift-pill">
                            <span className="shift-time">
                              {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                            </span>
                            <span className="shift-hours">
                              {h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`}
                            </span>
                            {s.note && <span className="shift-note">{s.note}</span>}
                          </span>
                        );
                      })}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '10px', fontSize: '9px', color: '#aaa', textAlign: 'right', fontFamily: 'monospace' }}>
          Printed {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}

export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#666' }}>
        Loading…
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
