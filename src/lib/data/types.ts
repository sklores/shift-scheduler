export type EmployeeRole = 'manager' | 'server' | 'cashier' | 'cook' | 'host' | 'barista';

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  hourlyRate: number;
  phone: string;
  color: string;
  employeeCode?: string;
  isActive: boolean;
}

export interface Shift {
  id: string;
  employeeId: string;
  /** ISO date YYYY-MM-DD — a specific calendar day, not a weekday offset. */
  date: string;
  startTime: string; // "HH:MM" 24h
  endTime: string;
  note: string;
}

export interface TemplateItem {
  employeeId: string;
  dayIndex: number;
  startTime: string;
  endTime: string;
  note: string;
}

export interface Template {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  sourceWeekStart: string; // "YYYY-MM-DD"
  items: TemplateItem[];
}

export interface WeekStats {
  totalHours: number;
  totalCost: number;
  totalShifts: number;
}

export const ROLE_COLORS: Record<EmployeeRole, string> = {
  manager: '#2a4f72',
  server: '#5a3e6b',
  cashier: '#3a6a35',
  cook: '#6a3a30',
  host: '#5a5028',
  barista: '#2f5866',
};

export const EMPLOYEE_COLORS = [
  '#2a4f72', '#5a3e6b', '#3a6a35', '#6a3a30',
  '#5a5028', '#2f5866', '#6a5028', '#3a4f72',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
