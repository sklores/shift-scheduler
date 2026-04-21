'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { DataAdapter } from '../data/adapter';
import type { AvailabilityBlock, Employee, Shift, Template, WeekStats } from '../data/types';
import { EMPLOYEE_COLORS } from '../data/types';
import { calculateWeekStats } from '../utils/cost';
import { findConflictingShiftIds } from '../utils/conflicts';
import { getWeekDates, formatWeekLabel, formatWeekLabelCompact, formatWeekStartISO, getDateForCell, toISODate } from '../utils/week';

interface WeekClipboardItem {
  employeeId: string;
  dayIdx: number; // index 0-6 within the COPIED week — gets re-projected onto paste week's actual dates
  startTime: string;
  endTime: string;
  note: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ── Draft mode ──────────────────────────────────────────────────────────────
// Draft shifts are stored in localStorage with a fixed "phantom week"
// (2000-01-03 Mon → 2000-01-09 Sun). When draft mode is active, currentWeekShifts
// re-dates them onto the current visible week so every grid/stat/conflict
// computation works without knowing about draft at all.
const PHANTOM_DATES = [
  '2000-01-03', // Mon
  '2000-01-04', // Tue
  '2000-01-05', // Wed
  '2000-01-06', // Thu
  '2000-01-07', // Fri
  '2000-01-08', // Sat
  '2000-01-09', // Sun
] as const;
const DRAFT_KEY = 'shift_draft_shifts';

function loadDraftFromStorage(): Shift[] {
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '[]'); } catch { return []; }
}
function saveDraftToStorage(s: Shift[]) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(s));
}
function currentDateToPhantomDate(date: string, weekOffset: number): string {
  for (let i = 0; i < 7; i++) {
    if (getDateForCell(weekOffset, i) === date) return PHANTOM_DATES[i];
  }
  // Fallback via day-of-week
  const d = new Date(date + 'T00:00:00');
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1;
  return PHANTOM_DATES[idx];
}
// ────────────────────────────────────────────────────────────────────────────

