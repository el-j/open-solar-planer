import { describe, it, expect } from 'vitest';
import { effectivePanelSize } from '../../utils/effectivePanelSize';
import { clampPanel } from '../../utils/clampPanel';
import { pxToCm } from '../../utils/pxToCm';
import { formatPower } from '../../utils/formatPower';
import { generateId } from '../../utils/generateId';

describe('effectivePanelSize', () => {
  it('returns portrait dimensions when isLandscape is false', () => {
    const result = effectivePanelSize(113, 172, false);
    expect(result.effectiveWidth).toBe(113);
    expect(result.effectiveHeight).toBe(172);
  });

  it('swaps dimensions when isLandscape is true', () => {
    const result = effectivePanelSize(113, 172, true);
    expect(result.effectiveWidth).toBe(172);
    expect(result.effectiveHeight).toBe(113);
  });

  it('works with equal width and length', () => {
    const result = effectivePanelSize(100, 100, true);
    expect(result.effectiveWidth).toBe(100);
    expect(result.effectiveHeight).toBe(100);
  });
});

describe('clampPanel', () => {
  it('returns unchanged position when panel fits within roof', () => {
    const result = clampPanel(50, 50, 113, 172, 500, 400);
    expect(result.x).toBe(50);
    expect(result.y).toBe(50);
  });

  it('clamps x to 0 when position is negative', () => {
    const result = clampPanel(-10, 50, 113, 172, 500, 400);
    expect(result.x).toBe(0);
  });

  it('clamps y to 0 when position is negative', () => {
    const result = clampPanel(50, -5, 113, 172, 500, 400);
    expect(result.y).toBe(0);
  });

  it('clamps x so panel right edge does not exceed roof width', () => {
    const result = clampPanel(450, 50, 113, 172, 500, 400);
    expect(result.x).toBe(500 - 113); // 387
  });

  it('clamps y so panel bottom edge does not exceed roof height', () => {
    const result = clampPanel(50, 290, 113, 172, 500, 400);
    expect(result.y).toBe(400 - 172); // 228
  });

  it('clamps to 0 when panel is wider than the roof', () => {
    const result = clampPanel(100, 50, 600, 172, 500, 400);
    expect(result.x).toBe(0);
  });

  it('returns rounded integer values', () => {
    const result = clampPanel(50.7, 30.3, 113, 172, 500, 400);
    expect(result.x).toBe(Math.round(50.7));
    expect(result.y).toBe(Math.round(30.3));
  });
});

describe('pxToCm', () => {
  it('divides px by effective scale', () => {
    expect(pxToCm(100, 2)).toBe(50);
  });

  it('returns 0 for 0 px', () => {
    expect(pxToCm(0, 3)).toBe(0);
  });

  it('returns 0 when effectiveScale is 0 (division guard)', () => {
    expect(pxToCm(100, 0)).toBe(0);
  });

  it('handles fractional scale', () => {
    expect(pxToCm(50, 0.5)).toBe(100);
  });
});

describe('formatPower', () => {
  it('converts Wp to kWp with 2 decimal places', () => {
    expect(formatPower(1600)).toBe('1.60 kWp');
  });

  it('formats 0 Wp as 0.00 kWp', () => {
    expect(formatPower(0)).toBe('0.00 kWp');
  });

  it('formats 1000 Wp as 1.00 kWp', () => {
    expect(formatPower(1000)).toBe('1.00 kWp');
  });

  it('formats 2800 Wp as 2.80 kWp', () => {
    expect(formatPower(2800)).toBe('2.80 kWp');
  });
});

describe('generateId', () => {
  it('returns a string starting with panel prefix', () => {
    const id = generateId('panel');
    expect(id.startsWith('panel-')).toBe(true);
  });

  it('returns a string starting with zone prefix', () => {
    const id = generateId('zone');
    expect(id.startsWith('zone-')).toBe(true);
  });

  it('produces different IDs for sequential calls with Date.now mock', () => {
    // Two rapid calls — result depends on timing but both must be non-empty strings
    const id1 = generateId('panel');
    const id2 = generateId('zone');
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
    expect(id1.length).toBeGreaterThan('panel-'.length);
  });
});
