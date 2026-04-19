'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';

// ─── types ────────────────────────────────────────────────────────────────────
interface Employee { id: string; name: string; role: string }
interface Shift { employee_id: string; shift_date: string; start_time: string; end_time: string; note: string }

const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const ROLE_COLORS: Record<string, string> = {
  manager: '#a02843',
  server:  '#0e7490',
  cashier: '#15803d',
  cook:    '#c2410c',
  host:    '#7c3aed',
  barista: '#6b3e18',
};

// ─── helpers ──────────────────────────────────────────────────────────────────
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
  const m1 = MONTHS[mon.getMonth()];
  const m2 = MONTHS[sun.getMonth()];
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

// ─── inner component (uses useSearchParams, needs Suspense wrapper) ───────────
function PrintContent() {
  const searchParams = useSearchParams();
  const weekStart = searchParams.get('week') ?? '';

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  // Auto-print once data is ready
  useEffect(() => {
    if (!loading && !error && employees.length > 0) {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [loading, error, employees.length]);

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#8A8478' }}>
      Loading schedule…
    </div>
  );

  if (error) return (
    <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#a02843' }}>
      {error}
    </div>
  );

  const dates = weekDates(weekStart);
  const label = weekLabel(weekStart);

  // Build shift lookup: emp_id + date → shifts[]
  const shiftMap = new Map<string, Shift[]>();
  for (const s of shifts) {
    const key = `${s.employee_id}-${s.shift_date}`;
    const arr = shiftMap.get(key) ?? [];
    arr.push(s);
    shiftMap.set(key, arr);
  }

  // Total hours
  const totalHours = shifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
  const totalShifts = shifts.length;

  // Filter employees who have at least one shift this week
  const scheduledEmpIds = new Set(shifts.map(s => s.employee_id));
  const scheduledEmps = employees.filter(e => scheduledEmpIds.has(e.id));

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; }
          @page { margin: 16mm 12mm; size: landscape; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: white; margin: 0; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #E8E3D8; padding: 6px 8px; }
        th { background: #F5F3EE; font-size: 11px; font-weight: 600; }
      `}</style>

      {/* Screen-only toolbar */}
      <div className="no-print" style={{ background: '#1F1B16', color: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '17px', fontWeight: 700 }}>
          sh<span style={{ color: '#C2410C' }}>i</span>ft
        </span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', flex: 1 }}>
          {label} — print preview
        </span>
        <button
          onClick={() => window.print()}
          style={{ background: '#C2410C', color: 'white', border: 'none', borderRadius: '6px', padding: '7px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
        >
          Print
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', padding: '7px 14px', fontSize: '13px', cursor: 'pointer' }}
        >
          Close
        </button>
      </div>

      {/* Schedule */}
      <div style={{ padding: '24px 28px' }}>
        {/* Header */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: 700, letterSpacing: '-0.03em', color: '#1F1B16' }}>
              sh<span style={{ color: '#C2410C' }}>i</span>ft
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1F1B16', marginTop: '2px' }}>
              Week of {label}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '12px', color: '#8A8478', fontFamily: 'monospace' }}>
            <div><strong style={{ color: '#1F1B16' }}>{totalShifts}</strong> shifts &nbsp;·&nbsp; <strong style={{ color: '#1F1B16' }}>{totalHours.toFixed(0)}h</strong> total &nbsp;·&nbsp; <strong style={{ color: '#1F1B16' }}>{scheduledEmps.length}</strong> staff</div>
            <div style={{ marginTop: '2px', opacity: 0.7 }}>schedule.anddone.ai</div>
          </div>
        </div>

        {/* Grid table */}
        <table>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', minWidth: '110px', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Employee
              </th>
              {dates.map((date, i) => {
                const d = new Date(date + 'T00:00:00');
                const dayShifts = shifts.filter(s => s.shift_date === date);
                const dayHrs = dayShifts.reduce((a, s) => a + calcHours(s.start_time, s.end_time), 0);
                return (
                  <th key={i} style={{ textAlign: 'center', minWidth: '90px', fontSize: '10px' }}>
                    <div style={{ letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8A8478' }}>{DAYS[i]}</div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#1F1B16', lineHeight: 1.2 }}>{d.getDate()}</div>
                    {dayShifts.length > 0 && (
                      <div style={{ fontFamily: 'monospace', fontSize: '9px', color: '#8A8478', marginTop: '1px' }}>
                        {dayHrs.toFixed(0)}h · {dayShifts.length}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {scheduledEmps.map((emp, ri) => {
              const color = ROLE_COLORS[emp.role] ?? '#1F1B16';
              return (
                <tr key={emp.id} style={{ background: ri % 2 === 1 ? '#FAFAF7' : 'white' }}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: color, color: 'white',
                        fontSize: '10px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {emp.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1F1B16' }}>{emp.name}</div>
                        <div style={{ fontSize: '10px', color: '#8A8478', textTransform: 'capitalize' }}>{emp.role}</div>
                      </div>
                    </div>
                  </td>
                  {dates.map((date, di) => {
                    const key = `${emp.id}-${date}`;
                    const cellShifts = shiftMap.get(key) ?? [];
                    return (
                      <td key={di} style={{ textAlign: 'center', verticalAlign: 'middle', padding: '5px 6px' }}>
                        {cellShifts.length === 0 ? (
                          <span style={{ color: '#D0CCC3', fontSize: '12px' }}>—</span>
                        ) : cellShifts.map((s, si) => {
                          const h = calcHours(s.start_time, s.end_time);
                          return (
                            <div
                              key={si}
                              style={{
                                background: color,
                                color: 'white',
                                borderRadius: '4px',
                                padding: '3px 5px',
                                marginBottom: si < cellShifts.length - 1 ? '2px' : 0,
                              }}
                            >
                              <div style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                                {fmtTime(s.start_time)}–{fmtTime(s.end_time)}
                              </div>
                              <div style={{ fontSize: '9.5px', opacity: 0.85, fontFamily: 'monospace' }}>
                                {h % 1 === 0 ? `${h}h` : `${h.toFixed(1)}h`}
                              </div>
                              {s.note && (
                                <div style={{ fontSize: '9px', opacity: 0.75, marginTop: '1px' }}>{s.note}</div>
                              )}
                            </div>
                          );
                        })}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div style={{ marginTop: '14px', fontSize: '10px', color: '#B8B3A5', textAlign: 'right', fontFamily: 'monospace' }}>
          Printed from schedule.anddone.ai &nbsp;·&nbsp; {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </>
  );
}

// ─── page export with Suspense boundary ───────────────────────────────────────
export default function PrintPage() {
  return (
    <Suspense fallback={
      <div style={{ fontFamily: 'system-ui', padding: '48px', textAlign: 'center', color: '#8A8478' }}>
        Loading…
      </div>
    }>
      <PrintContent />
    </Suspense>
  );
}
