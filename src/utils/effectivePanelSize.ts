import type { EffectivePanelSize } from '../types';

/**
 * Returns the panel dimensions as rendered on screen, taking orientation into account.
 * Landscape mode swaps the shorter width with the longer length.
 *
 * Pure function — no side effects.
 *
 * @param panelWidth   Shorter physical dimension of the panel (cm)
 * @param panelLength  Longer physical dimension of the panel (cm)
 * @param isLandscape  Whether the panel is rotated 90° into landscape orientation
 */
export function effectivePanelSize(
  panelWidth: number,
  panelLength: number,
  isLandscape: boolean,
): EffectivePanelSize {
  return {
    effectiveWidth: isLandscape ? panelLength : panelWidth,
    effectiveHeight: isLandscape ? panelWidth : panelLength,
  };
}
