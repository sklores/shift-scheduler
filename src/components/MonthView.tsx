'use client';

import { useState, useMemo } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { formatTime } from '@/lib/utils/time';
import { toISODate, isToday, parseISODate } from '@/lib/utils/week';
import type { Shift } from '@/lib/data/types';

interface MonthViewProps {
  onJumpToWeek: (offset: number) => void;
}

/** Return the week offset (relative to today's week) for any calendar date. */
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

export default function MonthView({ onJumpToWeek }: MonthViewProps) {
  const { employees, shifts } = useSchedulerContext();
  const [monthOffset, setMonthOffset] = useState(0);

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
      // Show a left border to mark week start (Monday)
      isWeekStart: jsDay === 1 && i > 0,
    };
  }), [year, month, daysInMonth]);

  // Build lookup: date -> employeeId -> shifts[]
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[var(--color-bg)]">
      {/* Month nav */}
      <div className="px-4 sm:px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => setMonthOffset(o => o - 1)}
          className="w-7 h-7 rounded-md text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex items-center justify-center flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="font-mono text-[14px] font-semibold text-[var(--color-text)] w-40 text-center">{monthLabel}</span>
        <button
          onClick={() => setMonthOffset(o => o + 1)}
          className="w-7 h-7 rounded-md text-[var(--color-text-2)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)] transition-all flex items-center justify-center flex-shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3L9 7L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        {monthOffset !== 0 && (
          <button
            onClick={() => setMonthOffset(0)}
            className="text-[12px] font-medium text-[var(--color-muted)] hover:text-[var(--color-accent)] transition-colors ml-1"
          >
            Today
          </button>
        )}
        <div className="ml-auto flex items-center gap-4 text-[12px] text-[var(--color-muted)]">
          <span><span className="font-semibold text-[var(--color-text)]">{monthStats.total}</span> shifts</span>
          <span><span className="font-semibold text-[var(--color-text)]">{monthStats.staff}</span> staff scheduled</span>
          <span className="text-[11px] opacity-60 hidden sm:inline">Click any block to open that week</span>
        </div>
      </div>

      {/* Gantt grid */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '128px' }} />
            {days.map(d => (
              <col key={d.date} style={{ width: '32px' }} />
            ))}
          </colgroup>

          {/* Header: day numbers */}
          <thead>
            <tr className="bg-[var(--color-surface)] sticky top-0 z-10">
              <th className="border-b border-r border-[var(--color-border)] px-3 py-2 text-left">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Employee</span>
              </th>
              {days.map(d => (
                <th
                  key={d.date}
                  className={`border-b border-[var(--color-border)] py-2 text-center align-bottom
                    ${d.isWeekStart ? 'border-l-2 border-l-[var(--color-border-strong)]' : 'border-l border-l-[var(--color-border)]'}
                    ${d.isWeekend ? 'bg-[var(--color-bg)]' : ''}
                  `}
                >
                  <div className={`text-[9px] font-semibold uppercase leading-none mb-0.5 ${d.isWeekend ? 'text-[var(--color-muted)]' : 'text-[var(--color-text-2)]'}`}>
                    {DAY_LETTERS[d.jsDay]}
                  </div>
                  <div className={`text-[13px] font-mono font-bold leading-none ${d.isToday ? 'text-[var(--color-accent)]' : d.isWeekend ? 'text-[var(--color-text-2)]' : 'text-[var(--color-text)]'}`}>
                    {d.dayNum}
                  </div>
                  {d.isToday && <div className="w-1 h-1 rounded-full bg-[var(--color-accent)] mx-auto mt-0.5" />}
                </th>
              ))}
            </tr>
          </thead>

          {/* Employee rows */}
          <tbody>
            {employees.map((emp, idx) => (
              <tr
                key={emp.id}
                className={idx % 2 === 0 ? 'bg-white' : 'bg-[var(--color-surface)]'}
              >
                {/* Name cell */}
                <td className="border-b border-r border-[var(--color-border)] px-3 py-0 h-11">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: emp.color }} />
                    <span className="text-[13px] font-semibold text-[var(--color-text)] truncate">{emp.name}</span>
                  </div>
                </td>

                {/* Day cells */}
                {days.map(d => {
                  const dayShifts = shiftMap[d.date]?.[emp.id] ?? [];
                  const hasShift = dayShifts.length > 0;
                  const shift = dayShifts[0];
                  const tooltipText = hasShift
                    ? `${emp.name} · ${formatTime(shift.startTime)}–${formatTime(shift.endTime)}${shift.note ? ` · ${shift.note}` : ''}`
                    : undefined;
                  const weekOffset = hasShift ? weekOffsetForDate(parseISODate(d.date)) : 0;

                  return (
                    <td
                      key={d.date}
                      title={tooltipText}
                      onClick={hasShift ? () => onJumpToWeek(weekOffset) : undefined}
                      className={`border-b border-[var(--color-border)] h-11 text-center align-middle
                        ${d.isWeekStart ? 'border-l-2 border-l-[var(--color-border-strong)]' : 'border-l border-l-[var(--color-border)]'}
                        ${d.isWeekend ? 'bg-black/[0.015]' : ''}
                        ${d.isToday ? 'bg-[var(--color-accent-subtle)]' : ''}
                        ${hasShift ? 'cursor-pointer group' : ''}
                      `}
                    >
                      {hasShift ? (
                        <div
                          className="mx-auto w-5 h-6 rounded-sm transition-all group-hover:w-6 group-hover:brightness-110"
                          style={{ backgroundColor: emp.color }}
                        />
                      ) : (
                        <div className="mx-auto w-4 h-px bg-[var(--color-border)]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 sm:px-6 py-2 border-t border-[var(--color-border)] bg-[var(--color-surface)] flex items-center gap-4 flex-wrap flex-shrink-0">
        {employees.map(emp => (
          <div key={emp.id} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: emp.color }} />
            <span className="text-[11px] text-[var(--color-text-2)]">{emp.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
