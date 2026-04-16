'use client';

import React from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { DAYS } from '@/lib/data/types';
import { isToday } from '@/lib/utils/week';
import { employeeWeeklyHours, employeeWeeklyCost, formatCurrency } from '@/lib/utils/cost';
import ShiftBlock from './ShiftBlock';

interface ScheduleGridProps {
  onAddShift: (empId: string | null, day: number | null) => void;
  onEditShift: (shiftId: string) => void;
  onDeleteShift: (shiftId: string) => void;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ScheduleGrid({ onAddShift, onEditShift, onDeleteShift }: ScheduleGridProps) {
  const { employees, shifts, weekDates, getShiftsForCell } = useSchedulerContext();

  if (employees.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-16 text-[var(--color-muted)] font-mono text-sm">
        <div className="text-center">
          <div className="text-4xl mb-3 opacity-30">&#128197;</div>
          <div>No employees yet.</div>
          <div className="mt-1">Open <strong>Manage Staff</strong> to add your team.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="min-w-[900px] grid"
        style={{
          gridTemplateColumns: '200px repeat(7, minmax(120px, 1fr))',
          gridTemplateRows: '64px',
          gridAutoRows: '84px',
        }}
      >
        {/* Header row: staff column header */}
        <div className="sticky left-0 z-20 bg-[var(--color-surface)] border-r border-b-2 border-[var(--color-border)] flex items-center px-3.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          Staff
        </div>

        {/* Header row: day headers */}
        {weekDates.map((date, i) => {
          const today = isToday(date);
          // Calculate daily totals
          const dayShifts = shifts.filter(s => s.day === i);
          const dayHours = dayShifts.reduce((sum, s) => {
            const [hs, ms] = s.startTime.split(':').map(Number);
            const [he, me] = s.endTime.split(':').map(Number);
            return sum + Math.max(0, (he + me / 60) - (hs + ms / 60));
          }, 0);

          return (
            <div
              key={i}
              className={`border-r border-b-2 border-[var(--color-border)] last:border-r-0 bg-[var(--color-surface)] sticky top-0 z-10 px-2.5 py-2 text-center`}
            >
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-muted)]">
                {DAYS[i]}
              </div>
              <div className={`text-lg font-semibold leading-tight ${today ? 'text-[var(--color-accent)]' : ''}`}>
                {date.getDate()}
              </div>
              <div className="font-mono text-[10px] text-[var(--color-muted)]">
                {dayShifts.length > 0 ? `${dayHours.toFixed(0)}h · ${dayShifts.length}` : ''}
              </div>
            </div>
          );
        })}

        {/* Employee rows */}
        {employees.map((emp, rowIdx) => (
          <React.Fragment key={emp.id}>
            {/* Employee name cell (sticky left) */}
            <div
              className="sticky left-0 z-[9] bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] px-3.5 flex items-center gap-2.5 hover:bg-[var(--color-bg)] transition-colors"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0"
                style={{ backgroundColor: emp.color }}
              >
                {initials(emp.name)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium truncate">{emp.name}</div>
                <div className="text-[11px] text-[var(--color-muted)] capitalize">{emp.role}</div>
              </div>
              <div className="ml-auto text-right font-mono text-[11px] text-[var(--color-muted)] flex-shrink-0">
                <div>{employeeWeeklyHours(emp.id, shifts).toFixed(0)}h</div>
                <div className="text-[var(--color-accent)] font-semibold">
                  {formatCurrency(employeeWeeklyCost(emp.id, shifts, employees))}
                </div>
              </div>
            </div>

            {/* Day cells for this employee */}
            {Array.from({ length: 7 }, (_, dayIdx) => {
              const cellShifts = getShiftsForCell(emp.id, dayIdx);
              const isAlt = rowIdx % 2 === 1;

              return (
                <div
                  key={`cell-${emp.id}-${dayIdx}`}
                  className={`border-r border-b border-[var(--color-border)] last:border-r-0 p-1.5 transition-colors overflow-hidden ${
                    isAlt ? 'bg-[#faf9f6] hover:bg-[#f3f1ec]' : 'bg-[var(--color-surface)] hover:bg-[#fafaf8]'
                  }`}
                  onDoubleClick={() => onAddShift(emp.id, dayIdx)}
                >
                  <div className="flex flex-col gap-1 max-h-[48px] overflow-auto pr-0.5">
                    {cellShifts.map(shift => (
                      <ShiftBlock
                        key={shift.id}
                        shift={shift}
                        employee={emp}
                        onEdit={onEditShift}
                        onDelete={onDeleteShift}
                      />
                    ))}
                  </div>
                  <button
                    className="block w-full border border-dashed border-[var(--color-border)] text-[var(--color-muted)] rounded text-[11px] text-center py-0.5 mt-0.5 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-all"
                    onClick={() => onAddShift(emp.id, dayIdx)}
                  >
                    +
                  </button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
