import type { Shift, Employee } from '../data/types';
import { calcHours } from './time';
import { OT_THRESHOLD_HOURS } from './conflicts';
import { PAYROLL_TAX_RATE } from './cost';

export interface LaborBreakdown {
  /** Regular hourly wages: hours up to 40/wk × rate, for all hourly employees */
  hourly: number;
  /** Total regular hours (≤40/wk per employee) across all hourly staff */
  hourlyHours: number;
  /** Overtime: hours over 40/wk × rate × 1.5 */
  overtime: number;
  /** Total OT hours (>40/wk per employee) across all hourly staff */
  overtimeHours: number;
  /** Weekly salary pool (user input; not tied to shifts today) */
  salary: number;
  /** Weekly tips pool (user input; informational only) */
  tips: number;
  /** Sum before tax: hourly + overtime + salary + tips */
  subtotal: number;
  /** Estimated payroll tax on the subtotal (~11% in cost.ts) */
  tax: number;
  /** Final total: subtotal + tax */
  total: number;
}

/**
 * Break the week's labor into the standard categories a restaurant owner wants to see.
 *
 * Overtime calc assumes US standard time-and-a-half for hours over 40/week.
 * This computes OT per-employee across their full week of shifts, not per-shift.
 *
 * Salary and tips are NOT derived from shifts — they come from user-entered weekly
 * totals (stored in localStorage). When we add per-employee salary fields and/or
 * per-shift tip tracking post-Supabase, replace those params with computed values.
 */
export function computeLaborBreakdown(
  shifts: Shift[],
  employees: Employee[],
  weeklySalaryTotal: number = 0,
  weeklyTipsTotal: number = 0,
): LaborBreakdown {
  let hourly = 0;
  let overtime = 0;
  let hourlyHours = 0;
  let overtimeHours = 0;

  for (const emp of employees) {
    const empHours = shifts
      .filter(s => s.employeeId === emp.id)
      .reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);

    const regHours = Math.min(empHours, OT_THRESHOLD_HOURS);
    const otHours = Math.max(0, empHours - OT_THRESHOLD_HOURS);

    hourly += regHours * emp.hourlyRate;
    overtime += otHours * emp.hourlyRate * 1.5;
    hourlyHours += regHours;
    overtimeHours += otHours;
  }

  const salary = Math.max(0, weeklySalaryTotal || 0);
  const tips = Math.max(0, weeklyTipsTotal || 0);
  const subtotal = hourly + overtime + salary + tips;
  const tax = subtotal * PAYROLL_TAX_RATE;
  const total = subtotal + tax;

  return { hourly, hourlyHours, overtime, overtimeHours, salary, tips, subtotal, tax, total };
}
