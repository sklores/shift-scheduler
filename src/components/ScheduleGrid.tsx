'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSchedulerContext } from '@/context/SchedulerContext';
import { DAYS, ROLE_COLORS } from '@/lib/data/types';
import { isToday, getDateForCell, toISODate } from '@/lib/utils/week';
import { employeeWeeklyHours, employeeWeeklyCost, formatCurrency } from '@/lib/utils/cost';
import { calcHours } from '@/lib/utils/time';
import { isOvertime, OT_THRESHOLD_HOURS } from '@/lib/utils/conflicts';
import ShiftBlock from './ShiftBlock';
import type { ToastTipsData } from './Scheduler';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const EMP_ORDER_KEY = 'shift_employee_order';

interface ScheduleGridProps {
  onAddShift: (empId: string | null, date: string | null) => void;
  onEditShift: (shiftId: string) => void;
  onDeleteShift: (shiftId: string) => void;
  toastTips?: ToastTipsData | null;
  tipsLoading?: boolean;
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function loadOrder(): string[] {
  try { return JSON.parse(localStorage.getItem(EMP_ORDER_KEY) ?? '[]'); } catch { return []; }
}

function saveOrder(ids: string[]) {
  localStorage.setItem(EMP_ORDER_KEY, JSON.stringify(ids));
}

export default function ScheduleGrid(props: ScheduleGridProps) {
  return (
    <>
      <div className="hidden md:flex flex-1 overflow-hidden">
        <DesktopGrid {...props} />
      </div>
      <div className="flex md:hidden flex-1 overflow-auto">
        <MobileDayList {...props} />
      </div>
    </>
  );
}

// ──────────────────────────────
// Desktop Grid
// ──────────────────────────────
interface ShiftClipboard { startTime: string; endTime: string; note: string; }

function DesktopGrid({ onAddShift, onEditShift, onDeleteShift, toastTips, tipsLoading }: ScheduleGridProps) {
  const { employees, weekDates, weekOffset, currentWeekShifts, getShiftsForCell, moveShift, changeWeek, conflictingShiftIds, addShift, isDateBlocked, getBlocksForEmployee, removeAvailabilityBlock } = useSchedulerContext();

  // Shift drag state
  const [dragTarget, setDragTarget] = useState<string | null>(null);

  // Employee row drag-to-reorder state
  const [rowDragSrc, setRowDragSrc] = useState<string | null>(null);
  const [rowDragOver, setRowDragOver] = useState<string | null>(null);

  // Employee order (persisted in localStorage)
  const [empOrder, setEmpOrder] = useState<string[]>([]);
  useEffect(() => { setEmpOrder(loadOrder()); }, []);

  const sortedEmployees = useMemo(() => {
    if (!empOrder.length) return employees;
    return [...employees].sort((a, b) => {
      const ai = empOrder.indexOf(a.id);
      const bi = empOrder.indexOf(b.id);
      return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
    });
  }, [employees, empOrder]);

  const handleRowDrop = (targetId: string) => {
    if (!rowDragSrc || rowDragSrc === targetId) { setRowDragSrc(null); setRowDragOver(null); return; }
    const ids = sortedEmployees.map(e => e.id);
    const srcIdx = ids.indexOf(rowDragSrc);
    const dstIdx = ids.indexOf(targetId);
    ids.splice(srcIdx, 1);
    ids.splice(dstIdx, 0, rowDragSrc);
    setEmpOrder(ids);
    saveOrder(ids);
    setRowDragSrc(null);
    setRowDragOver(null);
  };

  const [focusedCell, setFocusedCell] = useState<{ row: number; col: number }>({ row: 0, col: 0 });
  const [clipboard, setClipboard] = useState<ShiftClipboard | null>(null);
  const cellRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (sortedEmployees.length === 0) return;
    setFocusedCell(f => ({
      row: Math.min(f.row, sortedEmployees.length - 1),
      col: Math.max(0, Math.min(6, f.col)),
    }));
  }, [sortedEmployees.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target.isContentEditable) return;
      }
      if (document.querySelector('[data-overlay]')) return;
      if (sortedEmployees.length === 0) return;

      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); setFocusedCell(f => f.col === 0 ? f : { ...f, col: f.col - 1 }); break;
        case 'ArrowRight': e.preventDefault(); setFocusedCell(f => f.col === 6 ? f : { ...f, col: f.col + 1 }); break;
        case 'ArrowUp': e.preventDefault(); setFocusedCell(f => f.row === 0 ? f : { ...f, row: f.row - 1 }); break;
        case 'ArrowDown': e.preventDefault(); setFocusedCell(f => f.row >= sortedEmployees.length - 1 ? f : { ...f, row: f.row + 1 }); break;
        case 'Enter': {
          e.preventDefault();
          const emp = sortedEmployees[focusedCell.row];
          if (emp) {
            const date = getDateForCell(weekOffset, focusedCell.col);
            const occupied = currentWeekShifts.some(s => s.employeeId === emp.id && s.date === date);
            if (!occupied) onAddShift(emp.id, date);
          }
          break;
        }
        case 'e': case 'E': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const emp = sortedEmployees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) { e.preventDefault(); onEditShift(cellShifts[0].id); }
          break;
        }
        case 'Delete': case 'Backspace': {
          const emp = sortedEmployees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) { e.preventDefault(); onDeleteShift(cellShifts[0].id); }
          break;
        }
        case 'c': case 'C': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          const emp = sortedEmployees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const cellShifts = currentWeekShifts.filter(s => s.employeeId === emp.id && s.date === date);
          if (cellShifts.length > 0) { e.preventDefault(); const s = cellShifts[0]; setClipboard({ startTime: s.startTime, endTime: s.endTime, note: s.note }); }
          break;
        }
        case 'v': case 'V': {
          if (e.metaKey || e.ctrlKey || e.altKey) return;
          if (!clipboard) return;
          const emp = sortedEmployees[focusedCell.row];
          if (!emp) return;
          const date = getDateForCell(weekOffset, focusedCell.col);
          const occupied = currentWeekShifts.some(s => s.employeeId === emp.id && s.date === date);
          if (occupied) return;
          e.preventDefault();
          addShift({ employeeId: emp.id, date, startTime: clipboard.startTime, endTime: clipboard.endTime, note: clipboard.note });
          break;
        }
        case '[': e.preventDefault(); changeWeek(-1); break;
        case ']': e.preventDefault(); changeWeek(1); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sortedEmployees, currentWeekShifts, focusedCell, weekOffset, onAddShift, onEditShift, onDeleteShift, changeWeek, addShift, clipboard]);

  useEffect(() => {
    const key = `${focusedCell.row}-${focusedCell.col}`;
    const el = cellRefs.current.get(key);
    if (el) el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [focusedCell]);

  if (sortedEmployees.length === 0) return <EmptyState />;

  return (
    <div className="flex-1 overflow-auto">
      <div
        className="min-w-[900px] grid bg-[var(--color-surface)]"
        style={{
          gridTemplateColumns: '220px repeat(7, minmax(130px, 1fr))',
          gridTemplateRows: '76px',
          gridAutoRows: '100px',
        }}
      >
        {/* Staff column header */}
        <div className="sticky left-0 top-0 z-20 bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] flex items-center px-4 text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--color-muted)]">
          Staff
        </div>

        {/* Day headers */}
        {weekDates.map((date, i) => {
          const today = isToday(date);
          const iso = toISODate(date);
          const dayShifts = currentWeekShifts.filter(s => s.date === iso);
          const dayHours = dayShifts.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);
          return (
            <div key={i} className="border-r border-b border-[var(--color-border)] last:border-r-0 bg-[var(--color-surface)] sticky top-0 z-10 px-3 py-2.5 text-center">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-muted)]">{DAYS[i]}</div>
              <div className={`text-[22px] font-semibold leading-tight mt-0.5 ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>{date.getDate()}</div>
              {/* Shift density dots + hours */}
              <div className="flex items-center justify-center gap-1 mt-1.5 h-4">
                {dayShifts.length > 0 ? (
                  <>
                    <div className="flex items-center gap-[3px]">
                      {Array.from({ length: Math.min(dayShifts.length, 5) }).map((_, di) => (
                        <span
                          key={di}
                          className={`inline-block w-[5px] h-[5px] rounded-full ${today ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border-strong)]'}`}
                        />
                      ))}
                      {dayShifts.length > 5 && (
                        <span className={`text-[9px] font-mono ml-0.5 ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>+{dayShifts.length - 5}</span>
                      )}
                    </div>
                    <span className={`font-mono text-[10px] ${today ? 'text-[var(--color-accent)]/70' : 'text-[var(--color-muted)]'}`}>{dayHours.toFixed(0)}h</span>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}

        {/* Employee rows */}
        {sortedEmployees.map((emp, rowIdx) => {
          const weeklyHrs = employeeWeeklyHours(emp.id, currentWeekShifts);
          const weeklyCost = employeeWeeklyCost(emp.id, currentWeekShifts, employees);
          const isRowDragSrc = rowDragSrc === emp.id;
          const isRowDragTarget = rowDragOver === emp.id && rowDragSrc !== emp.id;

          return (
            <React.Fragment key={emp.id}>
              {/* Sticky staff cell — draggable for row reorder */}
              <div
                className={`sticky left-0 z-[9] bg-[var(--color-surface)] border-r border-b border-[var(--color-border)] px-3 flex items-center gap-2.5 transition-colors cursor-grab active:cursor-grabbing
                  ${isRowDragSrc ? 'opacity-40' : ''}
                  ${isRowDragTarget ? 'border-t-2 border-t-[var(--color-accent)]' : 'hover:bg-[var(--color-surface-2)]'}
                `}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/employee-id', emp.id);
                  e.dataTransfer.effectAllowed = 'move';
                  setRowDragSrc(emp.id);
                }}
                onDragEnd={() => { setRowDragSrc(null); setRowDragOver(null); }}
                onDragOver={(e) => {
                  if (!e.dataTransfer.types.includes('text/employee-id')) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setRowDragOver(emp.id);
                }}
                onDragLeave={(e) => {
                  if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                    setRowDragOver(prev => prev === emp.id ? null : prev);
                  }
                }}
                onDrop={(e) => {
                  const srcId = e.dataTransfer.getData('text/employee-id');
                  if (srcId) { e.preventDefault(); handleRowDrop(emp.id); }
                }}
              >
                {/* Grip handle */}
                <div className="text-[var(--color-border-strong)] flex-shrink-0 opacity-50 hover:opacity-100" title="Drag to reorder">
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                    <circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/>
                    <circle cx="2.5" cy="7" r="1.5"/><circle cx="7.5" cy="7" r="1.5"/>
                    <circle cx="2.5" cy="11.5" r="1.5"/><circle cx="7.5" cy="11.5" r="1.5"/>
                  </svg>
                </div>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-semibold text-white flex-shrink-0 ring-2 ring-white"
                  style={{ backgroundColor: ROLE_COLORS[emp.role] }}
                >
                  {initials(emp.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold truncate text-[var(--color-text)]">{emp.name}</div>
                  <div className="text-[11.5px] text-[var(--color-muted)] capitalize">{emp.role}</div>
                </div>
                <div className="text-right font-mono text-[11.5px] flex-shrink-0">
                  <div className={`flex items-center gap-1 justify-end ${isOvertime(weeklyHrs) ? 'text-[var(--color-warn)] font-semibold' : 'text-[var(--color-muted)]'}`}
                    title={isOvertime(weeklyHrs) ? `${weeklyHrs.toFixed(0)}h — ${(weeklyHrs - OT_THRESHOLD_HOURS).toFixed(0)}h over 40` : undefined}>
                    {isOvertime(weeklyHrs) && <span aria-label="Overtime">&#9888;</span>}
                    <span>{weeklyHrs.toFixed(0)}h</span>
                  </div>
                  <div className="text-[var(--color-accent)] font-semibold">{formatCurrency(weeklyCost)}</div>
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
                    ref={(el) => { if (el) cellRefs.current.set(refKey, el); else cellRefs.current.delete(refKey); }}
                    className={`group/cell border-r border-b border-[var(--color-border)] last:border-r-0 p-1.5 transition-colors overflow-hidden relative flex flex-col justify-center ${
                      isAlt ? 'bg-[#fafaf7]' : 'bg-[var(--color-surface)]'
                    } ${isDragOver ? 'drag-over' : ''} ${isFocused ? 'kbd-focused' : ''}`}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('[data-shift-block]') || target.closest('[data-add-btn]')) return;
                      setFocusedCell({ row: rowIdx, col: dayIdx });
                      if (cellShifts.length === 0) onAddShift(emp.id, cellDate);
                    }}
                    onDoubleClick={() => { if (cellShifts.length === 0) onAddShift(emp.id, cellDate); }}
                    onDragOver={(e) => {
                      // Ignore employee row drags
                      if (e.dataTransfer.types.includes('text/employee-id')) return;
                      // Block drops onto occupied cells (unless it's the same shift being moved)
                      const draggingId = e.dataTransfer.types.includes('text/shift-id') ? 'pending' : null;
                      if (cellShifts.length > 0 && draggingId) {
                        e.dataTransfer.dropEffect = 'none';
                        return;
                      }
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragTarget !== cellKey) setDragTarget(cellKey);
                    }}
                    onDragLeave={() => { setDragTarget(prev => prev === cellKey ? null : prev); }}
                    onDrop={async (e) => {
                      if (e.dataTransfer.types.includes('text/employee-id')) return;
                      e.preventDefault();
                      setDragTarget(null);
                      const shiftId = e.dataTransfer.getData('text/shift-id');
                      if (!shiftId) return;
                      // Block drop if cell is occupied by a *different* shift
                      const alreadyOccupied = cellShifts.some(s => s.id !== shiftId);
                      if (alreadyOccupied) return;
                      await moveShift(shiftId, emp.id, cellDate);
                    }}
                  >
                    {blocked && blockRecord ? (
                      <div className="group/block relative flex flex-col gap-1">
                        <div className="w-full rounded-md bg-[#1F1B16] text-white text-[10.5px] font-semibold text-center py-1.5 px-2 flex items-center justify-between gap-1 cursor-pointer select-none" title="Click × to remove">
                          <span className="flex-1 text-center uppercase tracking-wide">Unavailable</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeAvailabilityBlock(blockRecord.id); }}
                            className="opacity-0 group-hover/block:opacity-100 transition-opacity text-white/60 hover:text-white text-base leading-none flex-shrink-0 -mr-0.5"
                            aria-label="Remove unavailable"
                          >&times;</button>
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
                        <div className="flex flex-col gap-1 overflow-auto pr-0.5">
                          {cellShifts.map(shift => (
                            <ShiftBlock key={shift.id} shift={shift} employee={emp} onEdit={onEditShift} onDelete={onDeleteShift} compact conflict={conflictingShiftIds.has(shift.id)} />
                          ))}
                        </div>
                        {/* + button: hidden until hover, gone entirely when occupied */}
                        {cellShifts.length === 0 && (
                          <button
                            data-add-btn
                            className="block w-full border border-dashed border-[var(--color-border-strong)] text-[var(--color-muted)] rounded-md text-[12px] text-center py-1 mt-1 opacity-0 group-hover/cell:opacity-100 hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] hover:bg-[var(--color-accent-subtle)] transition-all"
                            onClick={(e) => { e.stopPropagation(); onAddShift(emp.id, cellDate); }}
                          >+</button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}

        {/* Tips row — pinned at bottom, shows per-day totals from Toast */}
        <div className="sticky left-0 z-[9] bg-[var(--color-surface-2)] border-r border-b border-[var(--color-border)] px-4 flex items-center gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)] flex items-center gap-1 mb-1">
              Tips
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF4C00]" title="Live from Toast" />
            </div>
            <div className="font-mono text-[15px] font-semibold text-[var(--color-text)]">
              {tipsLoading ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-[var(--color-border-strong)] border-t-[var(--color-text)] rounded-full animate-spin align-middle" />
              ) : toastTips ? (
                formatCurrency(toastTips.total)
              ) : '—'}
            </div>
            <div className="text-[11px] text-[var(--color-muted)] mt-0.5">Weekly total</div>
          </div>
        </div>
        {Array.from({ length: 7 }, (_, i) => {
          const dayTips = toastTips?.byDay[DAY_LABELS[i]] ?? null;
          return (
            <div key={i} className="border-r border-b border-[var(--color-border)] last:border-r-0 bg-[var(--color-surface-2)] flex items-center justify-center px-2">
              {tipsLoading ? (
                <span className="inline-block w-3 h-3 border-2 border-[var(--color-border-strong)] border-t-[var(--color-muted)] rounded-full animate-spin" />
              ) : (
                <span className={`font-mono text-[14px] font-medium ${dayTips && dayTips > 0 ? 'text-[var(--color-text)]' : 'text-[var(--color-border-strong)]'}`}>
                  {dayTips && dayTips > 0 ? formatCurrency(dayTips) : '—'}
                </span>
              )}
            </div>
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

  if (employees.length === 0) return <EmptyState />;

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
                <div className={`font-mono text-[11px] uppercase tracking-[0.12em] ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>{DAYS[dayIdx]}</div>
                <div className={`text-lg font-semibold ${today ? 'text-[var(--color-accent)]' : 'text-[var(--color-text)]'}`}>{date.getDate()}</div>
              </div>
              <div className="font-mono text-[11px] text-[var(--color-muted)]">
                {dayShifts.length > 0 ? `${dayHours.toFixed(0)}h · ${dayShifts.length} shifts` : 'No shifts'}
              </div>
            </div>
            <div className="px-4 py-3 space-y-2 bg-[var(--color-surface)]">
              {dayShifts.map(shift => {
                const emp = getEmployeeById(shift.employeeId);
                return (
                  <ShiftBlock key={shift.id} shift={shift} employee={emp} onEdit={onEditShift} onDelete={onDeleteShift} showEmployeeName draggable={false} conflict={conflictingShiftIds.has(shift.id)} />
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
