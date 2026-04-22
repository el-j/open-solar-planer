import { useMemo } from 'react';
import { useRoofStore } from '../stores/RoofStore';
import { usePanelStore } from '../stores/PanelStore';
import { useGapStore } from '../stores/GapStore';
import { calculateLayout } from '../utils/calculateLayout';
import type { LayoutResult } from '../types';

/** Computes the grid layout from current roof/panel/gap store values. */
export function useLayout(): LayoutResult {
  const { roofWidth, roofHeight } = useRoofStore();
  const { panelWidth, panelLength, panelPower, isLandscape } = usePanelStore();
  const { gapX, gapY } = useGapStore();

  return useMemo(
    () => calculateLayout(roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY),
    [roofWidth, roofHeight, panelWidth, panelLength, panelPower, isLandscape, gapX, gapY],
  );
}
