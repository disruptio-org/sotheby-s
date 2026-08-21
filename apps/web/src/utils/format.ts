/** First letters of the first two words, e.g. "Mariana Costa" → "MC". */
export const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Portuguese decimal separator, for values rendered inside prose. */
export const decimalComma = (value: number | string): string => String(value).replace('.', ',');

/** Whole euros from integer cents — the platform's money display everywhere. */
export const euros = (cents: number): string => `${Math.round(cents / 100)} €`;

/** Two decimals, for figures small enough that rounding to the euro hides them. */
export const eurosExact = (cents: number): string =>
  `${decimalComma((cents / 100).toFixed(2))} €`;

/** "3 passos" / "1 passo" — the two-form plural the copy uses throughout. */
export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** Two-digit step ordinal: 1 → "01", 12 → "12". */
export const stepNumber = (index: number): string => String(index + 1).padStart(2, '0');

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const clock = (date: Date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "Hoje, 09:12" / "Ontem, 18:03" / "12 ago 2026" — the design's timestamp voice. */
export const timestamp = (iso: string | null): string => {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';

  const now = new Date();
  if (sameDay(date, now)) return `Hoje, ${clock(date)}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `Ontem, ${clock(date)}`;

  return `${date.getDate()} ${MONTHS[date.getMonth()] ?? ''} ${date.getFullYear()}`;
};

/** Short date only, for "last updated" columns. */
export const shortDate = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()] ?? ''} ${date.getFullYear()}`;
};

/** Elapsed wall-clock between two instants, as "1m 04s" or "3,2 s". */
export const duration = (from: string | null, to: string | null): string => {
  if (!from || !to) return '—';
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 10_000) return `${decimalComma((ms / 1000).toFixed(1))} s`;
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} s`;
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`;
};

export const compactNumber = (value: number): string =>
  value >= 1000 ? `${decimalComma((value / 1000).toFixed(1))}k` : String(value);
