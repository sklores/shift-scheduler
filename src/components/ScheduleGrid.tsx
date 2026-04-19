'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { DAYS, ROLE_COLORS } from '@/lib/data/types';
import { isToday, getDateForCell, toISODate } from '@/lib/utils/week';
import { employeeWeeklyHours, employeeWeeklyCost, formatCurrency } from '@/lib/utils/cost';
import { calcHours } from '@/lib/utils/time';
import { isOvertime, OT_THRESHOLD_HOURS } from '@/lib/utils/conflicts';
import ShiftBlock from './ShiftBlock';

interface ScheduleGridProps {
  onAddShift: (empId: string | null, date: string | null) => void;
  onEditShift: (shiftId: string) => void;
  onDeleteShift: (shiftId: string) => void;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function ScheduleGrid(props: ScheduleGridProps) {
  return (
    <>
      {/* Desktop grid */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        <DesktopGrid {...props} />
      </div>
      {/* Mobile list */}
      <div className="flex md:hidden flex-1 overflow-auto">
        <MobileDayList {...props} />
      </div>
    </>
  );
}

// ──────────────────────────────
// Desktop Grid
// ──────────────────────────────
interface ShiftClipboard {
  startTime: string;
  endTime: string;
  note: string;
}

function DesktopGrid({ onAddShift, onEditShift, onDeleteShift }: ScheduleGridProps) {
  const { employees, weekDates, weekOffset, currentWeekShifts, getShiftsForCell, moveShift, changeWeek, conflictingShiftIds, addShift, isDateBlocked, getBlocksForEmployee, removeAvailabilityBlock } = useSchedulerContext();
  const [dragTarget, setDragTarget] = useState<string | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [clipboard, setClipboard] = useState<ShiftClipboard | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Clamp focus when employees list shrinks
  useEffect(() => {
    if (employees.length === 0) return;
    setFocusedCell(f => ({
      row: Math.min(f.row, employees.length - 1),
      col: Math.max(0, Math.min(6, f.col)),
    }));
  }, [employees.length]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Skip if user is typing in an input/select/textarea
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      // Skip if any modal/drawer/confirm is open
      if (document.querySelector('[data-overlay]')) return;
      if (employees.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedCell(f => f.col === 0 ? f : { ...f, col: f.col - 1 });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedCell(f => f.col === 6 ? f : { ...f, col: f.col + 1 });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedCell(f => f.row === 0 ? f : { ...f, row: f.row - 1 });
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedCell(f => f.row >= employees.length - 1 ? f : { ...f, row: f.row + 1 });
          break;
        case 'Enter': {
          e.preventDefault();
          const emp = employees[focusedCell.row];
          if (emp) onAddShift(emp.id, getDateForCell(weekOffset, focusedCell.col));
          break;
        }
        case 'e':
        case 'E': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const emp = employees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) {
            e.preventDefault();
            onEditShift(cellShifts[0].id);
          }
          break;
        }
        case 'Delete':
        case 'Backspace': {
          const emp = employees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) {
            e.preventDefault();
            onDeleteShift(cellShifts[0].id);
          }
          break;
        }
        case 'c':
        case 'C': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const emp = employees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) {
            e.preventDefault();
            const s = cellShifts[0];
            setClipboard({ startTime: s.startTime, endTime: s.endTime, note: s.note });
          }
          break;
        }
        case 'v':
        case 'V': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (!clipboard) return;
          const emp = employees[focusedCell.row];
          if (!emp) return;
          e.preventDefault();
          addShift({
            employeeId: emp.id,
            date: getDateForCell(weekOffset, focusedCell.col),
            startTime: clipboard.startTime,
            endTime: clipboard.endTime,
            note: clipboard.note,
          });
          break;
        }
        case '[':
          e.preventDefault();
          changeWeek(-1);
          break;
        case ']':
          e.preventDefault();
          changeWeek(1);
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [employees, currentWeekShifts, focusedCell, weekOffset, onAddShift, onEditShift, onDeleteShift, changeWeek, addShift, clipboard]);

  // Scroll focused cell into view when focus moves
  useEffect(() => {
    const key = `${focusedCell.row}-${focusedCell.col}`;
    const el = cellRefs.current.get(key);
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    }
  }, [focusedCell]);

  if (employees.length === 0) {
    return (
      <EmptyState />
    );
  }

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="min-w-[900px] grid bg-[var(--color-surface)]"
        style={{
          gridTemplateColumns: '220px repeat(7, minmax(130px, 1fr))',
          gridTemplateRows: '72px',
          gridAutoRows: '96px',
        }}
      >
        {/* Staff column header */}
        <div className="sticky left-0 top-0 z-20 bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] flex items-center px-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
          Staff
        </div>

        {/* Day headers */}
        {weekDates.map((date, i) => {
          const today = isToday(date);
          const iso = toISODate(date);
          const dayShifts = currentWeekShifts.filter(s => s.date === iso);
          const dayHours = dayShifts.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);

          return (
            <div
              key={i}
              className="border-r border-b border-[var(--color-border)] last:border-r-0 bg-[var(--color-surface)] sticky top-0 z-10 px-3 py-2.5 text-center"
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--color-muted)]">
                {DAYS[i]}
              </div>
              <div className={`text-[20px] font-semibold leading-tight mt-0.5 ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                {date.getDate()}
              </div>
              <div className="font-mono text-[10px] text-[var(--color-muted)] mt-0.5 h-3.5">
                {dayShifts.length > 0 ? `${dayHours.toFixed(0)}h · ${dayShifts.length}` : ''}
              </div>
            </div>
          );
        })}

        {/* Employee rows */}
        {employees.map((emp, rowIdx) => {
          const weeklyHrs = employeeWeeklyHours(emp.id, currentWeekShifts);
          const weeklyCost = employeeWeeklyCost(emp.id, currentWeekShifts, employees);

          return (
            <React.Fragment key={emp.id}>
              {/* Sticky staff cell */}
              <div className="sticky left-0 z-[9] bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] px-4 flex items-center gap-3 hover:bg-[var(--color-surface-2)] transition-colors">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ring-2 ring-white"
                  style={{ backgroundColor: ROLE_COLORS[emp.role] }}
                >
                  {initials(emp.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate text-[var(--color-text)]">{emp.name}</div>
                  <div className="text-[11px] text-[var(--color-muted)] capitalize">{emp.role}</div>
                </div>
                <div className="text-right font-mono text-[11px] flex-shrink-0">
                  <div className={`flex items-center gap-1 justify-end ${isOvertime(weeklyHrs) ? 'text-[var(--color-warn)] font-semibold' : 'text-[var(--color-muted)]'}`}
                       title={isOvertime(weeklyHrs) ? `${weeklyHrs.toFixed(0)}h — ${(weeklyHrs - OT_THRESHOLD_HOURS).toFixed(0)}h over 40` : undefined}>
                    {isOvertime(weeklyHrs) && <span aria-label="Overtime">&#9888;</span>}
                    <span>{weeklyHrs.toFixed(0)}h</span>
                  </div>
                  <div className="text-[var(--color-accent)] font-semibold">
                    {formatCurrency(weeklyCost)}
                  </div>
                </div>
              </div>

              {/* Day cells */}
              {Array.from({ length: 7 }, (_, dayIdx) => {
                const cellDate = getDateForCell(weekOffset, dayIdx);
                const cellShifts = getShiftsForCell(emp.id, cellDate);
                const isAlt = rowIdx % 2 === 1;
                const cellKey = `${emp.id}-${cellDate}`;
                const isDragOver = dragTarget === cellKey;
                const isFocused = focusedCell.row === rowIdx && focusedCell.col === dayIdx;
                const refKey = `${rowIdx}-${dayIdx}`;
                const blocked = isDateBlocked(emp.id, cellDate);
                const blockRecord = blocked
                  ? getBlocksForEmployee(emp.id).find(b => b.startsOn <= cellDate && b.endsOn >= cellDate)
                  : null;

                return (
                  <div
                    key={cellKey}
                    ref={(el) => {
                      if (el) cellRefs.current.set(refKey, el);
                      else cellRefs.current.delete(refKey);
                    }}
                    className={`border-r border-b border-[var(--color-border)] last:border-r-0 p-1.5 transition-colors overflow-hidden relative ${
                      isAlt ? 'bg-[#fafaf7]' : 'bg-[var(--color-surface)]'
                    } ${isDragOver ? 'drag-over' : ''} ${isFocused ? 'kbd-focused' : ''}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-shift-block]') || target.closest('[data-add-btn]')) return;
                      setFocusedCell({ row: rowIdx, col: dayIdx });
                      if (cellShifts.length === 0) {
                        onAddShift(emp.id, cellDate);
                      }
                    }}
                    onDoubleClick={() => onAddShift(emp.id, cellDate)}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragTarget !== cellKey) setDragTarget(cellKey);
                    }}
                    onDragLeave={() => {
                      setDragTarget(prev => prev === cellKey ? null : prev);
                    }}
                    onDrop={async (e) => {
                      e.preventDefault();
                      setDragTarget(null);
                      const shiftId = e.dataTransfer.getData('text/shift-id');
                      if (shiftId) await moveShift(shiftId, emp.id, cellDate);
                    }}
                  >
                    {blocked && blockRecord ? (
                      /* Unavailable block */
                      <div className="group relative flex flex-col gap-1">
                        <div
                          className="w-full rounded-md bg-[#1F1B16] text-white text-[10.5px] font-semibold text-center py-1.5 px-2 flex items-center justify-between gap-1 cursor-pointer select-none"
                          title="Click × to remove"
                        >
                          <span className="flex-1 text-center uppercase tracking-wide">Unavailable</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeAvailabilityBlock(blockRecord.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-white/60 hover:text-white text-base leading-none flex-shrink-0 -mr-0.5"
                            aria-label="Remove unavailable"
                          >
                            &times;
                          </button>
                        </div>
                        {cellShifts.length > 0 && (
                          <div className="flex flex-col gap-1 max-h-[40px] overflow-auto pr-0.5">
                            {cellShifts.map(shift => (
                              <ShiftBlock key={shift.id} shift={shift} employee={emp} onEdit={onEditShift} onDelete={onDeleteShift} compact conflict={conflictingShiftIds.has(shift.id)} />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1 max-h-[60px] overflow-auto pr-0.5">
                          {cellShifts.map(shift => (
                            <ShiftBlock key={shift.id} shift={shift} employee={emp} onEdit={onEditShift} onDelete={onDeleteShift} compact conflict={conflictingShiftIds.has(shift.id)} />
                          ))}
                        </div>
                        <button
                          data-add-btn
                          className="block w-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)] rounded-md text-[11px] text-center py-[3px] mt-1 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all"
                          onClick={(e) => { e.stopPropagation(); onAddShift(emp.id, cellDate); }}
                        >
                          +
                        </button>
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────
// Mobile Day List
// ──────────────────────────────
function MobileDayList({ onAddShift, onEditShift, onDeleteShift }: ScheduleGridProps) {
  const { employees, currentWeekShifts, weekDates, weekOffset, getEmployeeById, conflictingShiftIds } = useSchedulerContext();

  if (employees.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="flex-1 w-full pb-20">
      {weekDates.map((date, dayIdx) => {
        const iso = toISODate(date);
        const dayShifts = currentWeekShifts
          .filter(s => s.date === iso)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));
        const dayHours = dayShifts.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);
        const today = isToday(date);

        return (
          <div key={dayIdx} className="border-b border-[var(--color-border)]">
            <div className={`px-4 py-3 flex items-baseline justify-between sticky top-0 z-10 ${today ? 'bg-[var(--color-accent-subtle)]' : 'bg-[var(--color-surface-2)]'}`}>
              <div className="flex items-baseline gap-2.5">
                <div className={`font-mono text-[11px] uppercase tracking-[0.12em] ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                  {DAYS[dayIdx]}
                </div>
                <div className={`text-lg font-semibold ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>
                  {date.getDate()}
                </div>
              </div>
              <div className="font-mono text-[11px] text-[var(--color-muted)]">
                {dayShifts.length > 0 ? `${dayHours.toFixed(0)}h · ${dayShifts.length} shifts` : 'No shifts'}
              </div>
            </div>

            <div className="px-4 py-3 space-y-2 bg-[var(--color-surface)]">
              {dayShifts.map(shift => {
                const emp = getEmployeeById(shift.employeeId);
                return (
                  <ShiftBlock
                    key={shift.id}
                    shift={shift}
                    employee={emp}
                    onEdit={onEditShift}
                    onDelete={onDeleteShift}
                    showEmployeeName
                    draggable={false}
                    conflict={conflictingShiftIds.has(shift.id)}
                  />
                );
              })}
              <button
                onClick={() => onAddShift(null, getDateForCell(weekOffset, dayIdx))}
                className="w-full border border-dashed border-[var(--color-border-strong)] rounded-md py-2.5 text-[12px] text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all"
              >
                + Add shift
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center p-12 text-[var(--color-muted)]">
      <div className="text-center max-w-xs">
        <div className="text-5xl mb-4 opacity-20">&#128197;</div>
        <div className="text-sm font-medium text-[var(--color-text-2)]">No employees yet</div>
        <div className="mt-1 text-[13px] text-[var(--color-muted)]">
          Tap <strong className="text-[var(--color-text)]">Manage Staff</strong> to add your team.
        </div>
      </div>
    </div>
  );
}
