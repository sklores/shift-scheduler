import type { Employee, Shift } from '../data/types';
import { DAYS } from '../data/types';
import { getWeekStart } from './week';
import { cleanPhone } from './phone';

function shortTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`;
}

export function buildScheduleMessage(emp: Employee, empShifts: Shift[], weekOffset: number): string {
  const ws = getWeekStart(weekOffset);
  const headerDate = `${DAYS[0]} ${ws.getMonth() + 1}/${ws.getDate()}`;

  const sorted = [...empShifts]
    .filter(s => s.employeeId === emp.id)
    .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));

  if (!sorted.length) {
    return `Schedule (${headerDate}):\nNo shifts this week.\nReply STOP to opt out.`;
  }

  const lines = sorted.map(s => `${DAYS[s.day]} ${shortTime(s.startTime)}–${shortTime(s.endTime)}`);
  return `Schedule (${headerDate}):\n${lines.join('\n')}\nReply STOP to opt out.`;
}

export interface PublishRecipient {
  emp: Employee;
  to: string;
  body: string;
}

export interface PublishResult {
  recipients: PublishRecipient[];
  missingPhone: Employee[];
  invalidPhone: Employee[];
  scheduledEmps: Employee[];
}

export function getPublishRecipients(employees: Employee[], shifts: Shift[], weekOffset: number): PublishResult {
  const scheduledEmpIds = [...new Set(shifts.map(s => s.employeeId))];
  const scheduledEmps = employees.filter(e => scheduledEmpIds.includes(e.id));
  const recipients: PublishRecipient[] = [];
  const missingPhone: Employee[] = [];
  const invalidPhone: Employee[] = [];

  for (const emp of scheduledEmps) {
    if (!emp.phone || !emp.phone.trim()) {
      missingPhone.push(emp);
      continue;
    }
    const to = cleanPhone(emp.phone);
    if (!to) {
      invalidPhone.push(emp);
      continue;
    }
    recipients.push({ emp, to, body: buildScheduleMessage(emp, shifts, weekOffset) });
  }

  return { recipients, missingPhone, invalidPhone, scheduledEmps };
}
