export function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  if (m === 0) return `${hour}${suffix}`;
  return `${hour}:${String(m).padStart(2, '0')}${suffix}`;
}

export function calcHours(startTime: string, endTime: string): number {
  const [hs, ms] = startTime.split(':').map(Number);
  const [he, me] = endTime.split(':').map(Number);
  return Math.max(0, (he + me / 60) - (hs + ms / 60));
}

export interface TimeOption {
  value: string; // "HH:MM"
  label: string; // "9:00 AM"
}

export function generateTimeOptions(): TimeOption[] {
  const options: TimeOption[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const suffix = h >= 12 ? 'PM' : 'AM';
      const hour = h % 12 || 12;
      const label = m === 0 ? `${hour}:00 ${suffix}` : `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
      options.push({ value, label });
    }
  }
  return options;
}
