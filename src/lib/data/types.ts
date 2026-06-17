export type EmployeeRole = 'manager' | 'server' | 'cashier' | 'cook' | 'host' | 'barista';

export interface AvailabilityBlock {
  id: string;
  employeeId: string;
  startsOn: string; // YYYY-MM-DD
  endsOn: string;   // YYYY-MM-DD
  reason: string;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  hourlyRate: number;
  phone: string;
  email: string;
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

// & done family: muted, harmonized hues (teal/green dominant). Each is the
// SOLID anchor color — dark enough for white text — used for avatars, the
// Month/Gantt bars, and the left color-bar + time text on week-grid boxes.
export const ROLE_COLORS: Record<EmployeeRole, string> = {
  manager: '#3c5a78', // slate blue
  server:  '#2c7d6a', // brand teal (darkened)
  cashier: '#2f8f6a', // brand green
  cook:    '#9a4452', // muted wine
  host:    '#65548f', // muted plum
  barista: '#835d33', // espresso clay
};

// Soft tint background for each role's week-grid shift box (paired with
// ROLE_COLORS as the text + left-bar color). Low-opacity, flat — the & done look.
export const ROLE_TINTS: Record<EmployeeRole, string> = {
  manager: '#eef2f7',
  server:  '#e7f2ee',
  cashier: '#e7f1ea',
  cook:    '#f6eced',
  host:    '#efecf6',
  barista: '#f3ede4',
};

// Per-employee palette (Month/Gantt bars + legend dots). Muted on-brand set,
// all dark enough for white text on the solid bars.
export const EMPLOYEE_COLORS = [
  '#9a4452', '#2c7d6a', '#2f8f6a', '#b06a3f',
  '#65548f', '#835d33', '#3c5a78', '#a85574',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
export const DAY_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
