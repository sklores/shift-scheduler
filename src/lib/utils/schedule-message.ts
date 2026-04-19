import type { Employee, Shift } from '../data/types';
import { DAYS } from '../data/types';
import { getWeekStart, formatWeekStartISO, dayIndexForDate } from './week';
import { cleanPhone } from './phone';

function shortTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, '0')}${h >= 12 ? 'p' : 'a'}`;
}

function getWeekBounds(weekOffset: number) {
  const ws = getWeekStart(weekOffset);
  const weekStartISO = formatWeekStartISO(weekOffset);
  const weekEndDate = new Date(ws); weekEndDate.setDate(ws.getDate() + 6);
  const weekEndISO = `${weekEndDate.getFullYear()}-${String(weekEndDate.getMonth() + 1).padStart(2, '0')}-${String(weekEndDate.getDate()).padStart(2, '0')}`;
  return { ws, weekStartISO, weekEndISO };
}

export function buildScheduleMessage(emp: Employee, empShifts: Shift[], weekOffset: number): string {
  const { ws, weekStartISO, weekEndISO } = getWeekBounds(weekOffset);
  const headerDate = `${DAYS[0]} ${ws.getMonth() + 1}/${ws.getDate()}`;

  const sorted = [...empShifts]
    .filter(s => s.employeeId === emp.id && s.date >= weekStartISO && s.date <= weekEndISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  if (!sorted.length) {
    return `Schedule (${headerDate}):\nNo shifts this week.\nReply STOP to opt out.`;
  }

  const lines = sorted.map(s => `${DAYS[dayIndexForDate(s.date)]} ${shortTime(s.startTime)}–${shortTime(s.endTime)}`);
  return `Schedule (${headerDate}):\n${lines.join('\n')}\nReply STOP to opt out.`;
}

// Email version — day as header, times below, blank line between days
export function buildScheduleEmailBody(emp: Employee, empShifts: Shift[], weekOffset: number): string {
  const { ws, weekStartISO, weekEndISO } = getWeekBounds(weekOffset);
  const headerDate = `${DAYS[0]} ${ws.getMonth() + 1}/${ws.getDate()}`;

  const sorted = [...empShifts]
    .filter(s => s.employeeId === emp.id && s.date >= weekStartISO && s.date <= weekEndISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));

  if (!sorted.length) {
    return `Schedule — week of ${headerDate}\n\nNo shifts this week.`;
  }

  // Group by day
  const byDay = new Map<string, Shift[]>();
  for (const s of sorted) {
    if (!byDay.has(s.date)) byDay.set(s.date, []);
    byDay.get(s.date)!.push(s);
  }

  const blocks = [...byDay.entries()].map(([date, shifts]) => {
    const dayLabel = DAYS[dayIndexForDate(date)];
    const times = shifts.map(s => `${shortTime(s.startTime)} – ${shortTime(s.endTime)}`).join('\n');
    return `${dayLabel}\n${times}`;
  });

  return `Schedule — week of ${headerDate}\n\n${blocks.join('\n\n')}`;
}

export interface PublishRecipient {
  emp: Employee;
  to: string;
  body: string;
}

export interface EmailRecipient {
  emp: Employee;
  to: string;
  name: string;
  subject: string;
  body: string;
}

export interface PublishResult {
  recipients: PublishRecipient[];
  missingPhone: Employee[];
  invalidPhone: Employee[];
  emailRecipients: EmailRecipient[];
  missingEmail: Employee[];
  scheduledEmps: Employee[];
}

export function getPublishRecipients(employees: Employee[], shifts: Shift[], weekOffset: number): PublishResult {
  const scheduledEmpIds = [...new Set(shifts.map(s => s.employeeId))];
  const scheduledEmps = employees.filter(e => scheduledEmpIds.includes(e.id));
  const recipients: PublishRecipient[] = [];
  const missingPhone: Employee[] = [];
  const invalidPhone: Employee[] = [];
  const emailRecipients: EmailRecipient[] = [];
  const missingEmail: Employee[] = [];

  for (const emp of scheduledEmps) {
    // SMS
    if (!emp.phone || !emp.phone.trim()) {
      missingPhone.push(emp);
    } else {
      const to = cleanPhone(emp.phone);
      if (!to) {
        invalidPhone.push(emp);
      } else {
        recipients.push({ emp, to, body: buildScheduleMessage(emp, shifts, weekOffset) });
      }
    }

    // Email
    if (!emp.email || !emp.email.trim()) {
      missingEmail.push(emp);
    } else {
      const ws = getWeekStart(weekOffset);
      const subject = `Your schedule — week of ${DAYS[0]} ${ws.getMonth() + 1}/${ws.getDate()}`;
      emailRecipients.push({
        emp,
        to: emp.email.trim(),
        name: emp.name,
        subject,
        body: buildScheduleEmailBody(emp, shifts, weekOffset),
      });
    }
  }

  return { recipients, missingPhone, invalidPhone, emailRecipients, missingEmail, scheduledEmps };
}
