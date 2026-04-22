# Task: Extract Pure Utils into `src/utils/`

**Type:** refactor  
**Branch:** `refactor/architecture-v2`  
**Phase:** 2 of 8 — requires Phase 1 (types) to be complete

---

## Goal

Move all pure business-logic functions into individual, named files under `src/utils/`. Add new utils that currently exist as anonymous inline logic inside `App.tsx`. Update `src/layout.ts` to re-export from the new locations so existing tests continue to pass without modification.

---

## Acceptance Criteria

- [ ] AC1: All util files listed below exist under `src/utils/` and are named exactly by their exported function
- [ ] AC2: Every util is a **named export** (not default) matching the file name
- [ ] AC3: `src/utils/index.ts` barrel-exports all utils
- [ ] AC4: `src/layout.ts` re-exports `calculateLayout`, `rectanglesOverlap`, `panelOverlapsZone` from their new paths (backward compat)
- [ ] AC5: No util file imports from `src/App.tsx` or any component
- [ ] AC6: `npm run build` passes; `npm test` passes; `npm run lint` passes

---

## Utils to Create

### `src/utils/calculateLayout.ts`

Move from `src/layout.ts`. Zero changes to logic or signature.

```typescript
import type { LayoutResult } from '../types';

export function calculateLayout(
  roofWidth: number,
  roofHeight: number,
  panelWidth: number,
  panelLength: number,
  panelPower: number,
  isLandscape: boolean,
  gapX: number,
  gapY: number,
): LayoutResult { … }
```

### `src/utils/rectanglesOverlap.ts`

Move from `src/layout.ts`. Zero changes.

```typescript
export function rectanglesOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
): boolean { … }
```

### `src/utils/panelOverlapsZone.ts`

Move from `src/layout.ts`. Zero changes.

```typescript
import type { FreePanel, ExclusionZone } from '../types';
import { rectanglesOverlap } from './rectanglesOverlap';

export function panelOverlapsZone(panel: FreePanel, zone: ExclusionZone): boolean { … }
```

### `src/utils/effectivePanelSize.ts`

**New.** Extract from the inline calculation in `App.tsx` (`effectiveDefaultW` / `effectiveDefaultH` and the logic inside `calculateLayout`).

```typescript
export type EffectivePanelSize = {
  effectiveWidth: number;   // cm — the dimension that goes along the X-axis
  effectiveHeight: number;  // cm — the dimension that goes along the Y-axis
};

/**
 * Returns the panel dimensions as rendered on screen, taking orientation into account.
 * Landscape mode swaps width (shorter) and length (longer).
 */
export function effectivePanelSize(
  panelWidth: number,
  panelLength: number,
  isLandscape: boolean,
): EffectivePanelSize {
  return {
    effectiveWidth: isLandscape ? panelLength : panelWidth,
    effectiveHeight: isLandscape ? panelWidth : panelLength,
  };
}
```

### `src/utils/clampPanel.ts`

**New.** Extract the `clampPanel` callback from `App.tsx`.

```typescript
export type ClampedPosition = { x: number; y: number };

/**
 * Clamps a panel's top-left corner so it stays fully within the roof bounds.
 * All values are in cm. Returns rounded integer cm values.
 */
export function clampPanel(
  x: number,
  y: number,
  panelWidth: number,
  panelHeight: number,
  roofWidth: number,
  roofHeight: number,
): ClampedPosition {
  return {
    x: Math.round(Math.min(Math.max(0, x), Math.max(0, roofWidth - panelWidth))),
    y: Math.round(Math.min(Math.max(0, y), Math.max(0, roofHeight - panelHeight))),
  };
}
```

### `src/utils/pxToCm.ts`

**New.** Extract the `pxToCm` callback from `App.tsx`.

```typescript
/**
 * Converts a pixel distance on the canvas to centimetres using the current scale factor.
 * @param px       Pixel distance
 * @param scale    Current scale factor (px per cm)
 */
export function pxToCm(px: number, scale: number): number {
  return px / scale;
}
```

### `src/utils/formatPower.ts`

**New.** Extract the inline `(x / 1000).toFixed(2) + ' kWp'` pattern from `App.tsx`.

```typescript
/**
 * Formats a power value in Watt-peak to a display string in kWp.
 * @example formatPower(1600) → "1.60 kWp"
 */
export function formatPower(wp: number): string {
  return `${(wp / 1000).toFixed(2)} kWp`;
}
```

