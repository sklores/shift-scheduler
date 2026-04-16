import type { Employee, Shift } from './types';

export const SEED_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Alex Rivera', role: 'manager', hourlyRate: 22, phone: '', color: '#1a3a5c', isActive: true },
  { id: 'emp-2', name: 'Jordan Lee', role: 'server', hourlyRate: 16, phone: '', color: '#4a3060', isActive: true },
  { id: 'emp-3', name: 'Sam Chen', role: 'cook', hourlyRate: 18, phone: '', color: '#2d5a27', isActive: true },
  { id: 'emp-4', name: 'Taylor Kim', role: 'cashier', hourlyRate: 15, phone: '', color: '#5a2d27', isActive: true },
];

export const SEED_SHIFTS: Shift[] = [
  { id: 'shift-1', employeeId: 'emp-1', day: 0, startTime: '08:00', endTime: '16:00', note: 'Opening' },
  { id: 'shift-2', employeeId: 'emp-2', day: 0, startTime: '11:00', endTime: '19:00', note: '' },
  { id: 'shift-3', employeeId: 'emp-3', day: 1, startTime: '07:00', endTime: '15:00', note: 'Prep' },
  { id: 'shift-4', employeeId: 'emp-2', day: 2, startTime: '10:00', endTime: '18:00', note: '' },
  { id: 'shift-5', employeeId: 'emp-4', day: 3, startTime: '09:00', endTime: '17:00', note: '' },
];
