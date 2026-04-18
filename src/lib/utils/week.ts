export function getWeekStart(offset: number = 0): Date {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff + offset * 7);
  return d;
}

export function getWeekDates(offset: number = 0): Date[] {
  const start = getWeekStart(offset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function formatWeekLabel(offset: number = 0): string {
  const dates = getWeekDates(offset);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(dates[0])} – ${fmt(dates[6])}`;
}

/** Compact form, e.g. "Apr 13–19" when both dates share a month, "Apr 30–May 6" when not */
export function formatWeekLabelCompact(offset: number = 0): string {
  const dates = getWeekDates(offset);
  const start = dates[0];
  const end = dates[6];
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' });
  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}`;
  }
  return `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}`;
}

export function isToday(date: Date): boolean {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

export function formatWeekStartISO(offset: number = 0): string {
  return toISODate(getWeekStart(offset));
}

/** Format a Date as YYYY-MM-DD in local time (not UTC — matters for month boundaries). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Given a week offset and a day index (0=Mon…6=Sun), return the ISO date string. */
export function getDateForCell(weekOffset: number, dayIdx: number): string {
  const start = getWeekStart(weekOffset);
  const d = new Date(start);
  d.setDate(start.getDate() + dayIdx);
  return toISODate(d);
}

/** Parse YYYY-MM-DD to a local Date (midnight local time). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Day-of-week index for an ISO date (0=Mon…6=Sun). */
export function dayIndexForDate(iso: string): number {
  const jsDay = parseISODate(iso).getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1;
}
