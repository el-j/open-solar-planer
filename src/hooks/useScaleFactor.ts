import { useMemo } from 'react';
import { useRoofStore } from '../stores/RoofStore';
import { useCanvasStore } from '../stores/CanvasStore';

/**
 * Computes the base scale factor (px per cm) that fits the roof within the
 * available container, ignoring the user's pinch-zoom multiplier.
 *
 * To get the full effective scale (including zoom), multiply by zoomScale from CanvasStore:
 *   `const effectiveScale = useScaleFactor() * zoomScale;`
 */
export function useScaleFactor(): number {
  const { roofWidth, roofHeight } = useRoofStore();
  const { containerSize } = useCanvasStore();

  return useMemo(() => {
    const availableW = containerSize.width - 40;
    const availableH = containerSize.height - 40;
    if (roofWidth === 0 || roofHeight === 0) return 1;
    return Math.min(availableW / roofWidth, availableH / roofHeight);
  }, [containerSize, roofWidth, roofHeight]);
}
