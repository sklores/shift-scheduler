import type { DataAdapter } from './adapter';
import type { Employee, Shift, Template } from './types';
import { SEED_EMPLOYEES, SEED_SHIFTS } from './seed';

const KEYS = {
  employees: 'shift_employees',
  shifts: 'shift_shifts',
  templates: 'shift_templates',
  version: 'shift_version',
} as const;

const CURRENT_VERSION = '1';

function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function read<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

function ensureSeeded(): void {
  if (typeof window === 'undefined') return;
  const version = localStorage.getItem(KEYS.version);
  if (version === CURRENT_VERSION) return;

  // Only seed if there's no existing data
  if (!localStorage.getItem(KEYS.employees)) {
    write(KEYS.employees, SEED_EMPLOYEES);
  }
  if (!localStorage.getItem(KEYS.shifts)) {
    write(KEYS.shifts, SEED_SHIFTS);
  }
  if (!localStorage.getItem(KEYS.templates)) {
    write(KEYS.templates, []);
  }
  localStorage.setItem(KEYS.version, CURRENT_VERSION);
}

export class LocalStorageAdapter implements DataAdapter {
  constructor() {
    ensureSeeded();
  }

  // --- Employees ---
  async getEmployees(): Promise<Employee[]> {
    return read<Employee[]>(KEYS.employees) ?? [];
  }

  async addEmployee(emp: Omit<Employee, 'id'>): Promise<Employee> {
    const employees = await this.getEmployees();
    const newEmp: Employee = { ...emp, id: genId() };
    employees.push(newEmp);
    write(KEYS.employees, employees);
    return newEmp;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const employees = await this.getEmployees();
    const idx = employees.findIndex(e => e.id === id);
    if (idx === -1) throw new Error(`Employee ${id} not found`);
    employees[idx] = { ...employees[idx], ...updates, id };
    write(KEYS.employees, employees);
    return employees[idx];
  }

  async removeEmployee(id: string): Promise<void> {
    const employees = await this.getEmployees();
    write(KEYS.employees, employees.filter(e => e.id !== id));
    // Also remove their shifts
    const shifts = await this.getShifts();
    write(KEYS.shifts, shifts.filter(s => s.employeeId !== id));
  }

  // --- Shifts ---
  async getShifts(): Promise<Shift[]> {
    return read<Shift[]>(KEYS.shifts) ?? [];
  }

  async addShift(shift: Omit<Shift, 'id'>): Promise<Shift> {
    const shifts = await this.getShifts();
    const newShift: Shift = { ...shift, id: genId() };
    shifts.push(newShift);
    write(KEYS.shifts, shifts);
    return newShift;
  }

  async updateShift(id: string, updates: Partial<Shift>): Promise<Shift> {
    const shifts = await this.getShifts();
    const idx = shifts.findIndex(s => s.id === id);
    if (idx === -1) throw new Error(`Shift ${id} not found`);
    shifts[idx] = { ...shifts[idx], ...updates, id };
    write(KEYS.shifts, shifts);
    return shifts[idx];
  }

  async removeShift(id: string): Promise<void> {
    const shifts = await this.getShifts();
    write(KEYS.shifts, shifts.filter(s => s.id !== id));
  }

  async clearAllShifts(): Promise<void> {
    write(KEYS.shifts, []);
  }

  // --- Templates ---
  async getTemplates(): Promise<Template[]> {
    return read<Template[]>(KEYS.templates) ?? [];
  }

  async saveTemplate(template: Omit<Template, 'id'>): Promise<Template> {
    const templates = await this.getTemplates();
    const newTemplate: Template = { ...template, id: genId() };
    templates.push(newTemplate);
    write(KEYS.templates, templates);
    return newTemplate;
  }

  async updateTemplate(id: string, updates: Partial<Template>): Promise<Template> {
    const templates = await this.getTemplates();
    const idx = templates.findIndex(t => t.id === id);
    if (idx === -1) throw new Error(`Template ${id} not found`);
    templates[idx] = { ...templates[idx], ...updates, id };
    write(KEYS.templates, templates);
    return templates[idx];
  }

  async removeTemplate(id: string): Promise<void> {
    const templates = await this.getTemplates();
    write(KEYS.templates, templates.filter(t => t.id !== id));
  }
}
