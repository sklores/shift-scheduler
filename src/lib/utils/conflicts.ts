import type { Shift } from '../data/types';
import { calcHours } from './time';

export const OT_THRESHOLD_HOURS = 40;

/** Parse "HH:MM" to minutes-since-midnight */
function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Returns true if two shift time ranges overlap (on the same day/employee — caller filters). */
export function shiftsOverlap(a: Shift, b: Shift): boolean {
  if (a.employeeId !== b.employeeId || a.day !== b.day) return false;
  const aStart = toMinutes(a.startTime);
  const aEnd = toMinutes(a.endTime);
  const bStart = toMinutes(b.startTime);
  const bEnd = toMinutes(b.endTime);
  return aStart < bEnd && aEnd > bStart;
}

/** Returns a Set of shift IDs that overlap at least one other shift. */
export function findConflictingShiftIds(shifts: Shift[]): Set<string> {
  const conflicts = new Set<string>();
  for (let i = 0; i < shifts.length; i++) {
    for (let j = i + 1; j < shifts.length; j++) {
      if (shiftsOverlap(shifts[i], shifts[j])) {
        conflicts.add(shifts[i].id);
        conflicts.add(shifts[j].id);
      }
    }
  }
  return conflicts;
}

/** Returns true if the employee's weekly hours exceed the OT threshold. */
export function isOvertime(employeeHours: number): boolean {
  return employeeHours > OT_THRESHOLD_HOURS;
}

/** Hours over the OT threshold, floored at 0. */
export function overtimeHours(employeeHours: number): number {
  return Math.max(0, employeeHours - OT_THRESHOLD_HOURS);
}

/** Total hours across all shifts (convenience). */
export function totalShiftHours(shifts: Shift[]): number {
  return shifts.reduce((sum, s) => sum + calcHours(s.startTime, s.endTime), 0);
}
