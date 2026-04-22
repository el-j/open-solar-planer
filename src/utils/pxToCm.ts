/**
 * Converts a pixel distance on the canvas to centimetres.
 *
 * @param px             Pixel distance
 * @param effectiveScale Combined scale in px/cm (scaleFactor * zoomScale)
 *
 * Pure function — no side effects.
 * Guard: if effectiveScale is 0, returns 0 to avoid division by zero.
 */
export function pxToCm(px: number, effectiveScale: number): number {
  if (effectiveScale === 0) return 0;
  return px / effectiveScale;
}
