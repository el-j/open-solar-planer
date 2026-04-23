/**
 * Converts a pixel distance on the canvas to centimetres.
 *
 * @param px             Pixel distance
 * @param effectiveScale Combined scale in px/cm (scaleFactor × zoomScale).
 *                       Must be positive for accurate results.
 *                       Returns 0 as a safe fallback to avoid division by zero
 *                       — callers should ensure effectiveScale is non-zero.
 *
 * Pure function — no side effects.
 */
export function pxToCm(px: number, effectiveScale: number): number {
  if (effectiveScale <= 0) return 0;
  return px / effectiveScale;
}
