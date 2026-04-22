import { describe, it, expect } from 'vitest';
import { calculateLayout, PRESETS, rectanglesOverlap, panelOverlapsZone, clampZoneToBounds } from '../layout';
import type { FreePanel, ExclusionZone } from '../layout';

describe('calculateLayout', () => {
  it('calculates correct number of panels for standard roof', () => {
    const result = calculateLayout(500, 300, 113, 172, 400, false, 2, 2);
    // (500 + 2) / (113 + 2) = 502 / 115 = 4 cols
    // (300 + 2) / (172 + 2) = 302 / 174 = 1 row
    expect(result.cols).toBe(4);
    expect(result.rows).toBe(1);
    expect(result.totalPanels).toBe(4);
    expect(result.totalPowerWp).toBe(1600);
  });

  it('handles landscape orientation by swapping dimensions', () => {
    const portrait = calculateLayout(500, 300, 113, 172, 400, false, 2, 2);
    const landscape = calculateLayout(500, 300, 113, 172, 400, true, 2, 2);
    expect(portrait.effectivePanelWidth).toBe(113);
    expect(portrait.effectivePanelHeight).toBe(172);
    expect(landscape.effectivePanelWidth).toBe(172);
    expect(landscape.effectivePanelHeight).toBe(113);
  });

  it('returns zero panels when roof is too small', () => {
    const result = calculateLayout(50, 50, 113, 172, 400, false, 2, 2);
    expect(result.totalPanels).toBe(0);
    expect(result.totalPowerWp).toBe(0);
  });

  it('calculates total power correctly', () => {
    const result = calculateLayout(500, 500, 100, 200, 350, false, 5, 5);
    // (500 + 5) / (100 + 5) = 505 / 105 = 4 cols
    // (500 + 5) / (200 + 5) = 505 / 205 = 2 rows
    expect(result.cols).toBe(4);
    expect(result.rows).toBe(2);
    expect(result.totalPanels).toBe(8);
    expect(result.totalPowerWp).toBe(2800);
  });

  it('handles zero gap correctly', () => {
    const result = calculateLayout(500, 300, 100, 150, 300, false, 0, 0);
    // 500 / 100 = 5 cols
    // 300 / 150 = 2 rows
    expect(result.cols).toBe(5);
    expect(result.rows).toBe(2);
  });

  it('handles exact fit panels', () => {
    const result = calculateLayout(200, 200, 100, 100, 200, false, 0, 0);
    expect(result.cols).toBe(2);
    expect(result.rows).toBe(2);
    expect(result.totalPanels).toBe(4);
  });
});

describe('PRESETS', () => {
  it('contains at least 4 presets', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(4);
  });

  it('standard preset has correct dimensions', () => {
    const standard = PRESETS.find(p => p.id === 'standard');
    expect(standard).toBeDefined();
    expect(standard!.width).toBe(113);
    expect(standard!.length).toBe(172);
    expect(standard!.power).toBe(400);
  });

  it('all presets have positive dimensions and power', () => {
    for (const preset of PRESETS) {
      expect(preset.width).toBeGreaterThan(0);
      expect(preset.length).toBeGreaterThan(0);
      expect(preset.power).toBeGreaterThan(0);
    }
  });
});

describe('rectanglesOverlap', () => {
  it('returns true for fully overlapping rectangles', () => {
    expect(rectanglesOverlap(0, 0, 10, 10, 2, 2, 4, 4)).toBe(true);
  });

  it('returns true for partially overlapping rectangles', () => {
    expect(rectanglesOverlap(0, 0, 10, 10, 8, 8, 10, 10)).toBe(true);
  });

  it('returns false for non-overlapping rectangles', () => {
    expect(rectanglesOverlap(0, 0, 5, 5, 10, 10, 5, 5)).toBe(false);
  });

  it('returns false for touching edges (not overlapping)', () => {
    // right edge of A touches left edge of B
    expect(rectanglesOverlap(0, 0, 5, 5, 5, 0, 5, 5)).toBe(false);
    // bottom edge of A touches top edge of B
    expect(rectanglesOverlap(0, 0, 5, 5, 0, 5, 5, 5)).toBe(false);
  });

  it('returns true when one rectangle is inside the other', () => {
    expect(rectanglesOverlap(0, 0, 20, 20, 5, 5, 5, 5)).toBe(true);
  });
});

describe('panelOverlapsZone', () => {
  const makePanel = (x: number, y: number, w: number, h: number): FreePanel => ({
    id: 'p1', x, y, width: w, height: h, power: 400,
  });
  const makeZone = (x: number, y: number, w: number, h: number): ExclusionZone => ({
    id: 'z1', x, y, width: w, height: h,
  });

  it('returns true when panel is inside zone', () => {
    expect(panelOverlapsZone(makePanel(10, 10, 20, 20), makeZone(0, 0, 100, 100))).toBe(true);
  });

  it('returns false when panel is outside zone', () => {
    expect(panelOverlapsZone(makePanel(200, 200, 20, 20), makeZone(0, 0, 100, 100))).toBe(false);
  });

  it('returns true when panel partially overlaps zone', () => {
    expect(panelOverlapsZone(makePanel(90, 90, 20, 20), makeZone(0, 0, 100, 100))).toBe(true);
  });
});

describe('clampZoneToBounds', () => {
  it('leaves a fully inside zone unchanged', () => {
    const result = clampZoneToBounds(10, 10, 50, 50, 200, 150);
    expect(result).toEqual({ x: 10, y: 10, width: 50, height: 50 });
  });

  it('clamps start coordinates that are beyond the roof boundaries', () => {
    // Negative start → clamped to 0; the zone extent (40×40) still fits within 200×150
    const result = clampZoneToBounds(-20, -30, 40, 40, 200, 150);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    // Width and height fit within the roof at position (0,0), so they remain unchanged
    expect(result.width).toBe(40);
    expect(result.height).toBe(40);
  });

  it('clamps width and height that would exceed the roof boundary', () => {
    // Zone starts at 160,120 and tries to extend 80×60 — would go beyond 200×150
    const result = clampZoneToBounds(160, 120, 80, 60, 200, 150);
    expect(result.x).toBe(160);
    expect(result.y).toBe(120);
    expect(result.width).toBe(40);  // capped at 200 - 160
    expect(result.height).toBe(30); // capped at 150 - 120
  });

  it('handles a 1×1 cm roof without crashing or negative values', () => {
    const result = clampZoneToBounds(0, 0, 5, 5, 1, 1);
    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.width).toBeGreaterThanOrEqual(0);
    expect(result.height).toBeGreaterThanOrEqual(0);
  });
});