### `src/utils/generateId.ts`

**New.** Extract the `panel-${Date.now()}` / `zone-${Date.now()}` pattern.

```typescript
/**
 * Generates a unique string ID for a panel or zone using the current timestamp.
 * Not cryptographically secure — fine for UI identity within a session.
 */
export function generateId(prefix: 'panel' | 'zone'): string {
  return `${prefix}-${Date.now()}`;
}
```

### `src/utils/index.ts`

Barrel re-export of all the above.

---

## Edge Cases

- EC1: `clampPanel` — when `roofWidth < panelWidth` the inner `Math.max(0, roofWidth - panelWidth)` returns 0, clamping x to 0. This is correct (panel is too big but we don't crash).
- EC2: `pxToCm` — if `scale` is 0, division produces `Infinity`. The caller (hook) must guard against `scale === 0` before calling this util.
- EC3: `effectivePanelSize` — both `panelWidth` and `panelLength` must be positive; passing 0 is not guarded in the util (caller's responsibility). Document this in the JSDoc.
- EC4: `formatPower(0)` should return `"0.00 kWp"` — verify in tests.

---

## Files to Change

| File | Change |
|------|--------|
| `src/utils/calculateLayout.ts` | **Create** — move function from `src/layout.ts` |
| `src/utils/rectanglesOverlap.ts` | **Create** — move function from `src/layout.ts` |
| `src/utils/panelOverlapsZone.ts` | **Create** — move function from `src/layout.ts` |
| `src/utils/effectivePanelSize.ts` | **Create** — new util extracted from App.tsx |
| `src/utils/clampPanel.ts` | **Create** — new util extracted from App.tsx |
| `src/utils/pxToCm.ts` | **Create** — new util extracted from App.tsx |
| `src/utils/formatPower.ts` | **Create** — new util extracted from App.tsx |
| `src/utils/generateId.ts` | **Create** — new util extracted from App.tsx |
| `src/utils/index.ts` | **Create** — barrel export |
| `src/layout.ts` | Replace function bodies with `export { … } from './utils/calculateLayout'` etc. Keep all existing named exports so `src/test/layout.test.ts` still passes |
| `src/App.tsx` | Update imports to use `src/utils/` directly; remove inline equivalents of new utils |

---

## New Tests to Write

Create `src/test/utils/` directory and add:

### `src/test/utils/clampPanel.test.ts`
```
describe('clampPanel', () => {
  it('returns position unchanged when within bounds')
  it('clamps x to 0 when negative')
  it('clamps y to 0 when negative')
  it('clamps to max x when panel would overflow right edge')
  it('clamps to max y when panel would overflow bottom edge')
  it('clamps to 0 when panel is wider than roof')
  it('returns integer values (Math.round)')
})
```

### `src/test/utils/effectivePanelSize.test.ts`
```
describe('effectivePanelSize', () => {
  it('returns original dimensions in portrait mode')
  it('swaps dimensions in landscape mode')
  it('is symmetric — landscape of landscape equals portrait')
})
```

### `src/test/utils/formatPower.test.ts`
```
describe('formatPower', () => {
  it('formats 1600 Wp as "1.60 kWp"')
  it('formats 0 Wp as "0.00 kWp"')
  it('formats 500 Wp as "0.50 kWp"')
  it('formats 10000 Wp as "10.00 kWp"')
})
```

---

## Commit Message

```
refactor: extract pure utils into src/utils/ (one file per function)
```

---

## Notes / Risks

- `src/layout.ts` must continue to export `calculateLayout`, `rectanglesOverlap`, `panelOverlapsZone`, `FreePanel`, `ExclusionZone`, `PanelPreset`, `LayoutResult`, `PRESETS` — these are all imported by `src/test/layout.test.ts`. Use `export { … } from '…'` re-exports.
- The existing `layout.test.ts` imports from `'../layout'` — do **not** change that file.
- `pxToCm` signature changes from a closed-over callback `(px: number) => px / scaleFactor` to a pure function `(px: number, scale: number): number`. Update all call sites in `App.tsx` accordingly.
- `clampPanel` signature changes from a callback `(x, y, w, h)` to `(x, y, w, h, roofWidth, roofHeight)`. The roof dimensions are no longer closed over. Update all call sites.
