import type { ClampedPosition } from '../types';

/**
 * Clamps a panel's top-left corner so the panel stays fully within the roof bounds.
 * Returns rounded integer cm values.
 *
 * Pure function — no side effects.
 *
 * If the panel is wider/taller than the roof, x/y is clamped to 0.
 */
export function clampPanel(
  x: number,
  y: number,
  panelWidth: number,
  panelHeight: number,
  roofWidth: number,
  roofHeight: number,
): ClampedPosition {
  return {
    x: Math.round(Math.min(Math.max(0, x), Math.max(0, roofWidth - panelWidth))),
    y: Math.round(Math.min(Math.max(0, y), Math.max(0, roofHeight - panelHeight))),
  };
}
