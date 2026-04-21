import { describe, it, expect } from 'vitest';
import { calculateLayout, PRESETS } from '../layout';

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
