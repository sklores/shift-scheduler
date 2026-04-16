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
  day: number; // 0=Mon, 1=Tue, ... 6=Sun
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
  manager: '#1a3a5c',
  server: '#4a3060',
  cashier: '#2d5a27',
  cook: '#5a2d27',
  host: '#4a4020',
  barista: '#2d4a5a',
};

export const EMPLOYEE_COLORS = [
  '#1a3a5c', '#4a3060', '#2d5a27', '#5a2d27',
  '#4a4020', '#1a4a4a', '#5a4a1a', '#2d4a5a',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
