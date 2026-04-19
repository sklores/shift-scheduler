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

// Restaurant vibe. Rich & distinct at a glance — all dark enough for white text.
export const ROLE_COLORS: Record<EmployeeRole, string> = {
  manager: '#a02843', // wine / burgundy — authority
  server:  '#0e7490', // ocean teal — front of house
  cashier: '#15803d', // cash green
  cook:    '#c2410c', // paprika — kitchen heat
  host:    '#7c3aed', // vivid plum — welcoming
  barista: '#6b3e18', // espresso brown
};

export const EMPLOYEE_COLORS = [
  '#a02843', '#0e7490', '#15803d', '#c2410c',
  '#7c3aed', '#6b3e18', '#b45309', '#be185d',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
