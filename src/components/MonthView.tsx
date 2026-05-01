'use client';

import { useState, useMemo, useRef } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { formatTime } from '@/lib/utils/time';
import { toISODate, isToday, parseISODate } from '@/lib/utils/week';
import type { Shift } from '@/lib/data/types';

interface MonthViewProps {
  onJumpToWeek: (offset: number) => void;
}

function weekOffsetForDate(date: Date): number {
  const jsDay = date.getDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  const targetMonday = new Date(date.getFullYear(), date.getMonth(), date.getDate() + diff);
  const now = new Date();
  const nowDay = now.getDay();
  const nowDiff = nowDay === 0 ? -6 : 1 - nowDay;
  const baseMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + nowDiff);
  return Math.round((targetMonday.getTime() - baseMonday.getTime()) / (7 * 24 * 60 * 60 * 1000));
}

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const EMP_COL = 130;
const DAY_COL = 28;

export default function MonthView({ onJumpToWeek }: MonthViewProps) {
  const { employees, shifts } = useSchedulerContext();
  const [monthOffset, setMonthOffset] = useState(0);

  // Sync horizontal scroll between the pinned header and the body
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef   = useRef<HTMLDivElement>(null);
  const onBodyScroll = () => {
    if (headerRef.current && bodyRef.current)
      headerRef.current.scrollLeft = bodyRef.current.scrollLeft;
  };

  const today = new Date();
  const viewDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month, i + 1);
    const jsDay = d.getDay();
    return {
      date: toISODate(d),
      dayNum: i + 1,
      jsDay,
      isToday: isToday(d),
      isWeekend: jsDay === 0 || jsDay === 6,
      isWeekStart: jsDay === 1 && i > 0,
    };
  }), [year, month, daysInMonth]);

  const shiftMap = useMemo(() => {
    const map: Record<string, Record<string, Shift[]>> = {};
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    for (const s of shifts) {
      if (!s.date.startsWith(prefix)) continue;
      if (!map[s.date]) map[s.date] = {};
      if (!map[s.date][s.employeeId]) map[s.date][s.employeeId] = [];
      map[s.date][s.employeeId].push(s);
    }
    return map;
  }, [shifts, year, month]);

  const monthStats = useMemo(() => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const ms = shifts.filter(s => s.date.startsWith(prefix));
    return { total: ms.length, staff: new Set(ms.map(s => s.employeeId)).size };
  }, [shifts, year, month]);

  const totalWidth = EMP_COL + DAY_COL * daysInMonth;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)] month-view-root">

      {/* ── Nav bar ── */}
      <div className="month-nav px-4 sm:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2 flex-shrink-0">
        <button onClick={() => setMonthOffset(o => o - 1)}
          className="w-7 h-7 rounded-md text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="font-mono text-[14px] font-semibold text-[var(--color-text)] w-40 text-center select-none">{monthLabel}</span>
        <button onClick={() => setMonthOffset(o => o + 1)}
          className="w-7 h-7 rounded-md text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex items-center justify-center flex-shrink-0">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {monthOffset !== 0 && (
          <button onClick={() => setMonthOffset(0)}
            className="text-[12px] font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors ml-1">
            Today
          </button>
        )}
        <div className="ml-auto flex items-center gap-3 text-[12px] text-[var(--color-muted)]">
          <span><span className="font-semibold text-[var(--color-text)]">{monthStats.total}</span> shifts</span>
          <span className="hidden sm:inline"><span className="font-semibold text-[var(--color-text)]">{monthStats.staff}</span> staff</span>
          <span className="text-[11px] opacity-50 hidden lg:inline">Click a block to open that week</span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all text-[12px] font-medium border border-[var(--color-border-strong)]"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M3 4V2H10V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><rect x="1" y="4" width="11" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M3 10V11H10V10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="9.5" cy="7" r="0.75" fill="currentColor"/></svg>
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ── Pinned day-header (scrolls with body via ref sync) ── */}
      <div
        ref={headerRef}
        className="flex-shrink-0 overflow-x-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]"
      >
        <div className="flex" style={{ width: totalWidth }}>
          {/* Employee column header */}
          <div
            className="flex-shrink-0 flex items-end px-3 pb-2 pt-2 border-r border-[var(--color-border)]"
            style={{ width: EMP_COL }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Employee</span>
          </div>
          {/* Day columns */}
          {days.map(d => (
            <div
              key={d.date}
              style={{ width: DAY_COL }}
              className={`flex-shrink-0 flex flex-col items-center justify-end pb-2 pt-1
                ${d.isWeekStart ? 'border-l-2 border-l-[var(--color-border-strong)]' : 'border-l border-l-[var(--color-border)]'}
                ${d.isWeekend ? 'bg-[var(--color-bg)]' : ''}
              `}
            >
              <span className={`text-[9px] font-bold uppercase leading-none mb-0.5 ${d.isWeekend ? 'text-[var(--color-muted)]' : 'text-[var(--color-text-2)]'}`}>
                {DAY_LETTERS[d.jsDay]}
              </span>
              <span className={`text-[13px] font-mono font-bold leading-none ${d.isToday ? 'text-[var(--color-accent)]' : d.isWeekend ? 'text-[var(--color-text-2)]' : 'text-[var(--color-text)]'}`}>
                {d.dayNum}
              </span>
              {d.isToday && <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] mt-0.5" />}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable body ── */}
      {/* overflow-x-auto for wide months, overflow-y-auto for many employees.
          minHeight: 100% on the inner lets flex-1 rows fill available space;
          when rows exceed the container they scroll vertically instead. */}
      <div
        ref={bodyRef}
        onScroll={onBodyScroll}
        className="flex-1 overflow-x-auto overflow-y-auto"
      >
        <div
          className="flex flex-col"
          style={{ width: totalWidth, minHeight: '100%' }}
        >
          {employees.map((emp, idx) => (
            <div
              key={emp.id}
              className={`flex flex-1 border-b border-[var(--color-border)] ${idx % 2 === 0 ? 'bg-white' : 'bg-[var(--color-surface)]'}`}
              style={{ minHeight: 52 }}
            >
              {/* Employee name */}
              <div
                className="flex-shrink-0 flex items-center gap-2 px-3 border-r border-[var(--color-border)]"
                style={{ width: EMP_COL }}
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                <span className="text-[13px] font-semibold text-[var(--color-text)] truncate">{emp.name}</span>
              </div>

              {/* Day cells */}
              {days.map(d => {
                const dayShifts = shiftMap[d.date]?.[emp.id] ?? [];
                const hasShift = dayShifts.length > 0;
                const shift = dayShifts[0];
                const tooltip = hasShift
                  ? `${emp.name} · ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}${shift.note ? ` · ${shift.note}` : ''}`
                  : undefined;
                const weekOff = hasShift ? weekOffsetForDate(parseISODate(d.date)) : 0;

                return (
                  <div
                    key={d.date}
                    title={tooltip}
                    onClick={hasShift ? () => onJumpToWeek(weekOff) : undefined}
                    style={{ width: DAY_COL }}
                    className={`flex-shrink-0 flex items-center justify-center
                      ${d.isWeekStart ? 'border-l-2 border-l-[var(--color-border-strong)]' : 'border-l border-l-[var(--color-border)]'}
                      ${d.isWeekend ? 'bg-black/[0.015]' : ''}
                      ${d.isToday ? 'bg-[var(--color-accent-subtle)]' : ''}
                      ${hasShift ? 'cursor-pointer group' : ''}
                    `}
                  >
                    {hasShift ? (
                      <div
                        className="rounded-sm transition-all group-hover:brightness-110 group-hover:scale-110"
                        style={{ backgroundColor: emp.color, width: 18, height: 26 }}
                      />
                    ) : (
                      <div className="w-4 h-px bg-[var(--color-border)]" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="month-legend px-4 sm:px-6 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-4 flex-wrap flex-shrink-0">
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: emp.color }} />
            <span className="text-[11px] text-[var(--color-text-2)]">{emp.name}</span>
          </div>
        ))}
      </div>

      <style>{`
        @media print {
          @page { size: landscape; margin: 10mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          header, .month-nav, .month-legend { display: none !important; }
        }
      `}</style>
    </div>
  );
}
