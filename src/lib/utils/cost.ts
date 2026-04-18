import type { Employee, Shift, WeekStats } from '../data/types';
import { calcHours } from './time';

export function shiftHours(shift: Shift): number {
  return calcHours(shift.startTime, shift.endTime);
}

export function shiftCost(shift: Shift, employees: Employee[]): number {
  const emp = employees.find(e => e.id === shift.employeeId);
  return emp ? shiftHours(shift) * emp.hourlyRate : 0;
}

export function employeeWeeklyHours(empId: string, shifts: Shift[]): number {
  return shifts
    .filter(s => s.employeeId === empId)
    .reduce((sum, s) => sum + shiftHours(s), 0);
}

export function employeeWeeklyCost(empId: string, shifts: Shift[], employees: Employee[]): number {
  return shifts
    .filter(s => s.employeeId === empId)
    .reduce((sum, s) => sum + shiftCost(s, employees), 0);
}

export function calculateWeekStats(shifts: Shift[], employees: Employee[]): WeekStats {
  return {
    totalShifts: shifts.length,
    totalHours: shifts.reduce((sum, s) => sum + shiftHours(s), 0),
    totalCost: shifts.reduce((sum, s) => sum + shiftCost(s, employees), 0),
  };
}

export function formatCurrency(n: number): string {
  return '$' + n.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Estimated payroll tax rate. This is a rough US floor for planning purposes —
 * includes FICA (7.65%) + a conservative allowance for unemployment insurance.
 * Real "fully loaded" rate is usually 15–22% depending on state and workers comp.
 * TODO: make this configurable per-org in settings once Supabase lands.
 */
export const PAYROLL_TAX_RATE = 0.11;

export function estimatedTax(laborCost: number): number {
  return laborCost * PAYROLL_TAX_RATE;
}

export function laborPlusTax(laborCost: number): number {
  return laborCost * (1 + PAYROLL_TAX_RATE);
}
