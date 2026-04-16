export function cleanPhone(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+') && digits.length >= 11) return digits;
  const justDigits = raw.replace(/\D/g, '');
  if (justDigits.length === 10) return `+1${justDigits}`;
  if (justDigits.length === 11 && justDigits.startsWith('1')) return `+${justDigits}`;
  return null;
}