export function useScheduler(adapter: DataAdapter) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<AvailabilityBlock[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [weekClipboard, setWeekClipboard] = useState<WeekClipboardItem[] | null>(null);

  // Draft mode
  const [isDraftMode, setIsDraftMode] = useState(false);
  const [draftShifts, setDraftShifts] = useState<Shift[]>([]);

  // Save status tracking — updates on every write, fades back to idle after success
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Wrap any write op to track status. Consumer just calls track(() => adapter.addShift(...)).
  const track = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    if (saveTimerRef.current) { clearTimeout(saveTimerRef.current); saveTimerRef.current = null; }
    setSaveStatus('saving');
    setSaveError(null);
    try {
      const result = await fn();
      setSaveStatus('saved');
      saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 1800);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed';
      setSaveStatus('error');
      setSaveError(msg);
      throw err;
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [emps, sh, tmpl, avail] = await Promise.all([
        adapter.getEmployees(),
        adapter.getShifts(),
        adapter.getTemplates(),
        adapter.getAvailabilityBlocks(),
      ]);
      if (!cancelled) {
        setEmployees(emps);
        setShifts(sh);
        setTemplates(tmpl);
        setAvailabilityBlocks(avail);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // --- Employee actions ---
  const addEmployee = useCallback(async (data: Omit<Employee, 'id'>) => {
    const emp = await track(() => adapter.addEmployee(data));
    setEmployees(prev => [...prev, emp]);
    return emp;
  }, [adapter, track]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const emp = await track(() => adapter.updateEmployee(id, updates));
    setEmployees(prev => prev.map(e => e.id === id ? emp : e));
    return emp;
  }, [adapter, track]);

  const removeEmployee = useCallback(async (id: string) => {
    await track(() => adapter.removeEmployee(id));
    setEmployees(prev => prev.filter(e => e.id !== id));
    setShifts(prev => prev.filter(s => s.employeeId !== id));
  }, [adapter, track]);

  // --- Shift actions ---
  const addShift = useCallback(async (data: Omit<Shift, 'id'>) => {
    if (isDraftMode) {
      const phantomDate = currentDateToPhantomDate(data.date, weekOffset);
      const shift: Shift = { ...data, id: crypto.randomUUID(), date: phantomDate };
      setDraftShifts(prev => { const next = [...prev, shift]; saveDraftToStorage(next); return next; });
      return shift;
    }
    const shift = await track(() => adapter.addShift(data));
    setShifts(prev => [...prev, shift]);
    return shift;
  }, [adapter, track, isDraftMode, weekOffset]);

  const updateShift = useCallback(async (id: string, updates: Partial<Shift>) => {
    if (isDraftMode) {
      let updated!: Shift;
      setDraftShifts(prev => {
        const next = prev.map(s => s.id === id ? (updated = { ...s, ...updates }) : s);
        saveDraftToStorage(next);
        return next;
      });
      return updated;
    }
    const shift = await track(() => adapter.updateShift(id, updates));
    setShifts(prev => prev.map(s => s.id === id ? shift : s));
    return shift;
  }, [adapter, track, isDraftMode]);

  const deleteShift = useCallback(async (id: string) => {
    if (isDraftMode) {
      setDraftShifts(prev => { const next = prev.filter(s => s.id !== id); saveDraftToStorage(next); return next; });
      return;
    }
    await track(() => adapter.removeShift(id));
    setShifts(prev => prev.filter(s => s.id !== id));
  }, [adapter, track, isDraftMode]);

  const moveShift = useCallback(async (id: string, newEmployeeId: string, newDate: string) => {
    if (isDraftMode) {
      const phantomDate = currentDateToPhantomDate(newDate, weekOffset);
      setDraftShifts(prev => {
        const next = prev.map(s => s.id === id ? { ...s, employeeId: newEmployeeId, date: phantomDate } : s);
        saveDraftToStorage(next);
        return next;
      });
      return;
    }
    const shift = shifts.find(s => s.id === id);
    if (!shift) return;
    if (shift.employeeId === newEmployeeId && shift.date === newDate) return;
    const updated = await track(() => adapter.updateShift(id, { employeeId: newEmployeeId, date: newDate }));
    setShifts(prev => prev.map(s => s.id === id ? updated : s));
  }, [adapter, shifts, track, isDraftMode, weekOffset]);

  // Week range helpers
  const weekStart = useMemo(() => formatWeekStartISO(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const dates = getWeekDates(weekOffset);
    return toISODate(dates[6]);
  }, [weekOffset]);

  // Only the displayed week's shifts — used by grid, stats, conflicts, etc.
  // In draft mode, phantom-dated draft shifts are re-dated onto the current visible week.
  const currentWeekShifts = useMemo(() => {
    if (isDraftMode) {
      return draftShifts.map(s => {
        const idx = PHANTOM_DATES.indexOf(s.date as typeof PHANTOM_DATES[number]);
        return { ...s, date: idx >= 0 ? getDateForCell(weekOffset, idx) : s.date };
      });
    }
    return shifts.filter(s => s.date >= weekStart && s.date <= weekEnd);
  }, [isDraftMode, draftShifts, shifts, weekStart, weekEnd, weekOffset]);

  const clearWeek = useCallback(async () => {
    if (isDraftMode) {
      setDraftShifts([]); saveDraftToStorage([]);
      return;
    }
    const toDelete = currentWeekShifts.map(s => s.id);
    for (const id of toDelete) await adapter.removeShift(id);
    setShifts(prev => prev.filter(s => !(s.date >= weekStart && s.date <= weekEnd)));
  }, [adapter, currentWeekShifts, weekStart, weekEnd, isDraftMode]);

  // Snapshot displayed week's shifts by their day-index-within-week,
  // so paste projects them onto whichever week the user is viewing when they paste.
  const copyWeek = useCallback(() => {
    if (currentWeekShifts.length === 0) return { copied: 0 };
    const snapshot: WeekClipboardItem[] = currentWeekShifts.map(s => {
      const jsDay = new Date(s.date + 'T00:00:00').getDay(); // 0=Sun
      const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
      return {
        employeeId: s.employeeId,
        dayIdx,
        startTime: s.startTime,
        endTime: s.endTime,
        note: s.note,
      };
    });
    setWeekClipboard(snapshot);
    return { copied: snapshot.length };
  }, [currentWeekShifts]);

  // Apply clipboard items to the currently-displayed week by projecting
  // each item's dayIdx onto this week's actual date. Skip duplicates.
  const pasteWeek = useCallback(async () => {
    if (!weekClipboard || weekClipboard.length === 0) return { added: 0, skipped: 0 };

    const existingKeys = new Set(
      currentWeekShifts.map(s => `${s.employeeId}-${s.date}-${s.startTime}-${s.endTime}`)
    );
    const validEmpIds = new Set(employees.map(e => e.id));

    let added = 0;
    let skipped = 0;
    for (const item of weekClipboard) {
      const date = getDateForCell(weekOffset, item.dayIdx);
      const key = `${item.employeeId}-${date}-${item.startTime}-${item.endTime}`;
      if (existingKeys.has(key) || !validEmpIds.has(item.employeeId)) {
        skipped++;
        continue;
      }
      await adapter.addShift({
        employeeId: item.employeeId,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.note,
      });
      added++;
    }

    const updated = await adapter.getShifts();
    setShifts(updated);
    setWeekClipboard(null);
    return { added, skipped };
  }, [adapter, weekClipboard, currentWeekShifts, employees, weekOffset]);

  const clearWeekClipboard = useCallback(() => setWeekClipboard(null), []);

  // --- Template actions ---
  // Templates store day-of-week (0-6) because they're reusable across weeks.
  /** Save a template from an externally-provided items array (e.g. OCR upload). */
  const saveTemplateFromItems = useCallback(async (name: string, items: import('../data/types').TemplateItem[]) => {
    const template = await adapter.saveTemplate({
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceWeekStart: '',
      items,
    });
    setTemplates(prev => [...prev, template]);
    return template;
  }, [adapter]);

  const saveTemplate = useCallback(async (name: string) => {
    const template = await adapter.saveTemplate({
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceWeekStart: formatWeekStartISO(weekOffset),
      items: currentWeekShifts.map(s => {
        const jsDay = new Date(s.date + 'T00:00:00').getDay();
        const dayIdx = jsDay === 0 ? 6 : jsDay - 1;
        return {
          employeeId: s.employeeId,
          dayIndex: dayIdx,
          startTime: s.startTime,
          endTime: s.endTime,
          note: s.note,
        };
      }),
    });
    setTemplates(prev => [...prev, template]);
    return template;
  }, [adapter, currentWeekShifts, weekOffset]);

  const applyTemplate = useCallback(async (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return { added: 0, skipped: 0 };

    const existingKeys = new Set(
      currentWeekShifts.map(s => `${s.employeeId}-${s.date}-${s.startTime}-${s.endTime}`)
    );
    let added = 0;
    let skipped = 0;

    for (const item of tmpl.items) {
      const date = getDateForCell(weekOffset, item.dayIndex);
      const empExists = employees.some(e => e.id === item.employeeId);
      const key = `${item.employeeId}-${date}-${item.startTime}-${item.endTime}`;
      if (!empExists || existingKeys.has(key)) {
        skipped++;
        continue;
      }
      await adapter.addShift({
        employeeId: item.employeeId,
        date,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.note,
      });
      added++;
    }

    const updatedShifts = await adapter.getShifts();
    setShifts(updatedShifts);
    return { added, skipped };
  }, [adapter, templates, currentWeekShifts, employees, weekOffset]);

  const renameTemplate = useCallback(async (id: string, name: string) => {
    const tmpl = await adapter.updateTemplate(id, { name, updatedAt: Date.now() });
    setTemplates(prev => prev.map(t => t.id === id ? tmpl : t));
  }, [adapter]);

  const deleteTemplate = useCallback(async (id: string) => {
    await adapter.removeTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [adapter]);

  // --- Availability block actions ---
  const addAvailabilityBlock = useCallback(async (data: Omit<AvailabilityBlock, 'id'>) => {
    const block = await track(() => adapter.addAvailabilityBlock(data));
    setAvailabilityBlocks(prev => [...prev, block].sort((a, b) => a.startsOn.localeCompare(b.startsOn)));
    return block;
  }, [adapter, track]);

  const removeAvailabilityBlock = useCallback(async (id: string) => {
    await track(() => adapter.removeAvailabilityBlock(id));
    setAvailabilityBlocks(prev => prev.filter(b => b.id !== id));
  }, [adapter, track]);

  /** Returns true if the employee has an availability block covering the given ISO date. */
  const isDateBlocked = useCallback((empId: string, date: string): boolean => {
    return availabilityBlocks.some(b =>
      b.employeeId === empId && b.startsOn <= date && b.endsOn >= date
    );
  }, [availabilityBlocks]);

  /** Returns all blocks for a given employee, sorted by start date. */
  const getBlocksForEmployee = useCallback((empId: string): AvailabilityBlock[] => {
    return availabilityBlocks.filter(b => b.employeeId === empId);
  }, [availabilityBlocks]);

  // --- Draft mode actions ---
  const toggleDraftMode = useCallback(() => {
    setIsDraftMode(prev => {
      if (!prev) setDraftShifts(loadDraftFromStorage()); // load on enter
      return !prev;
    });
  }, []);

  /** Apply draft shifts to the currently displayed week in Supabase. Skips duplicates. */
  const applyDraftToWeek = useCallback(async () => {
    if (!isDraftMode || draftShifts.length === 0) return { added: 0, skipped: 0 };
    const existingKeys = new Set(
      currentWeekShifts.map(s => `${s.employeeId}-${s.date}-${s.startTime}-${s.endTime}`)
    );
    const validEmpIds = new Set(employees.map(e => e.id));
    let added = 0; let skipped = 0;
    for (const ds of draftShifts) {
      const idx = PHANTOM_DATES.indexOf(ds.date as typeof PHANTOM_DATES[number]);
      if (idx < 0) { skipped++; continue; }
      const realDate = getDateForCell(weekOffset, idx);
      const key = `${ds.employeeId}-${realDate}-${ds.startTime}-${ds.endTime}`;
      if (!validEmpIds.has(ds.employeeId) || existingKeys.has(key)) { skipped++; continue; }
      await adapter.addShift({ employeeId: ds.employeeId, date: realDate, startTime: ds.startTime, endTime: ds.endTime, note: ds.note });
      added++;
    }
    const updated = await adapter.getShifts();
    setShifts(updated);
    return { added, skipped };
  }, [isDraftMode, draftShifts, currentWeekShifts, employees, weekOffset, adapter]);

  // --- Week navigation ---
  const changeWeek = useCallback((dir: -1 | 1) => {
    if (isDraftMode) return; // week nav locked in draft mode
    setWeekOffset(prev => prev + dir);
  }, [isDraftMode]);

  // --- Computed ---
  // Stats + conflicts are scoped to the CURRENTLY DISPLAYED week.
  const weekStats: WeekStats = useMemo(() => calculateWeekStats(currentWeekShifts, employees), [currentWeekShifts, employees]);
  const conflictingShiftIds = useMemo(() => findConflictingShiftIds(currentWeekShifts), [currentWeekShifts]);
  const weekLabel = useMemo(() => formatWeekLabel(weekOffset), [weekOffset]);
  const weekLabelCompact = useMemo(() => formatWeekLabelCompact(weekOffset), [weekOffset]);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  /** Fetch shifts for a cell by its exact ISO date. */
  const getShiftsForCell = useCallback((empId: string, date: string): Shift[] => {
    // In draft mode, currentWeekShifts is already re-dated to real dates — use it directly.
    if (isDraftMode) return currentWeekShifts.filter(s => s.employeeId === empId && s.date === date);
    return shifts.filter(s => s.employeeId === empId && s.date === date);
  }, [isDraftMode, shifts, currentWeekShifts]);

  const getEmployeeById = useCallback((id: string): Employee | undefined => {
    return employees.find(e => e.id === id);
  }, [employees]);

  const nextColor = useMemo(() => {
    return EMPLOYEE_COLORS[employees.length % EMPLOYEE_COLORS.length];
  }, [employees.length]);

  return {
    // State
    employees,
    shifts,
    currentWeekShifts,
    templates,
    weekOffset,
    weekStart,
    weekEnd,
    isLoading,
    saveStatus,
    saveError,

    // Draft mode
    isDraftMode,
    draftShifts,
    toggleDraftMode,
    applyDraftToWeek,

    // Employee actions
    addEmployee,
    updateEmployee,
    removeEmployee,

    // Shift actions
    addShift,
    updateShift,
    deleteShift,
    moveShift,
    clearWeek,

    // Week clipboard
    weekClipboard,
    copyWeek,
    pasteWeek,
    clearWeekClipboard,

    // Template actions
    saveTemplate,
    saveTemplateFromItems,
    applyTemplate,
    renameTemplate,
    deleteTemplate,

    // Availability
    availabilityBlocks,
    addAvailabilityBlock,
    removeAvailabilityBlock,
    isDateBlocked,
    getBlocksForEmployee,

    // Week
    changeWeek,

    // Computed
    weekStats,
    weekLabel,
    weekLabelCompact,
    weekDates,
    conflictingShiftIds,
    getShiftsForCell,
    getEmployeeById,
    nextColor,
  };
}

export type SchedulerState = ReturnType<typeof useScheduler>;
