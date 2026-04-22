/**
 * @deprecated Backward-compat re-exports for existing tests.
 * Import directly from src/utils/, src/constants/, or src/types/ in new code.
 */
export type { FreePanel, ExclusionZone, PanelPreset, LayoutResult } from './types';
export { calculateLayout } from './utils/calculateLayout';
export { rectanglesOverlap } from './utils/rectanglesOverlap';
export { panelOverlapsZone } from './utils/panelOverlapsZone';
export { clampZoneToBounds } from './utils/clampZoneToBounds';
export { PRESETS } from './constants/presets';
