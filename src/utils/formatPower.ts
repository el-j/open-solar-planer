/**
 * Formats a power value in Watt-peak to a human-readable kWp string.
 *
 * @example formatPower(1600) → "1.60 kWp"
 *
 * Pure function — no side effects.
 */
export function formatPower(wp: number): string {
  return `${(wp / 1000).toFixed(2)} kWp`;
}
