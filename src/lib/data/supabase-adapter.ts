import type { SupabaseClient } from '@supabase/supabase-js';
import type { DataAdapter } from './adapter';
import type { AvailabilityBlock, Employee, EmployeeRole, Shift, Template, TemplateItem } from './types';

// Row shapes (snake_case in Supabase)
interface EmployeeRow {
  id: string;
  name: string;
  role: EmployeeRole;
  hourly_rate: number | string;
  phone: string;
  email: string;
  color: string;
  employee_code: string | null;
  is_active: boolean;
}

interface ShiftRow {
  id: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  note: string;
}

interface TemplateRow {
  id: string;
  name: string;
  source_week_start: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateItemRow {
  id: string;
  template_id: string;
  employee_id: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note: string;
}

// Normalize "HH:MM:SS" → "HH:MM" (Postgres time columns return 8-char strings)
function trimTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function employeeFromRow(r: EmployeeRow): Employee {
  return {
    id: r.id,
    name: r.name,
    role: r.role,
    hourlyRate: typeof r.hourly_rate === 'string' ? parseFloat(r.hourly_rate) : r.hourly_rate,
    phone: r.phone ?? '',
    email: r.email ?? '',
    color: r.color,
    employeeCode: r.employee_code ?? undefined,
    isActive: r.is_active,
  };
}

function shiftFromRow(r: ShiftRow): Shift {
  return {
    id: r.id,
    employeeId: r.employee_id,
    date: r.shift_date,
    startTime: trimTime(r.start_time),
    endTime: trimTime(r.end_time),
    note: r.note ?? '',
  };
}

function templateFromRow(r: TemplateRow, items: TemplateItemRow[]): Template {
  return {
    id: r.id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
    sourceWeekStart: r.source_week_start ?? '',
    items: items.map(it => ({
      employeeId: it.employee_id ?? '',
      dayIndex: it.day_of_week,
      startTime: trimTime(it.start_time),
      endTime: trimTime(it.end_time),
      note: it.note ?? '',
    })),
  };
}

export class SupabaseAdapter implements DataAdapter {
  constructor(private supabase: SupabaseClient) {}

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
    const { data, error } = await this.supabase
      .from('shift_employees')
      .select('*')
      .order('name');
    if (error) throw new Error(`getEmployees: ${error.message}`);
    return (data as EmployeeRow[]).map(employeeFromRow);
  }

  async addEmployee(emp: Omit<Employee, 'id'>): Promise<Employee> {
    const { data, error } = await this.supabase
      .from('shift_employees')
      .insert({
        name: emp.name,
        role: emp.role,
        hourly_rate: emp.hourlyRate,
        phone: emp.phone,
        email: emp.email ?? '',
        color: emp.color,
        employee_code: emp.employeeCode ?? null,
        is_active: emp.isActive,
      })
      .select()
      .single();
    if (error) throw new Error(`addEmployee: ${error.message}`);
    return employeeFromRow(data as EmployeeRow);
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.role !== undefined) patch.role = updates.role;
    if (updates.hourlyRate !== undefined) patch.hourly_rate = updates.hourlyRate;
    if (updates.phone !== undefined) patch.phone = updates.phone;
    if (updates.email !== undefined) patch.email = updates.email;
    if (updates.color !== undefined) patch.color = updates.color;
    if (updates.employeeCode !== undefined) patch.employee_code = updates.employeeCode ?? null;
    if (updates.isActive !== undefined) patch.is_active = updates.isActive;

    let { data, error } = await this.supabase
      .from('shift_employees')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    // If email column doesn't exist yet (migration pending), retry without it
    if (error && error.message?.includes('email') && patch.email !== undefined) {
      const { email: _email, ...patchWithoutEmail } = patch;
      void _email;
      ({ data, error } = await this.supabase
        .from('shift_employees')
        .update(patchWithoutEmail)
        .eq('id', id)
        .select()
        .single());
    }

