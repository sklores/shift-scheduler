import type { Employee, Shift } from './types';
import { getDateForCell } from '../utils/week';

export const SEED_EMPLOYEES: Employee[] = [
  { id: 'emp-1', name: 'Alex Rivera', role: 'manager', hourlyRate: 22, phone: '', email: '', color: '#2a4f72', isActive: true },
  { id: 'emp-2', name: 'Jordan Lee', role: 'server', hourlyRate: 16, phone: '', email: '', color: '#5a3e6b', isActive: true },
  { id: 'emp-3', name: 'Sam Chen', role: 'cook', hourlyRate: 18, phone: '', email: '', color: '#3a6a35', isActive: true },
  { id: 'emp-4', name: 'Taylor Kim', role: 'cashier', hourlyRate: 15, phone: '', email: '', color: '#6a3a30', isActive: true },
];

/** Seed shifts are on the CURRENT week so the initial view has data to look at. */
export function buildSeedShifts(): Shift[] {
  return [
    { id: 'shift-1', employeeId: 'emp-1', date: getDateForCell(0, 0), startTime: '08:00', endTime: '16:00', note: 'Opening' },
    { id: 'shift-2', employeeId: 'emp-2', date: getDateForCell(0, 0), startTime: '11:00', endTime: '19:00', note: '' },
    { id: 'shift-3', employeeId: 'emp-3', date: getDateForCell(0, 1), startTime: '07:00', endTime: '15:00', note: 'Prep' },
    { id: 'shift-4', employeeId: 'emp-2', date: getDateForCell(0, 2), startTime: '10:00', endTime: '18:00', note: '' },
    { id: 'shift-5', employeeId: 'emp-4', date: getDateForCell(0, 3), startTime: '09:00', endTime: '17:00', note: '' },
  ];
}
