/**
 * Returns true if two axis-aligned rectangles overlap (strictly — touching edges do not count).
 *
 * Pure function — no side effects.
 */
export function rectanglesOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}
