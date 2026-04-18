import type { SupabaseClient } from '@supabase/supabase-js';
import type { Employee, Shift, Template } from './types';
import { getDateForCell } from '../utils/week';

const LS_KEYS = {
  employees: 'shift_employees',
  shifts: 'shift_shifts',
  templates: 'shift_templates',
  version: 'shift_version',
  migratedFlag: 'shift_migrated_to_supabase',
} as const;

function readLS<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Detect if there's localStorage data worth offering to import. */
export function hasLocalStorageData(): boolean {
  if (typeof window === 'undefined') return false;
  if (localStorage.getItem(LS_KEYS.migratedFlag) === '1') return false;
  const emps = readLS<Employee[]>(LS_KEYS.employees);
  const shifts = readLS<Shift[]>(LS_KEYS.shifts);
  const tmpls = readLS<Template[]>(LS_KEYS.templates);
  return !!(emps?.length || shifts?.length || tmpls?.length);
}

export interface MigrationResult {
  employees: number;
  shifts: number;
  templates: number;
}

/**
 * Push the user's localStorage data up to Supabase.
 * Keeps the existing employee IDs (UUIDs) where possible, generates new ones
 * for client-string-IDs like "emp-1".
 */
export async function migrateLocalStorageToSupabase(
  supabase: SupabaseClient
): Promise<MigrationResult> {
  const result: MigrationResult = { employees: 0, shifts: 0, templates: 0 };
  if (typeof window === 'undefined') return result;

  const emps = readLS<Employee[]>(LS_KEYS.employees) ?? [];
  const shifts = readLS<Shift[]>(LS_KEYS.shifts) ?? [];
  const templates = readLS<Template[]>(LS_KEYS.templates) ?? [];

  // Employees — local IDs ('emp-1' etc) won't work as UUIDs in Supabase,
  // so we insert fresh and keep a mapping.
  const idMap = new Map<string, string>();
  for (const e of emps) {
    const { data, error } = await supabase.from('shift_employees').insert({
      name: e.name,
      role: e.role,
      hourly_rate: e.hourlyRate,
      phone: e.phone ?? '',
      color: e.color,
      employee_code: e.employeeCode ?? null,
      is_active: e.isActive ?? true,
    }).select().single();
    if (!error && data) {
      idMap.set(e.id, (data as { id: string }).id);
      result.employees++;
    }
  }

  // Shifts — remap employee_id, use date. If shift still has old-shape
  // `day` field (shouldn't after v2, but safety), compute date from current week.
  for (const s of shifts) {
    const newEmpId = idMap.get(s.employeeId);
    if (!newEmpId) continue;
    const legacyDay = (s as unknown as { day?: number }).day;
    const shift_date = s.date ?? (typeof legacyDay === 'number' ? getDateForCell(0, legacyDay) : null);
    if (!shift_date) continue;
    const { error } = await supabase.from('shift_shifts').insert({
      employee_id: newEmpId,
      shift_date,
      start_time: s.startTime,
      end_time: s.endTime,
      note: s.note ?? '',
    });
    if (!error) result.shifts++;
  }

  // Templates + items
  for (const t of templates) {
    const { data, error } = await supabase.from('shift_templates').insert({
      name: t.name,
      source_week_start: t.sourceWeekStart || null,
    }).select().single();
    if (error || !data) continue;
    const templateId = (data as { id: string }).id;

    const items = (t.items ?? [])
      .map(it => {
        const newEmpId = idMap.get(it.employeeId);
        return newEmpId ? {
          template_id: templateId,
          employee_id: newEmpId,
          day_of_week: it.dayIndex,
          start_time: it.startTime,
          end_time: it.endTime,
          note: it.note ?? '',
        } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (items.length > 0) {
      await supabase.from('shift_template_items').insert(items);
    }
    result.templates++;
  }

  // Mark as migrated so we don't prompt again; keep the raw data in localStorage
  // as a backup until the user confirms everything looks right.
  localStorage.setItem(LS_KEYS.migratedFlag, '1');
  return result;
}
