/** First letters of the first two words, e.g. "Mariana Costa" → "MC". */
export const initials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();

/** Portuguese decimal separator, for values rendered inside prose. */
export const decimalComma = (value: number): string => String(value).replace('.', ',');

export const euros = (value: number): string => `${value} €`;

/** "3 passos" / "1 passo" — the two-form plural the copy uses throughout. */
export const plural = (count: number, one: string, many: string): string =>
  `${count} ${count === 1 ? one : many}`;

/** Two-digit step ordinal: 1 → "01", 12 → "12". */
export const stepNumber = (index: number): string => String(index + 1).padStart(2, '0');
