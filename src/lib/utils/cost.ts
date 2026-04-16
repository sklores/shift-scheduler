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
