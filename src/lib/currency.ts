/** Digit-only typing → display as BRL (centavos por últimos 2 dígitos). */

export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** From numeric value to masked display string for input. */
export function formatMoneyFromNumber(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "";
  const cents = Math.round(Math.abs(value) * 100);
  const str = String(cents);
  const intRaw = str.length <= 2 ? "0" : str.slice(0, -2);
  const decPart = str.slice(-2).padStart(2, "0");
  const withDots = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots},${decPart}`;
}

/** Parse masked input to number (reais). */
export function parseMoneyToNumber(masked: string): number {
  const d = digitsOnly(masked);
  if (!d) return 0;
  const cents = parseInt(d, 10);
  return cents / 100;
}

/** While typing: append digit and return new mask. */
export function maskMoneyTyping(prevMasked: string, rawInput: string): string {
  const digits = digitsOnly(rawInput);
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const intPart = Math.floor(cents / 100);
  const decPart = String(cents % 100).padStart(2, "0");
  const intStr = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${intStr},${decPart}`;
}
