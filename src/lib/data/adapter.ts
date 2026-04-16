import type { Employee, Shift, Template } from './types';

export interface DataAdapter {
  getEmployees(): Promise<Employee[]>;
  addEmployee(emp: Omit<Employee, 'id'>): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee>;
  removeEmployee(id: string): Promise<void>;

  getShifts(): Promise<Shift[]>;
  addShift(shift: Omit<Shift, 'id'>): Promise<Shift>;
  updateShift(id: string, updates: Partial<Shift>): Promise<Shift>;
  removeShift(id: string): Promise<void>;
  clearAllShifts(): Promise<void>;

  getTemplates(): Promise<Template[]>;
  saveTemplate(template: Omit<Template, 'id'>): Promise<Template>;
  updateTemplate(id: string, updates: Partial<Template>): Promise<Template>;
  removeTemplate(id: string): Promise<void>;
}
