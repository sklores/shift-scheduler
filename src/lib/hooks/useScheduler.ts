'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { DataAdapter } from '../data/adapter';
import type { Employee, Shift, Template, WeekStats } from '../data/types';
import { EMPLOYEE_COLORS } from '../data/types';
import { calculateWeekStats } from '../utils/cost';
import { getWeekDates, formatWeekLabel, formatWeekLabelCompact, formatWeekStartISO } from '../utils/week';

export function useScheduler(adapter: DataAdapter) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [emps, sh, tmpl] = await Promise.all([
        adapter.getEmployees(),
        adapter.getShifts(),
        adapter.getTemplates(),
      ]);
      if (!cancelled) {
        setEmployees(emps);
        setShifts(sh);
        setTemplates(tmpl);
        setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [adapter]);

  // --- Employee actions ---
  const addEmployee = useCallback(async (data: Omit<Employee, 'id'>) => {
    const emp = await adapter.addEmployee(data);
    setEmployees(prev => [...prev, emp]);
    return emp;
  }, [adapter]);

  const updateEmployee = useCallback(async (id: string, updates: Partial<Employee>) => {
    const emp = await adapter.updateEmployee(id, updates);
    setEmployees(prev => prev.map(e => e.id === id ? emp : e));
    return emp;
  }, [adapter]);

  const removeEmployee = useCallback(async (id: string) => {
    await adapter.removeEmployee(id);
    setEmployees(prev => prev.filter(e => e.id !== id));
    setShifts(prev => prev.filter(s => s.employeeId !== id));
  }, [adapter]);

  // --- Shift actions ---
  const addShift = useCallback(async (data: Omit<Shift, 'id'>) => {
    const shift = await adapter.addShift(data);
    setShifts(prev => [...prev, shift]);
    return shift;
  }, [adapter]);

  const updateShift = useCallback(async (id: string, updates: Partial<Shift>) => {
    const shift = await adapter.updateShift(id, updates);
    setShifts(prev => prev.map(s => s.id === id ? shift : s));
    return shift;
  }, [adapter]);

  const deleteShift = useCallback(async (id: string) => {
    await adapter.removeShift(id);
    setShifts(prev => prev.filter(s => s.id !== id));
  }, [adapter]);

  const moveShift = useCallback(async (id: string, newEmployeeId: string, newDay: number) => {
    const shift = shifts.find(s => s.id === id);
    if (!shift) return;
    if (shift.employeeId === newEmployeeId && shift.day === newDay) return;
    const updated = await adapter.updateShift(id, { employeeId: newEmployeeId, day: newDay });
    setShifts(prev => prev.map(s => s.id === id ? updated : s));
  }, [adapter, shifts]);

  const clearWeek = useCallback(async () => {
    await adapter.clearAllShifts();
    setShifts([]);
  }, [adapter]);

  // --- Template actions ---
  const saveTemplate = useCallback(async (name: string) => {
    const template = await adapter.saveTemplate({
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sourceWeekStart: formatWeekStartISO(weekOffset),
      items: shifts.map(s => ({
        employeeId: s.employeeId,
        dayIndex: s.day,
        startTime: s.startTime,
        endTime: s.endTime,
        note: s.note,
      })),
    });
    setTemplates(prev => [...prev, template]);
    return template;
  }, [adapter, shifts, weekOffset]);

  const applyTemplate = useCallback(async (templateId: string) => {
    const tmpl = templates.find(t => t.id === templateId);
    if (!tmpl) return { added: 0, skipped: 0 };

    const existingKeys = new Set(shifts.map(s => `${s.employeeId}-${s.day}-${s.startTime}-${s.endTime}`));
    let added = 0;
    let skipped = 0;

    for (const item of tmpl.items) {
      const empExists = employees.some(e => e.id === item.employeeId);
      const key = `${item.employeeId}-${item.dayIndex}-${item.startTime}-${item.endTime}`;
      if (!empExists || existingKeys.has(key)) {
        skipped++;
        continue;
      }
      await adapter.addShift({
        employeeId: item.employeeId,
        day: item.dayIndex,
        startTime: item.startTime,
        endTime: item.endTime,
        note: item.note,
      });
      added++;
    }

    // Reload shifts from adapter to get all new IDs
    const updatedShifts = await adapter.getShifts();
    setShifts(updatedShifts);
    return { added, skipped };
  }, [adapter, templates, shifts, employees]);

  const renameTemplate = useCallback(async (id: string, name: string) => {
    const tmpl = await adapter.updateTemplate(id, { name, updatedAt: Date.now() });
    setTemplates(prev => prev.map(t => t.id === id ? tmpl : t));
  }, [adapter]);

  const deleteTemplate = useCallback(async (id: string) => {
    await adapter.removeTemplate(id);
    setTemplates(prev => prev.filter(t => t.id !== id));
  }, [adapter]);

  // --- Week navigation ---
  const changeWeek = useCallback((dir: -1 | 1) => {
    setWeekOffset(prev => prev + dir);
  }, []);

  // --- Computed ---
  const weekStats: WeekStats = useMemo(() => calculateWeekStats(shifts, employees), [shifts, employees]);
  const weekLabel = useMemo(() => formatWeekLabel(weekOffset), [weekOffset]);
  const weekLabelCompact = useMemo(() => formatWeekLabelCompact(weekOffset), [weekOffset]);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const getShiftsForCell = useCallback((empId: string, day: number): Shift[] => {
    return shifts.filter(s => s.employeeId === empId && s.day === day);
  }, [shifts]);

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
    templates,
    weekOffset,
    isLoading,

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

    // Template actions
    saveTemplate,
    applyTemplate,
    renameTemplate,
    deleteTemplate,

    // Week
    changeWeek,

    // Computed
    weekStats,
    weekLabel,
    weekLabelCompact,
    weekDates,
    getShiftsForCell,
    getEmployeeById,
    nextColor,
  };
}

export type SchedulerState = ReturnType<typeof useScheduler>;
