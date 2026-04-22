import type { ZoneBounds } from '../types';

/**
 * Clamps an exclusion-zone rectangle so that it stays within the roof bounds.
 * All parameters are in cm. Returns the clamped x, y, width, height.
 *
 * Pure function — no side effects.
 */
export function clampZoneToBounds(
  x: number,
  y: number,
  w: number,
  h: number,
  roofW: number,
  roofH: number,
): ZoneBounds {
  const clampedX = Math.max(0, Math.min(x, roofW));
  const clampedY = Math.max(0, Math.min(y, roofH));
  const clampedW = Math.min(w, Math.max(0, roofW - clampedX));
  const clampedH = Math.min(h, Math.max(0, roofH - clampedY));
  return { x: clampedX, y: clampedY, width: clampedW, height: clampedH };
}