    if (error) throw new Error(`updateEmployee: ${error.message}`);
    // Preserve the email update in-memory even if column is missing
    const result = employeeFromRow(data as EmployeeRow);
    if (updates.email !== undefined && !result.email) result.email = updates.email;
    return result;
  }

  async removeEmployee(id: string): Promise<void> {
    const { error } = await this.supabase.from('shift_employees').delete().eq('id', id);
    if (error) throw new Error(`removeEmployee: ${error.message}`);
  }

  // --- Shifts ---
  async getShifts(): Promise<Shift[]> {
    const { data, error } = await this.supabase
      .from('shift_shifts')
      .select('*')
      .order('shift_date')
      .order('start_time');
    if (error) throw new Error(`getShifts: ${error.message}`);
    return (data as ShiftRow[]).map(shiftFromRow);
  }

  async addShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
    const { data, error } = await this.supabase
      .from('shift_shifts')
      .insert({
        employee_id: shift.employeeId,
        shift_date: shift.date,
        start_time: shift.startTime,
        end_time: shift.endTime,
        note: shift.note,
      })
      .select()
      .single();
    if (error) throw new Error(`addShift: ${error.message}`);
    return shiftFromRow(data as ShiftRow);
  }

  async updateShift(id: string, updates: Partial<Shift>): Promise<Shift> {
    const patch: Record<string, unknown> = {};
    if (updates.employeeId !== undefined) patch.employee_id = updates.employeeId;
    if (updates.date !== undefined) patch.shift_date = updates.date;
    if (updates.startTime !== undefined) patch.start_time = updates.startTime;
    if (updates.endTime !== undefined) patch.end_time = updates.endTime;
    if (updates.note !== undefined) patch.note = updates.note;

    const { data, error } = await this.supabase
      .from('shift_shifts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`updateShift: ${error.message}`);
    return shiftFromRow(data as ShiftRow);
  }

  async removeShift(id: string): Promise<void> {
    const { error } = await this.supabase.from('shift_shifts').delete().eq('id', id);
    if (error) throw new Error(`removeShift: ${error.message}`);
  }

  async clearAllShifts(): Promise<void> {
    // Delete all shifts. Will use a guard: delete rows where id is a valid uuid.
    const { error } = await this.supabase.from('shift_shifts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw new Error(`clearAllShifts: ${error.message}`);
  }

  // --- Templates ---
  async getTemplates(): Promise<Template[]> {
    const { data: tmplRows, error: tErr } = await this.supabase
      .from('shift_templates')
      .select('*')
      .order('name');
    if (tErr) throw new Error(`getTemplates: ${tErr.message}`);

    const templates = tmplRows as TemplateRow[];
    if (templates.length === 0) return [];

    const { data: itemRows, error: iErr } = await this.supabase
      .from('shift_template_items')
      .select('*')
      .in('template_id', templates.map(t => t.id));
    if (iErr) throw new Error(`getTemplates (items): ${iErr.message}`);

    const itemsByTemplate = new Map<string, TemplateItemRow[]>();
    for (const it of itemRows as TemplateItemRow[]) {
      const arr = itemsByTemplate.get(it.template_id) ?? [];
      arr.push(it);
      itemsByTemplate.set(it.template_id, arr);
    }

    return templates.map(t => templateFromRow(t, itemsByTemplate.get(t.id) ?? []));
  }

  async saveTemplate(template: Omit<Template, 'id'>): Promise<Template> {
    const { data, error } = await this.supabase
      .from('shift_templates')
      .insert({
        name: template.name,
        source_week_start: template.sourceWeekStart || null,
      })
      .select()
      .single();
    if (error) throw new Error(`saveTemplate: ${error.message}`);
    const tmpl = data as TemplateRow;

    if (template.items.length > 0) {
      const { error: itemsErr } = await this.supabase
        .from('shift_template_items')
        .insert(
          template.items.map((it: TemplateItem) => ({
            template_id: tmpl.id,
            employee_id: it.employeeId || null,
            day_of_week: it.dayIndex,
            start_time: it.startTime,
            end_time: it.endTime,
            note: it.note,
          }))
        );
      if (itemsErr) throw new Error(`saveTemplate (items): ${itemsErr.message}`);
    }

    return {
      id: tmpl.id,
      name: tmpl.name,
      createdAt: new Date(tmpl.created_at).getTime(),
      updatedAt: new Date(tmpl.updated_at).getTime(),
      sourceWeekStart: tmpl.source_week_start ?? '',
      items: template.items,
    };
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const patch: Record<string, unknown> = {};
    if (updates.name !== undefined) patch.name = updates.name;
    if (updates.sourceWeekStart !== undefined) patch.source_week_start = updates.sourceWeekStart || null;

    const { data, error } = await this.supabase
      .from('shift_templates')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`updateTemplate: ${error.message}`);

    const { data: itemRows } = await this.supabase
      .from('shift_template_items')
      .select('*')
      .eq('template_id', id);

    return templateFromRow(data as TemplateRow, (itemRows ?? []) as TemplateItemRow[]);
  }

  async removeTemplate(id: string): Promise<void> {
    const { error } = await this.supabase.from('shift_templates').delete().eq('id', id);
    if (error) throw new Error(`removeTemplate: ${error.message}`);
  }

  // --- Availability blocks ---
  async getAvailabilityBlocks(): Promise<AvailabilityBlock[]> {
    const { data, error } = await this.supabase
      .from('shift_availability_blocks')
      .select('*')
      .order('starts_on');
    if (error) throw new Error(`getAvailabilityBlocks: ${error.message}`);
    return (data as Array<{ id: string; employee_id: string; starts_on: string; ends_on: string; reason: string | null }>).map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      startsOn: r.starts_on,
      endsOn: r.ends_on,
      reason: r.reason ?? '',
    }));
  }

  async addAvailabilityBlock(block: Omit<AvailabilityBlock, 'id'>): Promise<AvailabilityBlock> {
    const { data, error } = await this.supabase
      .from('shift_availability_blocks')
      .insert({
        employee_id: block.employeeId,
        starts_on: block.startsOn,
        ends_on: block.endsOn,
        reason: block.reason ?? '',
      })
      .select()
      .single();
    if (error) throw new Error(`addAvailabilityBlock: ${error.message}`);
    const r = data as { id: string; employee_id: string; starts_on: string; ends_on: string; reason: string | null };
    return { id: r.id, employeeId: r.employee_id, startsOn: r.starts_on, endsOn: r.ends_on, reason: r.reason ?? '' };
  }

  async removeAvailabilityBlock(id: string): Promise<void> {
    const { error } = await this.supabase.from('shift_availability_blocks').delete().eq('id', id);
    if (error) throw new Error(`removeAvailabilityBlock: ${error.message}`);
  }
}
