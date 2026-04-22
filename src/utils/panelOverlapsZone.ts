import type { FreePanel, ExclusionZone } from '../types';
import { rectanglesOverlap } from './rectanglesOverlap';

/**
 * Returns true if a free panel overlaps an exclusion zone.
 *
 * Pure function — no side effects.
 */
export function panelOverlapsZone(panel: FreePanel, zone: ExclusionZone): boolean {
  return rectanglesOverlap(
    panel.x, panel.y, panel.width, panel.height,
    zone.x, zone.y, zone.width, zone.height,
  );
}
