import type { LayoutResult } from '../types';

/**
 * Computes how many solar panels fit on a roof in a regular grid,
 * accounting for panel orientation and mounting gaps.
 *
 * Pure function — no side effects.
 */
export function calculateLayout(
  roofWidth: number,
  roofHeight: number,
  panelWidth: number,
  panelLength: number,
  panelPower: number,
  isLandscape: boolean,
  gapX: number,
  gapY: number,
): LayoutResult {
  const effectivePanelWidth = isLandscape ? panelLength : panelWidth;
  const effectivePanelHeight = isLandscape ? panelWidth : panelLength;

  const cols = Math.floor((roofWidth + gapX) / (effectivePanelWidth + gapX));
  const rows = Math.floor((roofHeight + gapY) / (effectivePanelHeight + gapY));
  const totalPanels = Math.max(0, cols) * Math.max(0, rows);

  return {
    cols: Math.max(0, cols),
    rows: Math.max(0, rows),
    totalPanels,
    totalPowerWp: totalPanels * panelPower,
    effectivePanelWidth,
    effectivePanelHeight,
  };
}
